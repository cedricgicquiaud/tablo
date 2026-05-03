/**
 * Server Action wrapper pour `runStarterPipeline`.
 *
 * Phase 18 Cycle B (T_B1, T_B6, T_B7, T_B12). Construit les vraies
 * dépendances (Supabase admin client, runAgent, DataSource) et appelle
 * `runStarterPipeline`. Gère idempotence (R2), audit (R9), timeout
 * 5 min server-side (R10).
 *
 * Usage : appelé en fire-and-forget via `after()` dans
 * `src/app/onboarding/select-project/actions.ts` (T_C1).
 */

"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSSEStream } from "@/lib/ai-engine/utils/stream";
import { runAgent } from "@/lib/ai-engine";
import { loadDataSource } from "@/lib/ai-engine/load-data-source";
import { detectSourceType } from "@/lib/ai-engine/utils/detect-source-type";
import { estimateCostUsd } from "@/lib/ai-engine/agents/v1/config";
import type { AgentResult, StreamEvent } from "@/lib/ai-engine/types/agent";
import {
  runStarterPipeline,
  type StarterDeps,
  type WidgetGenerationOutcome,
  type StarterResult,
} from "./starter-pipeline";

const TIMEOUT_MS = 5 * 60 * 1000; // R10
const BUDGET_CAP_USD = 0.25; // R13

/**
 * Génère le starter dashboard pour une connexion fraîchement créée.
 *
 * Idempotent : 2× call sur le même dashboard → 1 génération seulement (R2).
 * Fire-and-forget : pas de valeur de retour, log dans `ai_engine_audit`.
 *
 * Garanties :
 * - Pas de throw : tout est attrapé et loggué
 * - Setter `starter_generating_at` au début, `starter_generated_at` à la fin
 * - Timeout server hardcoded 5 min (R10)
 * - Audit dans `ai_engine_audit` avec tool='starter_dashboard' (R9)
 */
export async function generateStarterDashboard(
  connectionId: string,
  dashboardId: string,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();

  // R2 idempotence : on ne check QUE `starter_generated_at`. Le flag
  // `starter_generating_at` est posé par `selectProject` action AVANT
  // l'appel à cette fonction (pour l'écran progress UI), donc on ne
  // peut pas l'utiliser comme lock interne — sinon on retournerait
  // immédiatement. Risque de double exec acceptable en V1 (1 user
  // OAuth callback unique). Si besoin V2 : advisory lock Postgres.
  const { data: dashboardRow, error: fetchErr } = await admin
    .from("dashboards")
    .select("starter_generated_at")
    .eq("id", dashboardId)
    .single();

  if (fetchErr || !dashboardRow) {
    console.warn(
      `[starter-dashboard] dashboard ${dashboardId} introuvable: ${fetchErr?.message ?? "unknown"}`,
    );
    return;
  }

  if (dashboardRow.starter_generated_at) {
    // Déjà généré, no-op (idempotence stricte sur 2ème call).
    return;
  }

  // S'assurer que `starter_generating_at` est posé (l'UI s'en sert pour
  // afficher l'écran progress). Idempotent : pas de problème si déjà posé.
  const startedIso = new Date().toISOString();
  await admin
    .from("dashboards")
    .update({ starter_generating_at: startedIso })
    .eq("id", dashboardId)
    .is("starter_generated_at", null);

  // R10 : timeout server-side
  const ac = new AbortController();
  const timeoutHandle = setTimeout(() => ac.abort(), TIMEOUT_MS);

  let result: StarterResult | null = null;
  try {
    const dataSource = await loadDataSource(connectionId);

    const deps: StarterDeps = {
      listTables: () => dataSource.listTables(),
      detectSourceType,
      generateWidget: (prompt) =>
        runAgentAsWidgetGenerator(
          prompt,
          connectionId,
          workspaceId,
          userId,
          ac.signal,
        ),
      pinWidget: async (config, _data, _explanation, position) => {
        // Sérialisation explicite en Json (la WidgetConfig peut contenir des
        // formes non-Json comme Date côté types ; JSON.parse normalise).
        const configJson = JSON.parse(JSON.stringify(config));
        const positionJson = JSON.parse(JSON.stringify(position));
        const { error } = await admin.from("widgets").insert({
          dashboard_id: dashboardId,
          connection_id: connectionId,
          kind: config.kind,
          config_jsonb: configJson,
          position_jsonb: positionJson,
        });
        if (error) throw new Error(error.message);
      },
      isProfilingDone: async () => {
        const { data } = await admin
          .from("connections")
          .select("schema_synced_at")
          .eq("id", connectionId)
          .single();
        return Boolean(data?.schema_synced_at);
      },
      budgetCapUsd: BUDGET_CAP_USD,
      abortSignal: ac.signal,
      now: () => new Date(),
    };

    result = await runStarterPipeline(deps);
  } catch (err) {
    console.warn(
      `[starter-dashboard] pipeline error: ${err instanceof Error ? err.message : "unknown"}`,
    );
    result = null;
  } finally {
    clearTimeout(timeoutHandle);
  }

  // R2 + R9 : marquer terminé + audit
  await admin
    .from("dashboards")
    .update({
      starter_generated_at: new Date().toISOString(),
      starter_generating_at: null,
    })
    .eq("id", dashboardId);

  // R9 : audit
  if (result) {
    await admin.from("ai_engine_audit").insert({
      workspace_id: workspaceId,
      connection_id: connectionId,
      tool: "starter_dashboard",
      status: result.status,
      duration_ms: result.durationMs,
      error_message: JSON.stringify({
        source_type: result.sourceType,
        widgets_total: result.widgetsTotal,
        widgets_ok: result.widgetsOk,
        widgets_failed: result.widgetsFailed,
        cost_usd: result.costUsd,
      }),
    });
  } else {
    await admin.from("ai_engine_audit").insert({
      workspace_id: workspaceId,
      connection_id: connectionId,
      tool: "starter_dashboard",
      status: "error",
      error_message: "pipeline_threw",
    });
  }
}

/**
 * Adaptateur runAgent → WidgetGenerationOutcome pour le pipeline.
 * Consomme le SSE en interne, extrait le done event, calcule le coût.
 */
async function runAgentAsWidgetGenerator(
  prompt: string,
  connectionId: string,
  workspaceId: string,
  userId: string,
  signal: AbortSignal,
): Promise<WidgetGenerationOutcome> {
  const sse = createSSEStream<StreamEvent>();
  let agentResult: AgentResult | null = null;

  const reader = sse.stream.getReader();
  const decoder = new TextDecoder();
  const consume = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6)) as StreamEvent;
            if (event.type === "done") agentResult = event.result;
          } catch {
            // ignore lignes non-JSON
          }
        }
      }
    }
  })();

  await runAgent(
    { prompt, workspaceId, userId, connectionId, signal },
    sse,
  ).finally(() => sse.close());
  await consume;

  // TypeScript ne narrow pas correctement `agentResult` après les
  // assignations dans la closure ; on cast explicitement après l'await.
  const finalResult = agentResult as AgentResult | null;
  if (!finalResult) {
    return { ok: false, error: "no_done_event", costUsd: 0 };
  }

  const tokens = finalResult.tokens;
  const costUsd = tokens
    ? estimateCostUsd(
        tokens.input,
        tokens.output,
        tokens.cacheCreation,
        tokens.cacheRead,
      )
    : 0;

  if (!finalResult.ok) {
    return { ok: false, error: finalResult.error, costUsd };
  }

  return {
    ok: true,
    config: finalResult.config,
    data: finalResult.data,
    explanation: finalResult.explanation,
    costUsd,
  };
}
