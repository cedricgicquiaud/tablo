"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { after } from "next/server";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMyWorkspace } from "@/lib/queries/pinpoint";
import type { SupabaseProject } from "@/lib/connectors/oauth-supabase-api";
import { loadDataSource } from "@/lib/ai-engine/load-data-source";
import { profileConnection } from "@/lib/ai-engine/schema-cache/populate";
import { generateStarterDashboard } from "@/lib/pinpoint/starter-dashboard";

const SESSION_COOKIE = "pinpoint_oauth_session";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  projects: SupabaseProject[];
};

export async function createConnectionFromProject(formData: FormData) {
  const projectRef = formData.get("project_ref");
  if (typeof projectRef !== "string" || !projectRef) {
    throw new Error("Project ref manquant");
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    redirect("/oauth/supabase/start");
  }

  const session = JSON.parse(decrypt(sessionCookie)) as SessionPayload;
  const project = session.projects.find((p) => p.ref === projectRef);
  if (!project) {
    throw new Error("Projet introuvable dans la session OAuth");
  }

  // Identifie le workspace de l'utilisateur courant.
  const supabase = await createSupabaseServerClient();
  const workspace = await getMyWorkspace(supabase);
  if (!workspace) throw new Error("Workspace introuvable");

  const config = {
    project_ref: project.ref,
    project_url: `https://${project.ref}.supabase.co`,
    access_token_encrypted: encrypt(session.access_token),
    refresh_token_encrypted: encrypt(session.refresh_token),
    expires_at: session.expires_at,
    status: "active" as const,
  };

  // Insert via admin (RLS-bypass) — l'isolation tenant repose sur le workspace_id récupéré ci-dessus.
  const admin = createSupabaseAdminClient();
  const { data: inserted, error } = await admin
    .from("connections")
    .insert({
      workspace_id: workspace.id,
      name: project.name,
      kind: "supabase",
      config_jsonb: config,
    })
    .select("id")
    .single();
  if (error || !inserted) throw new Error(`Insert connection: ${error?.message ?? "unknown"}`);

  const connectionId = inserted.id as string;

  // Phase 18 (R1) : créer un dashboard "Mon premier dashboard" et marquer
  // `starter_generating_at` immédiatement pour que la page `/app/dashboards/[id]`
  // affiche l'écran progress dès le redirect.
  const { data: dashInserted, error: dashErr } = await admin
    .from("dashboards")
    .insert({
      workspace_id: workspace.id,
      name: `Mon premier dashboard — ${project.name}`,
      starter_generating_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (dashErr || !dashInserted) {
    throw new Error(`Insert dashboard: ${dashErr?.message ?? "unknown"}`);
  }
  const dashboardId = dashInserted.id as string;

  // Récupère le userId pour audit (R9).
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  // Profiling + starter dashboard fire-and-forget chaînés dans un SEUL
  // `after()`. En dev mode Next.js 16, plusieurs `after()` séparés dans
  // la même Server Action ne sont pas tous exécutés (bug observé Phase 18
  // smoke testing). Chaîner garantit que le starter démarre après le
  // profiling, en bénéficiant du schema cache fast-path P17.1.
  after(async () => {
    // Phase 14.1 (R67, B2) — profiling au connect.
    try {
      const dataSource = await loadDataSource(connectionId);
      const cache = await profileConnection(dataSource);
      await admin
        .from("connections")
        .update({
          schema_cache_jsonb: cache,
          schema_synced_at: cache.synced_at,
        })
        .eq("id", connectionId);
    } catch (err) {
      console.warn(
        `[auto-profiling] échec pour connection ${connectionId}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }

    // Phase 18 (R1) — starter dashboard generation. Le pipeline a aussi
    // sa propre attente du profiling (R12), redondante mais safe si le
    // profiling ci-dessus a échoué.
    try {
      await generateStarterDashboard(connectionId, dashboardId, workspace.id, userId);
    } catch (err) {
      console.warn(
        `[starter-dashboard] échec pour dashboard ${dashboardId}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  });

  // Cleanup : supprimer le cookie session OAuth.
  cookieStore.delete(SESSION_COOKIE);

  redirect(`/app/dashboards/${dashboardId}`);
}
