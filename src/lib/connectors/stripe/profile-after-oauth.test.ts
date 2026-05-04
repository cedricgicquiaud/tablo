/**
 * Tests `runProfileConnectionAfterOAuth` — Phase 14.4 EVALUATE finding #6.
 *
 * Couvre R13 fire-and-forget : decrypt → buildDataSource → profileConnection
 * → saveSchemaCache. Et le swallow d'erreurs (logWarn) qui garantit que le
 * `after()` côté route ne bubble jamais une exception.
 */

import { describe, expect, it, vi } from "vitest";
import { runProfileConnectionAfterOAuth } from "./profile-after-oauth";
import type { SchemaCacheEntry } from "../../ai-engine/schema-cache/types";
import type { DataSource } from "../types";

const fakeCache: SchemaCacheEntry = {
  version: 1,
  synced_at: "2026-05-04T10:19:55.376Z",
  status: "ok",
  tables: [],
};

const fakeDataSource: DataSource = {
  listTables: vi.fn(),
  inspectTable: vi.fn(),
  runQuery: vi.fn(),
};

describe("runProfileConnectionAfterOAuth", () => {
  it("happy path — decrypt + build + profile + save dans l'ordre", async () => {
    const decryptToken = vi.fn().mockReturnValue("rk_test_xxx");
    const buildDataSource = vi.fn().mockReturnValue(fakeDataSource);
    const profileConnection = vi.fn().mockResolvedValue(fakeCache);
    const saveSchemaCache = vi.fn().mockResolvedValue(undefined);

    await runProfileConnectionAfterOAuth(
      { connectionId: "conn_1", encryptedAccessToken: "enc:xxx" },
      { decryptToken, buildDataSource, profileConnection, saveSchemaCache },
    );

    expect(decryptToken).toHaveBeenCalledWith("enc:xxx");
    expect(buildDataSource).toHaveBeenCalledWith("rk_test_xxx");
    expect(profileConnection).toHaveBeenCalledWith(fakeDataSource);
    expect(saveSchemaCache).toHaveBeenCalledWith("conn_1", fakeCache);
  });

  it("decrypt throw → logWarn appelé, ne re-throw pas (fire-and-forget garanti)", async () => {
    const decryptToken = vi.fn().mockImplementation(() => {
      throw new Error("invalid encryption format");
    });
    const buildDataSource = vi.fn();
    const profileConnection = vi.fn();
    const saveSchemaCache = vi.fn();
    const logWarn = vi.fn();

    await expect(
      runProfileConnectionAfterOAuth(
        { connectionId: "conn_x", encryptedAccessToken: "broken" },
        { decryptToken, buildDataSource, profileConnection, saveSchemaCache, logWarn },
      ),
    ).resolves.toBeUndefined();

    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn.mock.calls[0]?.[0]).toContain("conn_x");
    expect(buildDataSource).not.toHaveBeenCalled();
  });

  it("profileConnection throw → logWarn + saveSchemaCache pas appelé", async () => {
    const decryptToken = vi.fn().mockReturnValue("rk_test_xxx");
    const buildDataSource = vi.fn().mockReturnValue(fakeDataSource);
    const profileConnection = vi.fn().mockRejectedValue(new Error("Stripe down"));
    const saveSchemaCache = vi.fn();
    const logWarn = vi.fn();

    await runProfileConnectionAfterOAuth(
      { connectionId: "conn_y", encryptedAccessToken: "enc:xxx" },
      { decryptToken, buildDataSource, profileConnection, saveSchemaCache, logWarn },
    );

    expect(saveSchemaCache).not.toHaveBeenCalled();
    expect(logWarn).toHaveBeenCalledTimes(1);
  });

  it("saveSchemaCache throw → logWarn (DB error swallow)", async () => {
    const decryptToken = vi.fn().mockReturnValue("rk_test_xxx");
    const buildDataSource = vi.fn().mockReturnValue(fakeDataSource);
    const profileConnection = vi.fn().mockResolvedValue(fakeCache);
    const saveSchemaCache = vi.fn().mockRejectedValue(new Error("DB down"));
    const logWarn = vi.fn();

    await runProfileConnectionAfterOAuth(
      { connectionId: "conn_z", encryptedAccessToken: "enc:xxx" },
      { decryptToken, buildDataSource, profileConnection, saveSchemaCache, logWarn },
    );

    expect(logWarn).toHaveBeenCalledTimes(1);
  });
});
