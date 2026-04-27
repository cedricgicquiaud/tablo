import { notFound } from "next/navigation";
import { getDashboard } from "@/lib/queries/pinpoint";
import { listPinnedWidgets } from "@/lib/queries/pinned-widgets";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/pinpoint/chat-panel";
import { DraggableGrid } from "@/components/pinpoint/draggable-grid";

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
  const pinned = await listPinnedWidgets(supabase, id);

  return (
    <main className="flex flex-1 flex-col gap-6 px-7 py-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          {dashboard.name}
        </h1>
        <p className="text-sm text-[var(--ink-3)]">
          {pinned.length} widget{pinned.length > 1 ? "s" : ""} épinglé{pinned.length > 1 ? "s" : ""}
          {pinned.length > 0 ? " · glisse pour réorganiser, redimensionne par les coins" : ""}
        </p>
      </header>

      {pinned.length === 0 ? (
        <section
          className="flex min-h-[60vh] flex-col items-center justify-center gap-3 border border-dashed border-[var(--line-2)] p-10 text-center"
          style={{ borderRadius: "var(--radius)" }}
        >
          <div className="text-4xl">✨</div>
          <h2 className="text-base font-semibold text-[var(--ink)]">
            Crée ton premier widget
          </h2>
          <p className="max-w-md text-sm text-[var(--ink-3)]">
            Click sur <span className="font-medium text-[var(--accent)]">Ajouter un widget</span>{" "}
            en bas à droite, décris ce que tu veux voir en français,
            l&apos;IA le construit, tu l&apos;épingles.
          </p>
        </section>
      ) : (
        <DraggableGrid widgets={pinned} dashboardId={id} />
      )}

      <ChatPanel dashboardId={id} />
    </main>
  );
}
