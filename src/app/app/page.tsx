import { getCurrentUser } from "@/lib/auth/current-user";
import { getMyWorkspace, listDashboards } from "@/lib/queries/pinpoint";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const workspace = await getMyWorkspace(supabase);
  const dashboards = workspace ? await listDashboards(supabase, workspace.id) : [];

  // Si déjà des dashboards, redirige vers le plus récent (UX classique).
  if (dashboards.length > 0) {
    redirect(`/app/dashboards/${dashboards[0].id}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-7 py-10">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="text-5xl">📊</div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Bonjour {user?.email?.split("@")[0]}
        </h1>
        <p className="text-sm text-[var(--ink-3)]">
          Crée ton premier dashboard depuis la barre latérale, puis demande à
          l&apos;IA de générer un widget en français.
        </p>
        <p className="text-[11px] text-[var(--ink-4)]">
          Exemples : &quot;mon revenu de ce mois&quot;, &quot;évolution sur 12 mois&quot;,
          &quot;répartition par catégorie&quot;.
        </p>
      </div>
    </main>
  );
}
