/**
 * TB7 — Tool list_tables avec lecture cache.
 *
 * Phase 17 cycle B T2.5.
 */

import { describe, it, expect, vi } from "vitest";
import { executeListTables } from "./list-tables";
import type { DataSource } from "@/lib/connectors/types";
import type { SchemaCacheEntry } from "../schema-cache/types";

function makeMockDataSource(): DataSource {
  return {
    listTables: vi.fn(async () => [
      { name: "live_orders", rowCount: 999 },
    ]),
    inspectTable: vi.fn(),
    runQuery: vi.fn(),
  };
}

function makeCache(tables: SchemaCacheEntry["tables"]): SchemaCacheEntry {
  return {
    version: 1,
    synced_at: new Date().toISOString(),
    status: "ok",
    tables,
  };
}

describe("executeListTables", () => {
  it("TB7 — cache présent → retour formaté depuis cache, PAS d'appel DataSource", async () => {
    const cache = makeCache([
      { name: "orders", row_count: 100, columns: [] },
      { name: "customers", row_count: 50, columns: [] },
    ]);
    const ds = makeMockDataSource();

    const result = await executeListTables(ds, cache);

    expect(result.is_error).toBe(false);
    const data = JSON.parse(result.content) as Array<{ name: string; rowCount: number }>;
    expect(data).toEqual([
      { name: "orders", rowCount: 100 },
      { name: "customers", rowCount: 50 },
    ]);
    // DataSource jamais appelé
    expect(ds.listTables).not.toHaveBeenCalled();
  });

  it("cache absent → fallback DataSource.listTables() (R11)", async () => {
    const ds = makeMockDataSource();
    const result = await executeListTables(ds, null);

    expect(result.is_error).toBe(false);
    const data = JSON.parse(result.content) as Array<{ name: string; rowCount: number }>;
    expect(data).toEqual([{ name: "live_orders", rowCount: 999 }]);
    expect(ds.listTables).toHaveBeenCalled();
  });

  it("DataSource throw → tool_result is_error: true (I12)", async () => {
    const ds: DataSource = {
      listTables: vi.fn(async () => {
        throw new Error("auth Supabase OAuth expirée");
      }),
      inspectTable: vi.fn(),
      runQuery: vi.fn(),
    };

    const result = await executeListTables(ds, null);
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("auth Supabase OAuth expirée");
  });
});
