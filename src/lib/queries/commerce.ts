import type { DashboardClient } from "@/lib/supabase/types";

export type RevenueKpi = {
  currentCents: number;
  previousCents: number;
  deltaPct: number;
  sparklineCents: number[];
};

export type OrdersKpi = {
  count: number;
  deltaPct: number;
  dailyCents: number[];
};

export type BasketKpi = {
  avgCents: number;
  deltaPct: number;
};

export type TargetProgress = {
  currentCents: number;
  targetCents: number;
  pct: number;
  onlineCents: number;
  storeCents: number;
};

export type RevenueMonthlyPoint = {
  month: Date;
  revenueCents: number;
};

export type RevenueByCategoryPoint = {
  category: string;
  revenueCents: number;
};

export type TargetVsActualPoint = {
  category: string;
  actualCents: number;
  targetCents: number;
};

export type HourDowCell = {
  dow: number;
  hourBucket: number;
  ordersCount: number;
};

export type FunnelStep = {
  step: string;
  stepOrder: number;
  count: number;
};

export type ShipmentHubStats = {
  hub: string;
  inTransit: number;
  delivered: number;
  total: number;
};

export type CountryRanking = {
  country: string;
  revenueCents: number;
  deltaPct: number;
};

export async function getRevenueKpi(client: DashboardClient): Promise<RevenueKpi> {
  const { data, error } = await client.rpc("revenue_kpi").single();
  if (error) throw new Error(error.message);
  return {
    currentCents: data.current_cents,
    previousCents: data.previous_cents,
    deltaPct: data.delta_pct,
    sparklineCents: data.sparkline_cents,
  };
}

export async function getOrdersKpi(
  client: DashboardClient,
  days = 7,
): Promise<OrdersKpi> {
  const { data, error } = await client.rpc("orders_kpi", { days }).single();
  if (error) throw new Error(error.message);
  return {
    count: data.count,
    deltaPct: data.delta_pct,
    dailyCents: data.daily_cents,
  };
}

export async function getBasketKpi(client: DashboardClient): Promise<BasketKpi> {
  const { data, error } = await client.rpc("basket_kpi").single();
  if (error) throw new Error(error.message);
  return {
    avgCents: data.avg_cents,
    deltaPct: data.delta_pct,
  };
}

export async function getTargetProgress(
  client: DashboardClient,
): Promise<TargetProgress> {
  const { data, error } = await client.rpc("target_progress").single();
  if (error) throw new Error(error.message);
  return {
    currentCents: data.current_cents,
    targetCents: data.target_cents,
    pct: data.pct,
    onlineCents: data.online_cents,
    storeCents: data.store_cents,
  };
}

export async function getRevenueMonthly(
  client: DashboardClient,
  months = 12,
): Promise<RevenueMonthlyPoint[]> {
  const { data, error } = await client.rpc("revenue_monthly", { months });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    month: new Date(row.month),
    revenueCents: row.revenue_cents,
  }));
}

export async function getRevenueByCategory(
  client: DashboardClient,
): Promise<RevenueByCategoryPoint[]> {
  const { data, error } = await client.rpc("revenue_by_category");
  if (error) throw new Error(error.message);
  return data.map((row) => ({ category: row.category, revenueCents: row.revenue_cents }));
}

export async function getTargetVsActualByCategory(
  client: DashboardClient,
): Promise<TargetVsActualPoint[]> {
  const { data, error } = await client.rpc("target_vs_actual_by_category");
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    category: row.category,
    actualCents: row.actual_cents,
    targetCents: row.target_cents,
  }));
}

export async function getOrdersByHourDow(
  client: DashboardClient,
  days = 90,
): Promise<HourDowCell[]> {
  const { data, error } = await client.rpc("orders_by_hour_dow", { days });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    dow: row.dow,
    hourBucket: row.hour_bucket,
    ordersCount: row.orders_count,
  }));
}

export async function getOrdersFunnel(
  client: DashboardClient,
  days = 30,
): Promise<FunnelStep[]> {
  const { data, error } = await client.rpc("orders_funnel", { days });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    step: row.step,
    stepOrder: row.step_order,
    count: row.count,
  }));
}

export async function getShipmentsByHub(
  client: DashboardClient,
): Promise<ShipmentHubStats[]> {
  const { data, error } = await client.rpc("shipments_by_hub");
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    hub: row.hub,
    inTransit: row.in_transit,
    delivered: row.delivered,
    total: row.total,
  }));
}

export async function getTopCountries(
  client: DashboardClient,
  limit = 5,
): Promise<CountryRanking[]> {
  const { data, error } = await client.rpc("top_countries", { limit_n: limit });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    country: row.country,
    revenueCents: row.revenue_cents,
    deltaPct: Number(row.delta_pct),
  }));
}
