import type { DashboardClient } from "@/lib/supabase/types";

export type KpiSnapshot = {
  mrrCents: number;
  churnPct: number;
  activeUsers: number;
  arpuCents: number;
};

export type MrrMonthlyPoint = {
  month: Date;
  mrrCents: number;
};

export type SignupsWeeklyPoint = {
  weekStart: Date;
  signupsCount: number;
};

export type PlanDistributionPoint = {
  plan: string;
  usersCount: number;
};

export type RecentUser = {
  id: string;
  email: string;
  fullName: string;
  country: string;
  createdAt: Date;
  plan: string;
  mrrCents: number;
};

export async function getKpiSnapshot(client: DashboardClient): Promise<KpiSnapshot> {
  const { data, error } = await client.rpc("kpi_snapshot").single();
  if (error) throw new Error(error.message);
  return {
    mrrCents: data.mrr_cents,
    churnPct: data.churn_pct,
    activeUsers: data.active_users,
    arpuCents: data.arpu_cents,
  };
}

export async function getMrrMonthly(
  client: DashboardClient,
  months = 12,
): Promise<MrrMonthlyPoint[]> {
  const { data, error } = await client.rpc("mrr_monthly", { months });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    month: new Date(row.month),
    mrrCents: row.mrr_cents,
  }));
}

export async function getSignupsWeekly(
  client: DashboardClient,
  weeks = 12,
): Promise<SignupsWeeklyPoint[]> {
  const { data, error } = await client.rpc("signups_weekly", { weeks });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    weekStart: new Date(row.week_start),
    signupsCount: row.signups_count,
  }));
}

export async function getPlanDistribution(
  client: DashboardClient,
): Promise<PlanDistributionPoint[]> {
  const { data, error } = await client.rpc("plan_distribution");
  if (error) throw new Error(error.message);
  return data.map((row) => ({ plan: row.plan, usersCount: row.users_count }));
}

export async function getRecentUsers(
  client: DashboardClient,
  limit = 10,
): Promise<RecentUser[]> {
  const { data, error } = await client.rpc("recent_users", { limit_n: limit });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    country: row.country,
    createdAt: new Date(row.created_at),
    plan: row.plan,
    mrrCents: row.mrr_cents,
  }));
}
