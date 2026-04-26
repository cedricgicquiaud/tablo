import { describe, expect, it } from "vitest";
import { decideAuthRedirect } from "./redirect";

describe("decideAuthRedirect", () => {
  it("R15 — anonyme sur /dashboard → redirect /login", () => {
    expect(decideAuthRedirect("/dashboard", false)).toEqual({
      kind: "redirect",
      to: "/login",
    });
  });

  it("R15 — anonyme sur sous-route /dashboard/users → redirect /login", () => {
    expect(decideAuthRedirect("/dashboard/users", false)).toEqual({
      kind: "redirect",
      to: "/login",
    });
  });

  it("R16 — authentifié sur /login → redirect /dashboard", () => {
    expect(decideAuthRedirect("/login", true)).toEqual({
      kind: "redirect",
      to: "/dashboard",
    });
  });

  it("authentifié sur / → redirect /dashboard", () => {
    expect(decideAuthRedirect("/", true)).toEqual({
      kind: "redirect",
      to: "/dashboard",
    });
  });

  it("anonyme sur / → redirect /login", () => {
    expect(decideAuthRedirect("/", false)).toEqual({
      kind: "redirect",
      to: "/login",
    });
  });

  it("authentifié sur /dashboard → next", () => {
    expect(decideAuthRedirect("/dashboard", true)).toEqual({ kind: "next" });
  });

  it("anonyme sur /login → next", () => {
    expect(decideAuthRedirect("/login", false)).toEqual({ kind: "next" });
  });
});
