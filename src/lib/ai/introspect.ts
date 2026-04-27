import type { DashboardClient } from "@/lib/supabase/types";

export type TableInfo = {
  name: string;
  rowCount: number;
};

export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
};

export type TableDetail = {
  name: string;
  columns: ColumnInfo[];
  samples: Record<string, unknown>[];
};

// Liste des tables e-commerce du seed démo. Hardcodé pour Phase 15 (1 connection only).
// Phase 14 introspectera dynamiquement le schema de connexions arbitraires.
const DEMO_TABLES = [
  "products",
  "customers",
  "orders",
  "order_items",
  "shipments",
  "events",
  "targets",
  "calendar_events",
] as const;

export async function listTables(admin: DashboardClient): Promise<TableInfo[]> {
  const out: TableInfo[] = [];
  for (const name of DEMO_TABLES) {
    const { count } = await admin.from(name).select("*", { count: "exact", head: true });
    out.push({ name, rowCount: count ?? 0 });
  }
  return out;
}

// Schema cache hardcodé. En Phase 14 → query information_schema.columns dynamiquement.
const COLUMNS_BY_TABLE: Record<string, ColumnInfo[]> = {
  products: [
    { name: "id", type: "uuid", nullable: false },
    { name: "sku", type: "text", nullable: false },
    { name: "name", type: "text", nullable: false },
    { name: "category", type: "text", nullable: false },
    { name: "segment", type: "text", nullable: false },
    { name: "price_cents", type: "integer", nullable: false },
    { name: "status", type: "text", nullable: false },
    { name: "stock", type: "integer", nullable: false },
    { name: "rating", type: "numeric", nullable: false },
    { name: "created_at", type: "timestamptz", nullable: false },
  ],
  customers: [
    { name: "id", type: "uuid", nullable: false },
    { name: "email", type: "text", nullable: false },
    { name: "full_name", type: "text", nullable: false },
    { name: "country", type: "text", nullable: false },
    { name: "segment", type: "text", nullable: false },
    { name: "created_at", type: "timestamptz", nullable: false },
  ],
  orders: [
    { name: "id", type: "uuid", nullable: false },
    { name: "customer_id", type: "uuid", nullable: false },
    { name: "status", type: "text", nullable: false },
    { name: "total_cents", type: "integer", nullable: false },
    { name: "channel", type: "text", nullable: false },
    { name: "created_at", type: "timestamptz", nullable: false },
    { name: "paid_at", type: "timestamptz", nullable: true },
  ],
  order_items: [
    { name: "id", type: "bigint", nullable: false },
    { name: "order_id", type: "uuid", nullable: false },
    { name: "product_id", type: "uuid", nullable: false },
    { name: "quantity", type: "integer", nullable: false },
    { name: "unit_price_cents", type: "integer", nullable: false },
  ],
  shipments: [
    { name: "id", type: "uuid", nullable: false },
    { name: "order_id", type: "uuid", nullable: false },
    { name: "hub", type: "text", nullable: false },
    { name: "status", type: "text", nullable: false },
    { name: "shipped_at", type: "timestamptz", nullable: false },
    { name: "delivered_at", type: "timestamptz", nullable: true },
  ],
  events: [
    { name: "id", type: "bigint", nullable: false },
    { name: "customer_id", type: "uuid", nullable: true },
    { name: "type", type: "text", nullable: false },
    { name: "occurred_at", type: "timestamptz", nullable: false },
    { name: "metadata", type: "jsonb", nullable: true },
  ],
  targets: [
    { name: "month", type: "date", nullable: false },
    { name: "revenue_cents", type: "bigint", nullable: false },
  ],
  calendar_events: [
    { name: "id", type: "uuid", nullable: false },
    { name: "title", type: "text", nullable: false },
    { name: "tag", type: "text", nullable: false },
    { name: "starts_at", type: "timestamptz", nullable: false },
    { name: "duration_min", type: "integer", nullable: false },
  ],
};

export async function inspectTable(
  admin: DashboardClient,
  tableName: string,
): Promise<TableDetail | null> {
  if (!(DEMO_TABLES as readonly string[]).includes(tableName)) return null;
  const columns = COLUMNS_BY_TABLE[tableName] ?? [];
  const { data: samples } = await admin
    // tableName est validé par le whitelist DEMO_TABLES juste au-dessus.
    .from(tableName as never)
    .select("*")
    .limit(3);
  return {
    name: tableName,
    columns,
    samples: (samples as Record<string, unknown>[]) ?? [],
  };
}
