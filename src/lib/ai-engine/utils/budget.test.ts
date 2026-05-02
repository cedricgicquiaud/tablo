/**
 * TA3 — Budget cap dollars par session runAgent (R5bis).
 *
 * Phase 17 cycle A T1.6. Empêche l'IA de boucler et consommer des tokens
 * sans limite. Hard cap à BUDGET_CAP_USD ($0.05 défaut).
 */

import { describe, it, expect } from "vitest";
import { checkBudgetCap } from "./budget";
import { BUDGET_CAP_USD } from "../agents/v1/config";

describe("checkBudgetCap", () => {
  it("0 tokens → ok", () => {
    const result = checkBudgetCap(0, 0);
    expect(result.ok).toBe(true);
  });

  it("usage modeste haiku-4-5 (1k input + 500 output) → ok", () => {
    // haiku : input $1/M, output $5/M → 0.001 + 0.0025 = $0.0035
    const result = checkBudgetCap(1000, 500);
    expect(result.ok).toBe(true);
  });

  it(`usage cumulé > ${BUDGET_CAP_USD} → erreur`, () => {
    // haiku : pour dépasser $0.05, need ~50k input ou 10k output
    const result = checkBudgetCap(10_000, 10_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("budget exceeded");
      expect(result.error).toContain(`${BUDGET_CAP_USD}`);
    }
  });

  it("Au seuil exact (cost = BUDGET_CAP_USD) → ok (non strict)", () => {
    // 50k input × $1/M = $0.05 exactement
    const result = checkBudgetCap(50_000, 0);
    expect(result.ok).toBe(true);
  });

  it("1 cent au-dessus du seuil → erreur", () => {
    // 51k input × $1/M = $0.051
    const result = checkBudgetCap(51_000, 0);
    expect(result.ok).toBe(false);
  });
});
