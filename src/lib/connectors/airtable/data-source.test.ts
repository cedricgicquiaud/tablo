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
import type {
  FetchTableRecordsOpts,
  FetchTableRecordsResult,
} from "./records-api";

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
  const fetchSchema =
    override.fetchTablesSchemaFn ?? vi.fn().mockResolvedValue(fakeSchema);
  return new AirtableDataSource({
    connectionId: override.connectionId ?? "conn_1",
    baseId: override.baseId ?? "appA",
    getAccessToken: override.getAccessToken ?? (async () => "tok"),
    fetchTablesSchemaFn: fetchSchema as unknown as (
      accessToken: string,
      baseId: string,
    ) => Promise<typeof fakeSchema>,
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

  it("smoke S7 fix — fetchTableRecordsFn retourne 3 records → samples flatten 3 entrées", async () => {
    const fetchRecordsFn = vi.fn().mockResolvedValue({
      records: [
        { id: "rec1", createdTime: "2024-01-15T10:00:00Z", fields: { Name: "Alice", Email: "a@x.com" } },
        { id: "rec2", createdTime: "2024-01-15T11:00:00Z", fields: { Name: "Bob", Email: "b@x.com" } },
        { id: "rec3", createdTime: "2024-01-15T12:00:00Z", fields: { Name: "Charlie" } },
      ],
      truncated: false,
    });
    const ds = new AirtableDataSource({
      connectionId: "conn_1",
      baseId: "appA",
      getAccessToken: async () => "tok",
      fetchTablesSchemaFn: vi
        .fn()
        .mockResolvedValue(fakeSchema) as unknown as (
        a: string,
        b: string,
      ) => Promise<typeof fakeSchema>,
      fetchTableRecordsFn: fetchRecordsFn as unknown as (
        opts: FetchTableRecordsOpts,
      ) => Promise<FetchTableRecordsResult>,
    });

    const detail = await ds.inspectTable("Customers");

    expect(detail!.samples).toHaveLength(3);
    expect(detail!.samples[0]).toMatchObject({ id: "rec1", name: "Alice" });
    expect(fetchRecordsFn).toHaveBeenCalledWith({
      accessToken: "tok",
      baseId: "appA",
      tableName: "Customers",
      maxRecords: 3,
    });
  });

  it("samples : fetchTableRecordsFn throw → fallback samples=[] (inspectTable ne casse pas)", async () => {
    const fetchRecordsFn = vi
      .fn()
      .mockRejectedValue(new Error("network down"));
    const ds = new AirtableDataSource({
      connectionId: "conn_1",
      baseId: "appA",
      getAccessToken: async () => "tok",
      fetchTablesSchemaFn: vi
        .fn()
        .mockResolvedValue(fakeSchema) as unknown as (
        a: string,
        b: string,
      ) => Promise<typeof fakeSchema>,
      fetchTableRecordsFn: fetchRecordsFn as unknown as (
        opts: FetchTableRecordsOpts,
      ) => Promise<FetchTableRecordsResult>,
    });

    const detail = await ds.inspectTable("Customers");

    expect(detail).not.toBeNull();
    expect(detail!.samples).toEqual([]);
    // Les columns sont quand même retournées (inspectTable ne casse jamais)
    expect(detail!.columns.length).toBeGreaterThan(0);
  });
});

