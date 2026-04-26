import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  daysAgo,
  insertCustomer,
  insertEvent,
  insertOrder,
  insertShipment,
  truncateAll,
} from "./helpers";

const admin = adminClient();

beforeEach(async () => {
  await truncateAll(admin);
});

afterAll(async () => {
  await truncateAll(admin);
});

describe("R9 — orders_by_hour_dow()", () => {
  it("retourne 56 lignes (7 dow × 8 buckets) toutes ≥ 0", async () => {
    const { data, error } = await admin.rpc("orders_by_hour_dow");
    expect(error).toBeNull();
    const rows = data as Array<{ dow: number; hour_bucket: number; orders_count: number }>;
    expect(rows).toHaveLength(56);
    for (const r of rows) {
      expect(r.dow).toBeGreaterThanOrEqual(1);
      expect(r.dow).toBeLessThanOrEqual(7);
      expect([0, 3, 6, 9, 12, 15, 18, 21]).toContain(r.hour_bucket);
      expect(r.orders_count).toBeGreaterThanOrEqual(0);
    }
  });

  it("compte les paid orders dans le bon bucket", async () => {
    const c = await insertCustomer(admin, "r9@test.io");
    const tuesday14h = "2026-04-21T14:30:00Z"; // Tuesday (dow=2), bucket 12
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 1000,
      createdAt: tuesday14h,
      paidAt: tuesday14h,
    });

    const { data } = await admin.rpc("orders_by_hour_dow", { days: 365 });
    const rows = data as Array<{ dow: number; hour_bucket: number; orders_count: number }>;
    const target = rows.find((r) => r.dow === 2 && r.hour_bucket === 12);
    expect(target?.orders_count).toBe(1);
  });
});

describe("R10 — orders_funnel(days)", () => {
  it("retourne 4 étapes ordonnées (visit → paid)", async () => {
    const { data, error } = await admin.rpc("orders_funnel", { days: 30 });
    expect(error).toBeNull();
    const rows = data as Array<{ step: string; step_order: number; count: number }>;
    expect(rows.map((r) => r.step)).toEqual(["visit", "add_to_cart", "checkout", "paid"]);
  });

  it("count = nb events sur la période", async () => {
    const c = await insertCustomer(admin, "r10@test.io");
    await insertEvent(admin, "visit", daysAgo(2), c);
    await insertEvent(admin, "visit", daysAgo(3), c);
    await insertEvent(admin, "add_to_cart", daysAgo(2), c);

    const { data } = await admin.rpc("orders_funnel", { days: 30 });
    const rows = data as Array<{ step: string; count: number }>;
    const byStep = Object.fromEntries(rows.map((r) => [r.step, Number(r.count)]));
    expect(byStep.visit).toBe(2);
    expect(byStep.add_to_cart).toBe(1);
    expect(byStep.checkout).toBe(0);
    expect(byStep.paid).toBe(0);
  });
});

describe("R11 — shipments_by_hub()", () => {
  it("retourne 6 hubs avec in_transit/delivered/total = 0 si pas de shipment", async () => {
    const { data, error } = await admin.rpc("shipments_by_hub");
    expect(error).toBeNull();
    const rows = data as Array<{
      hub: string;
      in_transit: number;
      delivered: number;
      total: number;
    }>;
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.hub).sort()).toEqual([
      "bordeaux",
      "lille",
      "lyon",
      "marseille",
      "paris",
      "strasbourg",
    ]);
    for (const r of rows) {
      expect(r.in_transit).toBe(0);
      expect(r.delivered).toBe(0);
      expect(r.total).toBe(0);
    }
  });

  it("agrège correctement par hub × statut", async () => {
    const c = await insertCustomer(admin, "r11@test.io");
    const o1 = await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 100,
      createdAt: daysAgo(5).toISOString(),
    });
    const o2 = await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 100,
      createdAt: daysAgo(5).toISOString(),
    });
    await insertShipment(admin, {
      orderId: o1,
      hub: "paris",
      status: "in_transit",
      shippedAt: daysAgo(2).toISOString(),
    });
    await insertShipment(admin, {
      orderId: o2,
      hub: "paris",
      status: "delivered",
      shippedAt: daysAgo(4).toISOString(),
    });

    const { data } = await admin.rpc("shipments_by_hub");
    const rows = data as Array<{
      hub: string;
      in_transit: number;
      delivered: number;
      total: number;
    }>;
    const paris = rows.find((r) => r.hub === "paris");
    expect(paris?.in_transit).toBe(1);
    expect(paris?.delivered).toBe(1);
    expect(paris?.total).toBe(2);
  });
});

describe("R12 — top_countries(limit_n)", () => {
  it("retourne au plus N pays triés par revenu desc", async () => {
    const { data, error } = await admin.rpc("top_countries", { limit_n: 5 });
    expect(error).toBeNull();
    const rows = data as Array<{ country: string; revenue_cents: number; delta_pct: number }>;
    expect(rows.length).toBeLessThanOrEqual(5);
  });

  it("ne renvoie pas les pays avec revenue=0", async () => {
    const c = await insertCustomer(admin, "r12@test.io", { country: "FR" });
    const inThisMonth = new Date();
    inThisMonth.setUTCDate(10);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 5000,
      createdAt: inThisMonth.toISOString(),
    });

    const { data } = await admin.rpc("top_countries", { limit_n: 10 });
    const rows = data as Array<{ country: string; revenue_cents: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].country).toBe("FR");
    expect(Number(rows[0].revenue_cents)).toBe(5000);
  });
});
