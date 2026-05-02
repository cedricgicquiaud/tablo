/**
 * Moteur AI modulaire — Phase 17.
 *
 * Entry point public : `runAgent(input, sse)` orchestre la génération
 * d'un widget en streamant des events SSE vers le client.
 *
 * Architecture :
 * - System prompt versionné dans `agents/v1/system-prompt.md`
 * - Tools dans `tools/*.ts` (T1.7 cycle A)
 * - Helpers atomiques dans `utils/*.ts` (TA3-TA5, TA11)
 * - DataSource resolution dans `load-data-source.ts` (T1.5)
 *
 * Cycle A : parité fonctionnelle legacy + budget cap + retry cap +
 * narrative validation + erreurs structurées + streaming SSE.
 *
 * Cycle B ajoutera : schema_cache_jsonb populé/lu, top_values dans
 * inspect_table, refresh manuel.
 *
 * Cycle C ajoutera : execute_sql exposé, suggest_follow_ups,
 * validation chart_type/series, table audit, cleanup deprecated.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

import { getAnthropicClient } from "@/lib/ai/anthropic";
import { extractData } from "@/lib/ai/extract-preview";

import { WIDGET_JSON_SCHEMA, WidgetSchema, type WidgetConfig } from "./types/widget-schema";
import type { AgentResult, RunAgentInput, StreamEvent } from "./types/agent";
import type { SSEStream } from "./utils/stream";
import {
  AI_MODEL,
  MAX_ITERATIONS,
  MAX_TOKENS_PER_TURN,
} from "./agents/v1/config";
import { mapAnthropicError } from "./utils/error-mapper";
import { validateNarrative } from "./utils/narrative";
import { checkBudgetCap } from "./utils/budget";
import { recordToolCall } from "./utils/retry-tracker";
import { loadDataSource } from "./load-data-source";
import { readSchemaCache } from "./schema-cache/read";
import { executeListTables } from "./tools/list-tables";
import { executeInspectTable } from "./tools/inspect-table";
import { executeSql } from "./tools/execute-sql";
import {
  executeSuggestFollowUps,
  isSuggestFollowUpsEnabled,
} from "./tools/suggest-follow-ups";
import type { ToolContext } from "./types/tool";

const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), "src/lib/ai-engine/agents/v1/system-prompt.md"),
  "utf-8",
);

/**
 * Définitions tools exposées au LLM. Cycle A : parité legacy
 * (`list_tables`, `inspect_table`, `propose_widget`).
 *
 * Cycle B enrichira `inspect_table` avec top_values.
 * Cycle C ajoutera `execute_sql` + `suggest_follow_ups`.
 */
const SUGGEST_FOLLOW_UPS_TOOL: Anthropic.Messages.Tool = {
  name: "suggest_follow_ups",
  description:
    "Suggère 1 à 3 questions de drill-down que l'utilisateur pourrait vouloir poser après ce widget. À appeler en TOUT DERNIER, après propose_widget. Termine la session — ne plus appeler d'autres tools après.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 3,
        description:
          "Liste de 1 à 3 questions courtes (en français) que l'utilisateur pourrait poser après ce widget pour explorer plus loin.",
      },
    },
    required: ["suggestions"],
  },
};

const BASE_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "list_tables",
    description: "Liste toutes les tables disponibles avec leur nombre de lignes.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "inspect_table",
    description: "Retourne les colonnes (nom + type) d'une table + 3 lignes d'exemple.",
    input_schema: {
      type: "object",
      properties: {
        table_name: { type: "string", description: "Nom de la table à inspecter." },
      },
      required: ["table_name"],
    },
  },
  {
    name: "execute_sql",
    description:
      "Exécute une requête SQL SELECT/WITH read-only contre la base de données. Utile pour valider une hypothèse ou explorer les données avant de proposer un widget. La requête est limitée à 100 lignes (LIMIT injecté si absent) et le résultat tronqué si > 5000 caractères JSON. Réservé aux SELECT/WITH (INSERT/UPDATE/DELETE/DDL rejetés).",
    input_schema: {
      type: "object",
      properties: {
        sql_query: {
          type: "string",
          description: "Requête SQL Postgres (SELECT/WITH uniquement).",
        },
      },
      required: ["sql_query"],
    },
  },
  {
    name: "propose_widget",
    description:
      "Propose le widget config FINAL à afficher. Appelle ce tool une seule fois, à la fin.",
    input_schema: WIDGET_JSON_SCHEMA as unknown as Anthropic.Messages.Tool["input_schema"],
  },
];

