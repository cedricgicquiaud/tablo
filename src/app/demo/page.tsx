import Link from "next/link";
import { ROUTES } from "@/lib/auth/routes";
import {
  getBasketKpi,
  getCalendarUpcoming,
  getOrdersByHourDow,
  getOrdersFunnel,
  getOrdersKpi,
  getProductsPaginated,
  getRecentActivity,
  getRevenueByCategory,
  getRevenueBySegmentMonthly,
  getRevenueKpi,
  getRevenueMonthly,
  getShipmentsByHub,
  getTargetProgress,
  getTargetVsActualByCategory,
  getTopCountries,
} from "@/lib/queries/commerce";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TweaksToggle } from "@/components/tweaks-toggle";
import { Activity } from "@/components/widgets/activity";
import { BarChartWidget } from "@/components/widgets/bar-chart";
import { Calendar } from "@/components/widgets/calendar";
import { DonutExploded } from "@/components/widgets/donut-exploded";
import { Funnel } from "@/components/widgets/funnel";
import { Gauge } from "@/components/widgets/gauge";
import { Heatmap } from "@/components/widgets/heatmap";
import { KpiBars } from "@/components/widgets/kpi-bars";
import { KpiEditorial } from "@/components/widgets/kpi-editorial";
import { KpiRing } from "@/components/widgets/kpi-ring";
import { KpiTypo } from "@/components/widgets/kpi-typo";
import { LineChartWidget } from "@/components/widgets/line-chart";
import { MapWidget } from "@/components/widgets/map";
import { ProductsTable } from "@/components/widgets/products-table";
import { Ranking } from "@/components/widgets/ranking";
import { Stacked } from "@/components/widgets/stacked";

// /demo : showroom public e-commerce. Aucune auth requise.
// Bypass RLS via service-role admin client → dataset seedé visible par tous.
export default async function DemoPage() {
  const supabase = createSupabaseAdminClient();

  const [
    revenue,
    orders,
    basket,
    target,
    monthly,
    byCategory,
    targetVsActual,
    hourDow,
    funnel,
    hubs,
    countries,
    segmentMonthly,
    calendar,
    activity,
    productsPage,
  ] = await Promise.all([
    getRevenueKpi(supabase),
    getOrdersKpi(supabase, 7),
    getBasketKpi(supabase),
    getTargetProgress(supabase),
    getRevenueMonthly(supabase, 12),
    getRevenueByCategory(supabase),
    getTargetVsActualByCategory(supabase),
    getOrdersByHourDow(supabase, 90),
    getOrdersFunnel(supabase, 30),
    getShipmentsByHub(supabase),
    getTopCountries(supabase, 5),
    getRevenueBySegmentMonthly(supabase, 6),
    getCalendarUpcoming(supabase, 4),
    getRecentActivity(supabase, 8),
    getProductsPaginated(supabase, { limit: 10 }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-4 px-7 pt-[70px] pb-10">
      <header className="mb-2 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-2)]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            Démo publique
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Showroom Tablo — E-commerce
          </h1>
          <p className="text-sm text-[var(--ink-3)]">
            Aperçu des 16 widgets sur un dataset fictif (~3000 produits, 10k commandes).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TweaksToggle />
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-[var(--radius-tag-sm)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--bg)] hover:bg-[var(--accent-2)]"
          >
            Créer mon compte
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiEditorial data={revenue} />
        <KpiBars data={orders} />
        <KpiTypo data={basket} />
        <KpiRing data={target} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <LineChartWidget data={monthly} />
        <Gauge data={target} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.2fr_1fr]">
        <DonutExploded data={byCategory} />
        <BarChartWidget data={targetVsActual} />
        <Ranking data={countries} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Heatmap data={hourDow} />
        <Funnel data={funnel} />
        <MapWidget data={hubs} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Stacked data={segmentMonthly} />
        <Calendar data={calendar} />
        <Activity data={activity} />
      </section>

      <section>
        <ProductsTable initialPage={productsPage} />
      </section>
    </main>
  );
}
