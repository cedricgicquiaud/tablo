import { getCurrentUser } from "@/lib/auth/current-user";
import { signOut } from "@/app/login/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyWorkspace, listDashboards } from "@/lib/queries/pinpoint";
import { TweaksToggle } from "@/components/tweaks-toggle";
import { NewDashboardForm } from "@/app/app/new-dashboard-form";
import { DashboardLinks } from "./dashboard-links";

export async function Sidebar() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const workspace = await getMyWorkspace(supabase);
  const dashboards = workspace ? await listDashboards(supabase, workspace.id) : [];

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] flex-shrink-0 flex-col gap-3 border-r border-[var(--line)] bg-[var(--surface-2)] px-4 py-5">
      {/* Logo + workspace */}
      <div className="flex items-center gap-2 px-2">
        <div
          className="grid h-8 w-8 place-items-center rounded-md text-[var(--bg)]"
          style={{ background: "var(--accent)" }}
        >
          <span className="text-sm font-bold">P</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-[var(--ink)]">Pinpoint</span>
          <span className="text-[11px] text-[var(--ink-3)]">
            {workspace?.name ?? "Workspace"}
          </span>
        </div>
      </div>

      {/* Liste dashboards + form nouveau */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <div className="mt-2 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
          Dashboards
        </div>
        <DashboardLinks dashboards={dashboards} />

        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)]">
            Nouveau
          </div>
          <NewDashboardForm compact />
        </div>
      </nav>

      {/* User + tweaks + signout */}
      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-3">
        <TweaksToggle compact />
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[12px] text-[var(--ink-2)] hover:bg-[var(--surface-3)]"
          >
            <span className="truncate" title={user?.email ?? ""}>
              {user?.email}
            </span>
            <span className="text-[10px] text-[var(--ink-3)]">↪</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
