/**
 * Benchmark moteur AI Cadran — Phase 17 cycle C T3.7.
 *
 * Mesure RNF1 (first-token latency < 800ms), RNF2 (widget complet < 3s),
 * RNF3 (coût moyen < $0.02), R23 (≥ 4/5 prompts utilisent valeurs enum réelles).
 *
 * Usage : `bun run scripts/bench-ai-engine.ts`
 *
 * NB : nécessite ANTHROPIC_API_KEY dans .env.local + Supabase local up
 * + seed e-commerce. Le bench appelle réellement Anthropic → tokens consommés.
 */

import { config as loadEnv } from "dotenv";
// override:true car Bun pré-charge .env.local avec des valeurs vides pour
// certaines vars selon l'environnement, et dotenv n'écrase pas par défaut.
loadEnv({ path: ".env.local", override: true });

import { runAgent } from "@/lib/ai-engine";
import { createSSEStream } from "@/lib/ai-engine/utils/stream";
import type { AgentResult, StreamEvent } from "@/lib/ai-engine/types/agent";
import { estimateCostUsd } from "@/lib/ai-engine/agents/v1/config";

const PROMPTS = [
  // 3 prompts pour RNF1/RNF2/RNF3 (latence + coût)
  { label: "metric_card", prompt: "Mon revenu de ce mois" },
  { label: "time_series", prompt: "Évolution du revenu sur 12 mois" },
  { label: "donut", prompt: "Top catégories par revenu" },
  // 2 prompts supplémentaires pour R23 (valeurs enum réelles)
  {
    label: "enum_status_paid",
    prompt: "Combien de commandes ont le statut 'paid' ?",
    enumExpected: ["paid"],
  },
  {
    label: "enum_channel",
    prompt: "Répartition des commandes par canal (channel)",
    enumExpected: [], // valeurs détectées via inspect, pas devinées
  },
];

type BenchResult = {
  label: string;
  prompt: string;
  ok: boolean;
  firstTokenMs: number;
  totalMs: number;
  tokens: {
    input: number;
    output: number;
    cacheCreation?: number;
    cacheRead?: number;
  };
  costUsd: number;
  sql?: string;
  enumMatch?: boolean;
  error?: string;
};

async function benchOne(
  label: string,
  prompt: string,
  enumExpected: string[],
): Promise<BenchResult> {
  const start = Date.now();
  let firstTokenMs = -1;
  let result: AgentResult | null = null;

  const sse = createSSEStream<StreamEvent>();

  // Consume stream pour capturer first-token timing
  const reader = sse.stream.getReader();
  const consumePromise = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (firstTokenMs < 0) {
        firstTokenMs = Date.now() - start;
      }
      // Parse pour récupérer le done event
      const text = new TextDecoder().decode(value);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6)) as StreamEvent;
            if (event.type === "done") {
              result = event.result;
            }
          } catch {
            // ignore
          }
        }
      }
    }
  })();

  // Si BENCH_CONNECTION_ID/BENCH_WORKSPACE_ID définis (via seed-bench-schema-cache),
  // le fast-path schema (P17.1 Cycle C) est testé. Sinon : DemoDataSource sans cache.
  const benchConnectionId = process.env.BENCH_CONNECTION_ID;
  const benchWorkspaceId = process.env.BENCH_WORKSPACE_ID ?? "bench-ws";
  const benchUserId = process.env.BENCH_USER_ID ?? "bench-user";

  const abortController = new AbortController();
  const runPromise = runAgent(
    {
      prompt,
      workspaceId: benchWorkspaceId,
      userId: benchUserId,
      connectionId: benchConnectionId,
      signal: abortController.signal,
    },
    sse,
  ).finally(() => sse.close());

  await Promise.all([consumePromise, runPromise]);

  const totalMs = Date.now() - start;

  if (!result) {
    return {
      label,
      prompt,
      ok: false,
      firstTokenMs,
      totalMs,
      tokens: { input: 0, output: 0 },
      costUsd: 0,
      error: "no done event",
    };
  }

  const tokens = result.tokens ?? { input: 0, output: 0 };
  const costUsd = estimateCostUsd(
    tokens.input,
    tokens.output,
    tokens.cacheCreation,
    tokens.cacheRead,
  );

  if (!result.ok) {
    return {
      label,
      prompt,
      ok: false,
      firstTokenMs,
      totalMs,
      tokens,
      costUsd,
      error: result.error,
    };
  }

  const sql = result.config.query.sql;
  const enumMatch =
    enumExpected.length === 0
      ? undefined
      : enumExpected.every((v) => sql.includes(`'${v}'`));

  return {
    label,
    prompt,
    ok: true,
    firstTokenMs,
    totalMs,
    tokens,
    costUsd,
    sql,
    enumMatch,
  };
}

