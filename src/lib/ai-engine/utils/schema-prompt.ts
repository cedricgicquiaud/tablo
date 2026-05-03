/**
 * Helper formatage schema cache → markdown injectable dans le user prompt.
 *
 * Phase 17.1 Cycle C : fast-path schema. Quand le cache est utilisable,
 * on injecte le schema directement dans le prompt utilisateur et on
 * retire `list_tables` + `inspect_table` de TOOLS exposés au LLM. L'IA
 * peut alors écrire le SQL en 1-2 turns au lieu de 4-5 (RNF2 < 3s).
 *
 * Format markdown choisi pour lisibilité LLM (les modèles sont entraînés
 * sur du markdown). Inclut top_values pour résoudre R23 (enums réelles).
 */

import type { SchemaCacheEntry, ColumnProfile } from "../schema-cache/types";

/**
 * Indique si un cache schema est exploitable pour le fast-path.
 *
 * Conditions :
 * - cache non-null
 * - status `ok` ou `partial` (au moins quelques tables OK)
 * - au moins 1 table avec ≥ 1 colonne
 *
 * Si false → fallback sur les tools list_tables/inspect_table classiques.
 */
export function isSchemaCacheUsable(cache: SchemaCacheEntry | null): boolean {
  if (!cache) return false;
  if (cache.status === "failed" || cache.status === "not_applicable") return false;
  const tablesWithColumns = cache.tables.filter((t) => t.columns.length > 0);
  return tablesWithColumns.length > 0;
}

function formatColumn(col: ColumnProfile): string {
  const parts: string[] = [`\`${col.name}\` ${col.type}`];
  if (!col.nullable) parts.push("NOT NULL");

  if (col.top_values && col.top_values.length > 0) {
    const values = col.top_values
      .slice(0, 5)
      .map((tv) => JSON.stringify(tv.value))
      .join(", ");
    parts.push(`valeurs : ${values}`);
  } else if (col.min !== undefined && col.max !== undefined) {
    parts.push(`min=${JSON.stringify(col.min)}, max=${JSON.stringify(col.max)}`);
  }

  return `- ${parts.join(" — ")}`;
}

/**
 * Sérialise un SchemaCacheEntry en markdown injectable.
 *
 * Structure produite :
 * ```
 * ## Schema disponible
 * (status: ok, synced 2026-05-03)
 *
 * ### orders (2300 rows)
 * - `id` uuid NOT NULL
 * - `status` text NOT NULL — valeurs : "paid", "shipped", ...
 * ...
 *
 * ### customers (800 rows)
 * ...
 * ```
 */
export function formatSchemaForPrompt(cache: SchemaCacheEntry): string {
  const lines: string[] = [];
  lines.push("## Schema disponible");
  lines.push(
    `(status: ${cache.status}${
      cache.partial_tables ? `, tables manquantes : ${cache.partial_tables.join(", ")}` : ""
    })`,
  );
  lines.push("");

  for (const table of cache.tables) {
    if (table.columns.length === 0) continue;
    lines.push(`### ${table.name} (${table.row_count} rows)`);
    for (const col of table.columns) {
      lines.push(formatColumn(col));
    }
    lines.push("");
  }

  return lines.join("\n");
}
