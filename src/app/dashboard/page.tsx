import { getCurrentUser } from "@/lib/auth/current-user";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Signed in as {user?.email}
          </p>
        </div>
        <SignOutButton />
      </header>
      <section className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Widgets seront branchés en Phase 04 (KPI cards + table) et Phase 05 (charts).
      </section>
    </main>
  );
}
