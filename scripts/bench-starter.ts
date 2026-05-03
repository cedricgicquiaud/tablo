/**
 * Bench `generateStarterDashboard` — Phase 18 Cycle C T_C4.
 *
 * Mesure RNF1 (latence ≤ 45s) et RNF2 (coût ≤ $0.15) pour la génération
 * complète d'un starter dashboard sur DemoDataSource avec schema cache
 * pré-populé (fast-path P17.1 actif).
 *
 * Usage :
 *   bun run scripts/seed-bench-schema-cache.ts  # populate schema cache
 *   bun run scripts/bench-starter.ts             # run bench
 *
 * NB : appelle Anthropic réellement → tokens consommés (~$0.10 / run).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { generateStarterDashboard } from "@/lib/pinpoint/starter-dashboard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createSupabaseAdminClient();

  // Trouve la connexion demo et son workspace.
  const { data: conn, error: connErr } = await admin
    .from("connections")
    .select("id, workspace_id")
    .eq("kind", "demo")
    .limit(1)
    .single();

  if (connErr || !conn) {
    throw new Error(
      "Aucune connexion demo trouvée — lance `bun run db:fresh` d'abord",
    );
  }

  // Vérifie que le schema cache est populé (fast-path actif)
  const { data: connFull } = await admin
    .from("connections")
    .select("schema_synced_at")
    .eq("id", conn.id)
    .single();

  if (!connFull?.schema_synced_at) {
    throw new Error(
      "Schema cache non populé — lance `bun run scripts/seed-bench-schema-cache.ts` d'abord",
    );
  }

  // Crée un dashboard de test (jeté à chaque run).
  const { data: dashboard, error: dashErr } = await admin
    .from("dashboards")
    .insert({
      workspace_id: conn.workspace_id,
      name: `[BENCH] Starter ${new Date().toISOString()}`,
    })
    .select("id")
    .single();

  if (dashErr || !dashboard) {
    throw new Error(`Création dashboard test: ${dashErr?.message ?? "unknown"}`);
  }

  console.log(`Dashboard test créé : ${dashboard.id}`);
  console.log(`Connection demo : ${conn.id}`);
  console.log(`Workspace : ${conn.workspace_id}`);
  console.log("\nLancement starter dashboard generation…\n");

  const start = Date.now();
  await generateStarterDashboard(
    conn.id,
    dashboard.id,
    conn.workspace_id,
    "00000000-0000-0000-0000-000000000000", // bench user fictif
  );
  const durationMs = Date.now() - start;

  // Récupère le résultat depuis ai_engine_audit.
  const { data: audit } = await admin
    .from("ai_engine_audit")
    .select("status, error_message, duration_ms")
    .eq("tool", "starter_dashboard")
    .eq("connection_id", conn.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Compte les widgets pinnés.
  const { count: widgetCount } = await admin
    .from("widgets")
    .select("*", { count: "exact", head: true })
    .eq("dashboard_id", dashboard.id);

  let auditMeta: Record<string, unknown> | null = null;
  try {
    auditMeta = audit?.error_message ? JSON.parse(audit.error_message) : null;
  } catch {
    /* ignore */
  }

  console.log("─────────────────────────────────────────");
  console.log(`Status : ${audit?.status ?? "unknown"}`);
  console.log(`Durée totale : ${durationMs}ms`);
  console.log(`Pipeline durée : ${audit?.duration_ms ?? "n/a"}ms`);
  console.log(`Widgets pinnés : ${widgetCount ?? 0}`);
  if (auditMeta) {
    console.log(`Source type : ${auditMeta.source_type}`);
    console.log(`Widgets total / OK : ${auditMeta.widgets_total} / ${auditMeta.widgets_ok}`);
    console.log(`Coût total : $${(auditMeta.cost_usd as number).toFixed(5)}`);
    if (Array.isArray(auditMeta.widgets_failed) && auditMeta.widgets_failed.length > 0) {
      console.log(`Widgets failed : ${auditMeta.widgets_failed.length}`);
      for (const f of auditMeta.widgets_failed as Array<{ prompt: string; error: string }>) {
        console.log(`  - "${f.prompt}" → ${f.error}`);
      }
    }
  }

  // RNF check
  console.log("\n─── RNF Phase 18 ──────────────────────");
  const rnf1 = durationMs < 45_000 ? "✓" : "✗";
  const cost = (auditMeta?.cost_usd as number | undefined) ?? 0;
  const rnf2 = cost < 0.15 ? "✓" : "✗";
  console.log(`RNF1 latence ≤ 45s : ${durationMs}ms ${rnf1}`);
  console.log(`RNF2 coût ≤ \$0.15 : \$${cost.toFixed(5)} ${rnf2}`);
}

main().catch((err) => {
  console.error("Bench failed:", err);
  process.exit(1);
});
