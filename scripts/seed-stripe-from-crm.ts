/**
 * Seed Stripe test depuis CRM démo distante — Phase 14.2 Cycle A.
 *
 * Crée Customers (~200), Subscriptions (~165 starter+business),
 * et Invoices (~168 deals Closed Won) côté Stripe test mode.
 * La DB CRM n'est jamais écrite — la liaison se fait via metadata
 * `crm_company_id` / `crm_deal_id` côté Stripe uniquement.
 *
 * Usage :
 *   bun run scripts/seed-stripe-from-crm.ts
 *
 * Pré-requis :
 *   STRIPE_SECRET_KEY=sk_test_... (refus sk_live_)
 *   CRM_DEMO_DATABASE_URL=postgresql://...
 *
 * Idempotent : 2× run = 2nd run skip toutes les entités déjà créées
 * (recherche via metadata Stripe).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { Client as PgClient } from "pg";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { companySizeToPlan, type StripePlan } from "@/lib/stripe/plan-mapping";
import { withRetry as sharedWithRetry } from "@/lib/utils/retry";

const SEED_TAG = "v1";

type CompanyRow = {
  id: string;
  name: string;
  size: string;
  primary_email: string | null;
};

type DealRow = {
  id: string;
  name: string;
  company_id: string;
  amount_cents: number;
};

type Prices = {
  productId: string;
  starterPriceId: string;
  businessPriceId: string;
};

type Stats = { created: number; skipped: number; failed: number };

/**
 * Wrapper local autour du helper partagé `withRetry` (P14.3 P0) qui
 * accepte le pattern positionnel `(label, fn)` historique du seed.
 * Le helper partagé gère la détection 429 (`statusCode` ou message).
 */
function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  return sharedWithRetry(fn, { label });
}

/**
 * R2 — Crée Product "Cipher" + 2 Prices recurring (starter 99€, business 999€)
 * idempotent via metadata `tablo_seed: v1`.
 *
 * "Cipher" est un persona inventé : un SaaS B2B fictif vendu aux ~200
 * customers de la démo CRM. Distinct de Tablo (notre app).
 */
async function ensureProductAndPrices(stripe: Stripe): Promise<Prices> {
  console.log("[setup] Vérification Product + Prices…");
  // Recherche Product existant
  const products = await withRetry("products.list", () =>
    stripe.products.list({ limit: 100 }),
  );
  const existingProduct = products.data.find(
    (p) => p.metadata?.tablo_seed === SEED_TAG,
  );

  let productId: string;
  if (existingProduct) {
    productId = existingProduct.id;
    console.log(`[setup] Product trouvé : ${productId}`);
  } else {
    const created = await withRetry("products.create", () =>
      stripe.products.create({
        name: "Cipher",
        description: "Plateforme collaborative SaaS B2B (persona démo)",
        metadata: { tablo_seed: SEED_TAG },
      }),
    );
    productId = created.id;
    console.log(`[setup] Product créé : ${productId}`);
  }

  // Recherche Prices existants pour ce Product
  const prices = await withRetry("prices.list", () =>
    stripe.prices.list({ product: productId, limit: 100 }),
  );
  const existingStarter = prices.data.find(
    (p) => p.metadata?.plan === "starter" && p.metadata?.tablo_seed === SEED_TAG,
  );
  const existingBusiness = prices.data.find(
    (p) => p.metadata?.plan === "business" && p.metadata?.tablo_seed === SEED_TAG,
  );

  let starterPriceId: string;
  if (existingStarter) {
    starterPriceId = existingStarter.id;
    console.log(`[setup] Price starter trouvé : ${starterPriceId}`);
  } else {
    const p = await withRetry("prices.create starter", () =>
      stripe.prices.create({
        product: productId,
        unit_amount: 9900,
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { plan: "starter", tablo_seed: SEED_TAG },
      }),
    );
    starterPriceId = p.id;
    console.log(`[setup] Price starter créé : ${starterPriceId}`);
  }

  let businessPriceId: string;
  if (existingBusiness) {
    businessPriceId = existingBusiness.id;
    console.log(`[setup] Price business trouvé : ${businessPriceId}`);
  } else {
    const p = await withRetry("prices.create business", () =>
      stripe.prices.create({
        product: productId,
        unit_amount: 99900,
        currency: "eur",
        recurring: { interval: "month" },
        metadata: { plan: "business", tablo_seed: SEED_TAG },
      }),
    );
    businessPriceId = p.id;
    console.log(`[setup] Price business créé : ${businessPriceId}`);
  }

  return { productId, starterPriceId, businessPriceId };
}

