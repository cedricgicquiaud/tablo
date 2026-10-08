import { describe, expect, it } from "vitest";
import { seedReferenceDate } from "./reference-date";

describe("seedReferenceDate", () => {
  it("part du jour courant, à midi UTC : la vitrine a toujours des données récentes", () => {
    const now = new Date("2026-10-08T07:42:13Z");
    expect(seedReferenceDate(now).toISOString()).toBe("2026-10-08T12:00:00.000Z");
  });

  it("accepte une date imposée (SEED_NOW) pour rejouer un jeu de données à l'identique", () => {
    const now = new Date("2026-10-08T07:42:13Z");
    expect(seedReferenceDate(now, "2026-04-26").toISOString()).toBe("2026-04-26T12:00:00.000Z");
  });

  it("refuse une date imposée illisible", () => {
    expect(() => seedReferenceDate(new Date(), "demain")).toThrow(/SEED_NOW/);
  });
});
