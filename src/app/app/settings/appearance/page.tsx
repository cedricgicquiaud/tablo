import { readTweaks } from "@/lib/ui/tweaks";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { SectionLabel } from "@/components/section-label";

export const metadata = {
  title: "Réglages · Apparence",
};

export default async function AppearancePage() {
  const tweaks = await readTweaks();
  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6 sm:px-7 sm:py-8">
      <SectionLabel label="RÉGLAGES / APPARENCE" right="mode · palette · radius" />
      <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-[26px]">
        Apparence
      </h1>
      <p className="mt-1 max-w-prose text-sm text-[var(--ink-3)]">
        Personnalise l&apos;apparence de ton workspace. Les changements sont
        appliqués instantanément et conservés dans ton navigateur.
      </p>
      <div className="mt-6">
        <AppearanceForm current={tweaks} />
      </div>
    </div>
  );
}
