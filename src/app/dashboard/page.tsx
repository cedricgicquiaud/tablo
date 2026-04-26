import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getBasketKpi,
  getOrdersKpi,
  getRevenueKpi,
  getTargetProgress,
} from "@/lib/queries/commerce";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { TweaksToggle } from "@/components/tweaks-toggle";
import { KpiBars } from "@/components/widgets/kpi-bars";
import { KpiEditorial } from "@/components/widgets/kpi-editorial";
import { KpiRing } from "@/components/widgets/kpi-ring";
import { KpiTypo } from "@/components/widgets/kpi-typo";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  const [revenue, orders, basket, target] = await Promise.all([
    getRevenueKpi(supabase),
    getOrdersKpi(supabase, 7),
    getBasketKpi(supabase),
    getTargetProgress(supabase),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-6 px-7 pt-[70px] pb-10">
      <header className="flex items-center justify-between gap-4">
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

      <section
        className="border border-dashed border-[var(--line-2)] p-10 text-center text-sm text-[var(--ink-3)]"
        style={{ borderRadius: "var(--radius)" }}
      >
        Widgets W05-W16 (charts + advanced + lists) seront branchés en Phases 08-10.
      </section>
    </main>
  );
}
