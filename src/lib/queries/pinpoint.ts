import type { DashboardClient } from "@/lib/supabase/types";

export type Workspace = {
  id: string;
  name: string;
  plan: string;
  createdAt: Date;
};

export type DashboardSummary = {
  id: string;
  workspaceId: string;
  name: string;
  palette: string;
  mode: string;
  radius: string;
  customAccent: string | null;
  widgetCount: number;
  createdAt: Date;
};

export async function getMyWorkspace(client: DashboardClient): Promise<Workspace | null> {
  const { data, error } = await client
    .from("workspaces")
    .select("id, name, plan, created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    plan: data.plan,
    createdAt: new Date(data.created_at),
  };
}

export async function listDashboards(
  client: DashboardClient,
  workspaceId: string,
): Promise<DashboardSummary[]> {
  const { data, error } = await client
    .from("dashboards")
    .select("id, workspace_id, name, palette, mode, radius, custom_accent, created_at, widgets(count)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    palette: row.palette,
    mode: row.mode,
    radius: row.radius,
    customAccent: row.custom_accent,
    widgetCount: row.widgets?.[0]?.count ?? 0,
    createdAt: new Date(row.created_at),
  }));
}

export async function getDashboard(
  client: DashboardClient,
  dashboardId: string,
): Promise<DashboardSummary | null> {
  const { data, error } = await client
    .from("dashboards")
    .select("id, workspace_id, name, palette, mode, radius, custom_accent, created_at, widgets(count)")
    .eq("id", dashboardId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.name,
    palette: data.palette,
    mode: data.mode,
    radius: data.radius,
    customAccent: data.custom_accent,
    widgetCount: data.widgets?.[0]?.count ?? 0,
    createdAt: new Date(data.created_at),
  };
}
