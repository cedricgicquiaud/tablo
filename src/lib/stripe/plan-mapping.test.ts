/**
 * Tests `companySizeToPlan` — Phase 14.2 T1.
 *
 * `companies.size` est un bucket text (cf. CRM démo réel) :
 * - "1-10", "11-50" → starter
 * - "51-200", "201-500" → business
 * - "500+" → enterprise
 * - autre → fallback enterprise (cas suspect)
 */

import { describe, it, expect } from "vitest";
import { companySizeToPlan } from "./plan-mapping";

describe("companySizeToPlan", () => {
  it('size="1-10" → starter', () => {
    expect(companySizeToPlan("1-10")).toBe("starter");
  });

  it('size="11-50" → starter', () => {
    expect(companySizeToPlan("11-50")).toBe("starter");
  });

  it('size="51-200" → business', () => {
    expect(companySizeToPlan("51-200")).toBe("business");
  });

  it('size="201-500" → business', () => {
    expect(companySizeToPlan("201-500")).toBe("business");
  });

  it('size="500+" → enterprise', () => {
    expect(companySizeToPlan("500+")).toBe("enterprise");
  });

  it('size inconnu → fallback enterprise (prudent)', () => {
    expect(companySizeToPlan("unknown")).toBe("enterprise");
    expect(companySizeToPlan("")).toBe("enterprise");
  });
});
