/**
 * Budget cap par session runAgent (R5bis).
 *
 * Phase 17 cycle A T1.6. Empêche l'IA de boucler infiniment et de
 * consommer des tokens sans limite. Hard cap à BUDGET_CAP_USD.
 *
 * Le seuil est NON-strict : on accepte exactement BUDGET_CAP_USD,
 * on rejette au-dessus.
 */

import { BUDGET_CAP_USD, estimateCostUsd } from "../agents/v1/config";

export type BudgetCheck =
  | { ok: true; costUsd: number }
  | { ok: false; costUsd: number; error: string };

export function checkBudgetCap(inputTokens: number, outputTokens: number): BudgetCheck {
  const costUsd = estimateCostUsd(inputTokens, outputTokens);
  if (costUsd > BUDGET_CAP_USD) {
    return {
      ok: false,
      costUsd,
      error: `budget exceeded ($${costUsd.toFixed(4)} > $${BUDGET_CAP_USD})`,
    };
  }
  return { ok: true, costUsd };
}
