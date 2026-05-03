/**
 * Tests `starter-kits` — Phase 18 Cycle A T_A3.
 *
 * Vérifie que chaque SourceKind a un kit défini avec 4-5 prompts.
 */

import { describe, it, expect } from "vitest";
import { STARTER_KITS } from "./starter-kits";
import type { SourceKind } from "@/lib/ai-engine/utils/detect-source-type";

const ALL_KINDS: SourceKind[] = [
  "ecommerce",
  "crm",
  "saas",
  "finance",
  "generic",
];

describe("STARTER_KITS", () => {
  it("T_A3.1 — chaque kit a entre 4 et 5 prompts", () => {
    for (const kind of ALL_KINDS) {
      const kit = STARTER_KITS[kind];
      expect(kit, `Kit ${kind} undefined`).toBeDefined();
      expect(kit.prompts.length).toBeGreaterThanOrEqual(4);
      expect(kit.prompts.length).toBeLessThanOrEqual(5);
    }
  });

  it("T_A3.2 — tous les SourceKind ont un kit (5 kinds)", () => {
    expect(Object.keys(STARTER_KITS).sort()).toEqual([...ALL_KINDS].sort());
  });

  it("T_A3.3 — kit ecommerce contient au moins un prompt 'revenu'", () => {
    const prompts = STARTER_KITS.ecommerce.prompts;
    expect(prompts.some((p) => /revenu|chiffre/i.test(p))).toBe(true);
  });

  it("T_A3.4 — kit crm contient au moins un prompt 'pipeline' ou 'deal'", () => {
    const prompts = STARTER_KITS.crm.prompts;
    expect(prompts.some((p) => /pipeline|deal/i.test(p))).toBe(true);
  });

  it("T_A3.5 — chaque prompt est non-vide et > 10 caractères", () => {
    for (const kind of ALL_KINDS) {
      for (const prompt of STARTER_KITS[kind].prompts) {
        expect(prompt.trim().length).toBeGreaterThan(10);
      }
    }
  });
});
