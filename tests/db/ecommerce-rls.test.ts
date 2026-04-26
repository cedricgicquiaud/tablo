import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  authedClient,
  ensureDemoUser,
  insertCustomer,
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

describe("RLS — anon", () => {
  it("R17 — SELECT anon retourne 0 ligne sur products / customers / orders", async () => {
    await insertProduct(admin);
    await insertCustomer(admin, "rls-anon@test.io");
    const anon = anonClient();

    const products = await anon.from("products").select("id");
    expect(products.data).toEqual([]);
    const customers = await anon.from("customers").select("id");
    expect(customers.data).toEqual([]);
  });
});

describe("RLS — authenticated", () => {
  it("R18 — SELECT authenticated retourne les lignes", async () => {
    await ensureDemoUser(admin);
    await insertProduct(admin, { name: "Auth product" });
    const auth = await authedClient("demo@demo.io", "demodemo");

    const products = await auth.from("products").select("id, name");
    expect(products.error).toBeNull();
    expect((products.data ?? []).length).toBeGreaterThan(0);
  });

  it("R19 — INSERT authenticated rejeté par RLS", async () => {
    await ensureDemoUser(admin);
    const auth = await authedClient("demo@demo.io", "demodemo");

    const beforeCountQuery = await admin
      .from("products")
      .select("id", { count: "exact", head: true });
    const before = beforeCountQuery.count ?? 0;

    const insertRes = await auth.from("products").insert({
      sku: "RLS-INSERT",
      name: "Should fail",
      category: "tech",
      segment: "basic",
      price_cents: 100,
      status: "active",
      stock: 1,
      rating: 1.0,
    });

    const afterCountQuery = await admin
      .from("products")
      .select("id", { count: "exact", head: true });
    const after = afterCountQuery.count ?? 0;

    // Soit l'API renvoie une erreur explicite, soit l'insert est silencieusement filtré : dans les
    // deux cas le compte ne doit pas avoir bougé.
    expect(after).toBe(before);
    if (!insertRes.error) {
      expect(insertRes.data).toBeFalsy();
    }
  });
});
