/**
 * TC1 — appendLimitIfMissing : injection LIMIT si absent.
 *
 * Phase 17 cycle C T3.1 (R32, I9). Règles :
 * 1. Si requête contient déjà LIMIT n (insensible casse, hors strings/comments)
 *    → laisser tel quel.
 * 2. Sinon → append ` LIMIT 100` à la fin avant le `;` final éventuel.
 * 3. Pour CTE (`WITH ... SELECT`), LIMIT appliqué au SELECT externe (pas dans CTE).
 */

import { describe, it, expect } from "vitest";
import { appendLimitIfMissing } from "./sql-limit";

describe("appendLimitIfMissing", () => {
  it("SELECT simple sans LIMIT → ajoute LIMIT 100", () => {
    const sql = "SELECT * FROM orders";
    expect(appendLimitIfMissing(sql, 100)).toBe("SELECT * FROM orders LIMIT 100");
  });

  it("SELECT avec LIMIT déjà présent → laisse tel quel", () => {
    const sql = "SELECT * FROM orders LIMIT 50";
    expect(appendLimitIfMissing(sql, 100)).toBe(sql);
  });

  it("SELECT avec LIMIT majuscule mixte → laisse tel quel (insensible casse)", () => {
    const sql = "SELECT * FROM orders LiMiT 50";
    expect(appendLimitIfMissing(sql, 100)).toBe(sql);
  });

  it("SELECT terminé par ; → insère LIMIT avant le ;", () => {
    const sql = "SELECT * FROM orders;";
    expect(appendLimitIfMissing(sql, 100)).toBe("SELECT * FROM orders LIMIT 100;");
  });

  it("SELECT terminé par ;\\n → insère LIMIT avant", () => {
    const sql = "SELECT * FROM orders;\n";
    expect(appendLimitIfMissing(sql, 100)).toBe("SELECT * FROM orders LIMIT 100;\n");
  });

  it("CTE sans LIMIT externe → ajoute LIMIT au SELECT externe", () => {
    const sql = "WITH x AS (SELECT * FROM orders) SELECT * FROM x";
    expect(appendLimitIfMissing(sql, 100)).toBe(
      "WITH x AS (SELECT * FROM orders) SELECT * FROM x LIMIT 100",
    );
  });

  it("CTE avec LIMIT dans le CTE seulement → ajoute LIMIT externe (LIMIT du CTE ne suffit pas)", () => {
    const sql = "WITH x AS (SELECT * FROM orders LIMIT 10) SELECT * FROM x";
    // LIMIT externe absent → on doit ajouter
    const result = appendLimitIfMissing(sql, 100);
    expect(result).toContain("LIMIT 10"); // CTE limit conservé
    expect(result).toMatch(/LIMIT 10\) SELECT.*LIMIT 100/);
  });

  it("LIMIT dans une string → ne match pas", () => {
    const sql = "SELECT * FROM orders WHERE name = 'LIMIT 5'";
    const result = appendLimitIfMissing(sql, 100);
    expect(result).toBe("SELECT * FROM orders WHERE name = 'LIMIT 5' LIMIT 100");
  });

  it("LIMIT dans un commentaire → ne match pas", () => {
    const sql = "SELECT * FROM orders -- LIMIT 5";
    const result = appendLimitIfMissing(sql, 100);
    expect(result).toContain("LIMIT 100");
  });

  it("Custom max → utilise la valeur", () => {
    expect(appendLimitIfMissing("SELECT 1", 50)).toBe("SELECT 1 LIMIT 50");
  });

  it("Trailing whitespace → trim avant ajout", () => {
    expect(appendLimitIfMissing("SELECT 1   ", 100)).toBe("SELECT 1 LIMIT 100");
  });
});
