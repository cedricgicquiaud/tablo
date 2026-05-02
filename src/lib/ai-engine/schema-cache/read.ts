/**
 * Lecture du schema cache pour une connexion — Phase 17 cycle B T2.4.
 *
 * Lit `connections.schema_cache_jsonb` + `schema_synced_at` via admin
 * client (l'IDOR guard est fait en amont par le Route Handler ou la
 * Server Action qui déclenche la lecture).
 *
 * Politique :
 * - Cache obsolète (synced_at < now() - 7 jours) → null (R4bis I1)
 * - JSON invalide / version inattendue → null + log error (graceful)
 * - schema_cache_jsonb null (pas encore profilé) → null
 * - status='failed' (profiling KO) → null (cache pas exploitable)
 * - status='ok' ou 'partial' avec synced_at récent → return cache
 *
 * `not_applicable` (futur CSV) reste à définir : pour l'instant on
 * retourne null aussi (le DataSource fera le fallback live).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SchemaCacheEntry } from "./types";

/** Fraicheur du cache en jours (R4bis). */
export const FRESHNESS_DAYS = 7;
const FRESHNESS_MS = FRESHNESS_DAYS * 24 * 60 * 60 * 1000;

export async function readSchemaCache(connectionId: string): Promise<SchemaCacheEntry | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("schema_cache_jsonb, schema_synced_at")
    .eq("id", connectionId)
    .single();

  if (error || !data) return null;

  const cache = data.schema_cache_jsonb;
  const syncedAt = data.schema_synced_at;

  // Pas encore profilé
  if (!cache || !syncedAt) return null;

  // Validation forme du cache (graceful sur format invalide)
  if (!isValidSchemaCacheEntry(cache)) {
    console.warn(`[schema-cache] format invalide pour connection ${connectionId}`);
    return null;
  }

  // Status non-exploitable
  if (cache.status === "failed" || cache.status === "not_applicable") {
    return null;
  }

  // Fraicheur (R4bis I1)
  const syncedAtMs = new Date(syncedAt).getTime();
  if (Number.isNaN(syncedAtMs)) return null;

  const ageMs = Date.now() - syncedAtMs;
  if (ageMs > FRESHNESS_MS) {
    console.warn(
      `[schema-cache] cache obsolète (>${FRESHNESS_DAYS}j) pour connection ${connectionId}, fallback live`,
    );
    return null;
  }

  return cache as SchemaCacheEntry;
}

/**
 * Type guard minimaliste pour SchemaCacheEntry. Ne couvre pas tous les
 * cas mais détecte les corruptions évidentes (champ manquant, version
 * inattendue).
 */
function isValidSchemaCacheEntry(value: unknown): value is SchemaCacheEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (typeof v.synced_at !== "string") return false;
  if (!["ok", "partial", "failed", "not_applicable"].includes(v.status as string)) return false;
  if (!Array.isArray(v.tables)) return false;
  return true;
}
