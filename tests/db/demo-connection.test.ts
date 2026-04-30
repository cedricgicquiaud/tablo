import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, authedClient } from "./helpers";

const admin = adminClient();

const USER = { email: "demo-conn@test.io", password: "democonn123" };

async function ensureUser(email: string, password: string) {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
}

beforeAll(async () => {
  await ensureUser(USER.email, USER.password);
}, 30000);

afterAll(async () => {
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === USER.email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);
}, 30000);

describe("trigger handle_new_user — connexion demo auto", () => {
  it("provisionne une connexion kind='demo' pour le workspace du nouvel user", async () => {
    const client = await authedClient(USER.email, USER.password);
    const { data: workspaces } = await client.from("workspaces").select("id");
    expect(workspaces).toHaveLength(1);
    const workspaceId = workspaces![0].id;

    const { data: connections, error } = await client
      .from("connections")
      .select("id, kind, name, workspace_id");
    expect(error).toBeNull();
    expect(connections).toHaveLength(1);
    expect(connections![0].kind).toBe("demo");
    expect(connections![0].workspace_id).toBe(workspaceId);
  });
});
