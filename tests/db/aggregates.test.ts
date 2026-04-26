import { afterAll, beforeEach, describe, expect, it } from "vitest";
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

describe("kpi_snapshot()", () => {
  it("R1 — mrr_cents = SUM des subscriptions WHERE status='active'", async () => {
    const u1 = await insertUser(admin, "free@test.io");
    const u2 = await insertUser(admin, "pro@test.io");
    const u3 = await insertUser(admin, "enterprise@test.io");
    const u4 = await insertUser(admin, "canceled@test.io");
    await insertSubscription(admin, { userId: u1, plan: "free", status: "active" });
    await insertSubscription(admin, { userId: u2, plan: "pro", status: "active" });
    await insertSubscription(admin, { userId: u3, plan: "enterprise", status: "active" });
    await insertSubscription(admin, {
      userId: u4,
      plan: "pro",
      status: "canceled",
      canceledAt: new Date().toISOString(),
    });

    const { data, error } = await admin.rpc("kpi_snapshot").single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ mrr_cents: 12800 });
  });

  it("R2 — churn_pct = canceled / actives_at_J-30 sur 30j glissants, arrondi entier", async () => {
    for (let i = 0; i < 10; i++) {
      const u = await insertUser(admin, `u${i}@test.io`);
      const startedAt = daysAgo(60).toISOString();
      if (i < 2) {
        await insertSubscription(admin, {
          userId: u,
          plan: "pro",
          status: "canceled",
          startedAt,
          canceledAt: daysAgo(15).toISOString(),
        });
      } else {
        await insertSubscription(admin, {
          userId: u,
          plan: "pro",
          status: "active",
          startedAt,
        });
      }
    }

    const { data, error } = await admin.rpc("kpi_snapshot").single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ churn_pct: 20 });
  });

  it("R3 — active_users = COUNT DISTINCT events.user_id sur 30j", async () => {
    const u1 = await insertUser(admin, "a@test.io");
    const u2 = await insertUser(admin, "b@test.io");
    const u3 = await insertUser(admin, "c@test.io");
    const u4 = await insertUser(admin, "d@test.io");
    const u5 = await insertUser(admin, "e@test.io");
    await insertEvent(admin, u1, "login", daysAgo(1));
    await insertEvent(admin, u1, "login", daysAgo(5));
    await insertEvent(admin, u1, "login", daysAgo(10));
    await insertEvent(admin, u2, "login", daysAgo(2));
    await insertEvent(admin, u3, "login", daysAgo(15));
    await insertEvent(admin, u4, "login", daysAgo(29));
    await insertEvent(admin, u5, "login", daysAgo(20));

    const { data, error } = await admin.rpc("kpi_snapshot").single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ active_users: 5 });
  });

  it("R4 — arpu_cents = round(mrr / active_users), 0 si active_users=0", async () => {
    for (let i = 0; i < 4; i++) {
      const u = await insertUser(admin, `x${i}@test.io`);
      await insertSubscription(admin, { userId: u, plan: "pro", status: "active", mrrCents: 2500 });
      await insertEvent(admin, u, "login", daysAgo(1));
    }

    const { data, error } = await admin.rpc("kpi_snapshot").single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ mrr_cents: 10000, active_users: 4, arpu_cents: 2500 });
  });

  it("R4 bis — arpu_cents = 0 quand active_users = 0", async () => {
    const u = await insertUser(admin, "noevent@test.io");
    await insertSubscription(admin, { userId: u, plan: "pro", status: "active", mrrCents: 2900 });
    const { data, error } = await admin.rpc("kpi_snapshot").single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ active_users: 0, arpu_cents: 0 });
  });
});

