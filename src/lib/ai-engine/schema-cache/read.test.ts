/**
 * TB5/TB6 — read.ts lecture cache avec fraicheur 7 jours.
 *
 * Phase 17 cycle B T2.4 (R4bis I1).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readSchemaCache, FRESHNESS_DAYS } from "./read";

const mockSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  })),
}));

describe("readSchemaCache", () => {
  beforeEach(() => {
    mockSingle.mockReset();
  });

  function makeValidCache(syncedAtISO: string) {
    return {
      schema_cache_jsonb: {
        version: 1,
        synced_at: syncedAtISO,
        status: "ok",
        tables: [{ name: "orders", row_count: 100, columns: [] }],
      },
      schema_synced_at: syncedAtISO,
    };
  }

  it("TB5 — synced_at = now() - 8 jours → return null (force fallback live R4bis)", async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    mockSingle.mockResolvedValue({
      data: makeValidCache(old),
      error: null,
    });

    const result = await readSchemaCache("conn-id");
    expect(result).toBeNull();
  });

  it(`synced_at = now() - ${FRESHNESS_DAYS - 1} jours → return cache OK`, async () => {
    const recent = new Date(Date.now() - (FRESHNESS_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString();
    mockSingle.mockResolvedValue({
      data: makeValidCache(recent),
      error: null,
    });

    const result = await readSchemaCache("conn-id");
    expect(result).not.toBeNull();
    expect(result?.status).toBe("ok");
  });

  it("TB6 — JSON corrompu (version manquante) en DB → return null (graceful)", async () => {
    mockSingle.mockResolvedValue({
      data: {
        schema_cache_jsonb: { weird: "not a SchemaCacheEntry" },
        schema_synced_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await readSchemaCache("conn-id");
    expect(result).toBeNull();
  });

  it("schema_cache_jsonb = null (pas encore profilé) → return null", async () => {
    mockSingle.mockResolvedValue({
      data: { schema_cache_jsonb: null, schema_synced_at: null },
      error: null,
    });

    const result = await readSchemaCache("conn-id");
    expect(result).toBeNull();
  });

  it("connexion introuvable → return null (no throw)", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "row not found" },
    });

    const result = await readSchemaCache("inexistant");
    expect(result).toBeNull();
  });

  it("status='failed' avec synced_at récent → return null (cache pas exploitable)", async () => {
    const recent = new Date().toISOString();
    mockSingle.mockResolvedValue({
      data: {
        schema_cache_jsonb: {
          version: 1,
          synced_at: recent,
          status: "failed",
          tables: [],
        },
        schema_synced_at: recent,
      },
      error: null,
    });

    const result = await readSchemaCache("conn-id");
    expect(result).toBeNull();
  });

  it("status='partial' avec synced_at récent → return cache (utilisable)", async () => {
    const recent = new Date().toISOString();
    mockSingle.mockResolvedValue({
      data: {
        schema_cache_jsonb: {
          version: 1,
          synced_at: recent,
          status: "partial",
          tables: [{ name: "orders", row_count: 100, columns: [] }],
          partial_tables: ["customers"],
        },
        schema_synced_at: recent,
      },
      error: null,
    });

    const result = await readSchemaCache("conn-id");
    expect(result).not.toBeNull();
    expect(result?.status).toBe("partial");
  });
});
