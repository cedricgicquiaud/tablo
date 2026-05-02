/**
 * Tool list_tables — Phase 17 cycle B T2.5.
 *
 * Stratégie de lecture :
 * 1. Si cache disponible (status='ok'|'partial' frais) → format depuis cache
 * 2. Sinon → fallback `DataSource.listTables()` live (R11, I12)
 *
 * Format retour : `[{ name: string, rowCount: number }]` (R12 strict).
 */

import type { DataSource } from "@/lib/connectors/types";
import type { SchemaCacheEntry } from "../schema-cache/types";
import type { ToolResult } from "../types/tool";

export async function executeListTables(
  dataSource: DataSource,
  cache: SchemaCacheEntry | null,
): Promise<ToolResult> {
  // Cache hit : format depuis cache (pas d'appel DataSource)
  if (cache) {
    const tables = cache.tables.map((t) => ({
      name: t.name,
      rowCount: t.row_count,
    }));
    return {
      content: JSON.stringify(tables),
      is_error: false,
    };
  }

  // Cache miss : fallback DataSource live
  try {
    const tables = await dataSource.listTables();
    return {
      content: JSON.stringify(tables),
      is_error: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Schema unavailable";
    return {
      content: `Schema unavailable: ${message}`,
      is_error: true,
    };
  }
}
