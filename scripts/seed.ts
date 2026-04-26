import { fileURLToPath } from "node:url";
import { faker } from "@faker-js/faker";
import { config } from "dotenv";
import {
  CALENDAR_TAGS,
  CATEGORIES,
  CHANNELS,
  COUNTRIES,
  HUBS,
  ORDER_STATUSES,
  PRICE_RANGES_CENTS,
  PRODUCT_STATUSES,
  SEGMENTS,
  type Category,
  type Channel,
  type Country,
  type Hub,
  type OrderStatus,
  type ProductStatus,
  type Segment,
  type ShipmentStatus,
} from "../src/lib/domain/commerce";
import {
  createSupabaseAdminClient,
  ensureDemoAuthUser,
  truncateDemoTables,
} from "../src/lib/supabase/admin";
import type { TablesInsert } from "../src/lib/supabase/database.types";
import type { DashboardClient } from "../src/lib/supabase/types";

const TARGET_PRODUCTS = 3000;
const TARGET_CUSTOMERS = 5000;
const TARGET_ORDERS = 10000;
const HISTORY_MONTHS = 12;
const FAKER_SEED = 4242;
const NOW = new Date("2026-04-26T12:00:00Z");

const PRODUCT_SEGMENT_WEIGHTS = [
  { value: SEGMENTS[0], weight: 0.5 },
  { value: SEGMENTS[1], weight: 0.35 },
  { value: SEGMENTS[2], weight: 0.15 },
] as const satisfies ReadonlyArray<{ value: Segment; weight: number }>;

const PRODUCT_STATUS_WEIGHTS = [
  { value: PRODUCT_STATUSES[0], weight: 0.85 },
  { value: PRODUCT_STATUSES[1], weight: 0.1 },
  { value: PRODUCT_STATUSES[2], weight: 0.05 },
] as const satisfies ReadonlyArray<{ value: ProductStatus; weight: number }>;

const CUSTOMER_SEGMENT_WEIGHTS = [
  { value: SEGMENTS[0], weight: 0.55 },
  { value: SEGMENTS[1], weight: 0.3 },
  { value: SEGMENTS[2], weight: 0.15 },
] as const satisfies ReadonlyArray<{ value: Segment; weight: number }>;

const COUNTRY_WEIGHTS = [
  { value: COUNTRIES[0], weight: 0.45 },
  { value: COUNTRIES[2], weight: 0.18 },
  { value: COUNTRIES[1], weight: 0.15 },
  { value: COUNTRIES[3], weight: 0.1 },
  { value: COUNTRIES[4], weight: 0.08 },
  { value: COUNTRIES[5], weight: 0.04 },
] as const satisfies ReadonlyArray<{ value: Country; weight: number }>;

const ORDER_STATUS_WEIGHTS = [
  { value: ORDER_STATUSES[0], weight: 0.78 }, // paid
  { value: ORDER_STATUSES[1], weight: 0.12 }, // pending
  { value: ORDER_STATUSES[2], weight: 0.06 }, // refunded
  { value: ORDER_STATUSES[3], weight: 0.04 }, // canceled
] as const satisfies ReadonlyArray<{ value: OrderStatus; weight: number }>;

const CHANNEL_WEIGHTS = [
  { value: CHANNELS[0], weight: 0.72 },
  { value: CHANNELS[1], weight: 0.28 },
] as const satisfies ReadonlyArray<{ value: Channel; weight: number }>;