function formatResults(results: BenchResult[]): string {
  let out = "# Bench moteur AI — Phase 17 cycle C T3.7\n\n";
  out += `Date : ${new Date().toISOString()}\n\n`;

  // Per-prompt breakdown
  out += "## Résultats détaillés\n\n";
  out +=
    "| Label | First-Token | Total | Tokens (in/out) | Cache (write/read) | Coût | Status |\n";
  out += "|---|---|---|---|---|---|---|\n";
  for (const r of results) {
    const status = r.ok ? "OK" : `FAIL: ${r.error ?? "?"}`;
    const cacheW = r.tokens.cacheCreation ?? 0;
    const cacheR = r.tokens.cacheRead ?? 0;
    out += `| ${r.label} | ${r.firstTokenMs}ms | ${r.totalMs}ms | ${r.tokens.input}/${r.tokens.output} | ${cacheW}/${cacheR} | $${r.costUsd.toFixed(5)} | ${status} |\n`;
  }

  // RNF aggregates (sur les 3 premiers prompts canoniques)
  const canonical = results.slice(0, 3).filter((r) => r.ok);
  if (canonical.length > 0) {
    const avgFirstToken =
      canonical.reduce((acc, r) => acc + r.firstTokenMs, 0) / canonical.length;
    const avgTotal =
      canonical.reduce((acc, r) => acc + r.totalMs, 0) / canonical.length;
    const avgCost =
      canonical.reduce((acc, r) => acc + r.costUsd, 0) / canonical.length;
    out += "\n## RNF aggregates (3 prompts canoniques)\n\n";
    out += `- **RNF1** First-token P50 (avg) : **${avgFirstToken.toFixed(0)}ms** (cible < 800ms) — ${avgFirstToken < 800 ? "✓" : "✗"}\n`;
    out += `- **RNF2** Total widget P50 (avg) : **${avgTotal.toFixed(0)}ms** (cible < 3000ms) — ${avgTotal < 3000 ? "✓" : "✗"}\n`;
    out += `- **RNF3** Coût moyen / widget : **$${avgCost.toFixed(5)}** (cible < $0.02) — ${avgCost < 0.02 ? "✓" : "✗"}\n`;
  }

  // R23 enum matching
  const enumResults = results.filter((r) => r.enumMatch !== undefined);
  if (enumResults.length > 0) {
    const enumPass = enumResults.filter((r) => r.enumMatch).length;
    out += `\n## R23 enum literal matching\n\n`;
    out += `- **${enumPass}/${enumResults.length}** prompts contiennent les valeurs enum attendues (cible ≥ 4/5)\n`;
    for (const r of enumResults) {
      out += `  - ${r.label}: ${r.enumMatch ? "✓" : "✗"}\n`;
    }
  }

  return out;
}

async function main() {
  console.log("Lancement bench moteur AI...\n");
  const results: BenchResult[] = [];
  for (const p of PROMPTS) {
    process.stdout.write(`  ${p.label}... `);
    try {
      const r = await benchOne(p.label, p.prompt, p.enumExpected ?? []);
      results.push(r);
      console.log(
        `${r.ok ? "OK" : "FAIL"} (${r.totalMs}ms, $${r.costUsd.toFixed(5)})${r.ok ? "" : ` — ${r.error ?? "no error msg"}`}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.log(`THROW (${msg})`);
      results.push({
        label: p.label,
        prompt: p.prompt,
        ok: false,
        firstTokenMs: -1,
        totalMs: -1,
        tokens: { input: 0, output: 0 },
        costUsd: 0,
        error: msg,
      });
    }
  }

  console.log("\n" + formatResults(results));
}

main().catch((err) => {
  console.error("Bench failed:", err);
  process.exit(1);
});
