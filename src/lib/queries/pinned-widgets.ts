import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractData, type WidgetData } from "@/lib/ai/extract-preview";
import { WidgetSchema, type WidgetConfig } from "@/lib/ai/widget-schema";
import type { DashboardClient } from "@/lib/supabase/types";

export type WidgetPositionStored = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PinnedWidget = {
  id: string;
  config: WidgetConfig;
  data: WidgetData | null;
  error: string | null;
  position: WidgetPositionStored | null;
};

function parsePosition(raw: unknown): WidgetPositionStored | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.w);
  const h = Number(o.h);
  if ([x, y, w, h].some(Number.isNaN)) return null;
  return { x, y, w, h };
}

export async function listPinnedWidgets(
  client: DashboardClient,
  dashboardId: string,
): Promise<PinnedWidget[]> {
  const { data, error } = await client
    .from("widgets")
    .select("id, config_jsonb, position_jsonb")
    .eq("dashboard_id", dashboardId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const admin = createSupabaseAdminClient();
  const results = await Promise.all(
    (data ?? []).map(async (row) => {
      const position = parsePosition(row.position_jsonb);
      const parsed = WidgetSchema.safeParse(row.config_jsonb);
      if (!parsed.success) {
        return {
          id: row.id,
          config: row.config_jsonb as WidgetConfig,
          data: null,
          error: "Config invalide",
          position,
        };
      }
      const config = parsed.data;
      const { data: rows, error: sqlErr } = await admin.rpc("run_readonly_query", {
        query_sql: config.query.sql,
      });
      if (sqlErr) {
        return { id: row.id, config, data: null, error: sqlErr.message, position };
      }
      const arr = rows as Array<Record<string, unknown>>;
      if (!Array.isArray(arr)) {
        return { id: row.id, config, data: null, error: "Réponse SQL invalide", position };
      }
      const extracted = extractData(config, arr);
      if ("error" in extracted) {
        return { id: row.id, config, data: null, error: extracted.error, position };
      }
      return { id: row.id, config, data: extracted, error: null, position };
    }),
  );
  return results;
}
