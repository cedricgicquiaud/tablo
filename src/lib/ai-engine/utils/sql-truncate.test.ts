/**
 * TC2 — truncateJsonResult : tronque les rows tout en gardant un JSON valide.
 *
 * Phase 17 cycle C T3.1 (R33, B4).
 *
 * Règles :
 * 1. Si JSON.stringify(rows) <= maxChars → retourner les rows tels quels
 * 2. Sinon → tronquer en gardant un JSON valide :
 *    { "columns": [...], "rows": [...partial], "_truncated": true,
 *      "_truncated_reason": "5000 chars limit", "_total_rows": N }
 * 3. Si UNE seule ligne dépasse maxChars → return
 *    { "_error": "single row too large to display" }
 */

import { describe, it, expect } from "vitest";
import { truncateJsonResult } from "./sql-truncate";

describe("truncateJsonResult", () => {
  it("rows sous le seuil → retourne tel quel (pas de tronquage)", () => {
    const rows = [{ id: 1, name: "alice" }];
    const result = truncateJsonResult(rows, 5000);
    expect(result).toEqual({ rows, _truncated: false });
  });

  it("rows array vide → tel quel", () => {
    const result = truncateJsonResult([], 5000);
    expect(result).toEqual({ rows: [], _truncated: false });
  });

  it("rows dépassent le seuil → tronqué + flag _truncated", () => {
    // 100 rows × 50 chars JSON ≈ 5000 chars
    const rows = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `user${i.toString().padStart(40, "_")}`,
    }));
    const result = truncateJsonResult(rows, 1000);
    expect(result._truncated).toBe(true);
    expect(result.rows.length).toBeLessThan(100);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result._total_rows).toBe(100);
  });

  it("résultat tronqué reste un JSON valide (parseable)", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: i, blob: "x".repeat(200) }));
    const result = truncateJsonResult(rows, 500);
    // Sérialiser puis parser → ne doit pas throw
    const json = JSON.stringify(result);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(result._truncated).toBe(true);
  });

  it("une seule row dépasse maxChars → _error", () => {
    const giantRow = { id: 1, blob: "x".repeat(10000) };
    const result = truncateJsonResult([giantRow], 1000);
    expect(result._error).toContain("single row too large");
  });

  it("_truncated_reason présent et descriptif", () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: i, name: "x".repeat(50) }));
    const result = truncateJsonResult(rows, 1000);
    if (result._truncated) {
      expect(result._truncated_reason).toContain("1000");
    }
  });
});
