import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getKpiSnapshot,
  getMrrMonthly,
  getPlanDistribution,
  getRecentUsers,
  getSignupsWeekly,
} from "../../src/lib/queries/analytics";
import {
  adminClient,
  daysAgo,
  insertEvent,
  insertSubscription,
  insertUser,
  truncateAll,
} from "./helpers";

const admin = adminClient();

beforeEach(async () => {
  await truncateAll(admin);
});

afterAll(async () => {
  await truncateAll(admin);
});

describe("getKpiSnapshot()", () => {
  it("retourne un objet camelCase avec mrrCents/churnPct/activeUsers/arpuCents", async () => {
    const u = await insertUser(admin, "kpi@test.io");
    await insertSubscription(admin, { userId: u, plan: "pro", status: "active" });
    await insertEvent(admin, u, "login", daysAgo(1));

    const snap = await getKpiSnapshot(admin);

    expect(snap).toEqual({
      mrrCents: 2900,
      churnPct: 0,
      activeUsers: 1,
      arpuCents: 2900,
    });
  });
});

describe("getMrrMonthly()", () => {
  it("retourne 12 entrées avec month (Date) et mrrCents (number) triées asc", async () => {
    const rows = await getMrrMonthly(admin, 12);

    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(row.month).toBeInstanceOf(Date);
      expect(typeof row.mrrCents).toBe("number");
    }
    const ts = rows.map((r) => r.month.getTime());
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
  });
});

describe("getSignupsWeekly()", () => {
  it("retourne 12 entrées avec weekStart (Date lundi UTC) et signupsCount", async () => {
    const u = await insertUser(admin, "sw@test.io");
    await insertEvent(admin, u, "signup", daysAgo(0));

    const rows = await getSignupsWeekly(admin, 12);

    expect(rows).toHaveLength(12);
    for (const row of rows) {
      expect(row.weekStart).toBeInstanceOf(Date);
      expect(row.weekStart.getUTCDay()).toBe(1);
      expect(typeof row.signupsCount).toBe("number");
    }
    const total = rows.reduce((acc, r) => acc + r.signupsCount, 0);
    expect(total).toBe(1);
  });
});

describe("getPlanDistribution()", () => {
  it("retourne 3 entrées (free/pro/enterprise) avec usersCount camelCase", async () => {
    const u = await insertUser(admin, "pd@test.io");
    await insertSubscription(admin, { userId: u, plan: "pro", status: "active" });

    const rows = await getPlanDistribution(admin);
    expect(rows).toHaveLength(3);
    const byPlan = Object.fromEntries(rows.map((r) => [r.plan, r.usersCount]));
    expect(byPlan).toMatchObject({ free: 0, pro: 1, enterprise: 0 });
  });
});

describe("getRecentUsers()", () => {
  it("retourne ≤ N entrées camelCase triées created_at DESC", async () => {
    for (let i = 0; i < 12; i++) {
      const userId = await insertUser(admin, `ru${i}@test.io`, {
        full_name: `User ${i}`,
        created_at: new Date(2026, 0, i + 1).toISOString(),
      });
      await insertSubscription(admin, { userId, plan: "pro", status: "active" });
    }

    const rows = await getRecentUsers(admin, 10);

    expect(rows).toHaveLength(10);
    expect(rows[0].email).toBe("ru11@test.io");
    expect(rows[0].fullName).toBe("User 11");
    expect(rows[0].plan).toBe("pro");
    expect(rows[0].mrrCents).toBe(2900);
    expect(rows[0].createdAt).toBeInstanceOf(Date);
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
    ["getKpiSnapshot", (c: ReturnType<typeof brokenRpcClient>) => getKpiSnapshot(c)],
    ["getMrrMonthly", (c: ReturnType<typeof brokenRpcClient>) => getMrrMonthly(c)],
    ["getSignupsWeekly", (c: ReturnType<typeof brokenRpcClient>) => getSignupsWeekly(c)],
    ["getPlanDistribution", (c: ReturnType<typeof brokenRpcClient>) => getPlanDistribution(c)],
    ["getRecentUsers", (c: ReturnType<typeof brokenRpcClient>) => getRecentUsers(c)],
  ])("%s throws when supabase returns an error", async (_name, run) => {
    await expect(run(brokenRpcClient("boom"))).rejects.toThrow(/boom/);
  });
});
