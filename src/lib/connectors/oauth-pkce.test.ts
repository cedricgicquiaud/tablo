import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  generateChallenge,
  generateVerifier,
} from "./oauth-pkce";

describe("oauth-pkce", () => {
  it("generateVerifier produit une chaîne de 64 caractères url-safe", () => {
    const v = generateVerifier();
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
  });

  it("generateVerifier produit une valeur différente à chaque appel", () => {
    const a = generateVerifier();
    const b = generateVerifier();
    expect(a).not.toBe(b);
  });

  it("generateChallenge retourne SHA256 base64url du verifier", () => {
    // Vector officiel RFC 7636 :
    // verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    // challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = generateChallenge(verifier);
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("buildAuthorizeUrl assemble l'URL avec tous les paramètres OAuth", () => {
    const url = buildAuthorizeUrl({
      clientId: "client-abc",
      redirectUri: "http://localhost:3000/oauth/supabase/callback",
      state: "state-xyz",
      codeChallenge: "challenge-123",
      scopes: ["database:write", "projects:read"],
    });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://api.supabase.com/v1/oauth/authorize");
    expect(u.searchParams.get("client_id")).toBe("client-abc");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/oauth/supabase/callback",
    );
    expect(u.searchParams.get("state")).toBe("state-xyz");
    expect(u.searchParams.get("code_challenge")).toBe("challenge-123");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("scope")).toBe("database:write projects:read");
  });
});
