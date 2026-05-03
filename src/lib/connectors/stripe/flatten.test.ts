/**
 * Tests `flattenStripe*` — Phase 14.3 C1.
 *
 * Fonctions pures qui aplatissent les objets Stripe SDK en rows tabulaires
 * pour alasql. Cf SPEC R7.
 */

import { describe, it, expect, vi } from "vitest";
import {
  flattenStripeCustomer,
  flattenStripeSubscription,
  flattenStripeInvoice,
  flattenStripeCharge,
} from "./flatten";

describe("flattenStripeCustomer", () => {
  it("nominal — id, email, name, created_at ISO, delinquent", () => {
    const c = {
      id: "cus_1",
      email: "alice@example.com",
      name: "Alice",
      description: "Founder",
      created: 1714694400, // 2024-05-03 00:00:00 UTC
      delinquent: false,
      currency: "eur",
      metadata: {},
    } as unknown as Parameters<typeof flattenStripeCustomer>[0];

    const row = flattenStripeCustomer(c);

    expect(row).toMatchObject({
      id: "cus_1",
      email: "alice@example.com",
      name: "Alice",
      description: "Founder",
      created_at: "2024-05-03T00:00:00.000Z",
      delinquent: false,
      currency: "eur",
    });
  });

  it("email/name/description nullable → null (pas omission, pas string)", () => {
    const c = {
      id: "cus_2",
      email: null,
      name: null,
      description: null,
      created: 1714694400,
      delinquent: false,
      currency: null,
      metadata: {},
    } as unknown as Parameters<typeof flattenStripeCustomer>[0];

    const row = flattenStripeCustomer(c);

    expect(row.email).toBeNull();
    expect(row.name).toBeNull();
    expect(row.description).toBeNull();
    expect(row.currency).toBeNull();
  });

  it("metadata.crm_company_id et tablo_seed extraits au top-level", () => {
    const c = {
      id: "cus_3",
      email: "x@y.com",
      name: "Test",
      description: null,
      created: 1714694400,
      delinquent: false,
      currency: "eur",
      metadata: { crm_company_id: "comp_xyz", tablo_seed: "v1", other: "ignored" },
    } as unknown as Parameters<typeof flattenStripeCustomer>[0];

    const row = flattenStripeCustomer(c);

    expect(row.crm_company_id).toBe("comp_xyz");
    expect(row.tablo_seed).toBe("v1");
    expect(row).not.toHaveProperty("other");
  });
});

describe("flattenStripeSubscription", () => {
  const baseSub = {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    items: {
      data: [
        {
          price: {
            id: "price_starter",
            nickname: "starter",
            unit_amount: 9900,
            currency: "eur",
            recurring: { interval: "month" },
          },
        },
      ],
    },
    current_period_start: 1714694400,
    current_period_end: 1717372800,
    created: 1714694400,
    canceled_at: null,
    collection_method: "send_invoice",
    metadata: { crm_company_id: "comp_1", plan: "starter" },
  } as unknown as Parameters<typeof flattenStripeSubscription>[0];

  it("nominal — id, customer_id, status, plan_id, unit_amount_cents, interval", () => {
    const row = flattenStripeSubscription(baseSub);

    expect(row).toMatchObject({
      id: "sub_1",
      customer_id: "cus_1",
      status: "active",
      plan_id: "price_starter",
      plan_nickname: "starter",
      unit_amount_cents: 9900,
      currency: "eur",
      interval: "month",
      collection_method: "send_invoice",
      crm_company_id: "comp_1",
    });
    expect(row.canceled_at).toBeNull(); // sub active
    expect(row.created_at).toBe("2024-05-03T00:00:00.000Z");
  });

  it("multi-items — log warning + items[0] mappé, pas d'erreur", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const subMulti = {
      ...baseSub,
      id: "sub_multi",
      items: {
        data: [
          baseSub.items.data[0],
          {
            price: {
              id: "price_addon",
              nickname: "addon",
              unit_amount: 500,
              currency: "eur",
              recurring: { interval: "month" },
            },
          },
        ],
      },
    };

    const row = flattenStripeSubscription(subMulti);

    expect(row.plan_id).toBe("price_starter"); // items[0] gagne
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Stripe DataSource] Subscription sub_multi has 2 items"),
    );
    warnSpy.mockRestore();
  });

  it("items.data[0] absent → throw avec message clair", () => {
    const subEmpty = { ...baseSub, id: "sub_empty", items: { data: [] } };

    expect(() => flattenStripeSubscription(subEmpty)).toThrow(
      "Subscription sub_empty sans items.data[0]",
    );
  });

  it("price.nickname absent → fallback metadata.plan", () => {
    const subNoNick = {
      ...baseSub,
      id: "sub_no_nick",
      items: {
        data: [
          {
            price: {
              ...baseSub.items.data[0].price,
              nickname: null,
            },
          },
        ],
      },
    };

    const row = flattenStripeSubscription(subNoNick);

    expect(row.plan_nickname).toBe("starter"); // metadata.plan fallback
  });
});

