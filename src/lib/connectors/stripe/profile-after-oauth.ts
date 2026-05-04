/**
 * Pure logic + DI : profile une connection Stripe user-owned post-OAuth
 * et persiste le schema cache. Appelé via `after()` côté route callback.
 *
 * Pattern issu de `.claude/rules/02-architecture.md` : sépare la pure logic
 * (testable avec deps mockés légers) du wrapper Server qui assemble les
 * vraies deps (Supabase admin, decrypt, Stripe SDK).
 */

import type { SchemaCacheEntry } from "../../ai-engine/schema-cache/types";
import type { DataSource } from "../types";

export type ProfileAfterOAuthDeps = {
  /** Decrypt l'access_token depuis sa version chiffrée AES-256-GCM stockée en DB. */
  decryptToken: (encrypted: string) => string;
  /** Construit un DataSource Stripe à partir d'un access_token décrypté. */
  buildDataSource: (accessToken: string) => DataSource;
  /** Profile la DataSource (list_tables + inspect_table → schema cache). */
  profileConnection: (ds: DataSource) => Promise<SchemaCacheEntry>;
  /** Persiste le schema cache + synced_at sur la connection en DB. */
  saveSchemaCache: (
    connectionId: string,
    cache: SchemaCacheEntry,
  ) => Promise<void>;
  /** Logger d'erreur pour visibilité fire-and-forget. */
  logWarn?: (message: string, err: unknown) => void;
};

export type ProfileAfterOAuthInput = {
  connectionId: string;
  encryptedAccessToken: string;
};

export async function runProfileConnectionAfterOAuth(
  input: ProfileAfterOAuthInput,
  deps: ProfileAfterOAuthDeps,
): Promise<void> {
  const { connectionId, encryptedAccessToken } = input;
  const logWarn = deps.logWarn ?? defaultLogWarn;

  try {
    const accessToken = deps.decryptToken(encryptedAccessToken);
    const dataSource = deps.buildDataSource(accessToken);
    const cache = await deps.profileConnection(dataSource);
    await deps.saveSchemaCache(connectionId, cache);
  } catch (err) {
    logWarn(
      `[OAuth Stripe callback] profileConnection failed for ${connectionId}:`,
      err,
    );
  }
}

function defaultLogWarn(message: string, err: unknown): void {
  console.warn(message, err);
}
