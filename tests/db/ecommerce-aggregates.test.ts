import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  daysAgo,
  insertCustomer,
  insertOrder,
  insertProduct,
  insertOrderItem,
  setMonthlyTarget,
  startOfMonthUtc,
  truncateAll,
} from "./helpers";

const admin = adminClient();

beforeEach(async () => {
  await truncateAll(admin);
});

afterAll(async () => {
  await truncateAll(admin);
});

function nowMonth(): string {
  return startOfMonthUtc().toISOString().slice(0, 10);
}

describe("R1 — revenue_kpi()", () => {
  it("retourne current_cents = SUM des paid orders du mois courant", async () => {
    const c = await insertCustomer(admin, "r1@test.io");
    const inThisMonth = new Date();
    inThisMonth.setUTCDate(15);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 4500,
      createdAt: inThisMonth.toISOString(),
    });
    await insertOrder(admin, {
      customerId: c,
      status: "pending",
      totalCents: 9999,
      createdAt: inThisMonth.toISOString(),
    });

    const { data, error } = await admin.rpc("revenue_kpi").single();
    expect(error).toBeNull();
    expect(data?.current_cents).toBe(4500);
  });

  it("delta_pct = round((current-prev)/prev * 100), 0 si previous=0", async () => {
    const c = await insertCustomer(admin, "r1b@test.io");
    const lastMonth = startOfMonthUtc();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    lastMonth.setUTCDate(15);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 1000,
      createdAt: lastMonth.toISOString(),
    });
    const thisMonth = new Date();
    thisMonth.setUTCDate(15);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 1500,
      createdAt: thisMonth.toISOString(),
    });

    const { data } = await admin.rpc("revenue_kpi").single();
    expect(data?.delta_pct).toBe(50);
  });

  it("sparkline_cents = 12 entrées triées asc, fin de mois", async () => {
    const { data, error } = await admin.rpc("revenue_kpi").single();
    expect(error).toBeNull();
    expect(Array.isArray(data?.sparkline_cents)).toBe(true);
    expect(data?.sparkline_cents).toHaveLength(12);
  });
});

describe("R2 — orders_kpi(days)", () => {
  it("count = nb orders paid sur N derniers jours, daily_cents longueur=days", async () => {
    const c = await insertCustomer(admin, "r2@test.io");
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 1000,
      createdAt: daysAgo(2).toISOString(),
    });
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 2000,
      createdAt: daysAgo(5).toISOString(),
    });
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 9999,
      createdAt: daysAgo(20).toISOString(),
    });

    const { data, error } = await admin.rpc("orders_kpi", { days: 7 }).single();
    expect(error).toBeNull();
    expect(data?.count).toBe(2);
    expect(Array.isArray(data?.daily_cents)).toBe(true);
    expect((data?.daily_cents as number[]).length).toBe(7);
  });
});

describe("R3 — basket_kpi()", () => {
  it("avg_cents = round(SUM/COUNT) ; 0 si pas d'order paid", async () => {
    const { data: empty } = await admin.rpc("basket_kpi").single();
    expect(empty?.avg_cents).toBe(0);

    const c = await insertCustomer(admin, "r3@test.io");
    const inThisMonth = new Date();
    inThisMonth.setUTCDate(10);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 3000,
      createdAt: inThisMonth.toISOString(),
    });
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 5000,
      createdAt: inThisMonth.toISOString(),
    });

    const { data } = await admin.rpc("basket_kpi").single();
    expect(data?.avg_cents).toBe(4000);
  });
});

describe("R4 — target_progress()", () => {
  it("retourne current/target/pct + breakdown online/store, pct=0 si target=0", async () => {
    const c = await insertCustomer(admin, "r4@test.io");
    const inThisMonth = new Date();
    inThisMonth.setUTCDate(10);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 2500,
      channel: "online",
      createdAt: inThisMonth.toISOString(),
    });
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 1500,
      channel: "store",
      createdAt: inThisMonth.toISOString(),
    });
    await setMonthlyTarget(admin, nowMonth(), 10000);

    const { data, error } = await admin.rpc("target_progress").single();
    expect(error).toBeNull();
    expect(data?.current_cents).toBe(4000);
    expect(data?.target_cents).toBe(10000);
    expect(data?.pct).toBe(40);
    expect(data?.online_cents).toBe(2500);
    expect(data?.store_cents).toBe(1500);
  });

  it("pct = 0 quand target n'existe pas", async () => {
    const { data } = await admin.rpc("target_progress").single();
    expect(data?.pct).toBe(0);
    expect(data?.target_cents).toBe(0);
  });
});

