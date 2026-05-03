/**
 * Tests helpers OAuth Stripe Connect — Phase 14.4 C2.
 *
 * Couvre R6 (URL authorize), R7 step 2 (token exchange), E11 (application_not_found).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeAuthorizationCode,
  StripeOAuthError,
} from "./oauth";

describe("buildAuthorizeUrl", () => {
  it("génère URL Stripe Connect conforme avec params requis", () => {
    const url = buildAuthorizeUrl({
      clientId: "ca_test_xxxxx",
      state: "abc123",
      redirectUri: "http://localhost:3000/oauth/stripe/callback",
      scopes: ["read_only"],
    });

    expect(url).toContain("https://connect.stripe.com/oauth/v2/authorize");
    expect(url).toContain("response_type=code");
    expect(url).toContain("client_id=ca_test_xxxxx");
    expect(url).toContain("scope=read_only");
    expect(url).toContain("state=abc123");
    expect(url).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fstripe%2Fcallback",
    );
  });

  it("supporte plusieurs scopes joins par un espace url-encoded", () => {
    const url = buildAuthorizeUrl({
      clientId: "ca_x",
      state: "s",
      redirectUri: "http://x",
      scopes: ["read_only", "read_write"],
    });

    expect(url).toContain("scope=read_only+read_write");
  });
});

describe("exchangeAuthorizationCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne les tokens si Stripe répond 200 OK", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "sk_test_acc_xxx",
          refresh_token: "rt_xxx",
          stripe_user_id: "acct_test_xxx",
          livemode: false,
          scope: "read_only",
          token_type: "bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await exchangeAuthorizationCode("ac_test_xxx", "sk_test_secret");

    expect(result).toMatchObject({
      access_token: "sk_test_acc_xxx",
      refresh_token: "rt_xxx",
      stripe_user_id: "acct_test_xxx",
      livemode: false,
      scope: "read_only",
    });
  });

  it("E11 — Stripe répond avec error: application_not_found → throw StripeOAuthError(setup)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "application_not_found",
          error_description: "...",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );

    let caught: unknown;
    try {
      await exchangeAuthorizationCode("ac_x", "sk_test_x");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(StripeOAuthError);
    expect((caught as StripeOAuthError).code).toBe("application_not_found");
  });

  it("E4 — Stripe répond avec error invalid_grant (code expired) → throw StripeOAuthError(grant)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "invalid_grant", error_description: "Code expired" }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      exchangeAuthorizationCode("ac_expired", "sk_test_x"),
    ).rejects.toThrow(/invalid_grant/);
  });

  it("propage erreur réseau (fetch throw)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      exchangeAuthorizationCode("ac_x", "sk_x"),
    ).rejects.toThrow(/ECONNREFUSED/);
  });
});