describe("flattenStripeInvoice", () => {
  const baseInv = {
    id: "in_1",
    customer: "cus_1",
    subscription: "sub_1",
    amount_due: 9900,
    amount_paid: 9900,
    amount_remaining: 0,
    currency: "eur",
    status: "paid",
    created: 1714694400,
    due_date: 1717372800,
    paid: true,
    metadata: { crm_deal_id: "deal_1" },
  } as unknown as Parameters<typeof flattenStripeInvoice>[0];

  it("nominal — id, customer_id, subscription_id, amount_due_cents, status, dates ISO", () => {
    const row = flattenStripeInvoice(baseInv);

    expect(row).toMatchObject({
      id: "in_1",
      customer_id: "cus_1",
      subscription_id: "sub_1",
      amount_due_cents: 9900,
      amount_paid_cents: 9900,
      amount_remaining_cents: 0,
      currency: "eur",
      status: "paid",
      paid: true,
      crm_deal_id: "deal_1",
    });
    expect(row.created_at).toBe("2024-05-03T00:00:00.000Z");
    expect(row.due_date).toBe("2024-06-03T00:00:00.000Z");
  });

  it("Invoice ad-hoc — subscription_id null", () => {
    const adHoc = { ...baseInv, id: "in_adhoc", subscription: null };

    const row = flattenStripeInvoice(adHoc);

    expect(row.subscription_id).toBeNull();
  });

  it("due_date null + crm_deal_id absent", () => {
    const inv = {
      ...baseInv,
      id: "in_no_due",
      due_date: null,
      metadata: {}, // pas de crm_deal_id
    };

    const row = flattenStripeInvoice(inv);

    expect(row.due_date).toBeNull();
    expect(row.crm_deal_id).toBeNull();
  });
});

describe("flattenStripeCharge", () => {
  it("nominal + payment_method_details.type extrait", () => {
    const ch = {
      id: "ch_1",
      customer: "cus_1",
      amount: 9900,
      currency: "eur",
      status: "succeeded",
      paid: true,
      refunded: false,
      created: 1714694400,
      payment_method_details: { type: "card" },
    } as unknown as Parameters<typeof flattenStripeCharge>[0];

    const row = flattenStripeCharge(ch);

    expect(row).toMatchObject({
      id: "ch_1",
      customer_id: "cus_1",
      amount_cents: 9900,
      currency: "eur",
      status: "succeeded",
      paid: true,
      refunded: false,
      payment_method_type: "card",
    });
    expect(row.created_at).toBe("2024-05-03T00:00:00.000Z");
  });

  it("customer = null (charge guest) + payment_method_details null", () => {
    const ch = {
      id: "ch_guest",
      customer: null,
      amount: 5000,
      currency: "usd",
      status: "succeeded",
      paid: true,
      refunded: false,
      created: 1714694400,
      payment_method_details: null,
    } as unknown as Parameters<typeof flattenStripeCharge>[0];

    const row = flattenStripeCharge(ch);

    expect(row.customer_id).toBeNull();
    expect(row.payment_method_type).toBeNull();
  });
});
