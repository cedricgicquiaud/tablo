/**
 * TB1/TB2/TB3 — populate.ts profiling avec gestion d'erreur partielle.
 *
 * Phase 17 cycle B T2.2.
 */

import { describe, it, expect, vi } from "vitest";
import { profileConnection } from "./populate";
import type { DataSource } from "@/lib/connectors/types";

// DataSource mock minimal pour les tests
function makeMockDataSource(overrides?: Partial<DataSource>): DataSource {
  return {
    listTables: vi.fn(async () => [
      { name: "orders", rowCount: 100 },
      { name: "customers", rowCount: 50 },
      { name: "products", rowCount: 200 },
    ]),
    inspectTable: vi.fn(async (name: string) => ({
      name,
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "status", type: "text", nullable: false },
      ],
      samples: [],
    })),
    runQuery: vi.fn(async () => [
      { distinct_count: 6 },
    ]),
    ...overrides,
  };
}

describe("profileConnection", () => {
  it("TB1 — DataSource avec 3 tables → status='ok' + 3 entries", async () => {
    const ds = makeMockDataSource();
    const result = await profileConnection(ds);

    expect(result.status).toBe("ok");
    expect(result.tables).toHaveLength(3);
    expect(result.tables.map((t) => t.name)).toEqual(["orders", "customers", "products"]);
    expect(result.synced_at).toBeTruthy();
    expect(result.version).toBe(1);
  });

  it("TB2 — 1 table inspectTable throw → status='partial' + reason listant la table", async () => {
    let callCount = 0;
    const ds = makeMockDataSource({
      inspectTable: vi.fn(async (name: string) => {
        callCount++;
        if (name === "customers") {
          throw new Error("simulated timeout");
        }
        return {
          name,
          columns: [{ name: "id", type: "uuid", nullable: false }],
          samples: [],
        };
      }),
    });

    const result = await profileConnection(ds);
    expect(result.status).toBe("partial");
    expect(result.partial_tables).toEqual(["customers"]);
    expect(result.tables).toHaveLength(2); // orders + products only
    expect(callCount).toBe(3);
  });

  it("TB3 — toutes tables throw → status='failed' (I11 vérifie connexion non rollback côté DB)", async () => {
    const ds = makeMockDataSource({
      inspectTable: vi.fn(async () => {
        throw new Error("perm denied on all tables");
      }),
    });

    const result = await profileConnection(ds);
    expect(result.status).toBe("failed");
    expect(result.tables).toHaveLength(0);
    expect(result.partial_tables).toEqual(["orders", "customers", "products"]);
  });

  it("listTables throw → status='failed' avec 0 tables", async () => {
    const ds = makeMockDataSource({
      listTables: vi.fn(async () => {
        throw new Error("connection lost");
      }),
    });

    const result = await profileConnection(ds);
    expect(result.status).toBe("failed");
    expect(result.tables).toHaveLength(0);
  });

  it("Max 50 tables (R53) — si listTables retourne 60, on profile 50", async () => {
    const tables = Array.from({ length: 60 }, (_, i) => ({
      name: `t${i}`,
      rowCount: 10,
    }));
    const ds = makeMockDataSource({
      listTables: vi.fn(async () => tables),
    });

    const result = await profileConnection(ds);
    expect(result.tables).toHaveLength(50);
  });
});
