/**
 * Pipeline pure de génération starter dashboard — Phase 18 Cycle B.
 *
 * Sépare la logique métier (orchestration, budget, erreurs partielles)
 * des dépendances I/O (Supabase, Anthropic, Server Actions). Les deps
 * sont injectées pour permettre de tester le pipeline sans mocks lourds.
 *
 * Le wrapper Server Action `generateStarterDashboard` (starter-dashboard.ts)
 * crée les vraies deps et appelle `runStarterPipeline`.
 *
 * Couvre les règles SPEC R3, R4, R5, R6, R8, R10, R11, R12, R13.
 */

import type { WidgetConfig } from "@/lib/ai-engine/types/widget-schema";
import type { WidgetData } from "@/lib/ai/extract-preview";
import type { SourceKind } from "@/lib/ai-engine/utils/detect-source-type";
import { STARTER_KITS } from "./starter-kits";
import { nextPosition, type Position } from "./starter-layout";

export type StarterStatus = "ok" | "partial" | "error";

export type StarterResult = {
  status: StarterStatus;
  sourceType: SourceKind;
  widgetsTotal: number;
  widgetsOk: number;
  widgetsFailed: { prompt: string; error: string }[];
  durationMs: number;
  costUsd: number;
};

export type WidgetGenerationOutcome =
  | {
      ok: true;
      config: WidgetConfig;
      data: WidgetData;
      explanation: string;
      costUsd: number;
    }
  | { ok: false; error: string; costUsd: number };

export type TableInfo = { name: string; rowCount: number };

/**
 * Dépendances injectables. Permet de tester sans Supabase ni Anthropic réels.
 */
export type StarterDeps = {
  /** Liste les tables disponibles via la DataSource (R11 schéma vide). */
  listTables: () => Promise<TableInfo[]>;
  /** Détection LLM du type de business (R3). */
  detectSourceType: (tables: TableInfo[]) => Promise<SourceKind>;
  /** Génère un widget pour un prompt utilisateur (réutilise `runAgent`). */
  generateWidget: (prompt: string) => Promise<WidgetGenerationOutcome>;
  /** Pin le widget sur le dashboard (R6 layout). */
  pinWidget: (
    config: WidgetConfig,
    data: WidgetData,
    explanation: string,
    position: Position,
  ) => Promise<void>;
  /** Vérifie si le profiling est terminé (R12 fast-path). */
  isProfilingDone: () => Promise<boolean>;
  /** Budget cap global en USD (R13). */
  budgetCapUsd: number;
  /** Signal d'abort (R10 timeout). */
  abortSignal: AbortSignal;
  /** Source de temps testable. */
  now: () => Date;
  /** Nombre de polls profiling (default 15 = 30s avec interval 2s). */
  profilingMaxPolls?: number;
  /** Interval polling profiling en ms (default 2000). */
  profilingPollMs?: number;
};

const DEFAULT_PROFILING_MAX_POLLS = 15; // 15 × 2s = 30s
const DEFAULT_PROFILING_POLL_MS = 2000;

async function waitForProfiling(deps: StarterDeps): Promise<boolean> {
  const maxPolls = deps.profilingMaxPolls ?? DEFAULT_PROFILING_MAX_POLLS;
  const pollMs = deps.profilingPollMs ?? DEFAULT_PROFILING_POLL_MS;

  for (let i = 0; i < maxPolls; i++) {
    if (deps.abortSignal.aborted) return false;
    if (await deps.isProfilingDone()) return true;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

/**
 * Pipeline complet : détection → kit → génération séquentielle → pinning.
 *
 * Garanties :
 * - Pas de throw : tous les cas d'erreur retournent un StarterResult valide.
 * - Erreur partielle continue (R8) : 1 widget plante → on continue.
 * - Budget cap global (R13) : abort si cumul > deps.budgetCapUsd.
 * - Schéma vide (R11) → status='error', sourceType='generic', widgetsTotal=0.
 */
export async function runStarterPipeline(deps: StarterDeps): Promise<StarterResult> {
  const startedAt = deps.now().getTime();

  // R12 : attend profiling jusqu'à 30s, sinon continue sans cache (juste plus lent).
  await waitForProfiling(deps);

  // R11 : tables vides → on s'arrête tôt.
  let tables: TableInfo[];
  try {
    tables = await deps.listTables();
  } catch (err) {
    return {
      status: "error",
      sourceType: "generic",
      widgetsTotal: 0,
      widgetsOk: 0,
      widgetsFailed: [
        { prompt: "<listTables>", error: err instanceof Error ? err.message : "unknown" },
      ],
      durationMs: deps.now().getTime() - startedAt,
      costUsd: 0,
    };
  }

  if (tables.length === 0) {
    return {
      status: "error",
      sourceType: "generic",
      widgetsTotal: 0,
      widgetsOk: 0,
      widgetsFailed: [{ prompt: "<no-tables>", error: "no_tables" }],
      durationMs: deps.now().getTime() - startedAt,
      costUsd: 0,
    };
  }

  // R3 : détection type de source.
  const sourceType = await deps.detectSourceType(tables);
  const kit = STARTER_KITS[sourceType];

  // R4-R5 : boucle séquentielle sur les prompts du kit.
  const placedPositions: Position[] = [];
  let widgetsOk = 0;
  const widgetsFailed: { prompt: string; error: string }[] = [];
  let totalCostUsd = 0;

  for (const prompt of kit.prompts) {
    // R10 : abort interrompt la boucle.
    if (deps.abortSignal.aborted) {
      widgetsFailed.push({ prompt, error: "aborted" });
      continue;
    }

    // R13 : budget cap global.
    if (totalCostUsd >= deps.budgetCapUsd) {
      widgetsFailed.push({ prompt, error: "budget_cap_exceeded" });
      continue;
    }

    // R8 : try/catch par widget, continue sur fail.
    let outcome: WidgetGenerationOutcome;
    try {
      outcome = await deps.generateWidget(prompt);
    } catch (err) {
      widgetsFailed.push({
        prompt,
        error: err instanceof Error ? err.message : "unknown",
      });
      continue;
    }

    totalCostUsd += outcome.costUsd;

    if (!outcome.ok) {
      widgetsFailed.push({ prompt, error: outcome.error });
      continue;
    }

    // R6 : layout greedy.
    const position = nextPosition(placedPositions, outcome.config.kind);
    try {
      await deps.pinWidget(outcome.config, outcome.data, outcome.explanation, position);
      placedPositions.push(position);
      widgetsOk++;
    } catch (err) {
      widgetsFailed.push({
        prompt,
        error: `pin_failed: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  // Status final selon le résultat.
  const status: StarterStatus =
    widgetsOk === 0 ? "error" : widgetsFailed.length > 0 ? "partial" : "ok";

  return {
    status,
    sourceType,
    widgetsTotal: kit.prompts.length,
    widgetsOk,
    widgetsFailed,
    durationMs: deps.now().getTime() - startedAt,
    costUsd: totalCostUsd,
  };
}
