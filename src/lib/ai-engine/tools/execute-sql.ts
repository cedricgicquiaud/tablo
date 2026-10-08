/**
 * Tool execute_sql — Phase 17 cycle C T3.2.
 *
 * Permet à l'agent de tester ses requêtes SQL avant de proposer un widget
 * (R30, principe Nao adapté à notre stack TS).
 *
 * Garde-fous (B5, R31, R32, R33, R34, R36) :
 * 1. Validation read-only via validateReadOnlySql existant Cadran
 *    (pas de doublon avec un nouveau validateur Nao).
 * 2. LIMIT 100 injecté si absent (R32, helper sql-limit).
 * 3. Truncate à 5000 chars JSON (R33, helper sql-truncate, JSON valide).
 * 4. Erreur SQL DB → is_error: true tool_result (R34, l'IA peut corriger).
 * 5. Audit insert dans ai_engine_audit avec workspace_id, connection_id,
 *    sql tronqué, rows_count, duration_ms, status (R36).
 */

import { validateReadOnlySql } from "@/lib/connectors/sql-validation";
import { appendLimitIfMissing } from "../utils/sql-limit";
import { truncateJsonResult } from "../utils/sql-truncate";
import { logAuditEntry } from "../audit/log";
import type { ToolContext, ToolResult } from "../types/tool";

const LIMIT_MAX = 100;
const TRUNCATE_MAX_CHARS = 5000;

export type ExecuteSqlInput = { sql_query: string };

export async function executeSql(
  input: ExecuteSqlInput,
  context: ToolContext,
): Promise<ToolResult> {
  const start = Date.now();
  const sql = input.sql_query;

  // 1. Validation read-only (B5 — réutilise validateReadOnlySql existant)
  try {
    validateReadOnlySql(sql);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SQL non autorisé";
    await logAuditEntry({
      workspaceId: context.workspaceId,
      connectionId: context.connectionId,
      tool: "execute_sql",
      sqlTruncated: sql,
      durationMs: Date.now() - start,
      status: "rejected",
      errorMessage: msg,
    });
    return { content: `SQL non autorisé : ${msg}`, is_error: true };
  }

  // 2. LIMIT injection (R32)
  const sqlWithLimit = appendLimitIfMissing(sql, LIMIT_MAX);

  // 3. Exécution via DataSource
  let rows: Array<Record<string, unknown>>;
  try {
    rows = await context.dataSource.runQuery(sqlWithLimit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SQL execution error";
    await logAuditEntry({
      workspaceId: context.workspaceId,
      connectionId: context.connectionId,
      tool: "execute_sql",
      sqlTruncated: sqlWithLimit,
      durationMs: Date.now() - start,
      status: "error",
      errorMessage: msg,
    });
    return { content: `Erreur SQL : ${msg}`, is_error: true };
  }

  // 4. Truncate JSON (R33, B4 — JSON valide garanti)
  const truncated = truncateJsonResult(rows, TRUNCATE_MAX_CHARS);

  // 5. Audit log
  await logAuditEntry({
    workspaceId: context.workspaceId,
    connectionId: context.connectionId,
    tool: "execute_sql",
    sqlTruncated: sqlWithLimit,
    rowsCount: rows.length,
    durationMs: Date.now() - start,
    status: truncated._truncated ? "truncated" : "ok",
  });

  return {
    content: JSON.stringify(truncated),
    is_error: false,
  };
}
