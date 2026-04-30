import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const ORIG_CLIENT_ID = process.env.SUPABASE_OAUTH_CLIENT_ID;
const ORIG_REDIRECT = process.env.SUPABASE_OAUTH_REDIRECT_URI;

beforeEach(() => {
  process.env.SUPABASE_OAUTH_CLIENT_ID = "test-client-id";
  process.env.SUPABASE_OAUTH_REDIRECT_URI = "http://localhost:3000/oauth/supabase/callback";
});

afterEach(() => {
  process.env.SUPABASE_OAUTH_CLIENT_ID = ORIG_CLIENT_ID;
  process.env.SUPABASE_OAUTH_REDIRECT_URI = ORIG_REDIRECT;
});

describe("GET /oauth/supabase/start", () => {
  it("retourne une redirection 302/307 vers api.supabase.com/v1/oauth/authorize", async () => {
    const res = await GET();
    expect([302, 307, 308]).toContain(res.status);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).toContain("api.supabase.com/v1/oauth/authorize");
    expect(location).toContain("client_id=test-client-id");
    expect(location).toContain("code_challenge=");
    expect(location).toContain("code_challenge_method=S256");
    expect(location).toContain("response_type=code");
  });

  it("set un cookie verifier HttpOnly + SameSite=Lax", async () => {
    const res = await GET();
    const setCookies = res.headers.getSetCookie?.() ?? [];
    const verifierCookie = setCookies.find((c) =>
      c.startsWith("pinpoint_oauth_verifier="),
    );
    expect(verifierCookie).toBeDefined();
    expect(verifierCookie).toMatch(/HttpOnly/i);
    expect(verifierCookie).toMatch(/SameSite=Lax/i);
  });

  it("set un cookie state distinct du verifier", async () => {
    const res = await GET();
    const setCookies = res.headers.getSetCookie?.() ?? [];
    const stateCookie = setCookies.find((c) => c.startsWith("pinpoint_oauth_state="));
    expect(stateCookie).toBeDefined();
    expect(stateCookie).toMatch(/HttpOnly/i);
  });

  it("retourne 500 si SUPABASE_OAUTH_CLIENT_ID absent", async () => {
    delete process.env.SUPABASE_OAUTH_CLIENT_ID;
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
