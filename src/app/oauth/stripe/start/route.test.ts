/**
 * Tests Route /oauth/stripe/start — Phase 14.4 C2.
 *
 * Couvre R6 + E1.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("GET /oauth/stripe/start", () => {
  it("E1 — env STRIPE_CONNECT_CLIENT_ID manquant → 500 message clair", async () => {
    delete process.env.STRIPE_CONNECT_CLIENT_ID;

    const { GET } = await import("./route");
    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/STRIPE_CONNECT_CLIENT_ID/);
  });

  it("R6 — env présent → redirect URL Stripe Connect + cookie state set", async () => {
    process.env.STRIPE_CONNECT_CLIENT_ID = "ca_test_xxxxx";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    const { GET } = await import("./route");
    const res = await GET();

    expect(res.status).toBe(307); // Next.js redirect default
    const location = res.headers.get("location");
    expect(location).toContain("https://connect.stripe.com/oauth/v2/authorize");
    expect(location).toContain("client_id=ca_test_xxxxx");
    expect(location).toContain("scope=read_only");
    expect(location).toContain("redirect_uri=");

    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toContain("tablo_stripe_oauth_state");
    expect(cookieHeader).toContain("HttpOnly");
  });
});
