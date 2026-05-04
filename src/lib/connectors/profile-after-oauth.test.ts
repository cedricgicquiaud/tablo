/**
 * Tests `runProfileConnectionAfterOAuth` — cross-providers.
 *
 * Couvre fire-and-forget : decrypt → buildDataSource → profileConnection
 * → saveSchemaCache. Et le swallow d'erreurs (logWarn) qui garantit que le
 * `after()` côté route ne bubble jamais une exception.
 *
 * Promu de `stripe/profile-after-oauth.test.ts` (P14.4) en P14.5 :
 * + 1 test "provider-agnostic" qui valide que la signature accepte
 *   n'importe quel DataSource (Stripe, Airtable, futurs).
 */

import { describe, expect, it, vi } from "vitest";
import { runProfileConnectionAfterOAuth } from "./profile-after-oauth";
import type { SchemaCacheEntry } from "../ai-engine/schema-cache/types";
import type { DataSource } from "./types";

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

describe("runProfileConnectionAfterOAuth (cross-providers)", () => {
  it("happy path — decrypt + build + profile + save dans l'ordre", async () => {
    const decryptToken = vi.fn().mockReturnValue("token_decrypted");
    const buildDataSource = vi.fn().mockReturnValue(fakeDataSource);
    const profileConnection = vi.fn().mockResolvedValue(fakeCache);
    const saveSchemaCache = vi.fn().mockResolvedValue(undefined);

    await runProfileConnectionAfterOAuth(
      { connectionId: "conn_1", encryptedAccessToken: "enc:xxx" },
      { decryptToken, buildDataSource, profileConnection, saveSchemaCache },
    );

    expect(decryptToken).toHaveBeenCalledWith("enc:xxx");
    expect(buildDataSource).toHaveBeenCalledWith("token_decrypted");
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
    const decryptToken = vi.fn().mockReturnValue("token_decrypted");
    const buildDataSource = vi.fn().mockReturnValue(fakeDataSource);
    const profileConnection = vi.fn().mockRejectedValue(new Error("Provider API down"));
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
    const decryptToken = vi.fn().mockReturnValue("token_decrypted");
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

  it("provider-agnostic — signature accepte n'importe quel DataSource (Stripe, Airtable, futurs)", async () => {
    // Test simulant 2 providers différents (Stripe + Airtable) qui réutilisent
    // exactement la même signature pure logic.
    const stripeDataSource: DataSource = { listTables: vi.fn(), inspectTable: vi.fn(), runQuery: vi.fn() };
    const airtableDataSource: DataSource = { listTables: vi.fn(), inspectTable: vi.fn(), runQuery: vi.fn() };

    const callTimeline: string[] = [];
    const decryptToken = (s: string) => s.replace("enc:", "");
    const profileConnection = async (ds: DataSource): Promise<SchemaCacheEntry> => {
      callTimeline.push(ds === stripeDataSource ? "stripe" : "airtable");
      return fakeCache;
    };
    const saveSchemaCache = vi.fn().mockResolvedValue(undefined);

    await runProfileConnectionAfterOAuth(
      { connectionId: "conn_stripe", encryptedAccessToken: "enc:tok_stripe" },
      { decryptToken, buildDataSource: () => stripeDataSource, profileConnection, saveSchemaCache },
    );
    await runProfileConnectionAfterOAuth(
      { connectionId: "conn_airtable", encryptedAccessToken: "enc:tok_airtable" },
      { decryptToken, buildDataSource: () => airtableDataSource, profileConnection, saveSchemaCache },
    );

    expect(callTimeline).toEqual(["stripe", "airtable"]);
    expect(saveSchemaCache).toHaveBeenCalledTimes(2);
  });
});
