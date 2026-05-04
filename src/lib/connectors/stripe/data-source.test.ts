/**
 * Tests `StripeDataSource` — Phase 14.3 C2.
 *
 * Couvre R1-R6, R9, R14, R15 + E1-E10. Mock léger via injection
 * `getStripeClient` (pattern Pure logic + DI règle FORGE).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import { StripeDataSource, __resetStripeCacheForTests } from "./data-source";

/* -------------------------------------------------------------------------- */
/*                              Mock SDK builder                              */
/* -------------------------------------------------------------------------- */

type StripeListResponse<T> = { data: T[]; has_more: boolean };

type MockListFn<T> = (
  params?: { limit?: number; starting_after?: string },
) => Promise<StripeListResponse<T>>;

type MockStripe = {
  customers: { list: MockListFn<Stripe.Customer> };
  subscriptions: { list: MockListFn<Stripe.Subscription> };
  invoices: { list: MockListFn<Stripe.Invoice> };
  charges: { list: MockListFn<Stripe.Charge> };
};

function makeMockStripe(opts: {
  customers?: Stripe.Customer[];
  subscriptions?: Stripe.Subscription[];
  invoices?: Stripe.Invoice[];
  charges?: Stripe.Charge[];
  customerListFn?: MockListFn<Stripe.Customer>;
}): MockStripe {
  const paginate = <T extends { id: string }>(rows: T[]): MockListFn<T> => {
    return async (params) => {
      const limit = params?.limit ?? 100;
      const startIdx = params?.starting_after
        ? rows.findIndex((r) => r.id === params.starting_after) + 1
        : 0;
      const slice = rows.slice(startIdx, startIdx + limit);
      return { data: slice, has_more: startIdx + limit < rows.length };
    };
  };

  return {
    customers: { list: opts.customerListFn ?? paginate(opts.customers ?? []) },
    subscriptions: { list: paginate(opts.subscriptions ?? []) },
    invoices: { list: paginate(opts.invoices ?? []) },
    charges: { list: paginate(opts.charges ?? []) },
  };
}

/* -------------------------------------------------------------------------- */
/*                             Fixture builders                               */
/* -------------------------------------------------------------------------- */

function customer(id: string, email = `${id}@example.com`): Stripe.Customer {
  return {
    id,
    email,
    name: `Name ${id}`,
    description: null,
    created: 1714694400,
    delinquent: false,
    currency: "eur",
    metadata: { crm_company_id: `crm_${id}` },
  } as unknown as Stripe.Customer;
}

