/**
 * Seed le schema_cache_jsonb sur la connexion demo locale, pour permettre
 * au bench AI de tester le fast-path schema (Phase 17.1 Cycle C).
 *
 * Le bench standalone ne peut pas profiler en live sans serveur Next ; ce
 * script fait le profiling une fois et persiste le cache en DB. Le bench
 * utilise ensuite le connectionId + workspaceId imprimés ici pour activer
 * le fast-path.
 *
 * Usage : `bun run scripts/seed-bench-schema-cache.ts`
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { profileConnection } from "@/lib/ai-engine/schema-cache/populate";
import { getDemoDataSource } from "@/lib/connectors/registry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function main() {
  console.log("Profiling DemoDataSource…");
  const ds = getDemoDataSource();
  const cache = await profileConnection(ds);
  console.log(
    `  → ${cache.tables.length} tables profilées (status: ${cache.status})`,
  );

  const admin = createSupabaseAdminClient();
  const { data: connections, error: selectErr } = await admin
    .from("connections")
    .select("id, workspace_id")
    .eq("kind", "demo")
    .limit(1);

  if (selectErr) throw selectErr;
  if (!connections || connections.length === 0) {
    throw new Error(
      "Aucune connexion demo trouvée — lance d'abord `bun run db:fresh` pour créer demo@demo.io",
    );
  }

  const conn = connections[0];
  const { error: updateErr } = await admin
    .from("connections")
    .update({
      schema_cache_jsonb: cache,
      schema_synced_at: new Date().toISOString(),
    })
    .eq("id", conn.id);

  if (updateErr) throw updateErr;

  console.log("\nDone. Pour bench fast-path :");
  console.log(`  BENCH_CONNECTION_ID=${conn.id}`);
  console.log(`  BENCH_WORKSPACE_ID=${conn.workspace_id}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
