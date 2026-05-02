/**
 * TA11 — Mapping erreurs Anthropic SDK vers messages structurés FR (R6, I1).
 *
 * Phase 17 cycle A. Préserve la logique d'erreurs du legacy
 * `src/lib/ai/generate-widget.ts:217-238`.
 */

import { describe, it, expect } from "vitest";
import { mapAnthropicError } from "./error-mapper";

describe("mapAnthropicError", () => {
  it("rate limit → message FR explicite", () => {
    const err = new Error("rate limit exceeded");
    expect(mapAnthropicError(err)).toContain("Rate limit Anthropic");
  });

  it("rate limit avec underscore → matché aussi", () => {
    const err = new Error("rate_limit_error: too many requests");
    expect(mapAnthropicError(err)).toContain("Rate limit Anthropic");
  });

  it("auth invalide → message FR explicite", () => {
    const err = new Error("authentication_error: invalid API key");
    expect(mapAnthropicError(err)).toContain("Clé Anthropic invalide");
  });

  it("invalid_key → mappé comme auth", () => {
    const err = new Error("invalid api key provided");
    expect(mapAnthropicError(err)).toContain("Clé Anthropic invalide");
  });

  it("credit balance insuffisant → message FR avec lien billing", () => {
    const err = new Error("invalid_request_error: Your credit balance is too low");
    const msg = mapAnthropicError(err);
    expect(msg).toContain("Crédits Anthropic");
    expect(msg).toContain("billing");
  });

  it("erreur inconnue → fallback générique avec message original", () => {
    const err = new Error("Some random Anthropic API error 503");
    const msg = mapAnthropicError(err);
    expect(msg).toContain("Erreur Anthropic");
    expect(msg).toContain("503");
  });

  it("non-Error thrown (string) → fallback safe", () => {
    expect(mapAnthropicError("plain string")).toContain("Erreur Anthropic");
  });

  it("non-Error thrown (undefined) → fallback safe", () => {
    expect(mapAnthropicError(undefined)).toContain("Erreur Anthropic");
  });
});