describe("mrr_monthly()", () => {
  it("R5 — retourne exactement 12 lignes triées par month croissant", async () => {
    const { data, error } = await admin.rpc("mrr_monthly", { months: 12 });
    expect(error).toBeNull();
    expect(data).toHaveLength(12);
    const months = (data as Array<{ month: string }>).map((r) => r.month);
    const sorted = [...months].sort();
    expect(months).toEqual(sorted);
  });

  it("R6 — calcule MRR à la fin de chaque mois (sub couvre jan-fév, pas mars)", async () => {
    const u = await insertUser(admin, "ranged@test.io");
    await insertSubscription(admin, {
      userId: u,
      plan: "pro",
      status: "canceled",
      startedAt: "2026-01-15T00:00:00Z",
      canceledAt: "2026-03-10T00:00:00Z",
      mrrCents: 2900,
    });

    const { data, error } = await admin.rpc("mrr_monthly", { months: 6 });
    expect(error).toBeNull();
    const rows = data as Array<{ month: string; mrr_cents: number }>;
    const byMonth = new Map(rows.map((r) => [r.month.slice(0, 7), r.mrr_cents]));
    expect(byMonth.get("2026-01")).toBe(2900);
    expect(byMonth.get("2026-02")).toBe(2900);
    expect(byMonth.get("2026-03")).toBe(0);
  });
});

describe("signups_weekly()", () => {
  it("R7 — retourne 12 lignes (lundi UTC) avec count des events 'signup'", async () => {
    const u1 = await insertUser(admin, "s1@test.io");
    const u2 = await insertUser(admin, "s2@test.io");
    const u3 = await insertUser(admin, "s3@test.io");
    await insertEvent(admin, u1, "signup", daysAgo(0));
    await insertEvent(admin, u2, "signup", daysAgo(1));
    await insertEvent(admin, u3, "signup", daysAgo(2));

    const { data, error } = await admin.rpc("signups_weekly", { weeks: 12 });
    expect(error).toBeNull();
    const rows = data as Array<{ week_start: string; signups_count: number }>;
    expect(rows).toHaveLength(12);
    for (const r of rows) {
      const d = new Date(r.week_start);
      expect(d.getUTCDay()).toBe(1);
    }
    const total = rows.reduce((acc, r) => acc + r.signups_count, 0);
    expect(total).toBe(3);
  });
});

describe("plan_distribution()", () => {
  it("R8 — retourne toujours 3 lignes (free/pro/enterprise) même avec 0 user", async () => {
    const { data, error } = await admin.rpc("plan_distribution");
    expect(error).toBeNull();
    const rows = data as Array<{ plan: string; users_count: number }>;
    expect(rows).toHaveLength(3);
    const plans = rows.map((r) => r.plan).sort();
    expect(plans).toEqual(["enterprise", "free", "pro"]);
    for (const r of rows) expect(r.users_count).toBe(0);
  });

  it("R8 bis — count cohérent quand subs présentes", async () => {
    for (let i = 0; i < 3; i++) {
      const u = await insertUser(admin, `f${i}@test.io`);
      await insertSubscription(admin, { userId: u, plan: "free", status: "active" });
    }
    for (let i = 0; i < 2; i++) {
      const u = await insertUser(admin, `p${i}@test.io`);
      await insertSubscription(admin, { userId: u, plan: "pro", status: "active" });
    }
    const u = await insertUser(admin, "e0@test.io");
    await insertSubscription(admin, { userId: u, plan: "enterprise", status: "active" });

    const { data, error } = await admin.rpc("plan_distribution");
    expect(error).toBeNull();
    const rows = data as Array<{ plan: string; users_count: number }>;
    const counts = Object.fromEntries(rows.map((r) => [r.plan, r.users_count]));
    expect(counts).toMatchObject({ free: 3, pro: 2, enterprise: 1 });
  });
});

describe("recent_users()", () => {
  it("R9 — retourne au plus N lignes triées par created_at DESC", async () => {
    for (let i = 0; i < 15; i++) {
      const userId = await insertUser(admin, `r${i}@test.io`, {
        full_name: `User ${i}`,
        created_at: new Date(2026, 0, i + 1).toISOString(),
      });
      await insertSubscription(admin, { userId, plan: "pro", status: "active" });
    }

    const { data, error } = await admin.rpc("recent_users", { limit_n: 10 });
    expect(error).toBeNull();
    const rows = data as Array<{ email: string; created_at: string; plan: string; mrr_cents: number }>;
    expect(rows).toHaveLength(10);
    expect(rows[0].email).toBe("r14@test.io");
    expect(rows[9].email).toBe("r5@test.io");
    expect(rows[0].plan).toBe("pro");
    expect(rows[0].mrr_cents).toBe(2900);
  });
});
