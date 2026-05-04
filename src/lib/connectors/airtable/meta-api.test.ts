/**
 * Tests helper API meta Airtable — Phase 14.5 A.4.
 *
 * Couvre R6 (fetch bases via /v0/meta/bases), RNF6 (retry 429),
 * E9 préparation (401 → throw clair).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchBases, AirtableMetaApiError } from "./meta-api";

describe("fetchBases (R6, RNF6, E9)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("R6 — GET /v0/meta/bases avec Bearer token + retourne array {id, name, permissionLevel}", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bases: [
            { id: "appA", name: "Demo Base", permissionLevel: "create" },
            { id: "appB", name: "Other Base", permissionLevel: "read" },
          ],
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    const result = await fetchBases("oauth_access_token_xxx");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOpts] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe("https://api.airtable.com/v0/meta/bases");
    const headers = calledOpts.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer oauth_access_token_xxx");

    expect(result).toEqual([
      { id: "appA", name: "Demo Base", permissionLevel: "create" },
      { id: "appB", name: "Other Base", permissionLevel: "read" },
    ]);
  });

  it("R6 — base list vide → array vide (E8 préparation)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ bases: [] }), { status: 200 }),
    );
    const result = await fetchBases("token");
    expect(result).toEqual([]);
  });

  it("RNF6 — retry sur 429 puis succès au 2ème essai", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ bases: [{ id: "appA", name: "X", permissionLevel: "read" }] }), {
          status: 200,
        }),
      );
    global.fetch = fetchMock;

    const result = await fetchBases("token", { retryDelaysMs: [0, 0, 0] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });

  it("E9 — 401 → throw AirtableMetaApiError (token expiré/révoqué, pas de retry)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { type: "AUTHENTICATION_REQUIRED" } }),
        { status: 401 },
      ),
    );
    global.fetch = fetchMock;

    let caught: unknown;
    try {
      await fetchBases("invalid_token", { retryDelaysMs: [0, 0, 0] });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AirtableMetaApiError);
    expect((caught as AirtableMetaApiError).status).toBe(401);
    // Pas de retry sur 401 (un seul appel)
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("RNF3 — message d'erreur ne contient pas l'access_token (sécu logs)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "X" }), { status: 500 }),
    );

    let msg = "";
    try {
      await fetchBases("oauth_super_secret_xxx", { retryDelaysMs: [0, 0, 0] });
    } catch (err) {
      msg = (err as Error).message;
    }
    expect(msg).not.toContain("oauth_super_secret_xxx");
  });
});
