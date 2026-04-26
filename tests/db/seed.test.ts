import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { adminClient, truncateAll } from "./helpers";
import { seedDemoData } from "../../scripts/seed";

const admin = adminClient();

beforeEach(async () => {
  await truncateAll(admin);
});

afterAll(async () => {
  await truncateAll(admin);
});

async function countByPlan(): Promise<Record<string, number>> {
  const { data } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("status", "active");
  const out: Record<string, number> = { free: 0, pro: 0, enterprise: 0 };
  for (const row of data ?? []) out[row.plan as string]++;
  return out;
}

describe("seed", () => {
  it("R13 — produit ~1000 users + distribution 70/25/5 (±5pp)", async () => {
    await seedDemoData(admin);

    const { count: usersCount } = await admin
      .from("users")
      .select("*", { count: "exact", head: true });
    expect(usersCount).toBeGreaterThanOrEqual(980);
    expect(usersCount).toBeLessThanOrEqual(1020);

    const { count: subsCount } = await admin
      .from("subscriptions")
      .select("*", { count: "exact", head: true });
    expect(subsCount).toBe(usersCount);

    const dist = await countByPlan();
    const total = (dist.free ?? 0) + (dist.pro ?? 0) + (dist.enterprise ?? 0);
    const ratios = {
      free: dist.free / total,
      pro: dist.pro / total,
      enterprise: dist.enterprise / total,
    };
    expect(ratios.free).toBeGreaterThanOrEqual(0.65);
    expect(ratios.free).toBeLessThanOrEqual(0.75);
    expect(ratios.pro).toBeGreaterThanOrEqual(0.2);
    expect(ratios.pro).toBeLessThanOrEqual(0.3);
    expect(ratios.enterprise).toBeGreaterThanOrEqual(0.0);
    expect(ratios.enterprise).toBeLessThanOrEqual(0.1);
  });

  it("R14 — reproductible : deux runs successifs donnent les mêmes comptages", async () => {
    await seedDemoData(admin);
    const snapshot1 = {
      users: (await admin.from("users").select("*", { count: "exact", head: true })).count,
      subs: (await admin.from("subscriptions").select("*", { count: "exact", head: true })).count,
      events: (await admin.from("events").select("*", { count: "exact", head: true })).count,
    };

    await truncateAll(admin);
    await seedDemoData(admin);
    const snapshot2 = {
      users: (await admin.from("users").select("*", { count: "exact", head: true })).count,
      subs: (await admin.from("subscriptions").select("*", { count: "exact", head: true })).count,
      events: (await admin.from("events").select("*", { count: "exact", head: true })).count,
    };

    expect(snapshot2).toEqual(snapshot1);
  });
});