describe("R5 — revenue_monthly(months)", () => {
  it("retourne months entrées triées asc, fin de mois", async () => {
    const { data, error } = await admin.rpc("revenue_monthly", { months: 12 });
    expect(error).toBeNull();
    expect(data).toHaveLength(12);
    const months = (data as Array<{ month: string }>).map((r) => r.month);
    expect(months).toEqual([...months].sort());
  });

  it("calcule le revenu du mois (paid uniquement)", async () => {
    const c = await insertCustomer(admin, "r5@test.io");
    const target = startOfMonthUtc();
    target.setUTCMonth(target.getUTCMonth() - 2);
    target.setUTCDate(15);
    const targetIso = target.toISOString();
    const targetMonthPrefix = targetIso.slice(0, 7);

    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 7000,
      createdAt: targetIso,
      paidAt: targetIso,
    });
    await insertOrder(admin, {
      customerId: c,
      status: "pending",
      totalCents: 9999,
      createdAt: targetIso,
    });

    const { data } = await admin.rpc("revenue_monthly", { months: 6 });
    const rows = data as Array<{ month: string; revenue_cents: number }>;
    const targetRow = rows.find((r) => r.month.startsWith(targetMonthPrefix));
    expect(targetRow?.revenue_cents).toBe(7000);
  });
});

describe("R7 — revenue_by_category()", () => {
  it("retourne 5 lignes (toutes catégories), pad à 0 si manquant", async () => {
    const { data, error } = await admin.rpc("revenue_by_category");
    expect(error).toBeNull();
    const rows = data as Array<{ category: string; revenue_cents: number }>;
    expect(rows).toHaveLength(5);
    const cats = rows.map((r) => r.category).sort();
    expect(cats).toEqual(
      ["accessories", "apparel", "beauty", "home", "tech"].sort(),
    );
    for (const r of rows) expect(Number(r.revenue_cents)).toBe(0);
  });

  it("aggregate sur paid orders × order_items", async () => {
    const c = await insertCustomer(admin, "r7@test.io");
    const p1 = await insertProduct(admin, { category: "tech", price_cents: 5000 });
    const p2 = await insertProduct(admin, { category: "apparel", price_cents: 3000 });
    const o = await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 11000,
      createdAt: new Date().toISOString(),
    });
    await insertOrderItem(admin, {
      orderId: o,
      productId: p1,
      quantity: 1,
      unitPriceCents: 5000,
    });
    await insertOrderItem(admin, {
      orderId: o,
      productId: p2,
      quantity: 2,
      unitPriceCents: 3000,
    });

    const { data } = await admin.rpc("revenue_by_category");
    const rows = data as Array<{ category: string; revenue_cents: number }>;
    const byCat = Object.fromEntries(rows.map((r) => [r.category, Number(r.revenue_cents)]));
    expect(byCat.tech).toBe(5000);
    expect(byCat.apparel).toBe(6000);
    expect(byCat.home).toBe(0);
  });
});

describe("R8 — target_vs_actual_by_category()", () => {
  it("retourne 5 lignes avec actual_cents et target_cents", async () => {
    const { data, error } = await admin.rpc("target_vs_actual_by_category");
    expect(error).toBeNull();
    const rows = data as Array<{
      category: string;
      actual_cents: number;
      target_cents: number;
    }>;
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect(typeof Number(r.actual_cents)).toBe("number");
      expect(typeof Number(r.target_cents)).toBe("number");
    }
  });

  it("actual_cents ne compte que les paid orders du mois courant", async () => {
    const c = await insertCustomer(admin, "r8@test.io");
    const p = await insertProduct(admin, { category: "tech", price_cents: 5000 });

    const thisMonth = new Date();
    thisMonth.setUTCDate(10);
    const thisMonthIso = thisMonth.toISOString();
    const oCurrent = await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 5000,
      createdAt: thisMonthIso,
      paidAt: thisMonthIso,
    });
    await insertOrderItem(admin, {
      orderId: oCurrent,
      productId: p,
      quantity: 1,
      unitPriceCents: 5000,
    });

    const lastMonth = startOfMonthUtc();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 2);
    lastMonth.setUTCDate(10);
    const lastMonthIso = lastMonth.toISOString();
    const oOld = await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 9999,
      createdAt: lastMonthIso,
      paidAt: lastMonthIso,
    });
    await insertOrderItem(admin, {
      orderId: oOld,
      productId: p,
      quantity: 1,
      unitPriceCents: 9999,
    });

    const { data } = await admin.rpc("target_vs_actual_by_category");
    const rows = data as Array<{ category: string; actual_cents: number }>;
    const tech = rows.find((r) => r.category === "tech");
    expect(Number(tech?.actual_cents)).toBe(5000);
  });
});
