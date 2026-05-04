/**
 * Bench Airtable DataSource — Phase 14.5 RNF1 + RNF2.
 *
 * Mesure la latence cold (1ère runQuery, schema + records fetch) et warm
 * (cache hit) contre une connection Airtable user-owned existante en DB.
 *
 * USAGE :
 *   bun run scripts/bench-airtable-datasource.ts
 *
 * PRÉ-REQUIS :
 *   - .env.local rempli (Supabase + Airtable OAuth)
 *   - Au moins 1 connection kind='airtable' active en DB (créée via OAuth)
 *
 * SUCCÈS :
 *   RNF1 — P95 cold < 5000ms (justifié : Airtable schema + records paginate)
 *   RNF2 — P95 warm < 200ms (alasql in-memory)
 *   Exit code 0 si les 2 RNF passent, 1 sinon.
 *
 * Pattern symétrique scripts/bench-stripe-datasource.ts (P14.3).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import {
  AirtableDataSource,
  __resetAirtableCacheForTests,
} from "@/lib/connectors/airtable/data-source";
import { getValidAirtableAccessToken } from "@/lib/connectors/airtable-token-refresh";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const COLD_RUNS = 5; // limite rate Airtable 5 req/sec/base
const WARM_RUNS_PER_COLD = 1;

const RNF1_TARGET_MS = 5000;
const RNF2_TARGET_MS = 200;

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  console.log("=== Bench Airtable DataSource — RNF1 + RNF2 ===\n");

  // Récupère la connection Airtable la plus récente
  const admin = createSupabaseAdminClient();
  const { data: conn } = await admin
    .from("connections")
    .select("id, name, config_jsonb")
    .eq("kind", "airtable")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn) {
    console.error(
      "Aucune connection kind='airtable' en DB. OAuth une base d'abord via l'app.",
    );
    process.exit(2);
  }

  const config = (conn as { config_jsonb: { base_id: string } }).config_jsonb;
  console.log(
    `Connection : ${(conn as { name: string }).name} (base_id=${config.base_id})\n`,
  );

  // Pick une table arbitraire via listTables pour le bench
  const dsPick = new AirtableDataSource({
    connectionId: (conn as { id: string }).id,
    baseId: config.base_id,
    getAccessToken: () => getValidAirtableAccessToken((conn as { id: string }).id),
  });
  const tables = await dsPick.listTables();
  if (tables.length === 0) {
    console.error("La base Airtable n'a aucune table accessible.");
    process.exit(2);
  }
  const benchTable = tables[0].name;
  console.log(`Bench sur table : ${benchTable}\n`);

  // Warm-up
  console.log("Warm-up Airtable.com (1 run jeté)...");
  __resetAirtableCacheForTests();
  await dsPick.runQuery(`SELECT COUNT(*) AS n FROM ${quoteIfNeeded(benchTable)}`);
  console.log("Warm-up terminé.\n");

  const coldLatencies: number[] = [];
  const warmLatencies: number[] = [];

  for (let i = 0; i < COLD_RUNS; i++) {
    __resetAirtableCacheForTests();
    const ds = new AirtableDataSource({
      connectionId: (conn as { id: string }).id,
      baseId: config.base_id,
      getAccessToken: () =>
        getValidAirtableAccessToken((conn as { id: string }).id),
    });

    // Cold query : schema + records fetch + alasql
    const coldStart = performance.now();
    await ds.runQuery(`SELECT COUNT(*) AS n FROM ${quoteIfNeeded(benchTable)}`);
    const coldElapsed = performance.now() - coldStart;
    coldLatencies.push(coldElapsed);

    // Warm query : cache hit
    for (let j = 0; j < WARM_RUNS_PER_COLD; j++) {
      const warmStart = performance.now();
      await ds.runQuery(
        `SELECT COUNT(*) AS n FROM ${quoteIfNeeded(benchTable)}`,
      );
      warmLatencies.push(performance.now() - warmStart);
    }

    process.stdout.write(
      `Run ${i + 1}/${COLD_RUNS} — cold ${coldElapsed.toFixed(0)}ms, warm ${warmLatencies[warmLatencies.length - 1].toFixed(0)}ms\n`,
    );

    // Soft rate limit : 200ms entre runs (Airtable 5 req/sec/base)
    await new Promise((r) => setTimeout(r, 200));
  }

  const coldP95 = p95(coldLatencies);
  const warmP95 = p95(warmLatencies);
  const coldMedian = [...coldLatencies].sort((a, b) => a - b)[
    Math.floor(coldLatencies.length / 2)
  ];
  const warmMedian = [...warmLatencies].sort((a, b) => a - b)[
    Math.floor(warmLatencies.length / 2)
  ];

  console.log("\n=== Résultats ===\n");
  console.log(`| RNF | Métrique | P95 mesuré | Target | Verdict |`);
  console.log(`| --- | --- | --- | --- | --- |`);
  console.log(
    `| RNF1 | 1ère query cold | ${coldP95.toFixed(0)}ms (median ${coldMedian.toFixed(0)}ms) | < ${RNF1_TARGET_MS}ms | ${coldP95 < RNF1_TARGET_MS ? "✓ PASS" : "✗ FAIL"} |`,
  );
  console.log(
    `| RNF2 | Query suivante warm | ${warmP95.toFixed(0)}ms (median ${warmMedian.toFixed(0)}ms) | < ${RNF2_TARGET_MS}ms | ${warmP95 < RNF2_TARGET_MS ? "✓ PASS" : "✗ FAIL"} |`,
  );

  console.log(`\n# Détails`);
  console.log(
    `Cold runs (${coldLatencies.length}) : ${coldLatencies.map((v) => v.toFixed(0)).join(", ")} ms`,
  );
  console.log(
    `Warm runs (${warmLatencies.length}) : ${warmLatencies.map((v) => v.toFixed(0)).join(", ")} ms`,
  );

  const allPass = coldP95 < RNF1_TARGET_MS && warmP95 < RNF2_TARGET_MS;
  console.log(
    `\nVerdict global : ${allPass ? "✓ Tous RNF passent" : "✗ Au moins un RNF fail"}`,
  );

  process.exit(allPass ? 0 : 1);
}

function quoteIfNeeded(name: string): string {
  // Si le name contient des espaces / chars spéciaux, encadre en "double quotes"
  // (alasql syntax). Sinon brut.
  if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) return name;
  return `"${name}"`;
}

main().catch((err) => {
  console.error("Bench failed:", err);
  process.exit(2);
});
