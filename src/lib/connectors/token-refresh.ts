import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { refreshAccessToken } from "./oauth-supabase-api";

const REFRESH_THRESHOLD_MS = 60_000;

// Logique pure : faut-il rafraîchir l'access_token ?
export function shouldRefresh(expiresAt: string): boolean {
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return true;
  return t - Date.now() < REFRESH_THRESHOLD_MS;
}

// Mutex en mémoire pour sérialiser les refresh par connection_id (R11 light).
const refreshing = new Map<string, Promise<string>>();

type SupabaseConnectionConfig = {
  project_ref: string;
  project_url: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  expires_at: string;
  status?: "active" | "expired";
};

// Récupère un access_token valide pour une connexion 'supabase'. Refresh si nécessaire.
// Marque la connexion comme 'expired' si le refresh échoue (R10).
export async function getValidAccessToken(connectionId: string): Promise<string> {
  if (refreshing.has(connectionId)) {
    return refreshing.get(connectionId)!;
  }

  const promise = (async () => {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("connections")
      .select("id, kind, config_jsonb")
      .eq("id", connectionId)
      .single();
    if (error || !data) {
      throw new Error(`Connection ${connectionId} introuvable`);
    }
    if (data.kind !== "supabase") {
      throw new Error(`Connection ${connectionId} n'est pas de kind='supabase'`);
    }
    const config = data.config_jsonb as SupabaseConnectionConfig;
    if (config.status === "expired") {
      throw new Error("Connection expirée — reconnecter Supabase");
    }
    if (!shouldRefresh(config.expires_at)) {
      return decrypt(config.access_token_encrypted);
    }

    const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("OAuth Supabase non configuré (env vars manquantes)");
    }

    let tokens;
    try {
      tokens = await refreshAccessToken({
        refreshToken: decrypt(config.refresh_token_encrypted),
        clientId,
        clientSecret,
      });
    } catch (e) {
      // Refresh échoué : marquer la connexion expired (R10).
      const expiredConfig: SupabaseConnectionConfig = { ...config, status: "expired" };
      await admin
        .from("connections")
        .update({ config_jsonb: expiredConfig })
        .eq("id", connectionId);
      throw new Error(
        `Refresh échoué : ${e instanceof Error ? e.message : "unknown"} — reconnecter Supabase`,
      );
    }

    const newConfig: SupabaseConnectionConfig = {
      project_ref: config.project_ref,
      project_url: config.project_url,
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      status: "active",
    };
    await admin
      .from("connections")
      .update({ config_jsonb: newConfig })
      .eq("id", connectionId);

    return tokens.access_token;
  })();

  refreshing.set(connectionId, promise);
  try {
    return await promise;
  } finally {
    refreshing.delete(connectionId);
  }
}
