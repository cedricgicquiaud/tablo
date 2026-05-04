/**
 * Pure logic create-connection-from-airtable-base — Phase 14.5 A.5.
 *
 * Crée OU update une connection Airtable user-owned à partir d'une session OAuth
 * (cookie chiffré contenant tokens + bases) et du baseId choisi par l'user.
 *
 * Pattern pure logic + DI (5ème occurrence règle .claude/rules/02-architecture.md) :
 *  - `createConnectionFromAirtableBaseWithDeps(input, deps)` : pure logic testable
 *  - `actions.ts` : wrapper Server Action qui assemble les vraies deps (cookies,
 *    Supabase admin, encrypt, after, profileConnection).
 *
 * Idempotence R9 : findExistingConnection check par (workspace_id, kind, base_id)
 * → update si existe, insert sinon. Index DB : connections_airtable_base_id_idx.
 *
 * R21 : triggerAfterProfileConnection est appelé fire-and-forget pour profiler
 * la base + populate schema_cache (cohérent P14.4 helper P0.4).
 */

import type { AirtableBase } from "@/lib/connectors/airtable/meta-api";
import type { AirtableConnectionConfig } from "@/lib/connectors/airtable-token-refresh";

export type AirtableSessionPayload = {
  accessToken: string;
  refreshToken: string;
  /** Timestamp ms d'expiration (calculé côté callback à partir de tokens.expires_in). */
  expiresAt: number;
  scope: string;
  bases: AirtableBase[];
  workspaceId: string;
  userId: string;
};

export type CreateConnectionInput = {
  baseId: string;
  session: AirtableSessionPayload;
};

export type CreateConnectionResult = {
  connectionId: string;
  isReconnect: boolean;
};

export type CreateConnectionDeps = {
  /** Cherche une connection existante par (workspace_id, kind=airtable, base_id). */
  findExistingConnection: (params: {
    workspaceId: string;
    baseId: string;
  }) => Promise<string | null>;
  /** Insert nouvelle connection. Retourne le `connectionId` créé. */
  insertConnection: (params: {
    workspaceId: string;
    name: string;
    kind: "airtable";
    config: AirtableConnectionConfig;
  }) => Promise<{ id: string; isReconnect: false }>;
  /** Update les tokens d'une connection existante (rotation). */
  updateConnection: (
    connectionId: string,
    config: AirtableConnectionConfig,
  ) => Promise<void>;
  /** Encrypt token AES-256-GCM. */
  encryptToken: (plain: string) => string;
  /**
   * Trigger fire-and-forget profileConnection (R21). Implémenté via `after()`
   * dans le wrapper Server Action. Reçoit `baseId` pour construire un
   * AirtableDataSource correctement scopé sur la base choisie.
   */
  triggerAfterProfileConnection: (params: {
    connectionId: string;
    encryptedAccessToken: string;
    baseId: string;
  }) => void;
};

export async function createConnectionFromAirtableBaseWithDeps(
  input: CreateConnectionInput,
  deps: CreateConnectionDeps,
): Promise<CreateConnectionResult> {
  const { baseId, session } = input;

  if (!baseId) {
    throw new Error("baseId manquant");
  }

  if (session.bases.length === 0) {
    throw new Error("Aucune base disponible dans la session OAuth");
  }

  // Sécu IDOR — baseId DOIT être dans les bases retournées par fetchBases
  // pour ce token. Sinon attaque (user manipule le form pour viser la base
  // d'un autre tenant).
  const base = session.bases.find((b) => b.id === baseId);
  if (!base) {
    throw new Error(
      `Base ${baseId} introuvable dans la session OAuth (sécu : tenant mismatch)`,
    );
  }

  // Build config (tokens chiffrés)
  const config: AirtableConnectionConfig = {
    base_id: base.id,
    base_name: base.name,
    access_token: deps.encryptToken(session.accessToken),
    refresh_token: deps.encryptToken(session.refreshToken),
    expires_at: session.expiresAt,
    scope: session.scope,
    status: "active",
  };

  // R9 — idempotence
  const existingId = await deps.findExistingConnection({
    workspaceId: session.workspaceId,
    baseId: base.id,
  });

  let connectionId: string;
  let isReconnect: boolean;

  if (existingId) {
    await deps.updateConnection(existingId, config);
    connectionId = existingId;
    isReconnect = true;
  } else {
    const inserted = await deps.insertConnection({
      workspaceId: session.workspaceId,
      name: `Airtable (${base.name})`,
      kind: "airtable",
      config,
    });
    connectionId = inserted.id;
    isReconnect = false;
  }

  // R21 — fire-and-forget profileConnection (réutilise helper P0.4)
  deps.triggerAfterProfileConnection({
    connectionId,
    encryptedAccessToken: config.access_token,
    baseId: base.id,
  });

  return { connectionId, isReconnect };
}
