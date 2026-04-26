import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  PRICING_CENTS,
  type EventType,
  type PlanCode,
  type SubscriptionStatus,
} from "../../src/lib/domain/plans";
import type { Database } from "../../src/lib/supabase/database.types";
import {
  createSupabaseAdminClient,
  truncateDemoTables,
} from "../../src/lib/supabase/admin";
import { getSupabaseEnv } from "../../src/lib/supabase/env";
import type { DashboardClient } from "../../src/lib/supabase/types";

export function adminClient(): DashboardClient {
  return createSupabaseAdminClient();
}

export function anonClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseEnv();
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function authedClient(
  email: string,
  password: string,
): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

export const truncateAll = truncateDemoTables;

export async function ensureDemoUser(
  admin: DashboardClient,
  email = "demo@demo.io",
  password = "demodemo",
): Promise<string> {
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

export async function insertUser(
  admin: DashboardClient,
  email: string,
  overrides: Partial<{ full_name: string; country: string; created_at: string }> = {},
): Promise<string> {
  const { data, error } = await admin
    .from("users")
    .insert({
      email,
      full_name: overrides.full_name ?? "Test User",
      country: overrides.country ?? "FR",
      ...(overrides.created_at ? { created_at: overrides.created_at } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function insertSubscription(
  admin: DashboardClient,
  params: {
    userId: string;
    plan: PlanCode;
    status: SubscriptionStatus;
    mrrCents?: number;
    startedAt?: string;
    canceledAt?: string;
  },
): Promise<void> {
  const { error } = await admin.from("subscriptions").insert({
    user_id: params.userId,
    plan: params.plan,
    mrr_cents: params.mrrCents ?? PRICING_CENTS[params.plan],
    status: params.status,
    started_at: params.startedAt ?? new Date().toISOString(),
    canceled_at: params.canceledAt ?? null,
  });
  if (error) throw error;
}

export async function insertEvent(
  admin: DashboardClient,
  userId: string,
  type: EventType,
  occurredAt: Date,
): Promise<void> {
  const { error } = await admin.from("events").insert({
    user_id: userId,
    type,
    occurred_at: occurredAt.toISOString(),
  });
  if (error) throw error;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
