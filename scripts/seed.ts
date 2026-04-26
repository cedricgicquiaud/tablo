import { fileURLToPath } from "node:url";
import { faker } from "@faker-js/faker";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  PLAN_DISTRIBUTION,
  PRICING_CENTS,
  type PlanCode,
} from "../src/lib/domain/plans";
import type { Database, TablesInsert } from "../src/lib/supabase/database.types";

const TARGET_USERS = 1000;
const HISTORY_MONTHS = 12;
const FAKER_SEED = 4242;
const NOW = new Date("2026-04-26T12:00:00Z");
const CANCELED_RATIO = 0.04;
const ACTIVE_USER_RATIO = 0.6;

type Admin = SupabaseClient<Database>;

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pickPlan(): PlanCode {
  return faker.helpers.weightedArrayElement(PLAN_DISTRIBUTION);
}

function oldestStartedAt(): Date {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - HISTORY_MONTHS);
  return d;
}

export async function seedDemoData(admin: Admin): Promise<void> {
  faker.seed(FAKER_SEED);
  const start = oldestStartedAt().getTime();
  const end = NOW.getTime();

  const users: TablesInsert<"users">[] = [];
  const subs: TablesInsert<"subscriptions">[] = [];
  const events: TablesInsert<"events">[] = [];

  for (let i = 0; i < TARGET_USERS; i++) {
    const id = faker.string.uuid();
    const createdAt = new Date(faker.number.int({ min: start, max: end }));
    users.push({
      id,
      email: `seed-${i}-${faker.internet.email().toLowerCase()}`,
      full_name: faker.person.fullName(),
      country: faker.location.countryCode(),
      created_at: createdAt.toISOString(),
    });

    const plan = pickPlan();
    const isCanceled = faker.number.float({ min: 0, max: 1 }) < CANCELED_RATIO;
    const canceledAt = isCanceled
      ? new Date(
          createdAt.getTime() +
            faker.number.int({ min: 1, max: 60 }) * 24 * 3600 * 1000,
        ).toISOString()
      : null;
    subs.push({
      user_id: id,
      plan,
      mrr_cents: PRICING_CENTS[plan],
      status: isCanceled ? "canceled" : "active",
      started_at: createdAt.toISOString(),
      canceled_at: canceledAt,
    });

    events.push({ user_id: id, type: "signup", occurred_at: createdAt.toISOString() });
    if (faker.number.float({ min: 0, max: 1 }) < ACTIVE_USER_RATIO) {
      const nLogins = faker.number.int({ min: 1, max: 5 });
      for (let k = 0; k < nLogins; k++) {
        const offsetDays = faker.number.int({ min: 0, max: 29 });
        const occurred = new Date(end - offsetDays * 24 * 3600 * 1000);
        events.push({
          user_id: id,
          type: "login",
          occurred_at: occurred.toISOString(),
        });
      }
    }
  }

  for (const batch of chunked(users, 500)) {
    const { error } = await admin.from("users").insert(batch);
    if (error) throw error;
  }
  for (const batch of chunked(subs, 500)) {
    const { error } = await admin.from("subscriptions").insert(batch);
    if (error) throw error;
  }
  for (const batch of chunked(events, 500)) {
    const { error } = await admin.from("events").insert(batch);
    if (error) throw error;
  }
}

async function main(): Promise<void> {
  config({ path: ".env.local" });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "Missing env vars : run `supabase start` then copy values to .env.local",
    );
  }
  const admin = createClient<Database>(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.from("events").delete().gt("id", 0);
  await admin.from("subscriptions").delete().not("id", "is", null);
  await admin.from("users").delete().not("id", "is", null);
  console.log("Seeding demo data…");
  await seedDemoData(admin);
  console.log("Done.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
