/**
 * Tests config — Phase 17.1 Cycle B.
 *
 * Couvre `estimateCostUsd` avec breakdown cache (input non-cache, output,
 * cache write 1.25×, cache read 0.10×).
 */

import { describe, it, expect } from "vitest";
import { estimateCostUsd } from "./config";

describe("estimateCostUsd — breakdown cache (P17.1 Cycle B)", () => {
  it("legacy 2-args (input + output) — comportement préservé", () => {
    // 1000 input × $1/M + 500 output × $5/M = $0.001 + $0.0025 = $0.0035
    expect(estimateCostUsd(1000, 500)).toBeCloseTo(0.0035, 7);
  });

  it("cache write seul (1.25× input price)", () => {
    // 5000 cache_creation × $1.25/M = $0.00625
    expect(estimateCostUsd(0, 0, 5000, 0)).toBeCloseTo(0.00625, 7);
  });

  it("cache read seul (0.10× input price)", () => {
    // 10000 cache_read × $0.10/M = $0.001
    expect(estimateCostUsd(0, 0, 0, 10000)).toBeCloseTo(0.001, 7);
  });

  it("breakdown complet (input + output + cache write + cache read)", () => {
    // 1000 input × $1/M = $0.001
    // 500 output × $5/M = $0.0025
    // 5000 cache_write × $1.25/M = $0.00625
    // 10000 cache_read × $0.10/M = $0.001
    // Total = $0.01075
    expect(estimateCostUsd(1000, 500, 5000, 10000)).toBeCloseTo(0.01075, 7);
  });

  it("scénario typique cycle B : 5 prompts avec 1 cache miss + 4 cache hits", () => {
    // Hypothèse : SYSTEM + TOOLS = ~2000 tokens cachés
    // Run 1 : 100 input non-cache + 2000 cache write + 500 output
    // Runs 2-5 : 100 input non-cache + 2000 cache read + 500 output (×4)
    // Total : 500 input + 2500 output + 2000 write + 8000 read
    const cost = estimateCostUsd(500, 2500, 2000, 8000);
    // = $0.0005 + $0.0125 + $0.0025 + $0.0008 = $0.0163
    expect(cost).toBeCloseTo(0.0163, 4);
  });
});
