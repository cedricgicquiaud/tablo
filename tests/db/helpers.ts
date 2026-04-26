import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  Channel,
  EventType,
  Hub,
  OrderStatus,
  ProductStatus,
  Segment,
  ShipmentStatus,
} from "../../src/lib/domain/commerce";
import type { Database } from "../../src/lib/supabase/database.types";
import {
  createSupabaseAdminClient,
  ensureDemoAuthUser,
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
export const ensureDemoUser = ensureDemoAuthUser;

let skuCounter = 0;
function nextSku(): string {
  skuCounter += 1;
  return `ECO-${String(Date.now()).slice(-6)}-${skuCounter}`;
}

export async function insertProduct(
  admin: DashboardClient,
  overrides: Partial<{
    sku: string;
    name: string;
    category: Category;
    segment: Segment;
    price_cents: number;
    status: ProductStatus;
    stock: number;
    rating: number;
    created_at: string;
  }> = {},
): Promise<string> {
  const { data, error } = await admin
    .from("products")
    .insert({
      sku: overrides.sku ?? nextSku(),
      name: overrides.name ?? "Test product",
      category: overrides.category ?? "tech",
      segment: overrides.segment ?? "standard",
      price_cents: overrides.price_cents ?? 4900,
      status: overrides.status ?? "active",
      stock: overrides.stock ?? 10,
      rating: overrides.rating ?? 4.0,
      ...(overrides.created_at ? { created_at: overrides.created_at } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function insertCustomer(
  admin: DashboardClient,
  email: string,
  overrides: Partial<{
    full_name: string;
    country: string;
    segment: Segment;
    created_at: string;
  }> = {},
): Promise<string> {
  const { data, error } = await admin
    .from("customers")
    .insert({
      email,
      full_name: overrides.full_name ?? "Test Customer",
      country: overrides.country ?? "FR",
      segment: overrides.segment ?? "standard",
      ...(overrides.created_at ? { created_at: overrides.created_at } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function insertOrder(
  admin: DashboardClient,
  params: {
    customerId: string;
    status: OrderStatus;
    totalCents: number;
    channel?: Channel;
    createdAt?: string;
    paidAt?: string | null;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("orders")
    .insert({
      customer_id: params.customerId,
      status: params.status,
      total_cents: params.totalCents,
      channel: params.channel ?? "online",
      paid_at:
        params.paidAt !== undefined
          ? params.paidAt
          : params.status === "paid"
            ? (params.createdAt ?? new Date().toISOString())
            : null,
      ...(params.createdAt ? { created_at: params.createdAt } : {}),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function insertOrderItem(
  admin: DashboardClient,
  params: {
    orderId: string;
    productId: string;
    quantity: number;
    unitPriceCents: number;
  },
): Promise<void> {
  const { error } = await admin.from("order_items").insert({
    order_id: params.orderId,
    product_id: params.productId,
    quantity: params.quantity,
    unit_price_cents: params.unitPriceCents,
  });
  if (error) throw error;
}

export async function insertShipment(
  admin: DashboardClient,
  params: {
    orderId: string;
    hub: Hub;
    status: ShipmentStatus;
    shippedAt: string;
    deliveredAt?: string | null;
  },
): Promise<void> {
  const { error } = await admin.from("shipments").insert({
    order_id: params.orderId,
    hub: params.hub,
    status: params.status,
    shipped_at: params.shippedAt,
    delivered_at:
      params.deliveredAt !== undefined
        ? params.deliveredAt
        : params.status === "delivered"
          ? params.shippedAt
          : null,
  });
  if (error) throw error;
}

export async function insertEvent(
  admin: DashboardClient,
  type: EventType,
  occurredAt: Date,
  customerId: string | null = null,
): Promise<void> {
  const { error } = await admin.from("events").insert({
    customer_id: customerId,
    type,
    occurred_at: occurredAt.toISOString(),
  });
  if (error) throw error;
}

export async function setMonthlyTarget(
  admin: DashboardClient,
  month: string,
  revenueCents: number,
): Promise<void> {
  const { error } = await admin.from("targets").upsert({ month, revenue_cents: revenueCents });
  if (error) throw error;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export function startOfMonthUtc(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}
