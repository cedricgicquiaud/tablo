import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const fetchMock = vi.fn();

function makeRequest(url: string, cookies: Record<string, string> = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  process.env.SUPABASE_OAUTH_CLIENT_ID = "test-cid";
  process.env.SUPABASE_OAUTH_CLIENT_SECRET = "test-csecret";
  process.env.SUPABASE_OAUTH_REDIRECT_URI = "http://localhost:3000/oauth/supabase/callback";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /oauth/supabase/callback", () => {
  it("rejette avec 400 si le state ne matche pas le cookie (R3)", async () => {
    const req = makeRequest(
      "http://localhost:3000/oauth/supabase/callback?code=abc&state=mismatched",
      { tablo_oauth_state: "expected-state", tablo_oauth_verifier: "v" },
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("rejette avec 400 si le cookie state est absent (CSRF protection)", async () => {
    const req = makeRequest(
      "http://localhost:3000/oauth/supabase/callback?code=abc&state=any",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("redirige vers /onboarding/select-project en cas de succès (R4)", async () => {
    const ok = (b: unknown, s = 200) =>
      new Response(JSON.stringify(b), {
        status: s,
        headers: { "Content-Type": "application/json" },
      });
    fetchMock
      .mockResolvedValueOnce(
        ok({
          access_token: "at-1",
          refresh_token: "rt-1",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      )
      .mockResolvedValueOnce(
        ok([{ id: "p1", ref: "abcd", name: "P", organization_id: "o" }]),
      );

    const req = makeRequest(
      "http://localhost:3000/oauth/supabase/callback?code=abc&state=ok-state",
      { tablo_oauth_state: "ok-state", tablo_oauth_verifier: "ver" },
    );
    const res = await GET(req);
    expect([302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/onboarding/select-project");
  });

  it("set un cookie session (chiffré) avec tokens + projets après succès", async () => {
    const ok = (b: unknown) =>
      new Response(JSON.stringify(b), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    fetchMock
      .mockResolvedValueOnce(
        ok({
          access_token: "at-1",
          refresh_token: "rt-1",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      )
      .mockResolvedValueOnce(ok([{ id: "p1", ref: "abcd", name: "P", organization_id: "o" }]));

    const req = makeRequest(
      "http://localhost:3000/oauth/supabase/callback?code=abc&state=ok-state",
      { tablo_oauth_state: "ok-state", tablo_oauth_verifier: "ver" },
    );
    const res = await GET(req);
    const setCookies = res.headers.getSetCookie?.() ?? [];
    const session = setCookies.find((c) => c.startsWith("tablo_oauth_session="));
    expect(session).toBeDefined();
    expect(session).toMatch(/HttpOnly/i);
  });
});
