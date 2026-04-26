import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  daysAgo,
  insertCustomer,
  insertEvent,
  insertOrder,
  insertProduct,
  truncateAll,
} from "./helpers";

const admin = adminClient();

beforeEach(async () => {
  await truncateAll(admin);
});

afterAll(async () => {
  await truncateAll(admin);
});

describe("R13 — revenue_by_segment_monthly()", () => {
  it("retourne months × 3 segments triés asc", async () => {
    const { data, error } = await admin.rpc("revenue_by_segment_monthly", { months: 6 });
    expect(error).toBeNull();
    const rows = data as Array<{ month: string; segment: string; revenue_cents: number }>;
    expect(rows).toHaveLength(6 * 3);
    const segs = new Set(rows.map((r) => r.segment));
    expect(segs).toEqual(new Set(["basic", "standard", "premium"]));
  });

  it("agrège correctement par segment", async () => {
    const c = await insertCustomer(admin, "r13@test.io", { segment: "premium" });
    const inThisMonth = new Date();
    inThisMonth.setUTCDate(10);
    await insertOrder(admin, {
      customerId: c,
      status: "paid",
      totalCents: 5000,
      createdAt: inThisMonth.toISOString(),
    });

    const { data } = await admin.rpc("revenue_by_segment_monthly", { months: 3 });
    const rows = data as Array<{ month: string; segment: string; revenue_cents: number }>;
    const premiumThisMonth = rows.find(
      (r) =>
        r.segment === "premium" &&
        r.month.slice(0, 7) === inThisMonth.toISOString().slice(0, 7),
    );
    expect(Number(premiumThisMonth?.revenue_cents)).toBe(5000);
  });
});

describe("R14 — recent_activity()", () => {
  it("retourne au plus N events triés desc", async () => {
    const c = await insertCustomer(admin, "r14@test.io");
    await insertEvent(admin, "visit", daysAgo(3), c);
    await insertEvent(admin, "paid", daysAgo(1), c);
    await insertEvent(admin, "checkout", daysAgo(2), c);

    const { data } = await admin.rpc("recent_activity", { limit_n: 10 });
    const rows = data as Array<{
      customer_email: string;
      action_label: string;
      occurred_at: string;
    }>;
    expect(rows).toHaveLength(3);
    expect(rows[0].customer_email).toBe("r14@test.io");
    expect(rows[0].action_label).toBe("a payé une commande");
    const ts = rows.map((r) => new Date(r.occurred_at).getTime());
    expect(ts).toEqual([...ts].sort((a, b) => b - a));
  });

  it("event sans customer_id → 'visiteur'", async () => {
    await insertEvent(admin, "visit", daysAgo(1), null);
    const { data } = await admin.rpc("recent_activity", { limit_n: 1 });
    const rows = data as Array<{ customer_email: string }>;
    expect(rows[0].customer_email).toBe("visiteur");
  });
});

describe("R15 — products_paginated()", () => {
  it("retourne rows + total cohérents", async () => {
    for (let i = 0; i < 5; i++) {
      await insertProduct(admin, { name: `Product ${i}`, price_cents: 1000 + i * 100 });
    }

    const { data, error } = await admin
      .rpc("products_paginated", {
        search: "",
        sort_col: "created_at",
        sort_dir: "desc",
        limit_n: 3,
        offset_n: 0,
      })
      .single();
    expect(error).toBeNull();
    const result = data as { rows: unknown[]; total: number };
    expect(result.rows).toHaveLength(3);
    expect(Number(result.total)).toBe(5);
  });

  it("ILIKE filter sur name", async () => {
    await insertProduct(admin, { name: "Sneakers Rouge" });
    await insertProduct(admin, { name: "T-shirt Bleu" });
    await insertProduct(admin, { name: "Sneakers Noir" });

    const { data } = await admin
      .rpc("products_paginated", {
        search: "sneakers",
        sort_col: "name",
        sort_dir: "asc",
        limit_n: 10,
        offset_n: 0,
      })
      .single();
    const result = data as { rows: Array<{ name: string }>; total: number };
    expect(Number(result.total)).toBe(2);
    expect(result.rows.map((r) => r.name).sort()).toEqual(
      ["Sneakers Noir", "Sneakers Rouge"].sort(),
    );
  });
});

describe("R16 — calendar_upcoming()", () => {
  it("retourne les N prochains événements triés asc", async () => {
    const future1 = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const future2 = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    await admin.from("calendar_events").insert([
      { title: "Event 1", tag: "campagne", starts_at: future1, duration_min: 60 },
      { title: "Event 2", tag: "marketing", starts_at: future2, duration_min: 90 },
    ]);

    const { data, error } = await admin.rpc("calendar_upcoming", { limit_n: 4 });
    expect(error).toBeNull();
    const rows = data as Array<{ title: string; starts_at: string }>;
    expect(rows.map((r) => r.title)).toEqual(["Event 1", "Event 2"]);
  });

  it("ignore les events passés", async () => {
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    await admin.from("calendar_events").insert({
      title: "Past",
      tag: "stock",
      starts_at: past,
      duration_min: 30,
    });
    const { data } = await admin.rpc("calendar_upcoming", { limit_n: 4 });
    expect((data as Array<unknown>)).toHaveLength(0);
  });
});
