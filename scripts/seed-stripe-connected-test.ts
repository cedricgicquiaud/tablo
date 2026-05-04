/**
 * Seed Stripe test sur compte connecté (OAuth Standard) — Phase 14.4 smoke S7.
 *
 * Crée 30 customers + 20 subscriptions (mix starter/business) sur le compte
 * connecté `acct_1TTJbPQ5yHNQiOTp` via `Stripe-Account` header pattern (pas
 * besoin de décrypter le token user — utilise STRIPE_SECRET_KEY de plateforme).
 *
 * collection_method='send_invoice' pour éviter les contraintes payment method
 * sur compte connecté en vérification.
 *
 * Usage : bun run scripts/seed-stripe-connected-test.ts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
import Stripe from "stripe";

const CONNECTED_ACCOUNT_ID = "acct_1TTJbPQ5yHNQiOTp";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const opts = { stripeAccount: CONNECTED_ACCOUNT_ID };

const SEED_TAG = "v1-connected-smoke";

async function main() {
  console.log(`[seed] Target connected account: ${CONNECTED_ACCOUNT_ID}`);

  // 1. Product + 2 prices
  console.log("[seed] Creating product + prices…");
  const product = await stripe.products.create(
    { name: "Tablo Demo Plan", metadata: { tablo_seed: SEED_TAG } },
    opts,
  );
  const starterPrice = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: 2900,
      currency: "eur",
      recurring: { interval: "month" },
      nickname: "starter",
      metadata: { plan: "starter", tablo_seed: SEED_TAG },
    },
    opts,
  );
  const businessPrice = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: 9900,
      currency: "eur",
      recurring: { interval: "month" },
      nickname: "business",
      metadata: { plan: "business", tablo_seed: SEED_TAG },
    },
    opts,
  );
  console.log(`[seed] Product ${product.id} + prices created.`);

  // 2. Customers + subscriptions
  console.log("[seed] Creating 30 customers + 20 subscriptions…");
  for (let i = 0; i < 30; i++) {
    const customer = await stripe.customers.create(
      {
        email: `customer${i}@tablo-demo.test`,
        name: `Demo Customer ${i}`,
        metadata: { tablo_seed: SEED_TAG, idx: String(i) },
      },
      opts,
    );

    if (i < 20) {
      const isBusiness = i % 3 === 0;
      const priceId = isBusiness ? businessPrice.id : starterPrice.id;
      await stripe.subscriptions.create(
        {
          customer: customer.id,
          items: [{ price: priceId }],
          collection_method: "send_invoice",
          days_until_due: 30,
          metadata: {
            tablo_seed: SEED_TAG,
            plan: isBusiness ? "business" : "starter",
          },
        },
        opts,
      );
    }
    if ((i + 1) % 10 === 0) console.log(`[seed]  …${i + 1} customers done`);
  }

  console.log("[seed] Done. Refresh Tablo and retest chat.");
}

main().catch((err) => {
  console.error("[seed] FAILED:", err.message);
  process.exit(1);
});
