/**
 * Résolution DataSource pour runAgent — Phase 17 cycle A T1.5.
 *
 * Port du helper `loadDataSource()` legacy depuis
 * `src/lib/ai/generate-widget.ts:17-36`.
 *
 * Si `connectionId` fourni → fetch via admin client (l'IDOR guard est
 * fait en amont dans le Route Handler avec le SSR client RLS-scoped).
 * Sinon → DataSource demo.
 *
 * Réutilisé par runAgent (`src/lib/ai-engine/index.ts`).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDataSource, getDemoDataSource } from "@/lib/connectors/registry";
import type { Connection, DataSource } from "@/lib/connectors/types";

export async function loadDataSource(connectionId: string | undefined): Promise<DataSource> {
  if (!connectionId) return getDemoDataSource();

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("id, workspace_id, name, kind, config_jsonb")
    .eq("id", connectionId)
    .single();

  if (error || !data) {
    throw new Error(`Connection ${connectionId} introuvable`);
  }

  const conn: Connection = {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    kind: data.kind as Connection["kind"],
    configJsonb: data.config_jsonb as Record<string, unknown>,
  };
  return getDataSource(conn);
}
