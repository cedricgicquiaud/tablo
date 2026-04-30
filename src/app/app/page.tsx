import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyWorkspace, listDashboards } from "@/lib/queries/pinpoint";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SectionLabel } from "@/components/section-label";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const workspace = await getMyWorkspace(supabase);
  const dashboards = workspace ? await listDashboards(supabase, workspace.id) : [];

  // Si déjà des dashboards, redirige vers le plus récent (UX classique).
  if (dashboards.length > 0) {
    redirect(`/app/dashboards/${dashboards[0].id}`);
  }

  const userName = user?.email?.split("@")[0] ?? "vous";

  return (
    <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col px-4 py-6 sm:px-7 sm:py-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">
        WORKSPACE / GETTING STARTED
      </div>
      <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[var(--ink)] sm:text-[36px]">
        Bonjour <span style={{ color: "var(--accent)" }}>{userName}</span>.
      </h1>
      <p className="mt-3 max-w-prose text-[14px] text-[var(--ink-2)]">
        Crée ton premier dashboard depuis la barre latérale, puis demande à
        l&apos;IA de générer un widget en français.
      </p>

      <SectionLabel label="EXEMPLES" right="copie-colle dans le chat" />
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          "mon revenu de ce mois",
          "évolution sur 12 mois",
          "répartition par catégorie",
        ].map((q) => (
          <div
            key={q}
            className="rounded-[var(--radius-md)] border p-3 text-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--line)",
              color: "var(--ink-2)",
            }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
              ASK
            </span>
            <p className="mt-1.5">&quot;{q}&quot;</p>
          </div>
        ))}
      </div>
    </main>
  );
}
