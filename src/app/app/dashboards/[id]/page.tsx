import { notFound } from "next/navigation";
import { getDashboard, getMyWorkspace } from "@/lib/queries/pinpoint";
import { listPinnedWidgets } from "@/lib/queries/pinned-widgets";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/pinpoint/chat-panel";
import { DraggableGrid } from "@/components/pinpoint/draggable-grid";
import { SectionLabel } from "@/components/section-label";

type Params = { id: string };

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const dashboard = await getDashboard(supabase, id);
  if (!dashboard) notFound();
  const workspace = await getMyWorkspace(supabase);
  const pinned = await listPinnedWidgets(supabase, id);

  // Date courte (e.g. "Apr 30, 2026") en français
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="flex flex-1 flex-col px-4 py-5 sm:px-7 sm:py-7">
      {/* Header narratif Tablo */}
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
        {workspace?.name ?? "Workspace"} / Dashboard
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-[26px]">
          {dashboard.name}
        </h1>
        <span className="font-mono text-[11px] text-[var(--ink-3)]">
          live · {today}
        </span>
      </div>

      {pinned.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <>
          <SectionLabel
            label="WIDGETS"
            right={`${pinned.length} épinglé${pinned.length > 1 ? "s" : ""} · glisse pour réorganiser`}
          />
          <DraggableGrid widgets={pinned} dashboardId={id} />
        </>
      )}

      <ChatPanel dashboardId={id} />
    </main>
  );
}

function DashboardEmptyState() {
  return (
    <>
      <SectionLabel label="DASHBOARD" right="vide · ajoute ton premier widget" />
      <section
        className="flex min-h-[55vh] flex-col items-center justify-center gap-3 border border-dashed p-10 text-center"
        style={{
          borderColor: "var(--line-2)",
          borderRadius: "var(--radius)",
          background: "var(--surface-2)",
        }}
      >
        <div
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{
            background: "var(--accent-4)",
            color: "var(--accent)",
          }}
          aria-hidden
        >
          <SparkleIcon />
        </div>
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
          AUCUN WIDGET ÉPINGLÉ
        </h2>
        <p className="max-w-md text-sm text-[var(--ink-2)]">
          Click sur{" "}
          <span className="font-medium text-[var(--accent)]">
            Ajouter un widget
          </span>{" "}
          en bas à droite, décris ce que tu veux voir en français,
          l&apos;IA le construit, tu l&apos;épingles.
        </p>
      </section>
    </>
  );
}

function SparkleIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4z" />
      <path d="M19 14l.7 1.8L21.5 16l-1.8.7L19 18l-.7-1.8L16.5 16l1.8-.7z" />
    </svg>
  );
}
