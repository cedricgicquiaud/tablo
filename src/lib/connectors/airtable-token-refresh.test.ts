/**
 * Tests refresh logic Airtable — Phase 14.5 A.6.
 *
 * Couvre R10 (refresh proche expiration), R11 (rotation single-use),
 * R12 (mutex parallèle), R13 (status='expired' on fail), E9 (refusé refresh
 * sur status='expired' déjà marqué), E10 (refresh fail = mark expired).
 *
 * Pattern pure logic + DI (4ème occurrence règle .claude/rules/02-architecture.md) :
 *  - `getValidAirtableAccessTokenWithDeps(connectionId, deps)` : pure logic testable
 *  - `getValidAirtableAccessToken(connectionId)` : wrapper Server Component qui
 *    assemble les vraies deps (Supabase admin, env, refresh API call).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  shouldRefresh,
  getValidAirtableAccessTokenWithDeps,
  type AirtableTokenRefreshDeps,
  type AirtableConnectionConfig,
} from "./airtable-token-refresh";

describe("shouldRefresh (utility)", () => {
  it("retourne true si expiresAt dans le passé", () => {
    expect(shouldRefresh(Date.now() - 1000)).toBe(true);
  });

  it("retourne true si expiresAt - now < 60s (seuil de sécurité)", () => {
    expect(shouldRefresh(Date.now() + 30_000)).toBe(true);
  });

  it("retourne false si expiresAt - now > 60s", () => {
    expect(shouldRefresh(Date.now() + 600_000)).toBe(false);
  });

  it("retourne true si expiresAt invalide / NaN (safety net)", () => {
    expect(shouldRefresh(NaN)).toBe(true);
  });
});

function makeDeps(
  override: Partial<AirtableTokenRefreshDeps> = {},
): AirtableTokenRefreshDeps {
  return {
    fetchConnection: vi.fn(),
    updateConnection: vi.fn().mockResolvedValue(undefined),
    decryptToken: vi.fn((s: string) => s.replace(/^enc:/, "")),
    encryptToken: vi.fn((s: string) => `enc:${s}`),
    refreshAccessToken: vi.fn(),
    clientId: "abc",
    clientSecret: "secret",
    ...override,
  };
}

function makeConfig(
  override: Partial<AirtableConnectionConfig> = {},
): AirtableConnectionConfig {
  return {
    base_id: "appA",
    base_name: "Demo",
    access_token: "enc:old_acc",
    refresh_token: "enc:old_ref",
    expires_at: Date.now() + 600_000, // not expired by default
    scope: "data.records:read",
    status: "active",
    ...override,
  };
}

describe("getValidAirtableAccessTokenWithDeps (R10, R11, R12, R13, E9, E10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("R10 — token pas expiré → return decrypt(access_token), pas de refresh", async () => {
    const config = makeConfig();
    const deps = makeDeps({
      fetchConnection: vi.fn().mockResolvedValue(config),
    });

    const result = await getValidAirtableAccessTokenWithDeps("conn_1", deps);

    expect(result).toBe("old_acc");
    expect(deps.refreshAccessToken).not.toHaveBeenCalled();
    expect(deps.updateConnection).not.toHaveBeenCalled();
  });

  it("R10 + R11 — token expiré → refresh + update DB nouveau refresh_token (rotation)", async () => {
    const config = makeConfig({ expires_at: Date.now() - 1000 });
    const deps = makeDeps({
      fetchConnection: vi.fn().mockResolvedValue(config),
      refreshAccessToken: vi.fn().mockResolvedValue({
        access_token: "new_acc",
        refresh_token: "new_ref_rotated",
        expires_in: 3600,
        refresh_expires_in: 5184000,
        scope: "data.records:read",
        token_type: "Bearer",
      }),
    });

    const result = await getValidAirtableAccessTokenWithDeps("conn_1", deps);

    expect(result).toBe("new_acc");
    expect(deps.refreshAccessToken).toHaveBeenCalledWith({
      refreshToken: "old_ref",
      clientId: "abc",
      clientSecret: "secret",
    });
    expect(deps.updateConnection).toHaveBeenCalledTimes(1);
    const updateCall = (deps.updateConnection as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(updateCall[0]).toBe("conn_1");
    expect(updateCall[1]).toMatchObject({
      access_token: "enc:new_acc",
      refresh_token: "enc:new_ref_rotated",
      status: "active",
    });
  });

  it("R12 — 2 calls parallèles même connectionId → 1 seul refresh effectif (mutex)", async () => {
    const config = makeConfig({ expires_at: Date.now() - 1000 });
    let refreshCount = 0;
    const refreshFn = vi.fn().mockImplementation(async () => {
      refreshCount++;
      // Simule délai pour permettre la 2nde call avant resolve
      await new Promise((r) => setTimeout(r, 10));
      return {
        access_token: `new_acc_${refreshCount}`,
        refresh_token: `new_ref_${refreshCount}`,
        expires_in: 3600,
        refresh_expires_in: 5184000,
        scope: "data.records:read",
        token_type: "Bearer",
      };
    });
    const deps = makeDeps({
      fetchConnection: vi.fn().mockResolvedValue(config),
      refreshAccessToken: refreshFn,
    });

    const [r1, r2] = await Promise.all([
      getValidAirtableAccessTokenWithDeps("conn_mutex", deps),
      getValidAirtableAccessTokenWithDeps("conn_mutex", deps),
    ]);

    expect(refreshFn).toHaveBeenCalledTimes(1);
    // Les 2 calls retournent le même access_token (le 1er refresh)
    expect(r1).toBe(r2);
    expect(r1).toBe("new_acc_1");
  });

  it("R13 + E10 — refresh fail → mark status='expired' + throw", async () => {
    const config = makeConfig({ expires_at: Date.now() - 1000 });
    const deps = makeDeps({
      fetchConnection: vi.fn().mockResolvedValue(config),
      refreshAccessToken: vi
        .fn()
        .mockRejectedValue(new Error("invalid_grant: refresh revoked")),
    });

    await expect(
      getValidAirtableAccessTokenWithDeps("conn_fail", deps),
    ).rejects.toThrow(/Reconnecter Airtable/);

    // Update DB pour mark expired
    expect(deps.updateConnection).toHaveBeenCalledTimes(1);
    const updateCall = (deps.updateConnection as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(updateCall[1].status).toBe("expired");
  });

  it("E9 — config.status='expired' → throw immédiatement, pas de tentative refresh", async () => {
    const config = makeConfig({
      status: "expired",
      expires_at: Date.now() - 1000,
    });
    const deps = makeDeps({
      fetchConnection: vi.fn().mockResolvedValue(config),
    });

    await expect(
      getValidAirtableAccessTokenWithDeps("conn_revoked", deps),
    ).rejects.toThrow(/Reconnecter Airtable/);

    expect(deps.refreshAccessToken).not.toHaveBeenCalled();
    expect(deps.updateConnection).not.toHaveBeenCalled();
  });

  it("connection introuvable → throw clair", async () => {
    const deps = makeDeps({
      fetchConnection: vi.fn().mockResolvedValue(null),
    });

    await expect(
      getValidAirtableAccessTokenWithDeps("conn_missing", deps),
    ).rejects.toThrow(/introuvable/);
  });
});
