/**
 * Reset Stripe test depuis le seed Phase 14.2 Cycle A.
 *
 * Supprime tous les Customers Stripe avec metadata `tablo_seed=v1`
 * (cascade Subscriptions + Invoices). Désactive les Products avec la
 * même metadata (Stripe ne permet pas de delete les Products avec
 * Prices, on les marque inactive).
 *
 * La DB CRM n'est pas touchée (rien n'avait été écrit dedans).
 *
 * Usage :
 *   bun run scripts/stripe-seed-reset.ts
 *   bun run scripts/stripe-seed-reset.ts --yes  # skip confirmation
 *
 * Pré-requis : STRIPE_SECRET_KEY=sk_test_... (refus sk_live_).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import readline from "readline";
import { getStripeClient } from "@/lib/stripe/client";

const SEED_TAG = "v1";

async function confirm(message: string): Promise<boolean> {
  if (process.argv.includes("--yes")) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (yes/N) `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "yes");
    });
  });
}

async function main() {
  const stripe = getStripeClient();

  console.log("Reset Stripe seed — Phase 14.2 Cycle A\n");

  // 1. Liste tous les Customers du seed (paginé).
  console.log("[reset] Recherche des Customers seed…");
  const customers: Array<{ id: string; name: string | null }> = [];
  let starting_after: string | undefined;
  for (;;) {
    const page = await stripe.customers.list({
      limit: 100,
      ...(starting_after ? { starting_after } : {}),
    });
    for (const c of page.data) {
      if (c.metadata?.tablo_seed === SEED_TAG) {
        customers.push({ id: c.id, name: c.name });
      }
    }
    if (!page.has_more || page.data.length === 0) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  console.log(`[reset] ${customers.length} Customers trouvés\n`);

  // 2. Liste les Products du seed.
  console.log("[reset] Recherche des Products seed…");
  const products = await stripe.products.list({ limit: 100 });
  const seedProducts = products.data.filter(
    (p) => p.metadata?.tablo_seed === SEED_TAG && p.active,
  );
  console.log(`[reset] ${seedProducts.length} Products trouvés\n`);

  if (customers.length === 0 && seedProducts.length === 0) {
    console.log("Rien à supprimer. Exit.");
    return;
  }

  // Confirmation
  const ok = await confirm(
    `Supprimer ${customers.length} Customers (cascade subs + invoices) et désactiver ${seedProducts.length} Products ?`,
  );
  if (!ok) {
    console.log("Aborted.");
    return;
  }

  // 3. Delete Customers
  let deleted = 0;
  let failed = 0;
  for (const c of customers) {
    try {
      await stripe.customers.del(c.id);
      deleted++;
      console.log(`[reset] customer ${c.id} (${c.name ?? "no name"}) → deleted ✓`);
    } catch (err) {
      failed++;
      console.warn(
        `[reset] customer ${c.id} → FAIL ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  // 4. Deactivate Products
  let deactivated = 0;
  for (const p of seedProducts) {
    try {
      await stripe.products.update(p.id, { active: false });
      deactivated++;
      console.log(`[reset] product ${p.id} (${p.name}) → deactivated ✓`);
    } catch (err) {
      console.warn(
        `[reset] product ${p.id} → FAIL ${err instanceof Error ? err.message : "unknown"}`,
      );
    }
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`Customers : ${deleted} deleted / ${failed} failed`);
  console.log(`Products : ${deactivated} deactivated`);
  console.log("DB CRM : intouchée (read-only seed).");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
