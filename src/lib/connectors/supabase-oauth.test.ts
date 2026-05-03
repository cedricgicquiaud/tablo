import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupabaseOAuthDataSource } from "./supabase-oauth";

const fetchMock = vi.fn();

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeDS() {
  return new SupabaseOAuthDataSource({
    projectRef: "abcd",
    getAccessToken: async () => "at-1",
  });
}

describe("SupabaseOAuthDataSource", () => {
  it("runQuery POST /v1/projects/{ref}/database/query avec Bearer (R12)", async () => {
    fetchMock.mockResolvedValueOnce(ok([{ n: 5 }]));
    const ds = makeDS();
    const rows = await ds.runQuery("SELECT 5 AS n");
    expect(rows).toEqual([{ n: 5 }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.supabase.com/v1/projects/abcd/database/query");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBe("Bearer at-1");
    const body = JSON.parse(init.body);
    expect(body.query).toBe("SELECT 5 AS n");
  });

  it("runQuery rejette les requêtes non-SELECT/WITH (R13)", async () => {
    const ds = makeDS();
    await expect(ds.runQuery("DROP TABLE users")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("listTables retourne name + rowCount via information_schema", async () => {
    fetchMock.mockResolvedValueOnce(
      ok([
        { table_name: "users", row_count: 100 },
        { table_name: "orders", row_count: 50 },
      ]),
    );
    const ds = makeDS();
    const tables = await ds.listTables();
    expect(tables).toHaveLength(2);
    expect(tables[0]).toEqual({ name: "users", rowCount: 100 });
  });

  it("inspectTable retourne columns + samples via 2 queries", async () => {
    fetchMock
      .mockResolvedValueOnce(
        ok([
          { column_name: "id", data_type: "uuid", is_nullable: "NO" },
          { column_name: "email", data_type: "text", is_nullable: "NO" },
        ]),
      )
      .mockResolvedValueOnce(
        ok([
          { id: "u1", email: "a@b.c" },
          { id: "u2", email: "x@y.z" },
        ]),
      );
    const ds = makeDS();
    const detail = await ds.inspectTable("users");
    expect(detail).not.toBeNull();
    expect(detail!.columns).toHaveLength(2);
    expect(detail!.columns[0]).toEqual({
      name: "id",
      type: "uuid",
      nullable: false,
    });
    expect(detail!.samples).toHaveLength(2);
  });

  it("propage l'erreur HTTP du Management API", async () => {
    fetchMock.mockResolvedValueOnce(ok({ error: "unauthorized" }, 401));
    const ds = makeDS();
    await expect(ds.runQuery("SELECT 1")).rejects.toThrow(/401|unauthorized/i);
  });

  // Phase 14.1.1 — retry exponentiel sur 429 (rate limit Supabase Management API)
  describe("retry sur 429 ThrottlerException", () => {
    it("429 puis 200 → retry une fois et retourne le résultat (1 retry)", async () => {
      fetchMock
        .mockResolvedValueOnce(ok({ message: "ThrottlerException: Too Many Requests" }, 429))
        .mockResolvedValueOnce(ok([{ n: 42 }]));
      const ds = makeDS();
      const rows = await ds.runQuery("SELECT 42 AS n", { retryDelaysMs: [0] });
      expect(rows).toEqual([{ n: 42 }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("429 × 3 puis 200 → retry 3 fois et retourne le résultat", async () => {
      fetchMock
        .mockResolvedValueOnce(ok({ message: "ThrottlerException" }, 429))
        .mockResolvedValueOnce(ok({ message: "ThrottlerException" }, 429))
        .mockResolvedValueOnce(ok({ message: "ThrottlerException" }, 429))
        .mockResolvedValueOnce(ok([{ ok: true }]));
      const ds = makeDS();
      const rows = await ds.runQuery("SELECT 1", { retryDelaysMs: [0, 0, 0] });
      expect(rows).toEqual([{ ok: true }]);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("429 × 4 (au-delà du cap) → throw avec message clair", async () => {
      // Factory pour produire une nouvelle Response à chaque appel
      // (Response.text() consume le body, on ne peut pas réutiliser la même).
      fetchMock.mockImplementation(async () =>
        ok({ message: "ThrottlerException" }, 429),
      );
      const ds = makeDS();
      await expect(
        ds.runQuery("SELECT 1", { retryDelaysMs: [0, 0, 0] }),
      ).rejects.toThrow(/429|throttler/i);
      expect(fetchMock).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it("non-429 (401) → pas de retry, throw immédiat", async () => {
      fetchMock.mockResolvedValueOnce(ok({ error: "unauthorized" }, 401));
      const ds = makeDS();
      await expect(
        ds.runQuery("SELECT 1", { retryDelaysMs: [0, 0, 0] }),
      ).rejects.toThrow(/401|unauthorized/i);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
