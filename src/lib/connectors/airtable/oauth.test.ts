/**
 * Tests helpers OAuth Airtable PKCE — Phase 14.5 A.1.
 *
 * Couvre :
 *  - R1 (URL authorize PKCE)
 *  - R3 (token exchange POST)
 *  - R4 (zod validation response)
 *  - R10/R11 (refresh token rotation single-use)
 *  - E4 (PKCE verifier mismatch error)
 *  - E5 (token JSON invalide / response malformed)
 *  - RNF3 (sécurité logs : pas de tokens en exception messages)
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildAirtableAuthorizeUrl,
  exchangeAuthorizationCode,
  refreshAccessToken,
  AirtableOAuthError,
} from "./oauth";

describe("buildAirtableAuthorizeUrl (R1)", () => {
  it("génère URL Airtable authorize PKCE conforme avec params requis", () => {
    const url = buildAirtableAuthorizeUrl({
      clientId: "abc-client-id",
      state: "state_123",
      redirectUri: "http://localhost:3000/oauth/airtable/callback",
      codeChallenge: "challenge_xyz",
      scopes: ["data.records:read", "schema.bases:read"],
    });

    expect(url).toContain("https://airtable.com/oauth2/v1/authorize");
    expect(url).toContain("client_id=abc-client-id");
    expect(url).toContain("response_type=code");
    expect(url).toContain("state=state_123");
    expect(url).toContain("code_challenge=challenge_xyz");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fairtable%2Fcallback",
    );
    // scopes joined par espace url-encoded (+ ou %20 selon URL)
    expect(url).toMatch(/scope=data\.records%3Aread(\+|%20)schema\.bases%3Aread/);
  });
});

describe("exchangeAuthorizationCode (R3, R4, E4, E5)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("R3 — POST vers /oauth2/v1/token avec Basic Auth + body PKCE", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "oaaWWfQTPTFh1QVBT",
          refresh_token: "oarRtMvQwT0hYJG3O",
          expires_in: 3600,
          refresh_expires_in: 5184000,
          scope: "data.records:read schema.bases:read",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    global.fetch = fetchMock;

    await exchangeAuthorizationCode({
      code: "code_xxx",
      codeVerifier: "verifier_xxx",
      clientId: "abc",
      clientSecret: "secret",
      redirectUri: "http://localhost:3000/oauth/airtable/callback",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOpts] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe("https://airtable.com/oauth2/v1/token");
    expect(calledOpts.method).toBe("POST");
    const headers = calledOpts.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/x-www-form-urlencoded");
    // Basic Auth header : base64(client_id:client_secret)
    expect(headers["authorization"]).toMatch(/^Basic /);
    const decoded = Buffer.from(
      headers["authorization"].replace("Basic ", ""),
      "base64",
    ).toString("utf-8");
    expect(decoded).toBe("abc:secret");
    // Body params PKCE
    const body = String(calledOpts.body);
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=code_xxx");
    expect(body).toContain("code_verifier=verifier_xxx");
    expect(body).toContain("client_id=abc");
    expect(body).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth%2Fairtable%2Fcallback",
    );
  });

  it("R4 — zod parse et retourne AirtableTokenResponse", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "oa_acc",
          refresh_token: "oa_ref",
          expires_in: 3600,
          refresh_expires_in: 5184000,
          scope: "data.records:read",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await exchangeAuthorizationCode({
      code: "c",
      codeVerifier: "v",
      clientId: "id",
      clientSecret: "sec",
      redirectUri: "http://x",
    });

    expect(result).toMatchObject({
      access_token: "oa_acc",
      refresh_token: "oa_ref",
      expires_in: 3600,
      scope: "data.records:read",
    });
  });

  it("E4 — invalid_grant (code expiré ou verifier mismatch) → throw AirtableOAuthError", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "PKCE verifier does not match",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );

    let caught: unknown;
    try {
      await exchangeAuthorizationCode({
        code: "c",
        codeVerifier: "wrong",
        clientId: "id",
        clientSecret: "sec",
        redirectUri: "http://x",
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AirtableOAuthError);
    expect((caught as AirtableOAuthError).code).toBe("invalid_grant");
  });

  it("E5 — response JSON malformed (champs manquants) → throw zod error", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "only_acc" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      exchangeAuthorizationCode({
        code: "c",
        codeVerifier: "v",
        clientId: "id",
        clientSecret: "sec",
        redirectUri: "http://x",
      }),
    ).rejects.toThrow();
  });

  it("RNF3 — message d'erreur ne contient ni access_token ni refresh_token", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_request",
          error_description: "missing redirect_uri",
        }),
        { status: 400 },
      ),
    );

    let msg = "";
    try {
      await exchangeAuthorizationCode({
        code: "code_super_secret",
        codeVerifier: "verifier_super_secret",
        clientId: "id",
        clientSecret: "sec_super_secret",
        redirectUri: "http://x",
      });
    } catch (err) {
      msg = (err as Error).message;
    }
    expect(msg).not.toContain("code_super_secret");
    expect(msg).not.toContain("verifier_super_secret");
    expect(msg).not.toContain("sec_super_secret");
  });
});

describe("refreshAccessToken (R10, R11)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("R10 — POST grant_type=refresh_token + Basic Auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new_acc",
          refresh_token: "new_ref",
          expires_in: 3600,
          refresh_expires_in: 5184000,
          scope: "data.records:read",
          token_type: "Bearer",
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    await refreshAccessToken({
      refreshToken: "old_ref",
      clientId: "abc",
      clientSecret: "secret",
    });

    const [calledUrl, calledOpts] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe("https://airtable.com/oauth2/v1/token");
    const body = String(calledOpts.body);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=old_ref");
    const headers = calledOpts.headers as Record<string, string>;
    expect(headers["authorization"]).toMatch(/^Basic /);
  });

  it("R11 — retourne nouveau access_token ET nouveau refresh_token (rotation single-use)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new_acc",
          refresh_token: "new_ref_rotated",
          expires_in: 3600,
          refresh_expires_in: 5184000,
          scope: "data.records:read",
          token_type: "Bearer",
        }),
        { status: 200 },
      ),
    );

    const result = await refreshAccessToken({
      refreshToken: "old_ref",
      clientId: "abc",
      clientSecret: "secret",
    });

    expect(result.access_token).toBe("new_acc");
    expect(result.refresh_token).toBe("new_ref_rotated");
    expect(result.refresh_token).not.toBe("old_ref");
  });

  it("E10 — refresh fail (invalid_grant = refresh révoqué) → throw AirtableOAuthError", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Refresh token invalid or revoked",
        }),
        { status: 400 },
      ),
    );

    let caught: unknown;
    try {
      await refreshAccessToken({
        refreshToken: "revoked_ref",
        clientId: "abc",
        clientSecret: "secret",
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AirtableOAuthError);
    expect((caught as AirtableOAuthError).code).toBe("invalid_grant");
  });
});
