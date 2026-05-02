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

  // Profiling fire-and-forget (R67, B2) — Next.js 16 `after()` exécute
  // après la réponse mais dans le request lifecycle. Failure isolée :
  // la connexion reste utilisable, status='failed' enregistré dans cache.
  after(async () => {
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
      // Best-effort logging : on n'échoue pas la création de connexion
      console.warn(
        `[auto-profiling] échec pour connection ${connectionId}: ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  });

  // Cleanup : supprimer le cookie session OAuth.
  cookieStore.delete(SESSION_COOKIE);

  redirect("/app");
}
