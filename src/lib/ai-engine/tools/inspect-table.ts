/**
 * Tool inspect_table — Phase 17 cycle B T2.5.
 *
 * Stratégie de lecture :
 * 1. Si cache disponible et table présente → format depuis cache (avec
 *    top_values + stats — R20, R22 résout closed_won)
 * 2. Sinon → fallback `DataSource.inspectTable()` live + 3 lignes
 *    samples (R21, parité legacy)
 * 3. Si live retourne null → is_error: true (R24)
 * 4. Si live throw → is_error: true avec message (I12)
 */

import type { DataSource } from "@/lib/connectors/types";
import type { SchemaCacheEntry, TableProfile } from "../schema-cache/types";
import type { ToolResult } from "../types/tool";

export type InspectTableInput = { table_name: string };

export async function executeInspectTable(
  dataSource: DataSource,
  cache: SchemaCacheEntry | null,
  input: InspectTableInput,
): Promise<ToolResult> {
  const tableName = input.table_name;

  // 1. Tentative cache hit
  if (cache) {
    const cached = cache.tables.find((t) => t.name === tableName);
    if (cached) {
      return {
        content: JSON.stringify(formatTableFromCache(cached)),
        is_error: false,
      };
    }
    // Cache miss sur cette table → fallback live
  }

  // 2. Fallback DataSource live
  try {
    const detail = await dataSource.inspectTable(tableName);
    if (!detail) {
      return {
        content: JSON.stringify({ error: `Table ${tableName} introuvable` }),
        is_error: true,
      };
    }
    return {
      content: JSON.stringify(detail),
      is_error: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inspect failed";
    return {
      content: `Inspect failed: ${message}`,
      is_error: true,
    };
  }
}

/**
 * Convertit un TableProfile (cache) en format compatible avec la réponse
 * legacy `TableDetail` enrichie de top_values + stats.
 *
 * Le LLM voit :
 *   { name, columns: [{ name, type, nullable, distinct_count?, top_values?, ... }], samples: [] }
 *
 * Pas de samples depuis le cache (gardés en stats agrégées). Si le LLM
 * a besoin de samples, il peut appeler execute_sql en cycle C.
 */
function formatTableFromCache(profile: TableProfile): {
  name: string;
  row_count: number;
  columns: TableProfile["columns"];
  samples: never[];
} {
  return {
    name: profile.name,
    row_count: profile.row_count,
    columns: profile.columns,
    samples: [],
  };
}
