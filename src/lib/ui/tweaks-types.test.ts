import { describe, it, expect } from "vitest";
import {
  PALETTES,
  PALETTE_LABELS,
  PALETTE_DESCRIPTIONS,
  PALETTE_SWATCH,
  PALETTE_GROUPS,
} from "./tweaks-types";

describe("tweaks-types · palettes", () => {
  it("expose 9 palettes (5 legacy + 4 Tablo)", () => {
    expect(PALETTES).toHaveLength(9);
  });

  it("contient les 4 palettes Tablo", () => {
    expect(PALETTES).toContain("steel");
    expect(PALETTES).toContain("spectrum");
    expect(PALETTES).toContain("sunset");
    expect(PALETTES).toContain("citrus");
  });

  it("conserve les 5 palettes legacy (rétro-compat cookies)", () => {
    expect(PALETTES).toContain("terracotta");
    expect(PALETTES).toContain("editorial");
    expect(PALETTES).toContain("forest");
    expect(PALETTES).toContain("midnight");
    expect(PALETTES).toContain("mono");
  });

  it("PALETTE_LABELS couvre les 9 palettes", () => {
    for (const p of PALETTES) {
      expect(PALETTE_LABELS[p]).toBeTruthy();
    }
  });

  it("PALETTE_DESCRIPTIONS couvre les 9 palettes", () => {
    for (const p of PALETTES) {
      expect(PALETTE_DESCRIPTIONS[p]).toBeTruthy();
    }
  });

  it("PALETTE_SWATCH couvre les 9 palettes", () => {
    for (const p of PALETTES) {
      expect(PALETTE_SWATCH[p]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("PALETTE_GROUPS sépare Tablo et Legacy", () => {
    expect(PALETTE_GROUPS.tablo).toEqual(["steel", "spectrum", "sunset", "citrus"]);
    expect(PALETTE_GROUPS.legacy).toEqual([
      "terracotta",
      "editorial",
      "forest",
      "midnight",
      "mono",
    ]);
  });
});
