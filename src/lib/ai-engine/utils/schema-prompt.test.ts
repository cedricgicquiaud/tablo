/**
 * Tests pour `formatSchemaForPrompt` — Phase 17.1 Cycle C.
 *
 * Helper qui sérialise un SchemaCacheEntry en markdown injectable dans le
 * user prompt pour le fast-path schema (skip list_tables / inspect_table).
 */

import { describe, it, expect } from "vitest";
import { formatSchemaForPrompt, isSchemaCacheUsable } from "./schema-prompt";
import type { SchemaCacheEntry } from "../schema-cache/types";

const FULL_CACHE: SchemaCacheEntry = {
  version: 1,
  synced_at: "2026-05-03T00:00:00Z",
  status: "ok",
  tables: [
    {
      name: "orders",
      row_count: 2300,
      columns: [
        { name: "id", type: "uuid", nullable: false },
        {
          name: "status",
          type: "text",
          nullable: false,
          distinct_count: 4,
          top_values: [
            { value: "paid", count: 1500 },
            { value: "shipped", count: 600 },
            { value: "cancelled", count: 200 },
          ],
        },
        {
          name: "amount",
          type: "numeric",
          nullable: false,
          min: 5,
          max: 5000,
          mean: 87.5,
        },
        {
          name: "created_at",
          type: "timestamp",
          nullable: false,
          min: "2025-01-01T00:00:00Z",
          max: "2026-05-03T00:00:00Z",
        },
      ],
    },
    {
      name: "customers",
      row_count: 800,
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "email", type: "text", nullable: false },
      ],
    },
  ],
};

describe("formatSchemaForPrompt", () => {
  it("rend un markdown lisible avec tables, colonnes, types", () => {
    const md = formatSchemaForPrompt(FULL_CACHE);
    expect(md).toContain("orders");
    expect(md).toContain("2300");
    expect(md).toContain("customers");
    expect(md).toContain("status");
    expect(md).toContain("text");
    expect(md).toContain("numeric");
  });

  it("inclut top_values pour les colonnes catégorielles (résout R23 enums)", () => {
    const md = formatSchemaForPrompt(FULL_CACHE);
    // Les valeurs enum réelles doivent apparaître pour que l'IA s'en serve.
    expect(md).toContain("paid");
    expect(md).toContain("shipped");
    expect(md).toContain("cancelled");
  });

  it("inclut min/max pour les colonnes numériques et timestamp", () => {
    const md = formatSchemaForPrompt(FULL_CACHE);
    expect(md).toContain("5000"); // max amount
    expect(md).toContain("2026-05-03"); // max created_at
  });

  it("liste 'partial' status quand certaines tables ont échoué", () => {
    const partial: SchemaCacheEntry = {
      ...FULL_CACHE,
      status: "partial",
      partial_tables: ["events"],
    };
    const md = formatSchemaForPrompt(partial);
    expect(md.toLowerCase()).toContain("partial");
  });
});

describe("isSchemaCacheUsable", () => {
  it("cache complet (status ok, tables avec colonnes) → utilisable", () => {
    expect(isSchemaCacheUsable(FULL_CACHE)).toBe(true);
  });

  it("cache null → non utilisable", () => {
    expect(isSchemaCacheUsable(null)).toBe(false);
  });

  it("cache failed → non utilisable", () => {
    const cache: SchemaCacheEntry = { ...FULL_CACHE, status: "failed", tables: [] };
    expect(isSchemaCacheUsable(cache)).toBe(false);
  });

  it("cache partial mais avec tables → utilisable", () => {
    // partial = certaines tables manquent mais le reste est exploitable
    const cache: SchemaCacheEntry = { ...FULL_CACHE, status: "partial" };
    expect(isSchemaCacheUsable(cache)).toBe(true);
  });

  it("cache ok mais sans tables → non utilisable", () => {
    const cache: SchemaCacheEntry = { ...FULL_CACHE, tables: [] };
    expect(isSchemaCacheUsable(cache)).toBe(false);
  });

  it("cache avec tables sans colonnes → non utilisable", () => {
    const cache: SchemaCacheEntry = {
      ...FULL_CACHE,
      tables: [{ name: "orders", row_count: 100, columns: [] }],
    };
    expect(isSchemaCacheUsable(cache)).toBe(false);
  });
});
