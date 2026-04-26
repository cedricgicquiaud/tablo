import { describe, expect, it } from "vitest";
import { formatCompactCents, formatCents, formatDeltaPct } from "./cents";

describe("formatCents", () => {
  it("convertit cents → unité avec virgule pour milliers", () => {
    expect(formatCents(12300)).toBe("123");
    expect(formatCents(0)).toBe("0");
    expect(formatCents(99)).toBe("0,99");
  });
});

describe("formatCompactCents", () => {
  it("rend les nombres compacts (K, M)", () => {
    expect(formatCompactCents(0)).toBe("0");
    expect(formatCompactCents(99_900)).toBe("999");
    expect(formatCompactCents(123_400)).toBe("1,2K");
    expect(formatCompactCents(27_800_000)).toBe("278K");
    expect(formatCompactCents(1_500_000_000)).toBe("15M");
  });
});

describe("formatDeltaPct", () => {
  it("ajoute le signe et arrondit à 1 décimale", () => {
    expect(formatDeltaPct(12.4)).toBe("+12,4%");
    expect(formatDeltaPct(-4.78)).toBe("-4,8%");
    expect(formatDeltaPct(0)).toBe("+0,0%");
  });
});
