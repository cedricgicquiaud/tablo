import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  adminClient,
  anonClient,
  authedClient,
  ensureDemoUser,
  truncateAll,
} from "./helpers";

const admin = adminClient();
const DEMO_EMAIL = "rls-demo@demo.io";
const DEMO_PASSWORD = "rlsdemo123";

beforeAll(async () => {
  await ensureDemoUser(admin, DEMO_EMAIL, DEMO_PASSWORD);
});

beforeEach(async () => {
  await truncateAll(admin);
  // 1 user fixture
  const { error } = await admin
    .from("users")
    .insert({ email: "fixture@test.io", full_name: "Fixture", country: "FR" });
  if (error) throw error;
});

afterAll(async () => {
  await truncateAll(admin);
});

describe("RLS", () => {
  it("R10 — client anon ne peut pas SELECT users/subscriptions/events", async () => {
    const anon = anonClient();
    const { data: u, error: eu } = await anon.from("users").select("*");
    expect(eu).toBeNull();
    expect(u).toEqual([]);
    const { data: s } = await anon.from("subscriptions").select("*");
    expect(s).toEqual([]);
    const { data: e } = await anon.from("events").select("*");
    expect(e).toEqual([]);
  });

  it("R11 — client authentifié peut SELECT", async () => {
    const authed = await authedClient(DEMO_EMAIL, DEMO_PASSWORD);
    const { data, error } = await authed.from("users").select("*");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
  });

  it("R12 — client authentifié ne peut pas INSERT/UPDATE/DELETE", async () => {
    const authed = await authedClient(DEMO_EMAIL, DEMO_PASSWORD);
    // INSERT : aucune policy → erreur
    const ins = await authed
      .from("users")
      .insert({ email: "hack@test.io", full_name: "X", country: "FR" });
    expect(ins.error).not.toBeNull();
    // UPDATE : aucune policy → 0 ligne modifiée (RLS bloque silencieusement)
    const upd = await authed
      .from("users")
      .update({ country: "US" })
      .eq("email", "fixture@test.io")
      .select();
    expect(upd.data ?? []).toHaveLength(0);
    // Vérifie que la valeur n'a pas changé en relisant via admin
    const { data: stillFr } = await admin
      .from("users")
      .select("country")
      .eq("email", "fixture@test.io")
      .single();
    expect(stillFr?.country).toBe("FR");
    // DELETE : aucune policy → 0 ligne supprimée
    const del = await authed
      .from("users")
      .delete()
      .eq("email", "fixture@test.io")
      .select();
    expect(del.data ?? []).toHaveLength(0);
    const { data: stillExists } = await admin
      .from("users")
      .select("id")
      .eq("email", "fixture@test.io")
      .single();
    expect(stillExists?.id).toBeTruthy();
  });
});
