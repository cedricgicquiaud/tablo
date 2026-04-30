import { extractData, type WidgetData } from "@/lib/ai/extract-preview";
import { WidgetSchema, type WidgetConfig } from "@/lib/ai/widget-schema";
import { getDataSource, getDemoDataSource } from "@/lib/connectors/registry";
import type { Connection } from "@/lib/connectors/types";
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
  connectionId: string | null;
  connectionName: string | null;
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
    .select(
      "id, config_jsonb, position_jsonb, connection_id, connections(id, workspace_id, name, kind, config_jsonb)",
    )
    .eq("dashboard_id", dashboardId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const results = await Promise.all(
    (data ?? []).map(async (row) => {
      const position = parsePosition(row.position_jsonb);
      const parsed = WidgetSchema.safeParse(row.config_jsonb);
      const conn = row.connections as
        | {
            id: string;
            workspace_id: string;
            name: string;
            kind: string;
            config_jsonb: Record<string, unknown>;
          }
        | null;
      const connectionId = conn?.id ?? row.connection_id ?? null;
      const connectionName = conn?.name ?? null;
      if (!parsed.success) {
        return {
          id: row.id,
          config: row.config_jsonb as WidgetConfig,
          data: null,
          error: "Config invalide",
          position,
          connectionId,
          connectionName,
        };
      }
      const config = parsed.data;

      // Choix du DataSource : connexion stockée si présente, sinon fallback demo
      // (widgets antérieurs à la phase 14.1 sans connection_id).
      const ds = conn
        ? getDataSource({
            id: conn.id,
            workspaceId: conn.workspace_id,
            name: conn.name,
            kind: conn.kind as Connection["kind"],
            configJsonb: conn.config_jsonb,
          })
        : getDemoDataSource();

      try {
        const rows = await ds.runQuery(config.query.sql);
        const extracted = extractData(config, rows);
        if ("error" in extracted) {
          return {
            id: row.id,
            config,
            data: null,
            error: extracted.error,
            position,
            connectionId,
            connectionName,
          };
        }
        return {
          id: row.id,
          config,
          data: extracted,
          error: null,
          position,
          connectionId,
          connectionName,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur SQL inconnue";
        return {
          id: row.id,
          config,
          data: null,
          error: message,
          position,
          connectionId,
          connectionName,
        };
      }
    }),
  );
  return results;
}
