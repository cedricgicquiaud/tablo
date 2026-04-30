import { describe, expect, it } from "vitest";
import { shouldRefresh } from "./token-refresh";

describe("shouldRefresh", () => {
  it("retourne true si expires_at est dans le passé", () => {
    expect(shouldRefresh(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });

  it("retourne true si expires_at - now < 60s", () => {
    expect(shouldRefresh(new Date(Date.now() + 30_000).toISOString())).toBe(true);
  });

  it("retourne false si expires_at - now > 60s", () => {
    expect(shouldRefresh(new Date(Date.now() + 600_000).toISOString())).toBe(false);
  });

  it("retourne true si expires_at invalide (safety net)", () => {
    expect(shouldRefresh("not-a-date")).toBe(true);
  });
});
