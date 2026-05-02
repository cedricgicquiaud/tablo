/**
 * TC3/TC4 — Tool execute_sql avec validation, LIMIT, truncate, audit log.
 *
 * Phase 17 cycle C T3.2 (R30, R31, R32, R33, R34, R36).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockInsert, mockRunQuery } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockRunQuery: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: () => ({ insert: mockInsert }),
  })),
}));

import { executeSql } from "./execute-sql";
import type { DataSource } from "@/lib/connectors/types";
import type { ToolContext } from "../types/tool";

function makeMockDataSource(): DataSource {
  return {
    listTables: vi.fn(),
    inspectTable: vi.fn(),
    runQuery: mockRunQuery,
  };
}

function makeContext(dataSource: DataSource): ToolContext {
  return {
    workspaceId: "ws-1",
    userId: "user-1",
    connectionId: "conn-1",
    dataSource,
    retryCounters: new Map(),
  };
}

describe("executeSql tool", () => {
  beforeEach(() => {
    mockInsert.mockReset();
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockRunQuery.mockReset();
  });

  it("TC3 — INSERT rejeté → is_error: true (réutilisation validateReadOnlySql)", async () => {
    const ds = makeMockDataSource();
    const result = await executeSql(
      { sql_query: "INSERT INTO orders (id) VALUES (1)" },
      makeContext(ds),
    );
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("SELECT ou WITH");
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it("TC3 — DELETE rejeté → is_error", async () => {
    const ds = makeMockDataSource();
    const result = await executeSql(
      { sql_query: "DELETE FROM orders" },
      makeContext(ds),
    );
    expect(result.is_error).toBe(true);
  });

  it("TC3 — SELECT autorisé → exécuté normalement", async () => {
    mockRunQuery.mockResolvedValue([{ id: 1, name: "alice" }]);
    const ds = makeMockDataSource();
    const result = await executeSql(
      { sql_query: "SELECT id, name FROM customers LIMIT 5" },
      makeContext(ds),
    );
    expect(result.is_error).toBe(false);
    const data = JSON.parse(result.content) as { rows: unknown[] };
    expect(data.rows).toHaveLength(1);
  });

  it("LIMIT injecté si absent (R32)", async () => {
    mockRunQuery.mockResolvedValue([]);
    const ds = makeMockDataSource();
    await executeSql({ sql_query: "SELECT * FROM customers" }, makeContext(ds));
    expect(mockRunQuery).toHaveBeenCalledWith(expect.stringContaining("LIMIT 100"));
  });

  it("LIMIT existant préservé", async () => {
    mockRunQuery.mockResolvedValue([]);
    const ds = makeMockDataSource();
    await executeSql({ sql_query: "SELECT * FROM customers LIMIT 5" }, makeContext(ds));
    const calledWith = mockRunQuery.mock.calls[0][0];
    expect(calledWith).toBe("SELECT * FROM customers LIMIT 5");
  });

  it("Erreur SQL DB → tool_result is_error: true (R34)", async () => {
    mockRunQuery.mockRejectedValue(new Error("relation does not exist"));
    const ds = makeMockDataSource();
    const result = await executeSql(
      { sql_query: "SELECT * FROM nonexistent" },
      makeContext(ds),
    );
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("relation does not exist");
  });

  it("TC4 — log inséré dans ai_engine_audit pour SELECT réussi", async () => {
    mockRunQuery.mockResolvedValue([{ id: 1 }]);
    const ds = makeMockDataSource();
    await executeSql({ sql_query: "SELECT 1" }, makeContext(ds));
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0][0];
    expect(inserted.workspace_id).toBe("ws-1");
    expect(inserted.connection_id).toBe("conn-1");
    expect(inserted.tool).toBe("execute_sql");
    expect(inserted.status).toBe("ok");
    expect(inserted.rows_count).toBe(1);
  });

  it("TC4 — log inséré avec status='rejected' si SQL invalide", async () => {
    const ds = makeMockDataSource();
    await executeSql(
      { sql_query: "DROP TABLE orders" },
      makeContext(ds),
    );
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0].status).toBe("rejected");
  });

  it("TC4 — log inséré avec status='error' si runQuery throw", async () => {
    mockRunQuery.mockRejectedValue(new Error("DB down"));
    const ds = makeMockDataSource();
    await executeSql({ sql_query: "SELECT 1" }, makeContext(ds));
    expect(mockInsert.mock.calls[0][0].status).toBe("error");
    expect(mockInsert.mock.calls[0][0].error_message).toContain("DB down");
  });

  it("Truncate appliqué si résultat dépasse 5000 chars (R33)", async () => {
    const bigRows = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      blob: "x".repeat(500),
    }));
    mockRunQuery.mockResolvedValue(bigRows);
    const ds = makeMockDataSource();
    const result = await executeSql({ sql_query: "SELECT 1" }, makeContext(ds));
    expect(result.is_error).toBe(false);
    const data = JSON.parse(result.content) as { _truncated?: boolean };
    expect(data._truncated).toBe(true);
    // Status truncated dans audit
    expect(mockInsert.mock.calls[0][0].status).toBe("truncated");
  });
});
