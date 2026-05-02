"use server";

/**
 * Server Action `refreshConnectionSchema(connectionId)` — Phase 17 cycle B T2.7.
 *
 * Re-déclenche le profiling d'une connexion à la demande de l'utilisateur
 * (bouton "Refresh schema" dans Settings > Connexions).
 *
 * Garde-fous :
 *  - **IDOR (R56)** : SSR scoped RLS via `createSupabaseServerClient()`
 *    avant tout autre check. Si la connexion n'appartient pas au workspace
 *    du user → erreur sans toucher à la DB.
 *  - **Rate limit (R65, B3)** : refuse si dernière tentative < 60s
 *    (`config_jsonb.last_profiling_attempt_at`).
 *  - **Mutex (R66, B3)** : refuse si `config_jsonb.is_profiling === true`
 *    (un autre process est déjà en train de profiler).
 *  - **Try/finally** : reset `is_profiling = false` même si profileConnection
 *    throw (sinon la connexion reste bloquée).
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadDataSource } from "../load-data-source";
import { profileConnection } from "./populate";

const RATE_LIMIT_MS = 60 * 1000;

export type RefreshResult =
  | { ok: true; status: "ok" | "partial" | "failed"; tablesCount: number }
  | { ok: false; error: string };

export async function refreshConnectionSchema(connectionId: string): Promise<RefreshResult> {
  // 1. IDOR guard via SSR scoped RLS
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Non authentifié" };
  }

  const { data: ownedConn } = await supabase
    .from("connections")
    .select("id")
    .eq("id", connectionId)
    .single();

  if (!ownedConn) {
    return { ok: false, error: "Connexion non autorisée ou introuvable" };
  }

  // 2. Lecture config_jsonb (admin client OK : connectionId déjà validé)
  const admin = createSupabaseAdminClient();
  const { data: connRow } = await admin
    .from("connections")
    .select("config_jsonb")
    .eq("id", connectionId)
    .single();

  const config = (connRow?.config_jsonb as Record<string, unknown> | null) ?? {};

  // 3. Mutex check (R66)
  if (config.is_profiling === true) {
    return { ok: false, error: "Profiling déjà en cours" };
  }

  // 4. Rate limit check (R65)
  const lastAttempt = config.last_profiling_attempt_at;
  if (typeof lastAttempt === "string") {
    const lastMs = new Date(lastAttempt).getTime();
    if (!Number.isNaN(lastMs) && Date.now() - lastMs < RATE_LIMIT_MS) {
      return {
        ok: false,
        error: "Profiling déjà tenté il y a moins de 60 secondes. Patiente avant de réessayer.",
      };
    }
  }

  // 5. Acquire mutex : set is_profiling=true + last_profiling_attempt_at
  const newConfigStart = {
    ...config,
    is_profiling: true,
    last_profiling_attempt_at: new Date().toISOString(),
  };
  await admin.from("connections").update({ config_jsonb: newConfigStart }).eq("id", connectionId);

  // 6. Profile (try/finally pour garantir le reset du mutex)
  try {
    const dataSource = await loadDataSource(connectionId);
    const cache = await profileConnection(dataSource);

    // Écrit cache + reset flag
    const newConfigEnd = { ...newConfigStart, is_profiling: false };
    await admin
      .from("connections")
      .update({
        schema_cache_jsonb: cache,
        schema_synced_at: cache.synced_at,
        config_jsonb: newConfigEnd,
      })
      .eq("id", connectionId);

    return {
      ok: true,
      status: cache.status === "not_applicable" ? "failed" : cache.status,
      tablesCount: cache.tables.length,
    };
  } catch (err) {
    // Reset flag même en cas d'erreur
    const resetConfig = { ...newConfigStart, is_profiling: false };
    await admin
      .from("connections")
      .update({ config_jsonb: resetConfig })
      .eq("id", connectionId);

    return {
      ok: false,
      error: err instanceof Error ? err.message : "Profiling échoué",
    };
  }
}
