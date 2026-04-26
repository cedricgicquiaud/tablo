import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, truncateAll } from "./helpers";
import { seedDemoData } from "../../scripts/seed";

const admin = adminClient();

beforeAll(async () => {
  await truncateAll(admin);
}, 60_000);

afterAll(async () => {
  await truncateAll(admin);
}, 60_000);

async function counts() {
  const tables = ["products", "customers", "orders", "order_items", "shipments"] as const;
  const out: Record<string, number> = {};
  for (const t of tables) {
    const { count, error } = await admin
      .from(t)
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    out[t] = count ?? 0;
  }
  return out;
}

describe("R20 — seed reproductible", () => {
  it(
    "produit les volumes attendus puis re-seed donne les mêmes counts",
    async () => {
      await truncateAll(admin);
      await seedDemoData(admin);
      const first = await counts();

      expect(first.products).toBeGreaterThanOrEqual(2900);
      expect(first.products).toBeLessThanOrEqual(3100);
      expect(first.customers).toBeGreaterThanOrEqual(4900);
      expect(first.customers).toBeLessThanOrEqual(5100);
      expect(first.orders).toBeGreaterThanOrEqual(9900);
      expect(first.orders).toBeLessThanOrEqual(10100);
      expect(first.order_items).toBeGreaterThanOrEqual(15000);

      await truncateAll(admin);
      await seedDemoData(admin);
      const second = await counts();

      expect(second).toEqual(first);
    },
    180_000,
  );
});
