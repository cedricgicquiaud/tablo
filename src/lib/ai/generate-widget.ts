"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AI_MODEL, getAnthropicClient } from "./anthropic";
import { extractData } from "./extract-preview";
import { inspectTable, listTables } from "./introspect";
import {
  WIDGET_JSON_SCHEMA,
  WidgetSchema,
  type WidgetConfig,
} from "./widget-schema";
import type { GenerateResult } from "./generate-widget.types";

const SYSTEM_PROMPT = `Tu es un générateur de widgets de dashboard pour un produit nommé Pinpoint.

Ta mission : à partir d'une demande utilisateur en français, produire UN widget config JSON valide.

Tu as accès à 3 tools :
- list_tables : liste les tables disponibles avec leur nombre de lignes.
- inspect_table : retourne colonnes (nom + type) + 3 lignes d'exemple.
- propose_widget : propose le widget config FINAL (à appeler une seule fois).

Workflow obligatoire :
1. Toujours commencer par list_tables.
2. Inspecter 1-3 tables pertinentes.
3. Construire la requête SQL Postgres.
4. Appeler propose_widget.

Sécurité SQL :
- SELECT/WITH uniquement, pas de DDL/DML.
- LIMIT 100 max (le serveur ajoute déjà LIMIT 100 implicite).

KINDS DISPONIBLES (8) — choisis celui qui répond le mieux à la demande :

1. metric_card — UNE valeur principale (avec delta optionnel et sparkline optionnelle).
   - Use case : "mon revenu ce mois", "nombre de clients actifs", "panier moyen"
   - SQL : retourne UNE SEULE LIGNE avec colonnes [value, delta?, sparkline?]
   - mapping : { value: "col_name", delta?: "col_name", sparkline?: "col_name" }
   - icon : revenue / users / cart / trend (obligatoire pour ce kind)
   - Si métrique temporelle, INCLURE une sparkline 12 mois OU 7 jours via array_agg.

2. time_series — Courbe sur le temps.
   - Use case : "évolution du revenu sur 12 mois", "signups par jour"
   - SQL : retourne N lignes, une par point temporel.
   - mapping : { x: "date_or_label_col", y: "numeric_col" }
   - Pas d'icon ni de delta.

3. bar_chart — Barres par catégorie (avec target optionnel).
   - Use case : "ventes par catégorie", "top produits", "objectif vs réel par segment"
   - SQL : retourne N lignes (typiquement 3-10 catégories).
   - mapping : { label: "category_col", value: "numeric_col", target?: "target_col" }

4. donut — Parts en pourcentage.
   - Use case : "répartition canaux", "distribution par segment", "% par pays"
   - SQL : retourne N lignes (typiquement 3-6 segments).
   - mapping : { label: "category_col", value: "numeric_col" }

5. gauge — Jauge value/target (% atteint d'un objectif).
   - Use case : "% objectif mensuel atteint", "stock restant vs cible", "taux de complétion"
   - SQL : retourne UNE SEULE LIGNE avec colonnes [value, target] (target > 0)
   - mapping : { value: "col_name", target: "col_name" }

6. data_table — Table de N lignes, jusqu'à 5 colonnes.
   - Use case : "10 derniers clients", "top 20 commandes", "produits en rupture"
   - SQL : retourne N lignes (max 50 affichées). LIMIT raisonnable conseillé.
   - mapping : { columns: "col1,col2,col3" } — string CSV des colonnes à afficher.

7. funnel — Étapes décroissantes d'un entonnoir.
   - Use case : "vues → panier → checkout → paiement", "leads → demos → deals"
   - SQL : retourne N lignes (3-7 étapes), ordonnées par count DESC.
   - mapping : { stage: "etape_col", count: "count_col" }

8. event_timeline — Chronologie d'événements.
   - Use case : "30 derniers événements", "activité utilisateur récente"
   - SQL : retourne N lignes ordonnées par timestamp DESC (max 30 affichées).
   - mapping : { timestamp: "ts_col", label: "label_col", type?: "category_col" }

Format des valeurs :
- currency_eur_compact : valeur en CENTS (12300 → "123 €"). Pour revenu, panier, prix.
- count : entier. Pour nombre de clients, commandes, produits.
- percent : nombre déjà en %. Pour taux, conversion, parts.

Pattern SQL pour metric_card avec sparkline 12 mois (revenu) :

WITH series AS (SELECT generate_series(0, 11) AS i),
sparkline AS (
  SELECT array_agg(monthly.cents ORDER BY monthly.month ASC) AS sparkline_arr
  FROM series
  LEFT JOIN LATERAL (
    SELECT date_trunc('month', now() - make_interval(months => series.i)) AS month,
           COALESCE(SUM(o.total_cents), 0) AS cents
    FROM orders o
    WHERE o.status = 'paid'
      AND o.paid_at >= date_trunc('month', now() - make_interval(months => series.i))
      AND o.paid_at < date_trunc('month', now() - make_interval(months => series.i)) + interval '1 month'
  ) monthly ON true
)
SELECT current_value, prev_value, delta_pct, sparkline_arr FROM ...

Domaine actuel : e-commerce. Tables : products, customers, orders, order_items, shipments, events, targets, calendar_events.

Sois concis dans tes messages texte — propose le widget rapidement.`;

