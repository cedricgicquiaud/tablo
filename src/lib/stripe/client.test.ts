/**
 * Tests `getStripeClient` — Phase 14.2 T2.
 *
 * Garde sécurité : refuse `sk_live_*` pour empêcher pollution prod
 * en cas de mauvaise variable d'environnement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getStripeClient", () => {
  const originalEnv = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    // Reset le cache module pour que `getStripeClient` ré-évalue
    // process.env à chaque test.
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) process.env.STRIPE_SECRET_KEY = originalEnv;
    else delete process.env.STRIPE_SECRET_KEY;
  });

  it("STRIPE_SECRET_KEY manquante → throw 'manquante'", async () => {
    const { getStripeClient } = await import("./client");
    expect(() => getStripeClient()).toThrow(/manquante/i);
  });

  it("sk_live_xxx → throw 'test mode'", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_dangerous_key_should_be_refused";
    const { getStripeClient } = await import("./client");
    expect(() => getStripeClient()).toThrow(/test mode/i);
  });

  it("sk_test_xxx → retourne instance Stripe", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_unit_test";
    const { getStripeClient } = await import("./client");
    const client = getStripeClient();
    expect(client).toBeDefined();
    expect(client.customers).toBeDefined();
    expect(client.products).toBeDefined();
  });
});
