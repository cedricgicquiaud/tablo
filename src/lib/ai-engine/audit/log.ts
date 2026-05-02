/**
 * Audit logging des appels tools du moteur AI — Phase 17 cycle C T3.3 (R36).
 *
 * Insert via admin client (service role) dans `public.ai_engine_audit`.
 * Fire-and-forget : best-effort, le tool ne fail pas si l'audit échoue.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuditStatus = "ok" | "error" | "truncated" | "rejected";

export type AuditEntry = {
  workspaceId: string;
  connectionId?: string;
  tool: string;
  sqlTruncated?: string;
  rowsCount?: number;
  durationMs?: number;
  status: AuditStatus;
  errorMessage?: string;
};

const SQL_TRUNCATE_LEN = 500;

export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("ai_engine_audit").insert({
      workspace_id: entry.workspaceId,
      connection_id: entry.connectionId ?? null,
      tool: entry.tool,
      sql_truncated: entry.sqlTruncated
        ? entry.sqlTruncated.slice(0, SQL_TRUNCATE_LEN)
        : null,
      rows_count: entry.rowsCount ?? null,
      duration_ms: entry.durationMs ?? null,
      status: entry.status,
      error_message: entry.errorMessage ?? null,
    });
    if (error) {
      console.warn(
        `[ai-engine/audit] insert PostgrestError: ${error.code} ${error.message} (workspace=${entry.workspaceId})`,
      );
    }
  } catch (err) {
    // Best-effort : l'audit ne doit jamais faire échouer une génération
    console.warn(
      `[ai-engine/audit] insert threw: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
  // Aussi logguer le tool error en clair pour debug — visible dans terminal
  if (entry.status !== "ok" && entry.errorMessage) {
    console.warn(
      `[ai-engine/${entry.tool}] ${entry.status}: ${entry.errorMessage}`,
    );
  }
}