/**
 * R3 — Boucle companies → Customer (+ Subscription si starter/business).
 */
async function seedCustomersFromCompanies(
  pg: PgClient,
  stripe: Stripe,
  prices: Prices,
): Promise<Stats & { companyToCustomer: Map<string, string> }> {
  // Lecture DB CRM read-only avec primary contact (1er contact par company_id).
  const result = await pg.query<CompanyRow>(`
    SELECT
      c.id::text AS id,
      c.name,
      c.size,
      (SELECT email
       FROM contacts
       WHERE company_id = c.id AND email IS NOT NULL
       ORDER BY id LIMIT 1) AS primary_email
    FROM companies c
    ORDER BY c.id
  `);

  const stats: Stats = { created: 0, skipped: 0, failed: 0 };
  const map = new Map<string, string>();

  for (const row of result.rows) {
    const plan: StripePlan = companySizeToPlan(row.size);
    const priceId =
      plan === "starter"
        ? prices.starterPriceId
        : plan === "business"
          ? prices.businessPriceId
          : null;

    try {
      // Idempotence : search via metadata
      const search = await withRetry("customers.search", () =>
        stripe.customers.search({
          query: `metadata["crm_company_id"]:"${row.id}" AND metadata["tablo_seed"]:"${SEED_TAG}"`,
          limit: 1,
        }),
      );

      if (search.data.length > 0) {
        const cusId = search.data[0].id;
        map.set(row.id, cusId);
        stats.skipped++;
        console.log(
          `[seed-stripe] company ${row.id} (${row.name}, size=${row.size}) → SKIP (déjà processée, customer ${cusId})`,
        );
        continue;
      }

      // Création Customer
      const customer = await withRetry("customers.create", () =>
        stripe.customers.create({
          email: row.primary_email ?? undefined,
          name: row.name,
          metadata: {
            crm_company_id: row.id,
            tablo_seed: SEED_TAG,
          },
        }),
      );
      map.set(row.id, customer.id);

      // Subscription si starter/business. `collection_method='send_invoice'`
      // simule un cycle B2B (pas de charge automatique sur carte) → Stripe
      // accepte la création sans payment method attaché au Customer.
      let subInfo = "no sub";
      if (priceId) {
        try {
          const sub = await withRetry("subscriptions.create", () =>
            stripe.subscriptions.create({
              customer: customer.id,
              items: [{ price: priceId }],
              collection_method: "send_invoice",
              days_until_due: 30,
              metadata: {
                crm_company_id: row.id,
                tablo_seed: SEED_TAG,
              },
            }),
          );
          subInfo = `sub ${sub.id}`;
        } catch (subErr) {
          // Rollback : delete Customer
          console.warn(
            `[seed-stripe] Subscription failed pour company ${row.id}, rollback Customer ${customer.id}`,
          );
          await stripe.customers.del(customer.id).catch(() => {});
          map.delete(row.id);
          stats.failed++;
          console.warn(
            `[seed-stripe] company ${row.id} (${row.name}) → FAIL ${subErr instanceof Error ? subErr.message : "unknown"}`,
          );
          continue;
        }
      }

      stats.created++;
      console.log(
        `[seed-stripe] company ${row.id} (${row.name}, size=${row.size}) → ${plan} plan, customer ${customer.id}, ${subInfo} ✓`,
      );
    } catch (err) {
      stats.failed++;
      console.warn(
        `[seed-stripe] company ${row.id} (${row.name}) → FAIL ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return { ...stats, companyToCustomer: map };
}

/**
 * R4 — Boucle deals Closed Won → Invoice ad-hoc.
 */
async function seedInvoicesFromDeals(
  pg: PgClient,
  stripe: Stripe,
  companyToCustomer: Map<string, string>,
): Promise<Stats> {
  const result = await pg.query<DealRow>(`
    SELECT id::text AS id, name, company_id::text AS company_id, amount_cents
    FROM deals
    WHERE stage = 'closed_won'
    ORDER BY id
  `);

  const stats: Stats = { created: 0, skipped: 0, failed: 0 };

  for (const deal of result.rows) {
    const cusId = companyToCustomer.get(deal.company_id);
    if (!cusId) {
      stats.failed++;
      console.warn(
        `[seed-stripe] deal ${deal.id} (${deal.name}) → SKIP (pas de Customer pour company ${deal.company_id})`,
      );
      continue;
    }

    try {
      // Idempotence
      const search = await withRetry("invoices.search", () =>
        stripe.invoices.search({
          query: `metadata["crm_deal_id"]:"${deal.id}" AND metadata["tablo_seed"]:"${SEED_TAG}"`,
          limit: 1,
        }),
      );

      if (search.data.length > 0) {
        stats.skipped++;
        console.log(
          `[seed-stripe] deal ${deal.id} (${deal.name}) → SKIP (déjà processée, invoice ${search.data[0].id})`,
        );
        continue;
      }

      // Crée InvoiceItem puis Invoice
      await withRetry("invoiceItems.create", () =>
        stripe.invoiceItems.create({
          customer: cusId,
          amount: deal.amount_cents,
          currency: "eur",
          description: deal.name,
          metadata: {
            crm_deal_id: deal.id,
            tablo_seed: SEED_TAG,
          },
        }),
      );

      const invoice = await withRetry("invoices.create", () =>
        stripe.invoices.create({
          customer: cusId,
          auto_advance: true,
          metadata: {
            crm_deal_id: deal.id,
            tablo_seed: SEED_TAG,
          },
        }),
      );

      stats.created++;
      console.log(
        `[seed-stripe] deal ${deal.id} (${deal.name}, ${(deal.amount_cents / 100).toFixed(0)}€) → invoice ${invoice.id} ✓`,
      );
    } catch (err) {
      stats.failed++;
      console.warn(
        `[seed-stripe] deal ${deal.id} (${deal.name}) → FAIL ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  return stats;
}

/**
 * Orchestrateur principal.
 */
async function main() {
  console.log("Seed Stripe depuis CRM démo — Phase 14.2 Cycle A\n");

  // Pré-conditions
  if (!process.env.CRM_DEMO_DATABASE_URL) {
    console.error("CRM_DEMO_DATABASE_URL manquante dans .env.local");
    process.exit(1);
  }
  // getStripeClient throws si STRIPE_SECRET_KEY absente ou sk_live_
  const stripe = getStripeClient();

  // Connexion DB CRM read-only
  const pg = new PgClient({ connectionString: process.env.CRM_DEMO_DATABASE_URL });
  await pg.connect();
  await pg.query("SELECT 1 FROM companies LIMIT 1"); // ping
  console.log("[setup] DB CRM connectée");

  // Ping Stripe
  await withRetry("stripe.ping", () => stripe.products.list({ limit: 1 }));
  console.log("[setup] Stripe API connectée\n");

  const start = Date.now();

  try {
    const prices = await ensureProductAndPrices(stripe);
    console.log("");

    const companyResult = await seedCustomersFromCompanies(pg, stripe, prices);
    console.log("");

    const dealResult = await seedInvoicesFromDeals(
      pg,
      stripe,
      companyResult.companyToCustomer,
    );

    const durationMs = Date.now() - start;
    console.log("\n─────────────────────────────────────────");
    console.log(
      `Companies : ${companyResult.created + companyResult.skipped + companyResult.failed} total / ${companyResult.created} created / ${companyResult.skipped} skipped / ${companyResult.failed} failed`,
    );
    console.log(
      `Deals Closed Won : ${dealResult.created + dealResult.skipped + dealResult.failed} total / ${dealResult.created} created / ${dealResult.skipped} skipped / ${dealResult.failed} failed`,
    );
    console.log(`Durée : ${(durationMs / 1000).toFixed(1)}s`);
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
