import { getCurrentUser } from "@/lib/auth/current-user";
import { SignOutButton } from "@/components/sign-out-button";
import { TweaksToggle } from "@/components/tweaks-toggle";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-6 px-7 pt-[70px] pb-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--ink-3)]">
            Signed in as {user?.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TweaksToggle />
          <SignOutButton />
        </div>
      </header>
      <section
        className="border border-dashed border-[var(--line-2)] p-10 text-center text-sm text-[var(--ink-3)]"
        style={{ borderRadius: "var(--radius)" }}
      >
        Widgets W01-W16 seront branchés en Phase 07 (KPI), Phase 08 (charts),
        Phase 09 (advanced) et Phase 10 (lists).
      </section>
    </main>
  );
}
