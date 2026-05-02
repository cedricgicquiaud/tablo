/**
 * TB8 — Tool inspect_table avec lecture cache + top_values.
 *
 * Phase 17 cycle B T2.5 (R20, R22).
 */

import { describe, it, expect, vi } from "vitest";
import { executeInspectTable } from "./inspect-table";
import type { DataSource } from "@/lib/connectors/types";
import type { SchemaCacheEntry } from "../schema-cache/types";

function makeMockDataSource(): DataSource {
  return {
    listTables: vi.fn(),
    inspectTable: vi.fn(async (name: string) => ({
      name,
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "stage", type: "text", nullable: false },
      ],
      samples: [{ id: "abc", stage: "qualified" }],
    })),
    runQuery: vi.fn(),
  };
}

function makeCacheWithDeals(): SchemaCacheEntry {
  return {
    version: 1,
    synced_at: new Date().toISOString(),
    status: "ok",
    tables: [
      {
        name: "deals",
        row_count: 800,
        columns: [
          { name: "id", type: "uuid", nullable: false },
          {
            name: "stage",
            type: "text",
            nullable: false,
            distinct_count: 6,
            top_values: [
              { value: "closed_won", count: 168 },
              { value: "qualified", count: 161 },
            ],
          },
        ],
      },
    ],
  };
}

describe("executeInspectTable", () => {
  it("TB8 — cache OK + top_values → retournés au LLM (résout R22 closed_won)", async () => {
    const cache = makeCacheWithDeals();
    const ds = makeMockDataSource();

    const result = await executeInspectTable(ds, cache, { table_name: "deals" });

    expect(result.is_error).toBe(false);
    const detail = JSON.parse(result.content);
    expect(detail.name).toBe("deals");
    expect(detail.columns).toHaveLength(2);
    const stageCol = detail.columns.find((c: { name: string }) => c.name === "stage");
    expect(stageCol.top_values).toEqual([
      { value: "closed_won", count: 168 },
      { value: "qualified", count: 161 },
    ]);
    // DataSource jamais appelé : cache hit
    expect(ds.inspectTable).not.toHaveBeenCalled();
  });

  it("cache absent → fallback DataSource.inspectTable() + 3 lignes d'exemple (R21)", async () => {
    const ds = makeMockDataSource();
    const result = await executeInspectTable(ds, null, { table_name: "deals" });

    expect(result.is_error).toBe(false);
    const detail = JSON.parse(result.content);
    expect(detail.name).toBe("deals");
    expect(detail.samples).toBeDefined();
    expect(ds.inspectTable).toHaveBeenCalledWith("deals");
  });

  it("Table dans cache mais inconnue → cache miss → fallback DataSource", async () => {
    const cache = makeCacheWithDeals();
    const ds = makeMockDataSource();
    const result = await executeInspectTable(ds, cache, { table_name: "unknown_table" });

    // DataSource appelé pour fallback
    expect(ds.inspectTable).toHaveBeenCalledWith("unknown_table");
  });

  it("Table non trouvée (live aussi) → null + is_error: true (R24)", async () => {
    const ds: DataSource = {
      listTables: vi.fn(),
      inspectTable: vi.fn(async () => null),
      runQuery: vi.fn(),
    };

    const result = await executeInspectTable(ds, null, { table_name: "nope" });
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("nope");
    expect(result.content).toContain("introuvable");
  });

  it("DataSource throw → is_error avec message (I12)", async () => {
    const ds: DataSource = {
      listTables: vi.fn(),
      inspectTable: vi.fn(async () => {
        throw new Error("project paused");
      }),
      runQuery: vi.fn(),
    };

    const result = await executeInspectTable(ds, null, { table_name: "deals" });
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("project paused");
  });
});
