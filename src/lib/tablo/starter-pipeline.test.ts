/**
 * Tests `runStarterPipeline` — Phase 18 Cycle B.
 *
 * Couvre les invariants critiques :
 * - R3 détection type → kit utilisé
 * - R5 génération séquentielle (vs parallèle)
 * - R8 erreur partielle = continue
 * - R10 abort interrompt la boucle
 * - R11 schéma vide = status error early
 * - R13 budget cap global = abort
 * - RNF3 idempotence (testée au niveau Server Action wrapper)
 * - RNF4 robustesse 0 widget OK
 */

import { describe, it, expect, vi } from "vitest";
import {
  runStarterPipeline,
  type StarterDeps,
  type WidgetGenerationOutcome,
} from "./starter-pipeline";
import type { WidgetConfig } from "@/lib/ai-engine/types/widget-schema";

// Helper pour fabriquer des deps avec defaults sains.
function makeDeps(overrides: Partial<StarterDeps> = {}): StarterDeps {
  const fixedNow = new Date("2026-05-03T12:00:00Z").getTime();
  let counter = 0;
  return {
    listTables: vi.fn(async () => [
      { name: "orders", rowCount: 2300 },
      { name: "products", rowCount: 150 },
    ]),
    detectSourceType: vi.fn(async () => "ecommerce"),
    generateWidget: vi.fn(async (prompt: string) => makeOkWidget(prompt)),
    pinWidget: vi.fn(async () => {}),
    isProfilingDone: vi.fn(async () => true),
    budgetCapUsd: 0.25,
    abortSignal: new AbortController().signal,
    now: vi.fn(() => new Date(fixedNow + counter++ * 100)),
    profilingMaxPolls: 1,
    profilingPollMs: 0,
    ...overrides,
  };
}

function makeOkWidget(prompt: string, costUsd = 0.018): WidgetGenerationOutcome {
  const config: WidgetConfig = {
    kind: "metric_card",
    title: prompt,
    format: "currency_eur_compact",
    query: { sql: "SELECT 100 AS revenue" },
    mapping: { value: "revenue" },
  };
  return {
    ok: true,
    config,
    data: { value: 100 } as unknown as WidgetGenerationOutcome["data"] extends infer T ? T : never,
    explanation: "ok",
    costUsd,
  };
}

