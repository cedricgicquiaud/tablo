/**
 * TA5 — Retry cap par tool dans une session runAgent (R8bis).
 *
 * Phase 17 cycle A T1.6. Si l'IA appelle 4 fois le même tool dans une
 * session (3 retries OK, 4ᵉ KO), retour erreur structurée pour empêcher
 * les boucles infinies.
 */

import { describe, it, expect } from "vitest";
import { incrementRetry, recordToolCall } from "./retry-tracker";
import { MAX_RETRIES_PER_TOOL } from "../agents/v1/config";

describe("incrementRetry", () => {
  it("1ᵉʳ appel → ok, count = 1", () => {
    const counters = new Map<string, number>();
    const result = incrementRetry(counters, "list_tables");
    expect(result.ok).toBe(true);
    expect(counters.get("list_tables")).toBe(1);
  });

  it(`exactement ${MAX_RETRIES_PER_TOOL} appels → ok (cap = max attempts)`, () => {
    const counters = new Map<string, number>();
    for (let i = 0; i < MAX_RETRIES_PER_TOOL; i++) {
      const result = incrementRetry(counters, "execute_sql");
      expect(result.ok).toBe(true);
    }
    expect(counters.get("execute_sql")).toBe(MAX_RETRIES_PER_TOOL);
  });

  it(`${MAX_RETRIES_PER_TOOL + 1}ᵉ appel même tool → erreur`, () => {
    const counters = new Map<string, number>();
    for (let i = 0; i < MAX_RETRIES_PER_TOOL; i++) {
      incrementRetry(counters, "execute_sql");
    }
    const result = incrementRetry(counters, "execute_sql");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("execute_sql");
      expect(result.error).toContain("failed");
    }
  });

  it("compteurs séparés par tool name", () => {
    const counters = new Map<string, number>();
    incrementRetry(counters, "list_tables");
    incrementRetry(counters, "list_tables");
    incrementRetry(counters, "inspect_table");
    expect(counters.get("list_tables")).toBe(2);
    expect(counters.get("inspect_table")).toBe(1);
    // les deux peuvent encore être call MAX_RETRIES fois chacun
    const result = incrementRetry(counters, "inspect_table");
    expect(result.ok).toBe(true);
  });
});

describe("recordToolCall (cycle C)", () => {
  it("succès → reset le compteur à 0", () => {
    const counters = new Map<string, number>();
    counters.set("execute_sql", 2);
    const result = recordToolCall(counters, "execute_sql", false);
    expect(result.ok).toBe(true);
    expect(counters.get("execute_sql")).toBe(0);
  });

  it("échec → incrémente comme incrementRetry", () => {
    const counters = new Map<string, number>();
    const result = recordToolCall(counters, "execute_sql", true);
    expect(result.ok).toBe(true);
    expect(counters.get("execute_sql")).toBe(1);
  });

  it("3 échecs consécutifs → ok jusqu'au 3ᵉ, KO au 4ᵉ", () => {
    const counters = new Map<string, number>();
    for (let i = 0; i < MAX_RETRIES_PER_TOOL; i++) {
      const r = recordToolCall(counters, "execute_sql", true);
      expect(r.ok).toBe(true);
    }
    const r4 = recordToolCall(counters, "execute_sql", true);
    expect(r4.ok).toBe(false);
    if (!r4.ok) {
      expect(r4.error).toContain("consecutively");
    }
  });

  it("5 appels exploratoires successifs (tous succès) → tous ok (cas execute_sql légitime)", () => {
    const counters = new Map<string, number>();
    for (let i = 0; i < 5; i++) {
      const r = recordToolCall(counters, "execute_sql", false);
      expect(r.ok).toBe(true);
    }
  });

  it("succès intercalé entre échecs → reset le compteur (échecs non consécutifs)", () => {
    const counters = new Map<string, number>();
    recordToolCall(counters, "execute_sql", true); // count=1
    recordToolCall(counters, "execute_sql", true); // count=2
    recordToolCall(counters, "execute_sql", false); // reset → 0
    recordToolCall(counters, "execute_sql", true); // count=1
    recordToolCall(counters, "execute_sql", true); // count=2
    const r = recordToolCall(counters, "execute_sql", true); // count=3 → ok
    expect(r.ok).toBe(true);
  });
});
