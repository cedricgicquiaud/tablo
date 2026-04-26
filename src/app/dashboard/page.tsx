import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getBasketKpi,
  getOrdersByHourDow,
  getOrdersFunnel,
  getOrdersKpi,
  getRevenueByCategory,
  getRevenueKpi,
  getRevenueMonthly,
  getShipmentsByHub,
  getTargetProgress,
  getTargetVsActualByCategory,
  getTopCountries,
} from "@/lib/queries/commerce";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { TweaksToggle } from "@/components/tweaks-toggle";
import { BarChartWidget } from "@/components/widgets/bar-chart";
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
import { Ranking } from "@/components/widgets/ranking";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

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
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-4 px-7 pt-[70px] pb-10">
      <header className="mb-2 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Bonjour {user?.email?.split("@")[0]} 👋
          </h1>
          <p className="text-sm text-[var(--ink-3)]">
            Voici votre tableau de bord e-commerce.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TweaksToggle />
          <SignOutButton />
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

      <section
        className="border border-dashed border-[var(--line-2)] p-10 text-center text-sm text-[var(--ink-3)]"
        style={{ borderRadius: "var(--radius)" }}
      >
        Widgets W13-W16 (Calendar, Activity, Table, Stacked) seront branchés en Phase 10.
      </section>
    </main>
  );
}
