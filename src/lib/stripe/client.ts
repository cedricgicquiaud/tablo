/**
 * Lazy Stripe client avec garde sécurité (Phase 14.2 R7).
 *
 * Refuse `sk_live_*` au démarrage : pas de risque de polluer un compte
 * Stripe prod par accident. Le seed Stripe et les Phases 14.3 / 14.4
 * (DataSource adapter, OAuth Connect) utilisent ce helper pour garantir
 * que le test mode est respecté côté CLI / scripts.
 *
 * Côté Stripe Connect (Phase 14.4 future), les access_tokens user sont
 * gérés différemment (OAuth tokens chiffrés en DB), pas via cette
 * variable d'environnement.
 */

import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cached) return cached;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY manquante dans .env.local. " +
        "Récupère-la sur https://dashboard.stripe.com/test/apikeys",
    );
  }
  if (!apiKey.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_SECRET_KEY doit être en test mode (sk_test_*). " +
        "Refus de pollution compte prod.",
    );
  }
  cached = new Stripe(apiKey);
  return cached;
}
