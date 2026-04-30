import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { signOut } from "@/app/login/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getMyWorkspace,
  listDashboards,
  listWorkspaceConnections,
} from "@/lib/queries/pinpoint";
import { TabloWordmark } from "@/components/tablo-wordmark";
import { NewDashboardForm } from "@/app/app/new-dashboard-form";
import { DashboardLinks } from "./dashboard-links";
import { ConnectionsList } from "./connections-list";

export async function Sidebar() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const workspace = await getMyWorkspace(supabase);
  const [dashboards, connections] = workspace
    ? await Promise.all([
        listDashboards(supabase, workspace.id),
        listWorkspaceConnections(supabase, workspace.id),
      ])
    : [[], []];
  const workspaceName = workspace?.name ?? "Workspace";
  const workspaceInitial = workspaceName.charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 flex h-screen w-[230px] flex-shrink-0 flex-col gap-3.5 border-r border-[var(--line)] bg-[var(--bg)] px-3 py-4">
      {/* Wordmark Tablo */}
      <div className="px-1">
        <TabloWordmark size="md" />
      </div>

      {/* Workspace pill — pattern Tablo (avatar lettre + nom + chevron) */}
      <div
        className="flex items-center gap-2 rounded-md border px-2 py-1.5"
        style={{
          background: "var(--surface-2)",
          borderColor: "var(--line)",
        }}
      >
        <div
          className="grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-[4px] text-[10px] font-semibold"
          style={{
            background: "var(--ink)",
            color: "var(--bg)",
          }}
        >
          {workspaceInitial}
        </div>
        <div className="truncate text-[12px] font-medium text-[var(--ink)]">
          {workspaceName}
        </div>
        <ChevronDownIcon />
      </div>

      {/* DASHBOARDS + Connexions + Nouveau */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <div className="px-2 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ink-3)]">
          Dashboards
        </div>
        <DashboardLinks dashboards={dashboards} />

        {/* NOUVEAU — création */}
        <div className="mt-3">
          <div className="mb-1.5 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ink-3)]">
            Nouveau
          </div>
          <NewDashboardForm compact />
        </div>

        {/* CONNEXIONS — sources OAuth */}
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          <div className="mb-1.5 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ink-3)]">
            Connexions
          </div>
          <ConnectionsList connections={connections} />
        </div>
      </div>

      {/* Bottom — Réglages + signout */}
      <div className="flex flex-col gap-0.5 border-t border-[var(--line)] pt-2">
        <Link
          href="/app/settings/appearance"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
        >
          <span className="text-[var(--ink-3)]">
            <SettingsIcon />
          </span>
          Réglages
          <span className="ml-auto font-mono text-[10px] text-[var(--ink-3)]">
            →
          </span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
          >
            <span className="truncate" title={user?.email ?? ""}>
              {user?.email}
            </span>
            <span className="font-mono text-[10px] text-[var(--ink-3)]">↪</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-3)"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="ml-auto flex-shrink-0"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
