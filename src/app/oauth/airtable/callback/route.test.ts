/**
 * Tests Route /oauth/airtable/callback — Phase 14.5 A.3.
 *
 * Couvre R3-R7 + E1-E7 + RNF3.
 *
 * Stratégie :
 *  - Mock `exchangeAuthorizationCode` (helpers oauth.ts).
 *  - Mock `fetchBases` (meta-api.ts).
 *  - Mock `encrypt` (chiffrement cookie session R7).
 *  - Mock `createSupabaseServerClient` (user + workspace check).
 *
 * Note : pas d'insert DB ici (différence avec Stripe). La connection est créée
 *  par la Server Action de la page select-base (A.5). Ici on stocke un cookie
 *  session chiffré court (TTL 600s) avec tokens + bases pour passer à A.5.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

const {
  exchangeMock,
  fetchBasesMock,
  encryptMock,
  ssrUserMock,
  ssrWorkspaceMock,
} = vi.hoisted(() => ({
  exchangeMock: vi.fn(),
  fetchBasesMock: vi.fn(),
  encryptMock: vi.fn((s: string) => `enc:${s}`),
  ssrUserMock: vi.fn(),
  ssrWorkspaceMock: vi.fn(),
}));

vi.mock("@/lib/connectors/airtable/oauth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/connectors/airtable/oauth")>(
    "@/lib/connectors/airtable/oauth",
  );
  return { ...actual, exchangeAuthorizationCode: exchangeMock };
});

vi.mock("@/lib/connectors/airtable/meta-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/connectors/airtable/meta-api")>(
    "@/lib/connectors/airtable/meta-api",
  );
  return { ...actual, fetchBases: fetchBasesMock };
});

vi.mock("@/lib/crypto/encryption", () => ({
  encrypt: encryptMock,
  decrypt: vi.fn((s: string) => s.replace(/^enc:/, "")),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: ssrUserMock },
    from: () => ({
      select: () => ({
        eq: () => ({ single: ssrWorkspaceMock }),
      }),
    }),
  }),
}));

import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  encryptMock.mockImplementation((s: string) => `enc:${s}`);
  process.env.AIRTABLE_OAUTH_CLIENT_ID = "test-client-id";
  process.env.AIRTABLE_OAUTH_CLIENT_SECRET = "test-client-secret";
  process.env.AIRTABLE_OAUTH_REDIRECT_URI =
    "http://localhost:3000/oauth/airtable/callback";

  ssrUserMock.mockResolvedValue({
    data: { user: { id: "user_1" } },
    error: null,
  });
  ssrWorkspaceMock.mockResolvedValue({
    data: { id: "ws_1" },
    error: null,
  });

  exchangeMock.mockResolvedValue({
    access_token: "oa_acc_xxx",
    refresh_token: "oa_ref_xxx",
    expires_in: 3600,
    refresh_expires_in: 5184000,
    scope: "data.records:read schema.bases:read user.email:read",
    token_type: "Bearer",
  });
  fetchBasesMock.mockResolvedValue([
    { id: "appA", name: "Demo Base", permissionLevel: "create" },
  ]);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeRequest(
  query: Record<string, string>,
  cookies: Record<string, string> = {},
) {
  const url = new URL(
    `http://localhost:3000/oauth/airtable/callback?${new URLSearchParams(query).toString()}`,
  );
  const req = new NextRequest(url);
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

describe("GET /oauth/airtable/callback", () => {
  it("E2 — ?error=access_denied → redirect /app?error=oauth_denied", async () => {
    const req = makeRequest({ error: "access_denied" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=oauth_denied");
  });

  it("E3 — cookie state absent → 403 + purge cookies", async () => {
    const req = makeRequest({ code: "code_xxx", state: "abc" });
    const res = await GET(req);
    expect(res.status).toBe(403);
    const setCookies = res.headers.getSetCookie?.() ?? [];
    // state + verifier deletion (Max-Age=0 ou Expires=epoch)
    expect(setCookies.some((c) => c.startsWith("tablo_airtable_oauth_state="))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("tablo_airtable_oauth_verifier="))).toBe(true);
  });

  it("E3 — state query mismatche cookie → 403", async () => {
    const req = makeRequest(
      { code: "code_xxx", state: "abc" },
      {
        tablo_airtable_oauth_state: "different",
        tablo_airtable_oauth_verifier: "verifier_xxx",
      },
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("E3 consolidé — verifier cookie absent (mais state OK) → 403", async () => {
    const req = makeRequest(
      { code: "code_xxx", state: "abc" },
      { tablo_airtable_oauth_state: "abc" },
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("E1 — AIRTABLE_OAUTH_CLIENT_SECRET absent → 500", async () => {
    delete process.env.AIRTABLE_OAUTH_CLIENT_SECRET;
    const req = makeRequest(
      { code: "code_xxx", state: "abc" },
      {
        tablo_airtable_oauth_state: "abc",
        tablo_airtable_oauth_verifier: "verifier_xxx",
      },
    );
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("E4 — exchange throw AirtableOAuthError(invalid_grant) → redirect /app?error=oauth_token", async () => {
    const { AirtableOAuthError } = await import("@/lib/connectors/airtable/oauth");
    exchangeMock.mockRejectedValue(
      new AirtableOAuthError("invalid_grant", "PKCE verifier mismatch"),
    );
    const req = makeRequest(
      { code: "bad", state: "abc" },
      {
        tablo_airtable_oauth_state: "abc",
        tablo_airtable_oauth_verifier: "verifier_xxx",
      },
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("error=oauth_token");
  });

  it("E6 — user non-loggé → 401", async () => {
    ssrUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const req = makeRequest(
      { code: "code_xxx", state: "abc" },
      {
        tablo_airtable_oauth_state: "abc",
        tablo_airtable_oauth_verifier: "verifier_xxx",
      },
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("E7 — workspace introuvable → 404", async () => {
    ssrWorkspaceMock.mockResolvedValue({ data: null, error: null });
    const req = makeRequest(
      { code: "code_xxx", state: "abc" },
      {
        tablo_airtable_oauth_state: "abc",
        tablo_airtable_oauth_verifier: "verifier_xxx",
      },
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("R3-R7 — happy path : exchange + fetchBases + cookie session chiffré + redirect /onboarding/select-airtable-base", async () => {
    const req = makeRequest(
      { code: "code_xxx", state: "abc" },
      {
        tablo_airtable_oauth_state: "abc",
        tablo_airtable_oauth_verifier: "verifier_xxx",
      },
    );
    const res = await GET(req);

    // Exchange appelé avec les bons params (R3 + verifier issu cookie pour PKCE)
    expect(exchangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "code_xxx",
        codeVerifier: "verifier_xxx",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
      }),
    );

    // Bases fetched (R6) avec access_token
    expect(fetchBasesMock).toHaveBeenCalledWith("oa_acc_xxx");

    // Cookie session chiffré set (R7)
    const setCookies = res.headers.getSetCookie?.() ?? [];
    const sessionCookie = setCookies.find((c) =>
      c.startsWith("tablo_airtable_oauth_session="),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toMatch(/HttpOnly/i);
    expect(sessionCookie).toMatch(/SameSite=Lax/i);
    // Le contenu doit avoir été chiffré (encrypt mock appelé)
    expect(encryptMock).toHaveBeenCalled();

    // Redirect vers select-base
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/onboarding/select-airtable-base");

    // State + verifier cookies purgés (utilisés une seule fois)
    expect(setCookies.some((c) => c.startsWith("tablo_airtable_oauth_state="))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("tablo_airtable_oauth_verifier="))).toBe(true);
  });

  it("RNF3 — error path : message logué ne contient pas access_token", async () => {
    const { AirtableOAuthError } = await import("@/lib/connectors/airtable/oauth");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exchangeMock.mockRejectedValue(
      new AirtableOAuthError("invalid_grant", "verifier mismatch"),
    );
    const req = makeRequest(
      { code: "code_with_secret", state: "abc" },
      {
        tablo_airtable_oauth_state: "abc",
        tablo_airtable_oauth_verifier: "verifier_super_secret",
      },
    );
    await GET(req);

    const allLogs = consoleSpy.mock.calls
      .map((c) => c.map(String).join(" "))
      .join(" ");
    expect(allLogs).not.toContain("verifier_super_secret");
    consoleSpy.mockRestore();
  });
});
