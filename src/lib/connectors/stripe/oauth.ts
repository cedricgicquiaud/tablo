/**
 * Helpers OAuth Stripe Connect Standard — Phase 14.4 C2.
 *
 * Pattern : 2 fonctions pures testables sans setup environnement.
 *  - `buildAuthorizeUrl` : construit l'URL `/oauth/authorize` Stripe.
 *  - `exchangeAuthorizationCode` : POST `/oauth/token` pour échanger
 *    le `code` contre access_token/refresh_token/stripe_user_id.
 *
 * Erreurs Stripe (`application_not_found`, `invalid_grant`, etc.) wrapées
 * dans `StripeOAuthError` pour différenciation côté callback (E11 vs E4).
 */

import { z } from "zod";

// Connect OAuth Standard utilise `/oauth/authorize` + `/oauth/token` (sans v2).
// Le `/oauth/v2/...` est l'API Stripe Apps, pas Connect — confusion initiale
// révélée au smoke test (HTML 404 au lieu de JSON sur /v2/token).
const STRIPE_AUTHORIZE_BASE_URL = "https://connect.stripe.com/oauth/authorize";
const STRIPE_TOKEN_URL = "https://connect.stripe.com/oauth/token";

/* -------------------------------------------------------------------------- */
/*                              Types                                         */
/* -------------------------------------------------------------------------- */

export type Scope = "read_only" | "read_write";

export type BuildAuthorizeUrlOpts = {
  clientId: string;
  state: string;
  redirectUri: string;
  scopes: Scope[];
};

const StripeOAuthTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  stripe_user_id: z.string(),
  livemode: z.boolean(),
  scope: z.string(),
  token_type: z.string().optional(),
});

export type StripeOAuthTokenResponse = z.infer<
  typeof StripeOAuthTokenResponseSchema
>;

/** Erreur OAuth Stripe avec code structuré pour différencier les cas (E11/E4/E2). */
export class StripeOAuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "StripeOAuthError";
  }
}

/* -------------------------------------------------------------------------- */
/*                              buildAuthorizeUrl                             */
/* -------------------------------------------------------------------------- */

export function buildAuthorizeUrl(opts: BuildAuthorizeUrlOpts): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: opts.clientId,
    scope: opts.scopes.join(" "),
    state: opts.state,
    redirect_uri: opts.redirectUri,
  });
  return `${STRIPE_AUTHORIZE_BASE_URL}?${params.toString()}`;
}

/* -------------------------------------------------------------------------- */
/*                          exchangeAuthorizationCode                         */
/* -------------------------------------------------------------------------- */

export async function exchangeAuthorizationCode(
  code: string,
  clientSecret: string,
): Promise<StripeOAuthTokenResponse> {
  const body = new URLSearchParams({
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });

  const res = await fetch(STRIPE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json()) as Record<string, unknown>;

  if (!res.ok || typeof json.error === "string") {
    const errorCode = typeof json.error === "string" ? json.error : "unknown";
    const errorDesc =
      typeof json.error_description === "string"
        ? json.error_description
        : `HTTP ${res.status}`;
    throw new StripeOAuthError(
      errorCode,
      `Stripe OAuth error: ${errorCode} — ${errorDesc}`,
    );
  }

  return StripeOAuthTokenResponseSchema.parse(json);
}
