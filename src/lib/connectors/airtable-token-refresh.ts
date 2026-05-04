/**
 * Refresh logic Airtable — Phase 14.5 A.6.
 *
 * Pattern pure logic + DI (4ème occurrence règle .claude/rules/02-architecture.md) :
 *  - `getValidAirtableAccessTokenWithDeps(connectionId, deps)` : pure logic
 *    testable avec deps mockés (fetchConnection, updateConnection, refresh, encrypt/decrypt).
 *  - `getValidAirtableAccessToken(connectionId)` : wrapper qui assemble les
 *    vraies deps (Supabase admin, env vars, refreshAccessToken from oauth.ts).
 *
 * Spécificité Airtable vs Supabase (token-refresh.ts P14.1) :
 *  - `expires_at` stocké en `number` (Date.now() ms) plutôt qu'ISO string —
 *    plus simple à manipuler côté pure logic.
 *  - `refresh_token` est SINGLE-USE → chaque refresh retourne un nouveau
 *    refresh_token qu'il FAUT persister, sinon next refresh échouera (R11).
 *  - Mutex en mémoire par connectionId pour sérialiser refresh parallèles (R12).
 *
 * Status='expired' est mark si refresh fail → user doit re-OAuth (R13, E9).
 */

import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import {
  refreshAccessToken as refreshAirtableTokens,
  type AirtableTokenResponse,
} from "./airtable/oauth";

const REFRESH_THRESHOLD_MS = 60_000;

export function shouldRefresh(expiresAt: number): boolean {
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt - Date.now() < REFRESH_THRESHOLD_MS;
}

export type AirtableConnectionConfig = {
  base_id: string;
  base_name: string;
  /** access_token chiffré AES-256-GCM (string base64). */
  access_token: string;
  /** refresh_token chiffré AES-256-GCM. */
  refresh_token: string;
  /** Timestamp ms d'expiration du access_token. */
  expires_at: number;
  scope: string;
  status: "active" | "expired";
};

export type AirtableTokenRefreshDeps = {
  /** Lit la connection depuis la DB (admin, RLS bypassé). */
  fetchConnection: (
    connectionId: string,
  ) => Promise<AirtableConnectionConfig | null>;
  /** Persiste la nouvelle config_jsonb (rotation refresh_token + expires_at). */
  updateConnection: (
    connectionId: string,
    config: AirtableConnectionConfig,
  ) => Promise<void>;
  /** Decrypt token (AES-256-GCM via @/lib/crypto/encryption). */
  decryptToken: (encrypted: string) => string;
  /** Encrypt token. */
  encryptToken: (plain: string) => string;
  /** Effectue le POST /oauth2/v1/token grant_type=refresh_token. */
  refreshAccessToken: (opts: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }) => Promise<AirtableTokenResponse>;
  clientId: string;
  clientSecret: string;
};

const refreshing = new Map<string, Promise<string>>();

/**
 * Pure logic refresh : retourne un access_token valide pour `connectionId`.
 * Si proche expiration ou expiré → refresh + persist nouveau refresh_token.
 *
 * Le token retourné est TOUJOURS en clair (déchiffré ou frais via refresh) —
 * le caller (registry → AirtableDataSource) doit utiliser tel quel pour
 * Bearer auth. Le chiffrement DB est interne (encryptToken/decryptToken
 * via deps).
 */
export async function getValidAirtableAccessTokenWithDeps(
  connectionId: string,
  deps: AirtableTokenRefreshDeps,
): Promise<string> {
  // R12 — mutex parallèle : si déjà en cours pour cette connection, await celui-là
  if (refreshing.has(connectionId)) {
    return refreshing.get(connectionId)!;
  }

  const promise = doRefresh(connectionId, deps);
  refreshing.set(connectionId, promise);
  try {
    return await promise;
  } finally {
    refreshing.delete(connectionId);
  }
}

async function doRefresh(
  connectionId: string,
  deps: AirtableTokenRefreshDeps,
): Promise<string> {
  const config = await deps.fetchConnection(connectionId);
  if (!config) {
    throw new Error(`Connection ${connectionId} introuvable`);
  }

  // E9 — déjà marqué expired → user doit re-OAuth
  if (config.status === "expired") {
    throw new Error("Connection expirée — Reconnecter Airtable");
  }

  // R10 — pas besoin refresh si pas proche expiration
  if (!shouldRefresh(config.expires_at)) {
    return deps.decryptToken(config.access_token);
  }

  // R10 + R11 — refresh + rotation
  let tokens: AirtableTokenResponse;
  try {
    tokens = await deps.refreshAccessToken({
      refreshToken: deps.decryptToken(config.refresh_token),
      clientId: deps.clientId,
      clientSecret: deps.clientSecret,
    });
  } catch (err) {
    // R13 + E10 — refresh fail → mark expired + throw clair
    const expiredConfig: AirtableConnectionConfig = {
      ...config,
      status: "expired",
    };
    await deps.updateConnection(connectionId, expiredConfig);
    throw new Error(
      `Refresh échoué : ${err instanceof Error ? err.message : "unknown"} — Reconnecter Airtable`,
    );
  }

  // Persist nouvelle config (rotation refresh_token CRITIQUE — single-use)
  const newConfig: AirtableConnectionConfig = {
    base_id: config.base_id,
    base_name: config.base_name,
    access_token: deps.encryptToken(tokens.access_token),
    refresh_token: deps.encryptToken(tokens.refresh_token),
    expires_at: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
    status: "active",
  };
  await deps.updateConnection(connectionId, newConfig);

  return tokens.access_token;
}

/* -------------------------------------------------------------------------- */
/*                  Wrapper : assemble vraies deps                            */
/* -------------------------------------------------------------------------- */

/**
 * Wrapper Server Component / Server Action : assemble les vraies deps Supabase
 * + env + refreshAccessToken Airtable, et appelle la pure logic.
 *
 * À utiliser depuis :
 *  - `registry.ts` (case "airtable") pour fournir un access_token frais à
 *    l'AirtableDataSource à chaque construction.
 */
export async function getValidAirtableAccessToken(
  connectionId: string,
): Promise<string> {
  const clientId = process.env.AIRTABLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.AIRTABLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("OAuth Airtable non configuré (env vars manquantes)");
  }

  const admin = createSupabaseAdminClient();

  return getValidAirtableAccessTokenWithDeps(connectionId, {
    fetchConnection: async (id) => {
      const { data, error } = await admin
        .from("connections")
        .select("kind, config_jsonb")
        .eq("id", id)
        .single();
      if (error || !data) return null;
      if (data.kind !== "airtable") {
        throw new Error(`Connection ${id} n'est pas de kind='airtable'`);
      }
      return data.config_jsonb as unknown as AirtableConnectionConfig;
    },
    updateConnection: async (id, config) => {
      await admin
        .from("connections")
        .update({ config_jsonb: config as unknown as Json })
        .eq("id", id);
    },
    decryptToken: decrypt,
    encryptToken: encrypt,
    refreshAccessToken: refreshAirtableTokens,
    clientId,
    clientSecret,
  });
}