function subscription(
  id: string,
  customerId: string,
  status: Stripe.Subscription.Status = "active",
  plan = "starter",
  amountCents = 9900,
): Stripe.Subscription {
  return {
    id,
    customer: customerId,
    status,
    items: {
      data: [
        {
          price: {
            id: `price_${plan}`,
            nickname: plan,
            unit_amount: amountCents,
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
    metadata: { crm_company_id: `crm_${customerId}`, plan },
  } as unknown as Stripe.Subscription;
}

function invoice(
  id: string,
  customerId: string,
  subscriptionId: string | null = null,
  status: Stripe.Invoice.Status = "paid",
): Stripe.Invoice {
  return {
    id,
    customer: customerId,
    subscription: subscriptionId,
    amount_due: 9900,
    amount_paid: status === "paid" ? 9900 : 0,
    amount_remaining: status === "paid" ? 0 : 9900,
    currency: "eur",
    status,
    created: 1714694400,
    due_date: 1717372800,
    paid: status === "paid",
    metadata: {},
  } as unknown as Stripe.Invoice;
}

function charge(id: string, customerId: string | null = null): Stripe.Charge {
  return {
    id,
    customer: customerId,
    amount: 9900,
    currency: "eur",
    status: "succeeded",
    paid: true,
    refunded: false,
    created: 1714694400,
    payment_method_details: { type: "card" },
  } as unknown as Stripe.Charge;
}

/* -------------------------------------------------------------------------- */
/*                              Reset cache + clock                           */
/* -------------------------------------------------------------------------- */

beforeEach(() => {
  __resetStripeCacheForTests();
  vi.useRealTimers();
});

/* -------------------------------------------------------------------------- */
/*                                  Tests                                     */
/* -------------------------------------------------------------------------- */

describe("StripeDataSource — listTables (R1, lazy)", () => {
  it("retourne 4 tables hardcodées (rowCount=0 avant fetch) (R1)", async () => {
    const mock = makeMockStripe({
      customers: [customer("cus_1"), customer("cus_2")],
      subscriptions: [subscription("sub_1", "cus_1")],
      invoices: [invoice("in_1", "cus_1")],
      charges: [charge("ch_1", "cus_1"), charge("ch_2", "cus_2"), charge("ch_3")],
    });
    const ds = new StripeDataSource({
      connectionId: "test_conn_1",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const tables = await ds.listTables();

    // listTables est lazy : pas de fetch implicite, rowCount=0 tant qu'aucune
    // table n'a été inspectée ni interrogée. Garde les 4 noms hardcodés.
    expect(tables).toEqual([
      { name: "stripe_customers", rowCount: 0 },
      { name: "stripe_subscriptions", rowCount: 0 },
      { name: "stripe_invoices", rowCount: 0 },
      { name: "stripe_charges", rowCount: 0 },
    ]);
  });

  it("rowCount accurate après inspectTable (R1)", async () => {
    const mock = makeMockStripe({
      customers: [customer("cus_1"), customer("cus_2")],
    });
    const ds = new StripeDataSource({
      connectionId: "test_conn_1b",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await ds.inspectTable("stripe_customers");
    const tables = await ds.listTables();

    expect(tables.find((t) => t.name === "stripe_customers")?.rowCount).toBe(2);
    // Les autres tables non-inspectées restent à 0 (lazy)
    expect(tables.find((t) => t.name === "stripe_subscriptions")?.rowCount).toBe(0);
  });

  it("propage erreur claire via inspectTable si customers.list throw (E2 auth invalide)", async () => {
    const authErr = Object.assign(new Error("Authentication failed"), {
      type: "StripeAuthenticationError",
      statusCode: 401,
    });
    const mock = makeMockStripe({
      customerListFn: async () => {
        throw authErr;
      },
    });
    const ds = new StripeDataSource({
      connectionId: "test_conn_2",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await expect(ds.inspectTable("stripe_customers")).rejects.toThrow(
      /Stripe DataSource/,
    );
  });
});

describe("StripeDataSource — inspectTable (R2 R9)", () => {
  it("inspectTable('stripe_customers') retourne schema + 3 samples (R2)", async () => {
    const customers = [
      customer("cus_1"),
      customer("cus_2"),
      customer("cus_3"),
      customer("cus_4"),
    ];
    const mock = makeMockStripe({ customers });
    const ds = new StripeDataSource({
      connectionId: "test_conn_3",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const detail = await ds.inspectTable("stripe_customers");

    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("stripe_customers");
    expect(detail!.columns.length).toBeGreaterThanOrEqual(8);
    expect(detail!.columns.find((c) => c.name === "email")).toBeDefined();
    expect(detail!.columns.find((c) => c.name === "crm_company_id")).toBeDefined();
    expect(detail!.samples).toHaveLength(3); // 3 samples max
  });

  it("inspectTable('unknown') retourne null (R9)", async () => {
    const mock = makeMockStripe({ customers: [customer("cus_1")] });
    const ds = new StripeDataSource({
      connectionId: "test_conn_4",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const detail = await ds.inspectTable("stripe_unknown_table");

    expect(detail).toBeNull();
  });
});

describe("StripeDataSource — runQuery (R3 R4)", () => {
  it("SELECT simple avec WHERE (R3)", async () => {
    const customers = [
      customer("cus_1", "alice@x.com"),
      customer("cus_2", "bob@x.com"),
    ];
    const mock = makeMockStripe({ customers });
    const ds = new StripeDataSource({
      connectionId: "test_conn_5",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const rows = await ds.runQuery(
      `SELECT * FROM stripe_customers WHERE email = 'alice@x.com'`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("cus_1");
  });

  it("GROUP BY + COUNT — pattern moteur AI (R3)", async () => {
    const subs = [
      subscription("sub_1", "cus_1", "active", "starter"),
      subscription("sub_2", "cus_2", "active", "starter"),
      subscription("sub_3", "cus_3", "active", "business"),
    ];
    const mock = makeMockStripe({ subscriptions: subs });
    const ds = new StripeDataSource({
      connectionId: "test_conn_6",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const rows = await ds.runQuery(
      `SELECT plan_nickname, COUNT(*) AS n FROM stripe_subscriptions GROUP BY plan_nickname ORDER BY n DESC`,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ plan_nickname: "starter", n: 2 });
    expect(rows[1]).toMatchObject({ plan_nickname: "business", n: 1 });
  });

  it("INNER JOIN entre 2 tables virtuelles (R15)", async () => {
    const mock = makeMockStripe({
      customers: [customer("cus_1", "a@x.com")],
      invoices: [invoice("in_1", "cus_1", "sub_1")],
    });
    const ds = new StripeDataSource({
      connectionId: "test_conn_7",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const rows = await ds.runQuery(
      `SELECT i.id AS invoice_id, c.email FROM stripe_invoices i INNER JOIN stripe_customers c ON i.customer_id = c.id`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ invoice_id: "in_1", email: "a@x.com" });
  });

  it("LEFT JOIN avec subscription_id NULL (Invoice ad-hoc) (R15)", async () => {
    const mock = makeMockStripe({
      invoices: [
        invoice("in_1", "cus_1", "sub_1"),
        invoice("in_adhoc", "cus_1", null),
      ],
      subscriptions: [subscription("sub_1", "cus_1")],
    });
    const ds = new StripeDataSource({
      connectionId: "test_conn_8",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const rows = await ds.runQuery(
      `SELECT i.id AS invoice_id, s.id AS sub_id FROM stripe_invoices i LEFT JOIN stripe_subscriptions s ON i.subscription_id = s.id ORDER BY invoice_id`,
    );

    expect(rows).toHaveLength(2);
    const adHoc = rows.find((r) => r.invoice_id === "in_adhoc");
    expect(adHoc?.sub_id).toBeNull();
  });

  it("E3 — SQL non read-only refusé AVANT fetch (DELETE)", async () => {
    const customerListFn = vi.fn();
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_9",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await expect(
      ds.runQuery(`DELETE FROM stripe_customers`),
    ).rejects.toThrow();

    expect(customerListFn).not.toHaveBeenCalled();
  });

  // Anti-régression scope OAuth `read_write` (Phase 14.4 — Stripe bloque
  // `read_only` pour nouveaux comptes Connect Standard, donc le scope
  // accordé à la clé OAuth user-owned est techniquement read_write. La
  // garantie que Tablo n'effectue jamais d'écriture sur le compte connecté
  // repose uniquement sur ce check côté StripeDataSource.runQuery →
  // validateReadOnlySql. Ces 2 tests verrouillent cette garantie.
  it("E3 — SQL non read-only refusé AVANT fetch (INSERT)", async () => {
    const customerListFn = vi.fn();
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_9b",
      getStripeClient: () => mock as unknown as Stripe,
    });
    await expect(
      ds.runQuery(`INSERT INTO stripe_customers (id) VALUES ('cus_x')`),
    ).rejects.toThrow();
    expect(customerListFn).not.toHaveBeenCalled();
  });

  it("E3 — SQL non read-only refusé AVANT fetch (UPDATE)", async () => {
    const customerListFn = vi.fn();
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_9c",
      getStripeClient: () => mock as unknown as Stripe,
    });
    await expect(
      ds.runQuery(`UPDATE stripe_customers SET email = 'x@y.z'`),
    ).rejects.toThrow();
    expect(customerListFn).not.toHaveBeenCalled();
  });

  it("E4 — table inconnue → erreur claire", async () => {
    const mock = makeMockStripe({ customers: [customer("cus_1")] });
    const ds = new StripeDataSource({
      connectionId: "test_conn_10",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await expect(
      ds.runQuery(`SELECT * FROM stripe_unknown_table`),
    ).rejects.toThrow(/stripe_unknown_table|table/i);
  });

  it("E5 — SQL syntaxe invalide → erreur claire", async () => {
    const mock = makeMockStripe({ customers: [customer("cus_1")] });
    const ds = new StripeDataSource({
      connectionId: "test_conn_11",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await expect(
      ds.runQuery(`SELEKT * FROM stripe_customers`),
    ).rejects.toThrow();
  });

  it("supporte les identifiants double-quotés Postgres-style (R13)", async () => {
    const mock = makeMockStripe({
      customers: [customer("cus_1", "alice@x.com")],
    });
    const ds = new StripeDataSource({
      connectionId: "test_conn_pg",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const rows = await ds.runQuery(
      `SELECT count(DISTINCT "email") AS n FROM "stripe_customers"`,
    );

    expect(rows[0].n).toBe(1);
  });
});

describe("StripeDataSource — cache + TTL (R6 RNF4)", () => {
  it("cache hit : 2nde query immédiate ne refetch pas", async () => {
    const customerListFn = vi.fn(async () => ({
      data: [customer("cus_1")],
      has_more: false,
    }));
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_cache_hit",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await ds.runQuery(`SELECT * FROM stripe_customers`);
    await ds.runQuery(`SELECT count(*) AS n FROM stripe_customers`);

    expect(customerListFn).toHaveBeenCalledTimes(1);
  });

  it("TTL boundary RNF4 : +299999ms cache hit, +300001ms refetch", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const customerListFn = vi.fn(async () => ({
      data: [customer("cus_1")],
      has_more: false,
    }));
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_ttl",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await ds.runQuery(`SELECT * FROM stripe_customers`);
    expect(customerListFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(299_999);
    await ds.runQuery(`SELECT * FROM stripe_customers`);
    expect(customerListFn).toHaveBeenCalledTimes(1); // cache hit

    vi.advanceTimersByTime(2);
    await ds.runQuery(`SELECT * FROM stripe_customers`);
    expect(customerListFn).toHaveBeenCalledTimes(2); // refetch

    vi.useRealTimers();
  });
});

describe("StripeDataSource — coalescing concurrent fetches (R14)", () => {
  it("2 runQuery en parallèle → 1 seul appel SDK customers.list", async () => {
    let resolveFetch: (data: { data: Stripe.Customer[]; has_more: boolean }) => void = () => {};
    const fetchPromise = new Promise<{ data: Stripe.Customer[]; has_more: boolean }>((r) => {
      resolveFetch = r;
    });
    const customerListFn = vi.fn(() => fetchPromise);
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_coalesce",
      getStripeClient: () => mock as unknown as Stripe,
    });

    // Lance 2 runQuery en parallèle (cache vide)
    const p1 = ds.runQuery(`SELECT * FROM stripe_customers`);
    const p2 = ds.runQuery(`SELECT count(*) AS n FROM stripe_customers`);

    // Laisse le tick d'event loop avancer pour que les 2 promises soient
    // initiées avant qu'on résolve le fetch
    await new Promise((r) => setImmediate(r));

    resolveFetch({ data: [customer("cus_1")], has_more: false });

    await Promise.all([p1, p2]);

    expect(customerListFn).toHaveBeenCalledTimes(1);
  });
});

describe("StripeDataSource — cap pagination (R5 RNF5)", () => {
  it("cap 1000 rows : retourne 1000 + truncatedTables logs warning", async () => {
    // Mock 1500 customers — l'adapter doit s'arrêter à 1000
    const customers = Array.from({ length: 1500 }, (_, i) => customer(`cus_${i}`));
    const customerListFn = vi.fn(async (params?: { limit?: number; starting_after?: string }) => {
      const limit = params?.limit ?? 100;
      const startIdx = params?.starting_after
        ? customers.findIndex((c) => c.id === params.starting_after) + 1
        : 0;
      return {
        data: customers.slice(startIdx, startIdx + limit),
        has_more: startIdx + limit < customers.length,
      };
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_cap",
      getStripeClient: () => mock as unknown as Stripe,
    });

    const rows = await ds.runQuery(`SELECT count(*) AS n FROM stripe_customers`);

    expect(rows[0].n).toBe(1000);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("truncated at 1000 rows"),
    );
    warnSpy.mockRestore();
  });
});

describe("StripeDataSource — erreurs Stripe API (E1 E2 E6 E9)", () => {
  it("E1 — getStripeClient throw STRIPE_SECRET_KEY manquant → propagé", async () => {
    const ds = new StripeDataSource({
      connectionId: "test_conn_e1",
      getStripeClient: () => {
        throw new Error("STRIPE_SECRET_KEY env var manquant");
      },
    });

    // listTables est lazy → ne throw pas. inspectTable / runQuery déclenchent
    // bien la lecture env et propagent l'erreur claire.
    await expect(ds.inspectTable("stripe_customers")).rejects.toThrow(
      /Stripe DataSource.*STRIPE_SECRET_KEY/,
    );
  });

  it("E2 — clé invalide (StripeAuthenticationError) → message clair", async () => {
    const authErr = Object.assign(new Error("Invalid API Key provided"), {
      type: "StripeAuthenticationError",
      statusCode: 401,
    });
    const customerListFn = vi.fn(async () => {
      throw authErr;
    });
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_e2",
      getStripeClient: () => mock as unknown as Stripe,
    });

    await expect(ds.runQuery(`SELECT * FROM stripe_customers`)).rejects.toThrow(
      /Stripe DataSource.*invalide|Invalid API Key/,
    );
  });

  it("E6 — 429 retry exponentiel : 2 échecs puis succès au 3ème", async () => {
    const rateLimitErr = Object.assign(new Error("Rate limit exceeded"), {
      statusCode: 429,
    });
    let attempts = 0;
    const customerListFn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw rateLimitErr;
      return { data: [customer("cus_1")], has_more: false };
    });
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_e6",
      getStripeClient: () => mock as unknown as Stripe,
      // Fast retry pour test
      retryDelaysMs: [0, 0, 0],
    });

    const rows = await ds.runQuery(`SELECT * FROM stripe_customers`);

    expect(rows).toHaveLength(1);
    expect(customerListFn).toHaveBeenCalledTimes(3);
  });

  it("E9 — réseau down (StripeConnectionError) → wrap clair, pas de retry", async () => {
    const netErr = Object.assign(new Error("ECONNREFUSED"), {
      type: "StripeConnectionError",
    });
    const customerListFn = vi.fn(async () => {
      throw netErr;
    });
    const mock = makeMockStripe({ customerListFn });
    const ds = new StripeDataSource({
      connectionId: "test_conn_e9",
      getStripeClient: () => mock as unknown as Stripe,
      retryDelaysMs: [0, 0, 0],
    });

    await expect(ds.runQuery(`SELECT * FROM stripe_customers`)).rejects.toThrow(
      /Stripe DataSource.*r.seau|ECONNREFUSED/,
    );
    // Pas retryable → 1 seul appel
    expect(customerListFn).toHaveBeenCalledTimes(1);
  });
});
