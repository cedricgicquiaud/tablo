/**
 * Helpers OAuth Airtable PKCE — Phase 14.5 A.1.
 *
 * Pattern : 3 fonctions pures testables sans setup environnement.
 *  - `buildAirtableAuthorizeUrl` : URL `/oauth2/v1/authorize` avec PKCE.
 *  - `exchangeAuthorizationCode` : POST `/oauth2/v1/token` (code → tokens).
 *  - `refreshAccessToken` : POST `/oauth2/v1/token` (refresh_token rotation R11).
 *
 * Différences clés vs OAuth Stripe (P14.4) :
 *  - PKCE obligatoire (code_challenge S256 + code_verifier).
 *  - Basic Auth header `client_id:client_secret` (recommandé Airtable).
 *  - `refresh_token` est single-use → chaque refresh retourne un nouveau
 *    refresh_token qu'il faut persister. Sinon next refresh échouera.
 *
 * Erreurs Airtable wrapées dans `AirtableOAuthError` pour différenciation
 * côté callback/refresh (E4 invalid_grant, E5 zod parse error, E10 fail).
 *
 * Cf docs : https://airtable.com/developers/web/api/oauth-reference
 */

import { z } from "zod";
import { buildAuthorizeUrl as buildPkceAuthorizeUrl } from "../oauth-pkce";

const AIRTABLE_AUTHORIZE_URL = "https://airtable.com/oauth2/v1/authorize";
const AIRTABLE_TOKEN_URL = "https://airtable.com/oauth2/v1/token";

/* -------------------------------------------------------------------------- */
/*                              Types                                         */
/* -------------------------------------------------------------------------- */

export type BuildAirtableAuthorizeUrlOpts = {
  clientId: string;
  state: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
};

export type ExchangeAuthorizationCodeOpts = {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type RefreshAccessTokenOpts = {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
};

const AirtableTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  refresh_expires_in: z.number(),
  scope: z.string(),
  token_type: z.string(),
});

export type AirtableTokenResponse = z.infer<typeof AirtableTokenResponseSchema>;

/** Erreur OAuth Airtable avec code structuré (E4 invalid_grant, E10 refresh fail). */
export class AirtableOAuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AirtableOAuthError";
  }
}

/* -------------------------------------------------------------------------- */
/*                          buildAirtableAuthorizeUrl                         */
/* -------------------------------------------------------------------------- */

export function buildAirtableAuthorizeUrl(
  opts: BuildAirtableAuthorizeUrlOpts,
): string {
  return buildPkceAuthorizeUrl({
    authorizeUrl: AIRTABLE_AUTHORIZE_URL,
    clientId: opts.clientId,
    redirectUri: opts.redirectUri,
    state: opts.state,
    codeChallenge: opts.codeChallenge,
    scopes: opts.scopes,
  });
}

/* -------------------------------------------------------------------------- */
/*                        exchangeAuthorizationCode                           */
/* -------------------------------------------------------------------------- */

export async function exchangeAuthorizationCode(
  opts: ExchangeAuthorizationCodeOpts,
): Promise<AirtableTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    code_verifier: opts.codeVerifier,
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
  });

  return postTokenRequest(body, opts.clientId, opts.clientSecret);
}

/* -------------------------------------------------------------------------- */
/*                            refreshAccessToken                              */
/* -------------------------------------------------------------------------- */

export async function refreshAccessToken(
  opts: RefreshAccessTokenOpts,
): Promise<AirtableTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
    client_id: opts.clientId,
  });

  return postTokenRequest(body, opts.clientId, opts.clientSecret);
}

/* -------------------------------------------------------------------------- */
/*                          shared POST helper                                */
/* -------------------------------------------------------------------------- */

async function postTokenRequest(
  body: URLSearchParams,
  clientId: string,
  clientSecret: string,
): Promise<AirtableTokenResponse> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(AIRTABLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok || typeof json.error === "string") {
    const errorCode = typeof json.error === "string" ? json.error : "unknown";
    const errorDesc =
      typeof json.error_description === "string"
        ? json.error_description
        : `HTTP ${res.status}`;
    throw new AirtableOAuthError(
      errorCode,
      `Airtable OAuth error: ${errorCode} — ${errorDesc}`,
    );
  }

  return AirtableTokenResponseSchema.parse(json);
}
