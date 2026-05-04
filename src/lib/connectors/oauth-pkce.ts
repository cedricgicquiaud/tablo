import { createHash, randomBytes } from "node:crypto";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// PKCE verifier : 43-128 chars url-safe (RFC 7636).
// 48 random bytes → ~64 chars en base64url, dans la plage autorisée.
export function generateVerifier(): string {
  return base64url(randomBytes(48));
}

// PKCE challenge : base64url(SHA256(verifier)).
export function generateChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export type AuthorizeUrlParams = {
  /** URL de l'endpoint d'autorisation OAuth du provider (ex Supabase, Airtable). */
  authorizeUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes: string[];
};

export function buildAuthorizeUrl(params: AuthorizeUrlParams): string {
  const u = new URL(params.authorizeUrl);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", params.redirectUri);
  u.searchParams.set("state", params.state);
  u.searchParams.set("code_challenge", params.codeChallenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("scope", params.scopes.join(" "));
  return u.toString();
}
