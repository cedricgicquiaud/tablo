/**
 * Tests AirtableDataSource — Phase 14.5 B.3.
 *
 * Couvre R14 (listTables via API meta), R15 (inspectTable), R17 (cache schema
 * TTL 5min), E13 (table inexistante).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  AirtableDataSource,
  __resetAirtableCacheForTests,
} from "./data-source";
import type { AirtableTableSchema } from "./meta-api";

const fakeSchema: AirtableTableSchema[] = [
  {
    id: "tbl1",
    name: "Customers",
    primaryFieldId: "fldName",
    fields: [
      { id: "fldName", name: "Name", type: "singleLineText" },
      { id: "fldEmail", name: "Email", type: "email" },
      { id: "fldAmount", name: "Amount", type: "currency" },
      { id: "fldCreated", name: "Created Time", type: "createdTime" },
      { id: "fldActive", name: "Is Active", type: "checkbox" },
    ],
  },
  {
    id: "tbl2",
    name: "Orders",
    primaryFieldId: "fldId",
    fields: [
      { id: "fldId", name: "Order ID", type: "singleLineText" },
      { id: "fldCustomer", name: "Customer", type: "multipleRecordLinks" },
      { id: "fldTotal", name: "Total", type: "number" },
    ],
  },
];

function makeDataSource(
  override: Partial<{
    fetchTablesSchemaFn: ReturnType<typeof vi.fn>;
    getAccessToken: () => Promise<string>;
    connectionId: string;
    baseId: string;
  }> = {},
) {
  return new AirtableDataSource({
    connectionId: override.connectionId ?? "conn_1",
    baseId: override.baseId ?? "appA",
    getAccessToken: override.getAccessToken ?? (async () => "tok"),
    fetchTablesSchemaFn:
      override.fetchTablesSchemaFn ??
      vi.fn().mockResolvedValue(fakeSchema),
  });
}

describe("AirtableDataSource.listTables (R14)", () => {
  beforeEach(() => {
    __resetAirtableCacheForTests();
    vi.restoreAllMocks();
  });

  it("retourne array TableInfo {name, rowCount} depuis fetchTablesSchema", async () => {
    const ds = makeDataSource();
    const tables = await ds.listTables();

    expect(tables).toHaveLength(2);
    expect(tables[0]).toMatchObject({ name: "Customers", rowCount: 0 });
    expect(tables[1]).toMatchObject({ name: "Orders", rowCount: 0 });
  });

  it("R17 — cache schema : 2 calls listTables → 1 seul fetch API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeSchema);
    const ds = makeDataSource({ fetchTablesSchemaFn: fetchMock });

    await ds.listTables();
    await ds.listTables();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("appelle fetchTablesSchema avec accessToken frais issue de getAccessToken", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeSchema);
    const getAccessToken = vi.fn().mockResolvedValue("fresh_tok");
    const ds = makeDataSource({
      fetchTablesSchemaFn: fetchMock,
      getAccessToken,
    });

    await ds.listTables();

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("fresh_tok", "appA");
  });
});

describe("AirtableDataSource.inspectTable (R15, E13)", () => {
  beforeEach(() => {
    __resetAirtableCacheForTests();
    vi.restoreAllMocks();
  });

  it("R15 — retourne TableDetail avec columns mappés vers types SQL", async () => {
    const ds = makeDataSource();
    const detail = await ds.inspectTable("Customers");

    expect(detail).toBeDefined();
    expect(detail!.name).toBe("Customers");
    // Columns normalisées + types SQL mappés
    const cols = detail!.columns;
    expect(cols).toContainEqual({
      name: "name",
      type: "text",
      nullable: true,
    });
    expect(cols).toContainEqual({
      name: "email",
      type: "text",
      nullable: true,
    });
    expect(cols).toContainEqual({
      name: "amount",
      type: "numeric",
      nullable: true,
    });
    expect(cols).toContainEqual({
      name: "created_time",
      type: "timestamp",
      nullable: true,
    });
    expect(cols).toContainEqual({
      name: "is_active",
      type: "boolean",
      nullable: true,
    });
  });

  it("R15 — accepte le name normalisé (snake_case) ET le name Airtable original", async () => {
    const ds = makeDataSource();

    // Lookup par nom Airtable original
    const d1 = await ds.inspectTable("Orders");
    expect(d1).toBeDefined();
    expect(d1!.name).toBe("Orders");

    // Lookup case-insensitive (cohérence SQL)
    const d2 = await ds.inspectTable("orders");
    expect(d2).toBeDefined();
  });

  it("E13 — table inexistante → null", async () => {
    const ds = makeDataSource();
    const detail = await ds.inspectTable("NonExistent");
    expect(detail).toBeNull();
  });

  it("R17 — cache schema partagé entre listTables et inspectTable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeSchema);
    const ds = makeDataSource({ fetchTablesSchemaFn: fetchMock });

    await ds.listTables();
    await ds.inspectTable("Customers");
    await ds.inspectTable("Orders");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("samples : V1 retourne array vide (B.4 fetchRecords pas requis pour inspect)", async () => {
    const ds = makeDataSource();
    const detail = await ds.inspectTable("Customers");
    expect(detail!.samples).toEqual([]);
  });
});
