"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMyWorkspace } from "@/lib/queries/pinpoint";
import type { SupabaseProject } from "@/lib/connectors/oauth-supabase-api";

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
  const { error } = await admin.from("connections").insert({
    workspace_id: workspace.id,
    name: project.name,
    kind: "supabase",
    config_jsonb: config,
  });
  if (error) throw new Error(`Insert connection: ${error.message}`);

  // Cleanup : supprimer le cookie session OAuth.
  cookieStore.delete(SESSION_COOKIE);

  redirect("/app");
}
