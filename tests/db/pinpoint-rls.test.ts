import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, anonClient, authedClient } from "./helpers";

const admin = adminClient();

const USER_A = { email: "rls-a@test.io", password: "rlspass123" };
const USER_B = { email: "rls-b@test.io", password: "rlspass123" };

async function ensureUser(email: string, password: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function cleanupUser(email: string) {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
  }
}

beforeAll(async () => {
  await cleanupUser(USER_A.email);
  await cleanupUser(USER_B.email);
  await ensureUser(USER_A.email, USER_A.password);
  await ensureUser(USER_B.email, USER_B.password);
}, 30000);

afterAll(async () => {
  await cleanupUser(USER_A.email);
  await cleanupUser(USER_B.email);
}, 30000);

describe("RLS multi-tenant Pinpoint", () => {
  it("le trigger handle_new_user crée un workspace par user", async () => {
    const clientA = await authedClient(USER_A.email, USER_A.password);
    const { data, error } = await clientA
      .from("workspaces")
      .select("id, name, owner_user_id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].name).toBe("Mon workspace");
  });

  it("user A ne voit pas le workspace de user B", async () => {
    const clientA = await authedClient(USER_A.email, USER_A.password);
    const clientB = await authedClient(USER_B.email, USER_B.password);

    const { data: wsA } = await clientA.from("workspaces").select("id");
    const { data: wsB } = await clientB.from("workspaces").select("id");

    expect(wsA).toHaveLength(1);
    expect(wsB).toHaveLength(1);
    expect(wsA?.[0].id).not.toBe(wsB?.[0].id);
  });

  it("user A crée un dashboard, user B ne le voit pas", async () => {
    const clientA = await authedClient(USER_A.email, USER_A.password);
    const clientB = await authedClient(USER_B.email, USER_B.password);

    const { data: wsA } = await clientA
      .from("workspaces")
      .select("id")
      .single();
    const { data: created, error: createErr } = await clientA
      .from("dashboards")
      .insert({ workspace_id: wsA!.id, name: "Dashboard A" })
      .select("id")
      .single();
    expect(createErr).toBeNull();
    expect(created?.id).toBeDefined();

    const { data: dashA } = await clientA.from("dashboards").select("id, name");
    const { data: dashB } = await clientB.from("dashboards").select("id, name");
    expect(dashA?.some((d) => d.id === created!.id)).toBe(true);
    expect(dashB?.some((d) => d.id === created!.id)).toBe(false);
  });

  it("user B ne peut pas insert un dashboard dans le workspace de A", async () => {
    const clientA = await authedClient(USER_A.email, USER_A.password);
    const clientB = await authedClient(USER_B.email, USER_B.password);

    const { data: wsA } = await clientA
      .from("workspaces")
      .select("id")
      .single();
    const { error } = await clientB
      .from("dashboards")
      .insert({ workspace_id: wsA!.id, name: "Hack from B" });
    expect(error).not.toBeNull();
  });

  it("anon ne voit aucun workspace ni dashboard", async () => {
    const anon = anonClient();
    const { data: ws } = await anon.from("workspaces").select("id");
    const { data: dash } = await anon.from("dashboards").select("id");
    expect(ws).toEqual([]);
    expect(dash).toEqual([]);
  });
});