/** Tools exposés au LLM, avec feature flag suggest_follow_ups (R61, R62). */
const TOOLS: Anthropic.Messages.Tool[] = isSuggestFollowUpsEnabled()
  ? [...BASE_TOOLS, SUGGEST_FOLLOW_UPS_TOOL]
  : BASE_TOOLS;

/**
 * Résume un input de tool pour la notification SSE (R7).
 * Tronqué à 80 caractères pour éviter de polluer l'UI.
 */
function summarizeToolInput(input: unknown): string {
  const json = JSON.stringify(input);
  return json.length > 80 ? `${json.slice(0, 77)}...` : json;
}

/**
 * Orchestre la génération d'un widget. Émet les events SSE en live.
 *
 * Étapes :
 * 1. Charge la DataSource (admin client après IDOR guard amont)
 * 2. Boucle d'iterations max MAX_ITERATIONS :
 *    a. Appel Anthropic avec messages + tools
 *    b. Si erreur Anthropic → mappe et termine en error
 *    c. Vérifie budget cap → abort si dépassé
 *    d. Pour chaque tool_use : exécute (avec retry cap), produit tool_result
 *    e. Stop si plus de tool_use ou propose_widget validé
 * 3. Valide narrative ≥ 20 caractères
 * 4. Si propose_widget validé : runQuery + extractData + send done ok
 *    Sinon : send done error
 *
 * Le signal `input.signal` est propagé à `anthropic.messages.create()`
 * pour permettre l'abort côté client.
 */