const TOOLS = [
  {
    name: "list_tables",
    description: "Liste toutes les tables disponibles avec leur nombre de lignes.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
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
    name: "propose_widget",
    description:
      "Propose le widget config FINAL à afficher. Appelle ce tool une seule fois, à la fin.",
    input_schema: WIDGET_JSON_SCHEMA,
  },
];

export async function generateWidget(prompt: string): Promise<GenerateResult> {
  if (!prompt || prompt.trim().length < 3) {
    return { ok: false, error: "Décris ta demande en quelques mots." };
  }
  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur Anthropic" };
  }
  const admin = createSupabaseAdminClient();

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: prompt },
  ];
  let proposedConfig: WidgetConfig | null = null;
  let totalIn = 0;
  let totalOut = 0;
  const MAX_ITERATIONS = 6;
  let lastText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let resp;
    try {
      resp = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        tools: TOOLS as Anthropic.Messages.Tool[],
        messages,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur Anthropic inconnue";
      // Erreurs courantes : crédits insuffisants, key invalide, rate limit.
      if (/credit balance|invalid_request_error.*credit/i.test(message)) {
        return {
          ok: false,
          error:
            "Crédits Anthropic insuffisants. Recharge ton compte sur https://console.anthropic.com/settings/billing",
        };
      }
      if (/authentication|invalid.*key/i.test(message)) {
        return {
          ok: false,
          error: "Clé Anthropic invalide. Vérifie ANTHROPIC_API_KEY dans .env.local.",
        };
      }
      if (/rate.?limit/i.test(message)) {
        return {
          ok: false,
          error: "Rate limit Anthropic atteint. Réessaie dans quelques secondes.",
        };
      }
      return { ok: false, error: `Erreur Anthropic : ${message}` };
    }
    totalIn += resp.usage.input_tokens;
    totalOut += resp.usage.output_tokens;

    for (const block of resp.content) {
      if (block.type === "text" && block.text.trim()) lastText = block.text;
    }

    messages.push({ role: "assistant", content: resp.content });

    const toolUses = resp.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (toolUses.length === 0) break;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      try {
        if (tu.name === "list_tables") {
          const tables = await listTables(admin);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(tables),
          });
        } else if (tu.name === "inspect_table") {
          const args = tu.input as { table_name: string };
          const detail = await inspectTable(admin, args.table_name);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: detail
              ? JSON.stringify(detail)
              : JSON.stringify({ error: `Table ${args.table_name} introuvable` }),
            is_error: !detail,
          });
        } else if (tu.name === "propose_widget") {
          const parsed = WidgetSchema.safeParse(tu.input);
          if (!parsed.success) {
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
              content: "Widget config validé.",
            });
          }
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: `Unknown tool: ${tu.name}`,
            is_error: true,
          });
        }
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: err instanceof Error ? err.message : "Tool execution error",
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });

    if (resp.stop_reason !== "tool_use") break;
    if (proposedConfig) break;
  }

  if (!proposedConfig) {
    return {
      ok: false,
      error: "L'AI n'a pas proposé de widget. Reformule ta demande.",
    };
  }

  const { data: rows, error: sqlErr } = await admin.rpc("run_readonly_query", {
    query_sql: proposedConfig.query.sql,
  });
  if (sqlErr) {
    return { ok: false, error: `Erreur SQL : ${sqlErr.message}` };
  }
  const arr = rows as Array<Record<string, unknown>>;
  if (!Array.isArray(arr)) {
    return { ok: false, error: "Réponse SQL invalide" };
  }

  const extracted = extractData(proposedConfig, arr);
  if ("error" in extracted) {
    return { ok: false, error: extracted.error };
  }

  return {
    ok: true,
    config: proposedConfig,
    data: extracted,
    explanation: lastText || "Widget généré.",
    tokens: { input: totalIn, output: totalOut },
  };
}
