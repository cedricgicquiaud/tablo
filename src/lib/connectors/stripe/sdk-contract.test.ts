/**
 * Contract test SDK Stripe — Phase 14.3 R16.
 *
 * Vérifie que les champs consommés par flattenStripe* existent toujours
 * sur les types `Stripe.Customer`, `Stripe.Subscription`, `Stripe.Invoice`,
 * `Stripe.Charge` du SDK.
 *
 * Si le SDK update casse une shape (rename, remove, etc.) → ce test passe
 * de vert à rouge en CI, signalant qu'il faut adapter flatten.ts ou
 * downgrader le pin SDK.
 *
 * NB : tests TypeScript-only via `expectTypeOf`. Pas d'exec runtime des
 * objets Stripe — uniquement validation de types.
 */

import { describe, it, expectTypeOf } from "vitest";
import type Stripe from "stripe";

describe("Stripe SDK contract — types consumed by flatten", () => {
  it("Stripe.Customer a les champs consommés par flattenStripeCustomer", () => {
    type Customer = Stripe.Customer;
    expectTypeOf<Customer>().toHaveProperty("id");
    expectTypeOf<Customer>().toHaveProperty("email");
    expectTypeOf<Customer>().toHaveProperty("name");
    expectTypeOf<Customer>().toHaveProperty("description");
    expectTypeOf<Customer>().toHaveProperty("created");
    expectTypeOf<Customer>().toHaveProperty("delinquent");
    expectTypeOf<Customer>().toHaveProperty("currency");
    expectTypeOf<Customer>().toHaveProperty("metadata");
  });

  it("Stripe.Subscription a les champs items.data[0].price.{id,nickname,unit_amount,currency,recurring.interval}", () => {
    type Sub = Stripe.Subscription;
    expectTypeOf<Sub>().toHaveProperty("id");
    expectTypeOf<Sub>().toHaveProperty("customer");
    expectTypeOf<Sub>().toHaveProperty("status");
    expectTypeOf<Sub>().toHaveProperty("items");
    expectTypeOf<Sub>().toHaveProperty("created");
    expectTypeOf<Sub>().toHaveProperty("canceled_at");
    expectTypeOf<Sub>().toHaveProperty("collection_method");
    expectTypeOf<Sub>().toHaveProperty("metadata");

    type SubItem = Stripe.SubscriptionItem;
    expectTypeOf<SubItem>().toHaveProperty("price");

    type Price = Stripe.Price;
    expectTypeOf<Price>().toHaveProperty("id");
    expectTypeOf<Price>().toHaveProperty("nickname");
    expectTypeOf<Price>().toHaveProperty("unit_amount");
    expectTypeOf<Price>().toHaveProperty("currency");
    expectTypeOf<Price>().toHaveProperty("recurring");
  });

  it("Stripe.Invoice a les champs consommés par flattenStripeInvoice", () => {
    type Invoice = Stripe.Invoice;
    expectTypeOf<Invoice>().toHaveProperty("id");
    expectTypeOf<Invoice>().toHaveProperty("customer");
    expectTypeOf<Invoice>().toHaveProperty("amount_due");
    expectTypeOf<Invoice>().toHaveProperty("amount_paid");
    expectTypeOf<Invoice>().toHaveProperty("amount_remaining");
    expectTypeOf<Invoice>().toHaveProperty("currency");
    expectTypeOf<Invoice>().toHaveProperty("status");
    expectTypeOf<Invoice>().toHaveProperty("created");
    expectTypeOf<Invoice>().toHaveProperty("due_date");
    expectTypeOf<Invoice>().toHaveProperty("metadata");
    // `subscription` field migrated to `parent.subscription_details`
    // in Stripe SDK >= 18 — flatten reads both via defensive narrow cast.
  });

  it("Stripe.Charge a les champs consommés par flattenStripeCharge", () => {
    type Charge = Stripe.Charge;
    expectTypeOf<Charge>().toHaveProperty("id");
    expectTypeOf<Charge>().toHaveProperty("customer");
    expectTypeOf<Charge>().toHaveProperty("amount");
    expectTypeOf<Charge>().toHaveProperty("currency");
    expectTypeOf<Charge>().toHaveProperty("status");
    expectTypeOf<Charge>().toHaveProperty("paid");
    expectTypeOf<Charge>().toHaveProperty("refunded");
    expectTypeOf<Charge>().toHaveProperty("created");
    expectTypeOf<Charge>().toHaveProperty("payment_method_details");
  });
});
