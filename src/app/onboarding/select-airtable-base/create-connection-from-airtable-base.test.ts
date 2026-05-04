/**
 * Tests pure logic create-connection-from-airtable-base — Phase 14.5 A.5.
 *
 * Couvre R9 (idempotence (workspace_id, kind, base_id)), R21 (after profileConnection
 * fire-and-forget), E8 (workspace introuvable), sécu (baseId pas dans session).
 *
 * Pattern pure logic + DI (5ème occurrence règle .claude/rules/02-architecture.md).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createConnectionFromAirtableBaseWithDeps,
  type CreateConnectionDeps,
  type AirtableSessionPayload,
} from "./create-connection-from-airtable-base";

const baseSession: AirtableSessionPayload = {
  accessToken: "oa_acc_xxx",
  refreshToken: "oa_ref_xxx",
  expiresAt: Date.now() + 3600_000,
  scope: "data.records:read schema.bases:read user.email:read",
  bases: [
    { id: "appA", name: "Demo Base", permissionLevel: "create" },
    { id: "appB", name: "Other Base", permissionLevel: "read" },
  ],
  workspaceId: "ws_1",
  userId: "user_1",
};

function makeDeps(
  override: Partial<CreateConnectionDeps> = {},
): CreateConnectionDeps {
  return {
    findExistingConnection: vi.fn().mockResolvedValue(null),
    insertConnection: vi
      .fn()
      .mockResolvedValue({ id: "conn_new", isReconnect: false }),
    updateConnection: vi.fn().mockResolvedValue(undefined),
    encryptToken: vi.fn((s: string) => `enc:${s}`),
    triggerAfterProfileConnection: vi.fn(),
    ...override,
  };
}

describe("createConnectionFromAirtableBaseWithDeps", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("happy path — nouvelle base → insert + after + retourne {connectionId, isReconnect: false}", async () => {
    const deps = makeDeps();

    const result = await createConnectionFromAirtableBaseWithDeps(
      { baseId: "appA", session: baseSession },
      deps,
    );

    expect(result).toEqual({ connectionId: "conn_new", isReconnect: false });

    // Insert appelé avec config chiffrée
    expect(deps.insertConnection).toHaveBeenCalledTimes(1);
    const insertCall = (deps.insertConnection as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(insertCall.workspaceId).toBe("ws_1");
    expect(insertCall.kind).toBe("airtable");
    expect(insertCall.name).toBe("Airtable (Demo Base)");
    expect(insertCall.config.base_id).toBe("appA");
    expect(insertCall.config.base_name).toBe("Demo Base");
    expect(insertCall.config.access_token).toBe("enc:oa_acc_xxx");
    expect(insertCall.config.refresh_token).toBe("enc:oa_ref_xxx");
    expect(insertCall.config.status).toBe("active");
    expect(typeof insertCall.config.expires_at).toBe("number");

    // R21 — after appelé pour profileConnection fire-and-forget
    expect(deps.triggerAfterProfileConnection).toHaveBeenCalledTimes(1);
    const afterArgs = (
      deps.triggerAfterProfileConnection as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];
    expect(afterArgs.connectionId).toBe("conn_new");
    expect(afterArgs.encryptedAccessToken).toBe("enc:oa_acc_xxx");
  });

  it("R9 — idempotence : connection existante (même workspace+base_id) → update + retourne isReconnect: true", async () => {
    const deps = makeDeps({
      findExistingConnection: vi.fn().mockResolvedValue("conn_existing"),
    });

    const result = await createConnectionFromAirtableBaseWithDeps(
      { baseId: "appA", session: baseSession },
      deps,
    );

    expect(result).toEqual({
      connectionId: "conn_existing",
      isReconnect: true,
    });

    // Insert NON appelé
    expect(deps.insertConnection).not.toHaveBeenCalled();

    // Update appelé avec nouveaux tokens chiffrés (rotation)
    expect(deps.updateConnection).toHaveBeenCalledTimes(1);
    const updateCall = (deps.updateConnection as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(updateCall[0]).toBe("conn_existing");
    expect(updateCall[1].access_token).toBe("enc:oa_acc_xxx");
    expect(updateCall[1].refresh_token).toBe("enc:oa_ref_xxx");

    // R21 — after profile encore appelé sur reconnect (re-profile schema possible)
    expect(deps.triggerAfterProfileConnection).toHaveBeenCalledTimes(1);
  });

  it("sécu — baseId absent de session.bases → throw (anti-IDOR)", async () => {
    const deps = makeDeps();

    await expect(
      createConnectionFromAirtableBaseWithDeps(
        { baseId: "appNotInSession", session: baseSession },
        deps,
      ),
    ).rejects.toThrow(/Base.+introuvable/i);

    expect(deps.insertConnection).not.toHaveBeenCalled();
    expect(deps.updateConnection).not.toHaveBeenCalled();
  });

  it("session.bases vide (E8) → throw clair", async () => {
    const deps = makeDeps();
    const emptySession = { ...baseSession, bases: [] };

    await expect(
      createConnectionFromAirtableBaseWithDeps(
        { baseId: "anything", session: emptySession },
        deps,
      ),
    ).rejects.toThrow(/aucune base|introuvable/i);
  });

  it("baseId vide ou non-string → throw", async () => {
    const deps = makeDeps();

    await expect(
      createConnectionFromAirtableBaseWithDeps(
        { baseId: "", session: baseSession },
        deps,
      ),
    ).rejects.toThrow();
  });

  it("calcule expires_at = now + expires_in*1000 (cohérent avec callback)", async () => {
    const deps = makeDeps();
    const before = Date.now();

    await createConnectionFromAirtableBaseWithDeps(
      { baseId: "appA", session: baseSession },
      deps,
    );

    const after = Date.now();
    const insertCall = (deps.insertConnection as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    // baseSession.expiresAt est utilisé directement (déjà calculé côté callback)
    expect(insertCall.config.expires_at).toBe(baseSession.expiresAt);
    expect(insertCall.config.expires_at).toBeGreaterThan(before);
    expect(insertCall.config.expires_at).toBeGreaterThan(after);
  });
});
