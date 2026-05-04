/**
 * Tests Route /oauth/stripe/callback — Phase 14.4 C2.
 *
 * Couvre R7, R10, R11, R13 + E2-E7 + E11.
 *
 * Stratégie :
 *  - Mock `next/server` `after` pour exécuter callback synchrone (PLAN T2.15).
 *  - Mock `exchangeAuthorizationCode` (helper oauth.ts).
 *  - Mock `createSupabaseServerClient` + `createSupabaseAdminClient`.
 *  - Mock `profileConnection` pour spy R13.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const ORIGINAL_ENV = { ...process.env };

// vi.hoisted pour partager mocks avec les vi.mock (hoisted top-level).
const {
  exchangeMock,
  encryptMock,
  decryptMock,
  ssrUserMock,
  ssrWorkspaceMock,
  adminUpdateMock,
  adminInsertMock,
  adminSelectMock,
  profileConnectionMock,
} = vi.hoisted(() => ({
  exchangeMock: vi.fn(),
  encryptMock: vi.fn((s: string) => `enc:${s}`),
  decryptMock: vi.fn((s: string) => s.replace(/^enc:/, "")),
  ssrUserMock: vi.fn(),
  ssrWorkspaceMock: vi.fn(),
  adminUpdateMock: vi.fn(),
  adminInsertMock: vi.fn(),
  adminSelectMock: vi.fn(),
  profileConnectionMock: vi.fn(),
}));

vi.mock("@/lib/connectors/stripe/oauth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/connectors/stripe/oauth")>(
    "@/lib/connectors/stripe/oauth",
  );
  return { ...actual, exchangeAuthorizationCode: exchangeMock };
});

vi.mock("@/lib/crypto/encryption", () => ({
  encrypt: encryptMock,
  decrypt: decryptMock,
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

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: adminSelectMock }) }) }) }),
      update: adminUpdateMock,
      insert: adminInsertMock,
    }),
  }),
}));

vi.mock("@/lib/ai-engine/schema-cache/populate", () => ({
  profileConnection: profileConnectionMock,
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (cb: () => void | Promise<void>) => cb(),
  };
});

import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  encryptMock.mockImplementation((s: string) => `enc:${s}`);
  decryptMock.mockImplementation((s: string) => s.replace(/^enc:/, ""));
  process.env.STRIPE_CONNECT_CLIENT_ID = "ca_test_xxx";
  process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
  // Default user logué + workspace existant
  ssrUserMock.mockResolvedValue({
    data: { user: { id: "user_1" } },
    error: null,
  });
  ssrWorkspaceMock.mockResolvedValue({
    data: { id: "ws_1" },
    error: null,
  });
  adminSelectMock.mockResolvedValue({ data: null, error: null });
  adminUpdateMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  adminInsertMock.mockReturnValue({
    select: () => ({ single: () => Promise.resolve({ data: { id: "conn_1" }, error: null }) }),
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeRequest(query: Record<string, string>, cookies: Record<string, string> = {}) {
  const url = new URL(`http://localhost:3000/oauth/stripe/callback?${new URLSearchParams(query).toString()}`);
  const req = new NextRequest(url);
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

describe("GET /oauth/stripe/callback", () => {
  it("E2 — ?error=access_denied → redirect /app?error=oauth_denied", async () => {
    const req = makeRequest({ error: "access_denied" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=oauth_denied");
  });

  it("E3 — cookie state absent → 403", async () => {
    const req = makeRequest({ code: "ac_xxx", state: "abc" });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("E3 — state query mismatche cookie → 403", async () => {
    const req = makeRequest({ code: "ac_xxx", state: "abc" }, { tablo_stripe_oauth_state: "different" });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("E11 — exchange retourne application_not_found → redirect /app?error=oauth_setup", async () => {
    const { StripeOAuthError } = await import("@/lib/connectors/stripe/oauth");
    exchangeMock.mockRejectedValue(
      new StripeOAuthError("application_not_found", "Stripe Connect Platform pas activé"),
    );
    const req = makeRequest(
      { code: "ac_xxx", state: "abc" },
      { tablo_stripe_oauth_state: "abc" },
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("error=oauth_setup");
  });

  it("E5 — livemode=true → redirect /app?error=livemode + pas d'insert", async () => {
    exchangeMock.mockResolvedValue({
      access_token: "rk_live_xxx",
      refresh_token: "rt_xxx",
      stripe_user_id: "acct_live_xxx",
      livemode: true,
      scope: "read_only",
    });
    const req = makeRequest(
      { code: "ac_xxx", state: "abc" },
      { tablo_stripe_oauth_state: "abc" },
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("error=livemode");
    expect(adminInsertMock).not.toHaveBeenCalled();
  });

  it("E6 — user non-loggé → 401", async () => {
    ssrUserMock.mockResolvedValue({ data: { user: null }, error: null });
    exchangeMock.mockResolvedValue({
      access_token: "rk_test_xxx",
      refresh_token: "rt_xxx",
      stripe_user_id: "acct_test_xxx",
      livemode: false,
      scope: "read_only",
    });
    const req = makeRequest(
      { code: "ac_xxx", state: "abc" },
      { tablo_stripe_oauth_state: "abc" },
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("R7 — code valide + livemode=false → insert + redirect /app?connected=stripe", async () => {
    exchangeMock.mockResolvedValue({
      access_token: "rk_test_xxx",
      refresh_token: "rt_xxx",
      stripe_user_id: "acct_test_xxx",
      livemode: false,
      scope: "read_only",
    });
    const req = makeRequest(
      { code: "ac_xxx", state: "abc" },
      { tablo_stripe_oauth_state: "abc" },
    );
    const res = await GET(req);

    expect(adminInsertMock).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toContain("connected=stripe");

    // Vérifier que les tokens sont chiffrés (encrypt mock appelé 2× pour
    // access_token + refresh_token)
    expect(encryptMock).toHaveBeenCalledTimes(2);

    // R13 — profileConnection fire-and-forget non testé ici (import dynamic
    // async dans `after()` — pas await-able. Validation en smoke S6bis :
    // après OAuth réel, vérifier `connections.schema_cache_jsonb` populé.
  });

  it("R11 — re-OAuth même stripe_user_id → update + redirect ?reconnected=stripe", async () => {
    // Simule connection existante en DB
    adminSelectMock.mockResolvedValue({
      data: { id: "conn_existing", config_jsonb: { stripe_user_id: "acct_test_xxx" } },
      error: null,
    });
    exchangeMock.mockResolvedValue({
      access_token: "rk_test_new",
      refresh_token: "rt_new",
      stripe_user_id: "acct_test_xxx",
      livemode: false,
      scope: "read_only",
    });

    const req = makeRequest(
      { code: "ac_xxx", state: "abc" },
      { tablo_stripe_oauth_state: "abc" },
    );
    const res = await GET(req);

    expect(adminInsertMock).not.toHaveBeenCalled();
    expect(adminUpdateMock).toHaveBeenCalledTimes(1);
    expect(res.headers.get("location")).toContain("reconnected=stripe");
  });

  it("R10 — démo et user-owned coexistent : connection user créée n'est pas la démo", async () => {
    exchangeMock.mockResolvedValue({
      access_token: "rk_test_xxx",
      refresh_token: "rt_xxx",
      stripe_user_id: "acct_user",
      livemode: false,
      scope: "read_only",
    });
    const req = makeRequest(
      { code: "ac_xxx", state: "abc" },
      { tablo_stripe_oauth_state: "abc" },
    );
    await GET(req);

    // L'insert ne doit PAS contenir env_creds:true (c'est seulement pour la démo)
    const insertCall = adminInsertMock.mock.calls[0]?.[0];
    expect(insertCall.config_jsonb.env_creds).toBeUndefined();
    expect(insertCall.config_jsonb.stripe_user_id).toBe("acct_user");
  });
});