describe("AirtableDataSource.runQuery (R16, R18, RNF5, E12, E13, E14)", () => {
  beforeEach(() => {
    __resetAirtableCacheForTests();
    vi.restoreAllMocks();
  });

  function makeDataSourceWithRecords(
    records: Record<string, Array<{ id: string; createdTime: string; fields: Record<string, unknown> }>>,
    opts: {
      fetchRecordsFn?: ReturnType<typeof vi.fn>;
      connectionId?: string;
      baseId?: string;
    } = {},
  ) {
    const fetchRecordsFn =
      opts.fetchRecordsFn ??
      vi.fn().mockImplementation(async ({ tableName }: { tableName: string }) => ({
        records: records[tableName] ?? [],
        truncated: false,
      }));
    return new AirtableDataSource({
      connectionId: opts.connectionId ?? "conn_1",
      baseId: opts.baseId ?? "appA",
      getAccessToken: async () => "tok",
      fetchTablesSchemaFn: vi
        .fn()
        .mockResolvedValue(fakeSchema) as unknown as (
        a: string,
        b: string,
      ) => Promise<typeof fakeSchema>,
      fetchTableRecordsFn: fetchRecordsFn as unknown as (
        opts: FetchTableRecordsOpts,
      ) => Promise<FetchTableRecordsResult>,
    });
  }

  it("R16 — SELECT * FROM Customers → fetch records + flatten + alasql + return rows", async () => {
    const ds = makeDataSourceWithRecords({
      Customers: [
        {
          id: "rec1",
          createdTime: "2024-01-15T10:00:00.000Z",
          fields: { Name: "Alice", Email: "a@x.com" },
        },
        {
          id: "rec2",
          createdTime: "2024-01-15T11:00:00.000Z",
          fields: { Name: "Bob", Email: "b@x.com" },
        },
      ],
    });

    const rows = await ds.runQuery("SELECT * FROM Customers");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: "rec1", name: "Alice", email: "a@x.com" });
    expect(rows[1]).toMatchObject({ id: "rec2", name: "Bob" });
  });

  it("RNF5 + E12 — INSERT/UPDATE/DELETE → throw avant fetch", async () => {
    const fetchMock = vi.fn();
    const ds = makeDataSourceWithRecords(
      {},
      { fetchRecordsFn: fetchMock },
    );

    await expect(ds.runQuery("INSERT INTO Customers VALUES (1)")).rejects.toThrow();
    await expect(ds.runQuery("UPDATE Customers SET x=1")).rejects.toThrow();
    await expect(ds.runQuery("DELETE FROM Customers")).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("R16 — SELECT avec aggregate (COUNT) sur table existante → exécute via alasql", async () => {
    const ds = makeDataSourceWithRecords({
      Customers: [
        { id: "r1", createdTime: "t", fields: { Name: "A" } },
        { id: "r2", createdTime: "t", fields: { Name: "B" } },
        { id: "r3", createdTime: "t", fields: { Name: "C" } },
      ],
    });

    // Note : alias `total` est un keyword alasql → on utilise `cnt`. Si l'AI
    // génère `total`, B.5 translator devra wrapper dans [total]. Smoke
    // testing détectera (couvert).
    const rows = await ds.runQuery(
      "SELECT COUNT(*) AS cnt FROM Customers",
    );
    expect(rows).toHaveLength(1);
    expect((rows[0] as { cnt: number }).cnt).toBe(3);
  });

  it("Lazy-fetch — SELECT que de Customers → fetch que Customers (pas Orders)", async () => {
    const fetchRecordsFn = vi
      .fn()
      .mockImplementation(async ({ tableName }: { tableName: string }) => ({
        records:
          tableName === "Customers"
            ? [{ id: "r1", createdTime: "t", fields: { Name: "A" } }]
            : [],
        truncated: false,
      }));
    const ds = makeDataSourceWithRecords({}, { fetchRecordsFn });

    await ds.runQuery("SELECT * FROM Customers");

    // Une seule call, pour Customers
    expect(fetchRecordsFn).toHaveBeenCalledTimes(1);
    const call = (fetchRecordsFn.mock.calls[0] as [{ tableName: string }])[0];
    expect(call.tableName).toBe("Customers");
  });

  it("R17 — 2 calls successifs même SQL → 1 seul fetch (cache TTL 5min)", async () => {
    const fetchRecordsFn = vi
      .fn()
      .mockImplementation(async () => ({
        records: [{ id: "r1", createdTime: "t", fields: { Name: "A" } }],
        truncated: false,
      }));
    const ds = makeDataSourceWithRecords({}, { fetchRecordsFn });

    await ds.runQuery("SELECT * FROM Customers");
    await ds.runQuery("SELECT name FROM Customers");

    // Une seule fetch (table cache hit au 2nd run)
    expect(fetchRecordsFn).toHaveBeenCalledTimes(1);
  });

  it("R18 — 2 calls parallèles même table → 1 seul fetch via mutex", async () => {
    let count = 0;
    const fetchRecordsFn = vi.fn().mockImplementation(async () => {
      count++;
      // Délai pour permettre la 2nde call avant resolve
      await new Promise((r) => setTimeout(r, 10));
      return {
        records: [{ id: `r${count}`, createdTime: "t", fields: {} }],
        truncated: false,
      };
    });
    const ds = makeDataSourceWithRecords({}, { fetchRecordsFn });

    const [r1, r2] = await Promise.all([
      ds.runQuery("SELECT * FROM Customers"),
      ds.runQuery("SELECT * FROM Customers"),
    ]);

    expect(fetchRecordsFn).toHaveBeenCalledTimes(1);
    expect(r1).toEqual(r2);
  });

  it("E13 — table inexistante dans schema → throw clair", async () => {
    const ds = makeDataSourceWithRecords({});

    await expect(
      ds.runQuery("SELECT * FROM NonExistentTable"),
    ).rejects.toThrow(/non.+trouvée|n[' ]existe pas|inexistante/i);
  });

  it("Cross-tenant isolation — connections distinctes ne partagent pas le cache (P14.3 audit verifier)", async () => {
    const ds1 = makeDataSourceWithRecords(
      {
        Customers: [{ id: "r1", createdTime: "t", fields: { Name: "Tenant1" } }],
      },
      { connectionId: "conn_tenant1" },
    );
    const ds2 = makeDataSourceWithRecords(
      {
        Customers: [{ id: "r99", createdTime: "t", fields: { Name: "Tenant2" } }],
      },
      { connectionId: "conn_tenant2" },
    );

    const rows1 = await ds1.runQuery("SELECT name FROM Customers");
    const rows2 = await ds2.runQuery("SELECT name FROM Customers");

    expect((rows1[0] as { name: string }).name).toBe("Tenant1");
    expect((rows2[0] as { name: string }).name).toBe("Tenant2");
  });
});
