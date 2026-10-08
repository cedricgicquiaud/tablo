/**
 * TA4 — Validation narrative ≥ 20 caractères (R8, B1).
 *
 * Phase 17 cycle A. Empêche que l'agent retourne un widget sans
 * texte explicatif (juste tool_calls = mauvaise UX).
 */

import { describe, it, expect } from "vitest";
import { validateNarrative } from "./narrative";
import { NARRATIVE_MIN_CHARS } from "../agents/v1/config";

describe("validateNarrative", () => {
  it("texte vide → erreur", () => {
    const result = validateNarrative("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("narrative manquante");
  });

  it("texte 19 caractères → erreur (sous le seuil 20)", () => {
    const result = validateNarrative("a".repeat(19));
    expect(result.ok).toBe(false);
  });

  it(`texte exactement ${NARRATIVE_MIN_CHARS} caractères → ok`, () => {
    const result = validateNarrative("a".repeat(NARRATIVE_MIN_CHARS));
    expect(result.ok).toBe(true);
  });

  it("texte long → ok", () => {
    const result = validateNarrative("Voici un widget qui montre votre revenu.");
    expect(result.ok).toBe(true);
  });

  it("whitespace only → erreur (trim avant comptage)", () => {
    const result = validateNarrative("   \n\t   ");
    expect(result.ok).toBe(false);
  });
});
