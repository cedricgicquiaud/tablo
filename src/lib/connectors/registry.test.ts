import { describe, expect, it } from "vitest";
import { getDataSource } from "./registry";
import type { Connection } from "./types";

const baseConnection = {
  id: "11111111-1111-1111-1111-111111111111",
  workspaceId: "22222222-2222-2222-2222-222222222222",
  name: "Demo",
} as const;

describe("connector registry", () => {
  it("returns a data source instance for kind='demo'", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "demo",
      configJsonb: { kind: "ecommerce_demo" },
    };
    const ds = getDataSource(conn);
    expect(typeof ds.listTables).toBe("function");
    expect(typeof ds.inspectTable).toBe("function");
    expect(typeof ds.runQuery).toBe("function");
  });

  it("throws on an unknown kind", () => {
    const conn = {
      ...baseConnection,
      kind: "alien",
      configJsonb: {},
    } as unknown as Connection;
    expect(() => getDataSource(conn)).toThrow(/unsupported|unknown/i);
  });
});