describe("runStarterPipeline", () => {
  it("R3 — utilise le kit correspondant au sourceType détecté (ecommerce → 5 prompts)", async () => {
    const generateWidget = vi.fn(async (prompt: string) => makeOkWidget(prompt));
    const deps = makeDeps({ detectSourceType: vi.fn(async () => "ecommerce"), generateWidget });

    const result = await runStarterPipeline(deps);

    expect(result.sourceType).toBe("ecommerce");
    expect(result.widgetsTotal).toBe(5);
    expect(generateWidget).toHaveBeenCalledTimes(5);
    expect(result.status).toBe("ok");
    expect(result.widgetsOk).toBe(5);
  });

  it("R5 — boucle séquentielle (pas parallèle)", async () => {
    const order: number[] = [];
    let n = 0;
    const generateWidget = vi.fn(async (prompt: string) => {
      const myN = ++n;
      // Simule un délai et vérifie que le précédent est bien fini avant le suivant.
      await new Promise((r) => setTimeout(r, 5));
      order.push(myN);
      return makeOkWidget(prompt);
    });
    const deps = makeDeps({ generateWidget });

    await runStarterPipeline(deps);

    // Si parallèle, l'ordre serait non garanti / écarts massifs.
    // Si séquentiel, order = [1,2,3,4,5] (avec le n incrément avant await).
    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it("R8 — erreur partielle continue : 1 widget fail sur 5 → status partial, widgetsOk=4", async () => {
    let callIdx = 0;
    const generateWidget = vi.fn(async (prompt: string) => {
      callIdx++;
      if (callIdx === 3) {
        return { ok: false, error: "anthropic_timeout", costUsd: 0 } satisfies WidgetGenerationOutcome;
      }
      return makeOkWidget(prompt);
    });
    const deps = makeDeps({ generateWidget });

    const result = await runStarterPipeline(deps);

    expect(result.status).toBe("partial");
    expect(result.widgetsOk).toBe(4);
    expect(result.widgetsFailed).toHaveLength(1);
    expect(result.widgetsFailed[0].error).toBe("anthropic_timeout");
  });

  it("RNF4 — robustesse 0 widget OK : tous fail → status error", async () => {
    const generateWidget = vi.fn(async () => ({
      ok: false as const,
      error: "all_failed",
      costUsd: 0,
    }));
    const deps = makeDeps({ generateWidget });

    const result = await runStarterPipeline(deps);

    expect(result.status).toBe("error");
    expect(result.widgetsOk).toBe(0);
    expect(result.widgetsFailed).toHaveLength(5);
  });

  it("R11 — schéma vide : listTables() = [] → status error, widgetsTotal=0, no detection", async () => {
    const detectSourceType = vi.fn();
    const deps = makeDeps({
      listTables: vi.fn(async () => []),
      detectSourceType,
    });

    const result = await runStarterPipeline(deps);

    expect(result.status).toBe("error");
    expect(result.widgetsTotal).toBe(0);
    expect(detectSourceType).not.toHaveBeenCalled();
    expect(result.widgetsFailed[0].error).toBe("no_tables");
  });

  it("R10 — abort interrompt la boucle : 2/5 générés puis abort → 3 marked aborted", async () => {
    const ac = new AbortController();
    let callIdx = 0;
    const generateWidget = vi.fn(async (prompt: string) => {
      callIdx++;
      if (callIdx === 3) {
        ac.abort();
        return { ok: false as const, error: "interrupted", costUsd: 0 };
      }
      return makeOkWidget(prompt);
    });
    const deps = makeDeps({ generateWidget, abortSignal: ac.signal });

    const result = await runStarterPipeline(deps);

    expect(result.widgetsOk).toBe(2);
    // Les 3 derniers appels (3, 4, 5) : 1 a fail (interrupted), 2 sont aborted.
    expect(result.widgetsFailed.length).toBe(3);
    const abortedCount = result.widgetsFailed.filter((f) => f.error === "aborted").length;
    expect(abortedCount).toBe(2);
  });

  it("R13 — budget cap global : cumul > $0.25 → abort widgets restants avec error budget_cap_exceeded", async () => {
    let callIdx = 0;
    const generateWidget = vi.fn(async (prompt: string) => {
      callIdx++;
      // 1er widget = $0.10, 2ème = $0.10, 3ème = $0.10 → cumul $0.30 > $0.25 après 3 widgets
      // Au 4ème prompt, cumul = $0.30 ≥ $0.25 → abort le 4ème
      return makeOkWidget(prompt, 0.1);
    });
    const deps = makeDeps({ generateWidget, budgetCapUsd: 0.25 });

    const result = await runStarterPipeline(deps);

    expect(result.widgetsOk).toBe(3);
    const budgetFailed = result.widgetsFailed.filter(
      (f) => f.error === "budget_cap_exceeded",
    );
    expect(budgetFailed).toHaveLength(2);
  });

  it("R12 — attend profiling jusqu'à 30s, sinon continue sans cache", async () => {
    const isProfilingDone = vi.fn(async () => false);
    const deps = makeDeps({
      isProfilingDone,
      profilingMaxPolls: 3,
      profilingPollMs: 0,
    });

    const result = await runStarterPipeline(deps);

    expect(isProfilingDone).toHaveBeenCalledTimes(3);
    // Continue malgré profiling pas fini → widgets générés
    expect(result.widgetsOk).toBeGreaterThan(0);
  });

  it("R6 — pinWidget reçoit des positions cohérentes (greedy layout)", async () => {
    const positions: Array<{ x: number; y: number; w: number; h: number }> = [];
    const pinWidget = vi.fn(async (_config, _data, _exp, position) => {
      positions.push(position);
    });
    const deps = makeDeps({ pinWidget });

    await runStarterPipeline(deps);

    // 5 widgets metric_card (w:4, h:2) → ils s'organisent sur grille 12 col.
    // 1er en (0,0), 2ème en (4,0), 3ème en (8,0), 4ème en (0,2), 5ème en (4,2).
    expect(positions).toEqual([
      { x: 0, y: 0, w: 4, h: 2 },
      { x: 4, y: 0, w: 4, h: 2 },
      { x: 8, y: 0, w: 4, h: 2 },
      { x: 0, y: 2, w: 4, h: 2 },
      { x: 4, y: 2, w: 4, h: 2 },
    ]);
  });

  it("listTables throw → status error gracieux (pas de crash)", async () => {
    const deps = makeDeps({
      listTables: vi.fn(async () => {
        throw new Error("DataSource auth expired");
      }),
    });

    const result = await runStarterPipeline(deps);

    expect(result.status).toBe("error");
    expect(result.widgetsFailed[0].error).toContain("auth expired");
  });
});
