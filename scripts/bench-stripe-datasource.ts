/**
 * Bench Stripe DataSource — Phase 14.3 RNF1 + RNF2.
 *
 * Mesure la latence réelle de la 1ère query (cold cache) et des queries
 * suivantes (warm cache) contre le compte Stripe test seedé en P14.2
 * (~200 customers + ~166 subs + ~168 invoices).
 *
 * USAGE :
 *   bun run scripts/bench-stripe-datasource.ts
 *
 * PRÉ-REQUIS :
 *   STRIPE_SECRET_KEY=sk_test_... dans .env.local
 *
 * SUCCÈS :
 *   RNF1 — P95 cold < 8000ms (acté SPEC v2, justifié par variance Stripe API)
 *   RNF2 — P95 warm < 200ms
 *   Exit code 0 si les 2 RNF passent, 1 sinon.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import {
  StripeDataSource,
  __resetStripeCacheForTests,
} from "@/lib/connectors/stripe/data-source";
import { getStripeClient } from "@/lib/stripe/client";

const COLD_RUNS = 10;
const WARM_RUNS_PER_COLD = 1;

const RNF1_TARGET_MS = 8000;
const RNF2_TARGET_MS = 200;

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  console.log("=== Bench Stripe DataSource — RNF1 + RNF2 ===\n");

  // Warm-up : 1 run jeté pour amortir DNS lookup + TLS handshake initial
  // sur Stripe.com. Représente "user qui a déjà connecté Stripe il y a
  // quelques minutes, cache TTL expiré ou autre connexion fresh".
  console.log("Warm-up Stripe.com (1 run jeté)...");
  {
    __resetStripeCacheForTests();
    const ds = new StripeDataSource({
      connectionId: "warmup",
      getStripeClient,
    });
    await ds.runQuery(`SELECT COUNT(*) AS n FROM stripe_customers`);
  }
  console.log("Warm-up terminé.\n");

  const coldLatencies: number[] = [];
  const warmLatencies: number[] = [];

  for (let i = 0; i < COLD_RUNS; i++) {
    __resetStripeCacheForTests(); // force cold cache
    const ds = new StripeDataSource({
      connectionId: `bench_${i}`,
      getStripeClient,
    });

    // Cold query : 1ère SELECT — déclenche fetch Stripe paginé + alasql.
    // Avec le lazy-fetch per-table (option B 14.3), seule stripe_subscriptions
    // est fetchée. Représentatif d'un prompt user typique single-table.
    const coldStart = performance.now();
    await ds.runQuery(
      `SELECT plan_nickname, COUNT(*) AS n FROM stripe_subscriptions GROUP BY plan_nickname`,
    );
    const coldElapsed = performance.now() - coldStart;
    coldLatencies.push(coldElapsed);

    // Warm queries : cache chaud sur la MÊME table — alasql in-memory.
    // (Une query sur une autre table ferait un cold fetch separé avec lazy.)
    for (let j = 0; j < WARM_RUNS_PER_COLD; j++) {
      const warmStart = performance.now();
      await ds.runQuery(`SELECT COUNT(*) AS n FROM stripe_subscriptions`);
      warmLatencies.push(performance.now() - warmStart);
    }

    process.stdout.write(
      `Run ${i + 1}/${COLD_RUNS} — cold ${coldElapsed.toFixed(0)}ms, warm ${warmLatencies[warmLatencies.length - 1].toFixed(0)}ms\n`,
    );
  }

  const coldP95 = p95(coldLatencies);
  const warmP95 = p95(warmLatencies);
  const coldMedian = [...coldLatencies].sort((a, b) => a - b)[Math.floor(coldLatencies.length / 2)];
  const warmMedian = [...warmLatencies].sort((a, b) => a - b)[Math.floor(warmLatencies.length / 2)];

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
  console.log(`Cold runs (${coldLatencies.length}) : ${coldLatencies.map((v) => v.toFixed(0)).join(", ")} ms`);
  console.log(`Warm runs (${warmLatencies.length}) : ${warmLatencies.map((v) => v.toFixed(0)).join(", ")} ms`);

  const allPass = coldP95 < RNF1_TARGET_MS && warmP95 < RNF2_TARGET_MS;
  console.log(`\nVerdict global : ${allPass ? "✓ Tous RNF passent" : "✗ Au moins un RNF fail"}`);

  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("Bench failed:", err);
  process.exit(2);
});
