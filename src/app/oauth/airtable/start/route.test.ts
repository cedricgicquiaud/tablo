import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const ORIG_CLIENT_ID = process.env.AIRTABLE_OAUTH_CLIENT_ID;
const ORIG_REDIRECT = process.env.AIRTABLE_OAUTH_REDIRECT_URI;

beforeEach(() => {
  process.env.AIRTABLE_OAUTH_CLIENT_ID = "test-airtable-client-id";
  process.env.AIRTABLE_OAUTH_REDIRECT_URI =
    "http://localhost:3000/oauth/airtable/callback";
});

afterEach(() => {
  process.env.AIRTABLE_OAUTH_CLIENT_ID = ORIG_CLIENT_ID;
  process.env.AIRTABLE_OAUTH_REDIRECT_URI = ORIG_REDIRECT;
});

describe("GET /oauth/airtable/start (R1, R2, RNF4, E1)", () => {
  it("R1 — retourne 307 redirect vers airtable.com/oauth2/v1/authorize avec PKCE params", async () => {
    const res = await GET();
    expect([302, 307]).toContain(res.status);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).toContain("airtable.com/oauth2/v1/authorize");
    expect(location).toContain("client_id=test-airtable-client-id");
    expect(location).toContain("code_challenge=");
    expect(location).toContain("code_challenge_method=S256");
    expect(location).toContain("response_type=code");
    expect(location).toContain("scope=");
  });

  it("R2 + RNF4 — set cookie verifier HttpOnly + SameSite=Lax avec préfixe airtable distinct", async () => {
    const res = await GET();
    const setCookies = res.headers.getSetCookie?.() ?? [];
    const verifierCookie = setCookies.find((c) =>
      c.startsWith("tablo_airtable_oauth_verifier="),
    );
    expect(verifierCookie).toBeDefined();
    expect(verifierCookie).toMatch(/HttpOnly/i);
    expect(verifierCookie).toMatch(/SameSite=Lax/i);
  });

  it("R2 — set cookie state distinct du verifier (préfixe airtable)", async () => {
    const res = await GET();
    const setCookies = res.headers.getSetCookie?.() ?? [];
    const stateCookie = setCookies.find((c) =>
      c.startsWith("tablo_airtable_oauth_state="),
    );
    expect(stateCookie).toBeDefined();
    expect(stateCookie).toMatch(/HttpOnly/i);
  });

  it("E1 — retourne 500 si AIRTABLE_OAUTH_CLIENT_ID absent", async () => {
    delete process.env.AIRTABLE_OAUTH_CLIENT_ID;
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("E1 — retourne 500 si AIRTABLE_OAUTH_REDIRECT_URI absent", async () => {
    delete process.env.AIRTABLE_OAUTH_REDIRECT_URI;
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("préfixe cookie airtable n'écrase pas les cookies OAuth Supabase (cohabitation)", async () => {
    const res = await GET();
    const setCookies = res.headers.getSetCookie?.() ?? [];
    // Aucun cookie ne doit utiliser le nom Supabase tablo_oauth_* (sans prefix airtable)
    const supabaseConflict = setCookies.find(
      (c) =>
        c.startsWith("tablo_oauth_state=") ||
        c.startsWith("tablo_oauth_verifier="),
    );
    expect(supabaseConflict).toBeUndefined();
  });
});
