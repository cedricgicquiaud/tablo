import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getBasketKpi,
  getOrdersKpi,
  getRevenueByCategory,
  getRevenueKpi,
  getRevenueMonthly,
  getTargetProgress,
  getTargetVsActualByCategory,
} from "../../src/lib/queries/commerce";
import {
  adminClient,
  insertCustomer,
  insertOrder,
  insertOrderItem,
  insertProduct,
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

describe("getRevenueKpi()", () => {
  it("retourne objet camelCase complet avec sparkline number[]", async () => {
    const c = await insertCustomer(admin, "rk@test.io");
    const inThisMonth = new Date();
    inThisMonth.setUTCDate(10);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 12000,
      createdAt: inThisMonth.toISOString(),
    });

    const snap = await getRevenueKpi(admin);
    expect(snap.currentCents).toBe(12000);
    expect(typeof snap.previousCents).toBe("number");
    expect(typeof snap.deltaPct).toBe("number");
    expect(Array.isArray(snap.sparklineCents)).toBe(true);
    expect(snap.sparklineCents).toHaveLength(12);
    for (const v of snap.sparklineCents) expect(typeof v).toBe("number");
  });
});

describe("getOrdersKpi()", () => {
  it("default days=7, daily_cents longueur 7, count number", async () => {
    const snap = await getOrdersKpi(admin);
    expect(typeof snap.count).toBe("number");
    expect(typeof snap.deltaPct).toBe("number");
    expect(snap.dailyCents).toHaveLength(7);
  });

  it("days=30 → daily_cents longueur 30", async () => {
    const snap = await getOrdersKpi(admin, 30);
    expect(snap.dailyCents).toHaveLength(30);
  });
});

describe("getBasketKpi()", () => {
  it("avg=0 et delta=0 sur DB vide", async () => {
    const snap = await getBasketKpi(admin);
    expect(snap.avgCents).toBe(0);
    expect(snap.deltaPct).toBe(0);
  });
});

describe("getTargetProgress()", () => {
  it("retourne current/target/pct + breakdown channel en camelCase", async () => {
    const c = await insertCustomer(admin, "tp@test.io");
    const inThisMonth = new Date();
    inThisMonth.setUTCDate(10);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 5000,
      channel: "online",
      createdAt: inThisMonth.toISOString(),
    });
    await setMonthlyTarget(admin, nowMonth(), 10000);

    const snap = await getTargetProgress(admin);
    expect(snap.currentCents).toBe(5000);
    expect(snap.targetCents).toBe(10000);
    expect(snap.pct).toBe(50);
    expect(snap.onlineCents).toBe(5000);
    expect(snap.storeCents).toBe(0);
  });
});

describe("getRevenueMonthly()", () => {
  it("retourne 12 entrées avec month: Date et revenueCents: number", async () => {
    const rows = await getRevenueMonthly(admin, 12);
    expect(rows).toHaveLength(12);
    for (const r of rows) {
      expect(r.month).toBeInstanceOf(Date);
      expect(typeof r.revenueCents).toBe("number");
    }
    const ts = rows.map((r) => r.month.getTime());
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });
});

describe("getRevenueByCategory()", () => {
  it("retourne 5 entrées camelCase, revenueCents en number", async () => {
    const c = await insertCustomer(admin, "rbc@test.io");
    const p = await insertProduct(admin, { category: "tech", price_cents: 5000 });
    const o = await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 5000,
      createdAt: new Date().toISOString(),
    });
    await insertOrderItem(admin, {
      orderId: o,
      productId: p,
      quantity: 1,
      unitPriceCents: 5000,
    });

    const rows = await getRevenueByCategory(admin);
    expect(rows).toHaveLength(5);
    const byCat = Object.fromEntries(rows.map((r) => [r.category, r.revenueCents]));
    expect(byCat.tech).toBe(5000);
    expect(byCat.apparel).toBe(0);
  });
});

describe("getTargetVsActualByCategory()", () => {
  it("retourne 5 entrées avec actualCents/targetCents", async () => {
    const rows = await getTargetVsActualByCategory(admin);
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect(typeof r.category).toBe("string");
      expect(typeof r.actualCents).toBe("number");
      expect(typeof r.targetCents).toBe("number");
    }
    const cats = rows.map((r) => r.category).sort();
    expect(cats).toEqual(["accessories", "apparel", "beauty", "home", "tech"]);
  });
});

describe("error propagation", () => {
  function brokenRpcClient(message: string) {
    const result = { data: null, error: { message } };
    const builder: Record<string, unknown> = Promise.resolve(result);
    builder.single = async () => result;
    return { rpc: () => builder } as never;
  }

  it.each([
    ["getRevenueKpi", (c: ReturnType<typeof brokenRpcClient>) => getRevenueKpi(c)],
    ["getOrdersKpi", (c: ReturnType<typeof brokenRpcClient>) => getOrdersKpi(c)],
    ["getBasketKpi", (c: ReturnType<typeof brokenRpcClient>) => getBasketKpi(c)],
    ["getTargetProgress", (c: ReturnType<typeof brokenRpcClient>) => getTargetProgress(c)],
    ["getRevenueMonthly", (c: ReturnType<typeof brokenRpcClient>) => getRevenueMonthly(c)],
    ["getRevenueByCategory", (c: ReturnType<typeof brokenRpcClient>) => getRevenueByCategory(c)],
    [
      "getTargetVsActualByCategory",
      (c: ReturnType<typeof brokenRpcClient>) => getTargetVsActualByCategory(c),
    ],
  ])("%s throws when supabase returns an error", async (_name, run) => {
    await expect(run(brokenRpcClient("kapow"))).rejects.toThrow(/kapow/);
  });
});