type Admin = DashboardClient;

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pickWeighted<T>(items: ReadonlyArray<{ value: T; weight: number }>): T {
  const total = items.reduce((acc, it) => acc + it.weight, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function priceForSegment(segment: Segment): number {
  const [min, max] = PRICE_RANGES_CENTS[segment];
  return faker.number.int({ min, max });
}

function oldestStartedAt(): Date {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - HISTORY_MONTHS);
  return d;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function seedDemoData(admin: Admin): Promise<void> {
  faker.seed(FAKER_SEED);
  const start = oldestStartedAt().getTime();
  const end = NOW.getTime();

  const products: TablesInsert<"products">[] = [];
  for (let i = 0; i < TARGET_PRODUCTS; i++) {
    const category = faker.helpers.arrayElement(
      CATEGORIES as ReadonlyArray<Category>,
    );
    const segment = pickWeighted(PRODUCT_SEGMENT_WEIGHTS);
    const status = pickWeighted(PRODUCT_STATUS_WEIGHTS);
    products.push({
      sku: `ECO-${String(i).padStart(5, "0")}`,
      name: faker.commerce.productName(),
      category,
      segment,
      price_cents: priceForSegment(segment),
      status,
      stock: status === "sold_out" ? 0 : faker.number.int({ min: 1, max: 200 }),
      rating: Number(faker.number.float({ min: 2.5, max: 5, fractionDigits: 1 }).toFixed(1)),
      created_at: new Date(faker.number.int({ min: start, max: end })).toISOString(),
    });
  }

  const customers: TablesInsert<"customers">[] = [];
  for (let i = 0; i < TARGET_CUSTOMERS; i++) {
    customers.push({
      email: `seed-${i}-${faker.internet.email().toLowerCase()}`,
      full_name: faker.person.fullName(),
      country: pickWeighted(COUNTRY_WEIGHTS),
      segment: pickWeighted(CUSTOMER_SEGMENT_WEIGHTS),
      created_at: new Date(faker.number.int({ min: start, max: end })).toISOString(),
    });
  }

  for (const batch of chunked(products, 500)) {
    const { error } = await admin.from("products").insert(batch);
    if (error) throw error;
  }
  for (const batch of chunked(customers, 500)) {
    const { error } = await admin.from("customers").insert(batch);
    if (error) throw error;
  }

  const { data: productRows, error: productErr } = await admin
    .from("products")
    .select("id, segment, price_cents, status")
    .range(0, TARGET_PRODUCTS + 100);
  if (productErr) throw productErr;
  const activeProducts = productRows!.filter((p) => p.status !== "draft");

  const { data: customerRows, error: customerErr } = await admin
    .from("customers")
    .select("id, segment, created_at")
    .range(0, TARGET_CUSTOMERS + 100);
  if (customerErr) throw customerErr;

  const orders: TablesInsert<"orders">[] = [];
  const orderProductMap: Array<{ productId: string; unit_price_cents: number; quantity: number }[]> = [];
  for (let i = 0; i < TARGET_ORDERS; i++) {
    const customer = faker.helpers.arrayElement(customerRows!);
    const status = pickWeighted(ORDER_STATUS_WEIGHTS);
    const channel = pickWeighted(CHANNEL_WEIGHTS);
    const createdAt = new Date(faker.number.int({ min: start, max: end }));
    const itemCount = faker.number.int({ min: 1, max: 4 });
    const items: { productId: string; unit_price_cents: number; quantity: number }[] = [];
    let total = 0;
    for (let k = 0; k < itemCount; k++) {
      const product = faker.helpers.arrayElement(activeProducts);
      const quantity = faker.number.int({ min: 1, max: 3 });
      items.push({
        productId: product.id,
        unit_price_cents: product.price_cents,
        quantity,
      });
      total += product.price_cents * quantity;
    }
    orderProductMap.push(items);
    orders.push({
      customer_id: customer.id,
      status,
      total_cents: total,
      channel,
      created_at: createdAt.toISOString(),
      paid_at: status === "paid" ? createdAt.toISOString() : null,
    });
  }

  for (const batch of chunked(orders, 500)) {
    const { error } = await admin.from("orders").insert(batch);
    if (error) throw error;
  }

  const { data: orderRows, error: orderErr } = await admin
    .from("orders")
    .select("id, created_at")
    .order("created_at", { ascending: true })
    .range(0, TARGET_ORDERS + 100);
  if (orderErr) throw orderErr;

  const orderItems: TablesInsert<"order_items">[] = [];
  for (let i = 0; i < orderRows!.length; i++) {
    const order = orderRows![i];
    const items = orderProductMap[i] ?? [];
    for (const item of items) {
      orderItems.push({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
      });
    }
  }
  for (const batch of chunked(orderItems, 1000)) {
    const { error } = await admin.from("order_items").insert(batch);
    if (error) throw error;
  }

  const { data: paidOrders, error: paidErr } = await admin
    .from("orders")
    .select("id, paid_at")
    .eq("status", "paid")
    .range(0, TARGET_ORDERS + 100);
  if (paidErr) throw paidErr;

  const shipments: TablesInsert<"shipments">[] = [];
  for (const order of paidOrders!) {
    const hub = faker.helpers.arrayElement(HUBS as ReadonlyArray<Hub>);
    const isDelivered = faker.number.float({ min: 0, max: 1 }) < 0.85;
    const isReturned = !isDelivered && faker.number.float({ min: 0, max: 1 }) < 0.05;
    const status: ShipmentStatus = isReturned
      ? "returned"
      : isDelivered
        ? "delivered"
        : "in_transit";
    const shippedAt = order.paid_at!;
    shipments.push({
      order_id: order.id,
      hub,
      status,
      shipped_at: shippedAt,
      delivered_at:
        status === "delivered"
          ? new Date(new Date(shippedAt).getTime() + 24 * 3600 * 1000 * 3).toISOString()
          : null,
    });
  }
  for (const batch of chunked(shipments, 500)) {
    const { error } = await admin.from("shipments").insert(batch);
    if (error) throw error;
  }

  const events: TablesInsert<"events">[] = [];
  for (const customer of customerRows!) {
    const visits = faker.number.int({ min: 1, max: 8 });
    for (let i = 0; i < visits; i++) {
      const occurred = new Date(faker.number.int({ min: start, max: end }));
      events.push({ customer_id: customer.id, type: "visit", occurred_at: occurred.toISOString() });
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.55) {
      events.push({
        customer_id: customer.id,
        type: "add_to_cart",
        occurred_at: new Date(faker.number.int({ min: start, max: end })).toISOString(),
      });
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.4) {
      events.push({
        customer_id: customer.id,
        type: "checkout",
        occurred_at: new Date(faker.number.int({ min: start, max: end })).toISOString(),
      });
    }
    events.push({
      customer_id: customer.id,
      type: "signup",
      occurred_at: customer.created_at ?? new Date().toISOString(),
    });
  }
  for (const order of paidOrders!) {
    events.push({
      customer_id: null,
      type: "paid",
      occurred_at: order.paid_at!,
    });
  }
  for (const batch of chunked(events, 1000)) {
    const { error } = await admin.from("events").insert(batch);
    if (error) throw error;
  }

  const targets: TablesInsert<"targets">[] = [];
  for (let i = 0; i < HISTORY_MONTHS; i++) {
    const m = startOfMonth(NOW);
    m.setUTCMonth(m.getUTCMonth() - i);
    targets.push({
      month: m.toISOString().slice(0, 10),
      revenue_cents: faker.number.int({ min: 4_000_000, max: 8_500_000 }),
    });
  }
  const { error: targetsErr } = await admin.from("targets").upsert(targets);
  if (targetsErr) throw targetsErr;

  const calendarEvents: TablesInsert<"calendar_events">[] = [];
  for (let i = 0; i < 4; i++) {
    const startsAt = new Date(NOW.getTime() + (i + 1) * 24 * 3600 * 1000);
    calendarEvents.push({
      title: faker.commerce.productAdjective() + " " + faker.commerce.department(),
      tag: CALENDAR_TAGS[i % CALENDAR_TAGS.length],
      starts_at: startsAt.toISOString(),
      duration_min: faker.number.int({ min: 30, max: 240 }),
    });
  }
  const { error: calErr } = await admin.from("calendar_events").insert(calendarEvents);
  if (calErr) throw calErr;
}

async function main(): Promise<void> {
  config({ path: ".env.local" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  if (!isLocal && process.env.ALLOW_SEED_NON_LOCAL !== "1") {
    throw new Error(
      `Refus de seed sur un Supabase non-local (${url}). Le seed crée demo@demo.io ` +
        "via service_role. Exporte ALLOW_SEED_NON_LOCAL=1 si vraiment intentionnel.",
    );
  }

  const admin = createSupabaseAdminClient();
  await truncateDemoTables(admin);
  console.log("Seeding e-commerce demo data…");
  await seedDemoData(admin);
  await ensureDemoAuthUser(admin);
  console.log("Done. Demo credentials : demo@demo.io / demodemo");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
