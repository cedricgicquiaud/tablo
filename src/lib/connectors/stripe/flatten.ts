/**
 * Aplatissement des objets Stripe SDK en rows tabulaires — Phase 14.3 C1.
 *
 * Fonctions pures : un objet Stripe (avec types riches imbriqués) →
 * `Record<string, scalar | null>`. Consommé par `StripeDataSource.runQuery`
 * pour alimenter alasql avec des arrays de rows.
 *
 * Cf SPEC R7 (mapping détaillé table → colonnes).
 */

import type Stripe from "stripe";

export type StripeRow = Record<string, string | number | boolean | null>;

/** Convertit un timestamp Unix (sec) en ISO 8601 string. `null`/`undefined` → null. */
function unixToIso(ts: number | null | undefined): string | null {
  if (ts === null || ts === undefined) return null;
  return new Date(ts * 1000).toISOString();
}

/** Lit une metadata key et retourne `null` si absente (Stripe stocke les metadata vides comme {}). */
function meta(metadata: Stripe.Metadata | null | undefined, key: string): string | null {
  if (!metadata) return null;
  const value = metadata[key];
  return value === undefined ? null : value;
}

export function flattenStripeCustomer(c: Stripe.Customer): StripeRow {
  return {
    id: c.id,
    email: c.email ?? null,
    name: c.name ?? null,
    description: c.description ?? null,
    created_at: unixToIso(c.created)!,
    delinquent: c.delinquent ?? false,
    currency: c.currency ?? null,
    crm_company_id: meta(c.metadata, "crm_company_id"),
    tablo_seed: meta(c.metadata, "tablo_seed"),
  };
}

export function flattenStripeSubscription(s: Stripe.Subscription): StripeRow {
  const items = s.items?.data ?? [];
  if (items.length === 0) {
    throw new Error(`Subscription ${s.id} sans items.data[0]`);
  }
  if (items.length > 1) {
    console.warn(
      `[Stripe DataSource] Subscription ${s.id} has ${items.length} items, only items[0] mapped (V1 limitation, see backlog)`,
    );
  }

  const firstItem = items[0];
  const price = firstItem.price;

  // Subscription typing in Stripe SDK has current_period_* on the items as
  // well as the subscription itself depending on version. We read from the
  // subscription level (post-2024 schema) with a fallback to items[0] for
  // forward-compat with newer SDK versions that move these fields.
  const sAny = s as unknown as Record<string, unknown>;
  const cpStart =
    (typeof sAny.current_period_start === "number"
      ? sAny.current_period_start
      : (firstItem as unknown as { current_period_start?: number })
          .current_period_start) ?? null;
  const cpEnd =
    (typeof sAny.current_period_end === "number"
      ? sAny.current_period_end
      : (firstItem as unknown as { current_period_end?: number })
          .current_period_end) ?? null;

  return {
    id: s.id,
    customer_id: typeof s.customer === "string" ? s.customer : s.customer.id,
    status: s.status,
    plan_id: price.id,
    // Toujours non-null. Fallback chain garantit une valeur lisible :
    // nickname Stripe → metadata.plan (seed P14.2) → price.id en dernier
    // recours. Le profiler P17 indexe alors les top_values (starter/business/
    // enterprise sur le seed démo) et l'IA group sur cette colonne plutôt
    // que sur plan_id (UUID).
    plan_nickname: price.nickname ?? meta(s.metadata, "plan") ?? price.id,
    unit_amount_cents: price.unit_amount ?? null,
    currency: price.currency,
    interval: price.recurring?.interval ?? null,
    current_period_start: unixToIso(cpStart),
    current_period_end: unixToIso(cpEnd),
    created_at: unixToIso(s.created)!,
    canceled_at: unixToIso(s.canceled_at),
    collection_method: s.collection_method,
    crm_company_id: meta(s.metadata, "crm_company_id"),
  };
}

export function flattenStripeInvoice(i: Stripe.Invoice): StripeRow {
  // Stripe SDK >= 18 a déplacé `subscription` dans `parent.subscription_details`.
  // On lit aux deux emplacements pour rester forward-compat avec le pin actuel
  // 22.x (R16 contract test détectera tout drift).
  const iAny = i as unknown as Record<string, unknown>;
  let subscriptionId: string | null = null;
  if (typeof iAny.subscription === "string") {
    subscriptionId = iAny.subscription;
  } else if (
    iAny.subscription &&
    typeof iAny.subscription === "object" &&
    "id" in (iAny.subscription as object)
  ) {
    subscriptionId = (iAny.subscription as { id: string }).id;
  } else if (
    iAny.parent &&
    typeof iAny.parent === "object" &&
    "subscription_details" in (iAny.parent as object)
  ) {
    const details = (iAny.parent as { subscription_details?: { subscription?: string | { id: string } } }).subscription_details;
    if (details?.subscription) {
      subscriptionId =
        typeof details.subscription === "string"
          ? details.subscription
          : details.subscription.id;
    }
  }

  return {
    id: i.id ?? "",
    customer_id: typeof i.customer === "string" ? i.customer : i.customer?.id ?? null,
    subscription_id: subscriptionId,
    amount_due_cents: i.amount_due,
    amount_paid_cents: i.amount_paid,
    amount_remaining_cents: i.amount_remaining,
    currency: i.currency,
    status: i.status ?? "draft",
    created_at: unixToIso(i.created)!,
    due_date: unixToIso(i.due_date),
    paid: (iAny.paid as boolean | undefined) ?? i.status === "paid",
    crm_deal_id: meta(i.metadata, "crm_deal_id"),
  };
}

export function flattenStripeCharge(c: Stripe.Charge): StripeRow {
  return {
    id: c.id,
    customer_id: typeof c.customer === "string" ? c.customer : c.customer?.id ?? null,
    amount_cents: c.amount,
    currency: c.currency,
    status: c.status,
    paid: c.paid,
    refunded: c.refunded,
    created_at: unixToIso(c.created)!,
    payment_method_type: c.payment_method_details?.type ?? null,
  };
}
