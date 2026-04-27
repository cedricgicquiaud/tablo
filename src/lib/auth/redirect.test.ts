import { describe, expect, it } from "vitest";
import { decideAuthRedirect } from "./redirect";

describe("decideAuthRedirect", () => {
  it("anonyme sur /app → redirect /login", () => {
    expect(decideAuthRedirect("/app", false)).toEqual({
      kind: "redirect",
      to: "/login",
    });
  });

  it("anonyme sur /app/dashboards/abc → redirect /login", () => {
    expect(decideAuthRedirect("/app/dashboards/abc", false)).toEqual({
      kind: "redirect",
      to: "/login",
    });
  });

  it("authentifié sur /login → redirect /app", () => {
    expect(decideAuthRedirect("/login", true)).toEqual({
      kind: "redirect",
      to: "/app",
    });
  });

  it("authentifié sur /signup → redirect /app", () => {
    expect(decideAuthRedirect("/signup", true)).toEqual({
      kind: "redirect",
      to: "/app",
    });
  });

  it("authentifié sur / → redirect /app", () => {
    expect(decideAuthRedirect("/", true)).toEqual({
      kind: "redirect",
      to: "/app",
    });
  });

  it("anonyme sur / → redirect /login", () => {
    expect(decideAuthRedirect("/", false)).toEqual({
      kind: "redirect",
      to: "/login",
    });
  });

  it("authentifié sur /app → next", () => {
    expect(decideAuthRedirect("/app", true)).toEqual({ kind: "next" });
  });

  it("anonyme sur /login → next", () => {
    expect(decideAuthRedirect("/login", false)).toEqual({ kind: "next" });
  });

  it("anonyme sur /signup → next", () => {
    expect(decideAuthRedirect("/signup", false)).toEqual({ kind: "next" });
  });

  it("anonyme sur /demo → next (showroom public)", () => {
    expect(decideAuthRedirect("/demo", false)).toEqual({ kind: "next" });
  });

  it("authentifié sur /demo → next (accessible aussi quand connecté)", () => {
    expect(decideAuthRedirect("/demo", true)).toEqual({ kind: "next" });
  });
});