export async function runAgent(
  input: RunAgentInput,
  sse: SSEStream<StreamEvent>,
): Promise<void> {
  let totalIn = 0;
  let totalOut = 0;
  let lastText = "";
  let proposedConfig: WidgetConfig | null = null;
  let followUps: string[] = [];
  const retryCounters = new Map<string, number>();

  // 1. DataSource resolution
  let dataSource;
  try {
    dataSource = await loadDataSource(input.connectionId);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Connexion introuvable";
    sse.send({ type: "done", result: { ok: false, error: errorMsg } });
    return;
  }

  // 1bis. Lecture cache schema (R3, R4, R4bis I1) — best-effort, tolère null
  const schemaCache = input.connectionId
    ? await readSchemaCache(input.connectionId).catch(() => null)
    : null;

  // 2. Anthropic client
  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    sse.send({
      type: "done",
      result: { ok: false, error: err instanceof Error ? err.message : "Erreur Anthropic" },
    });
    return;
  }

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: input.prompt },
  ];

  // 3. Boucle agent
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Budget cap check (R5bis)
    const budget = checkBudgetCap(totalIn, totalOut);
    if (!budget.ok) {
      sse.send({
        type: "done",
        result: { ok: false, error: budget.error, tokens: { input: totalIn, output: totalOut } },
      });
      return;
    }

    // Anthropic call avec signal propagé (R74)
    let resp;
    try {
      resp = await anthropic.messages.create(
        {
          model: AI_MODEL,
          max_tokens: MAX_TOKENS_PER_TURN,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        },
        { signal: input.signal },
      );
    } catch (err) {
      sse.send({
        type: "done",
        result: {
          ok: false,
          error: mapAnthropicError(err),
          tokens: { input: totalIn, output: totalOut },
        },
      });
      return;
    }

    totalIn += resp.usage.input_tokens;
    totalOut += resp.usage.output_tokens;

    // Stream les blocks texte au client (R7)
    for (const block of resp.content) {
      if (block.type === "text" && block.text.trim()) {
        lastText = block.text;
        sse.send({ type: "text_delta", text: block.text });
      }
    }

    messages.push({ role: "assistant", content: resp.content });

    const toolUses = resp.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) break;

    // Exécution des tools (retry cap appliqué APRÈS chaque exec, R8bis cycle C)
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      // Notification UI (R7)
      sse.send({
        type: "tool_use_notif",
        name: tu.name,
        input_summary: summarizeToolInput(tu.input),
      });

      // Exécution selon le tool name
      let toolIsError = false;
      try {
        if (tu.name === "list_tables") {
          const r = await executeListTables(dataSource, schemaCache);
          toolIsError = r.is_error;
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: r.content,
            is_error: r.is_error,
          });
        } else if (tu.name === "inspect_table") {
          const args = tu.input as { table_name: string };
          const r = await executeInspectTable(dataSource, schemaCache, args);
          toolIsError = r.is_error;
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: r.content,
            is_error: r.is_error,
          });
        } else if (tu.name === "execute_sql") {
          const args = tu.input as { sql_query: string };
          const ctx: ToolContext = {
            workspaceId: input.workspaceId,
            userId: input.userId,
            connectionId: input.connectionId,
            dataSource,
            retryCounters,
          };
          const r = await executeSql(args, ctx);
          toolIsError = r.is_error;
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: r.content,
            is_error: r.is_error,
          });
        } else if (tu.name === "suggest_follow_ups") {
          const args = tu.input as { suggestions: string[] };
          const r = executeSuggestFollowUps(args);
          toolIsError = r.is_error;
          if (!r.is_error) {
            try {
              const parsed = JSON.parse(r.content) as { suggestions?: string[] };
              followUps = parsed.suggestions ?? [];
            } catch {
              // Ignore parse error : le tool a déjà validé
            }
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: r.content,
            is_error: r.is_error,
          });
        } else if (tu.name === "propose_widget") {
          const parsed = WidgetSchema.safeParse(tu.input);
          if (!parsed.success) {
            toolIsError = true;
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: `Config invalide : ${JSON.stringify(parsed.error.issues)}`,
              is_error: true,
            });
          } else {
            proposedConfig = parsed.data;
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: isSuggestFollowUpsEnabled()
                ? "Widget config validé. Maintenant, appelle suggest_follow_ups avec 1 à 3 questions de drill-down pour terminer."
                : "Widget config validé.",
            });
          }
        } else {
          toolIsError = true;
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Unknown tool: ${tu.name}`,
            is_error: true,
          });
        }
      } catch (err) {
        // I12 : erreur DataSource (auth expirée, etc.) → tool_result is_error
        toolIsError = true;
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: err instanceof Error ? err.message : "Tool execution error",
          is_error: true,
        });
      }

      // Retry cap : compte les échecs CONSÉCUTIFS uniquement (R8bis cycle C).
      // Succès → reset à 0 (l'IA a progressé). Échec → incrémente.
      // Cap = 3 échecs consécutifs sur le MÊME tool → abandon.
      const retryCheck = recordToolCall(retryCounters, tu.name, toolIsError);
      if (!retryCheck.ok) {
        sse.send({
          type: "done",
          result: {
            ok: false,
            error: retryCheck.error,
            tokens: { input: totalIn, output: totalOut },
          },
        });
        return;
      }
    }

    messages.push({ role: "user", content: toolResults });

    // Break si l'IA arrête d'elle-même (stop_reason 'end_turn' = pas de tool_use suivant)
    if (resp.stop_reason !== "tool_use") break;

    // Break si propose_widget validé ET (follow-ups désactivé OU déjà appelés OU
    // suggest_follow_ups vient d'être appelé dans ce turn). Cela permet à l'IA
    // d'enchaîner propose_widget → suggest_follow_ups dans des turns successifs.
    if (proposedConfig) {
      const followUpsCalledThisTurn = toolUses.some(
        (t) => t.name === "suggest_follow_ups",
      );
      if (!isSuggestFollowUpsEnabled() || followUps.length > 0 || followUpsCalledThisTurn) {
        break;
      }
    }
  }

  // 4. Validation narrative (R8, B1)
  const narrativeCheck = validateNarrative(lastText);
  if (!narrativeCheck.ok) {
    sse.send({
      type: "done",
      result: {
        ok: false,
        error: narrativeCheck.error,
        tokens: { input: totalIn, output: totalOut },
      },
    });
    return;
  }

  // 5. Pas de propose_widget validé
  if (!proposedConfig) {
    sse.send({
      type: "done",
      result: {
        ok: false,
        error: "L'AI n'a pas proposé de widget. Reformule ta demande.",
        tokens: { input: totalIn, output: totalOut },
      },
    });
    return;
  }

  // 6. Exécution SQL + extraction data
  let rows: Array<Record<string, unknown>>;
  try {
    rows = await dataSource.runQuery(proposedConfig.query.sql);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Erreur SQL inconnue";
    sse.send({
      type: "done",
      result: {
        ok: false,
        error: `Erreur SQL : ${errorMsg}`,
        tokens: { input: totalIn, output: totalOut },
      },
    });
    return;
  }

  const extracted = extractData(proposedConfig, rows);
  if ("error" in extracted) {
    sse.send({
      type: "done",
      result: {
        ok: false,
        error: extracted.error,
        tokens: { input: totalIn, output: totalOut },
      },
    });
    return;
  }

  const result: AgentResult = {
    ok: true,
    config: proposedConfig,
    data: extracted,
    explanation: lastText,
    tokens: { input: totalIn, output: totalOut },
    ...(followUps.length > 0 ? { followUps } : {}),
  };

  sse.send({ type: "done", result });
}
