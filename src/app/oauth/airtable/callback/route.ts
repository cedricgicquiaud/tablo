import { NextResponse, type NextRequest } from "next/server";
import {
  AirtableOAuthError,
  exchangeAuthorizationCode,
} from "@/lib/connectors/airtable/oauth";
import { fetchBases } from "@/lib/connectors/airtable/meta-api";
import { encrypt } from "@/lib/crypto/encryption";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STATE_COOKIE = "tablo_airtable_oauth_state";
const VERIFIER_COOKIE = "tablo_airtable_oauth_verifier";
const SESSION_COOKIE = "tablo_airtable_oauth_session";

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

function redirectAppErr(request: NextRequest, code: string) {
  // Pattern P14.4 : purge cookies state+verifier sur tous les paths d'erreur
  // pour éviter replay TTL 600s (audit verifier P14.4 finding bloquant).
  const res = NextResponse.redirect(
    new URL(`/app?error=${encodeURIComponent(code)}`, request.url),
    307,
  );
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(VERIFIER_COOKIE);
  return res;
}

function jsonErrAndClearCookies(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(VERIFIER_COOKIE);
  return res;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // E2 — user a refusé le consent côté Airtable
  if (errorParam === "access_denied") {
    return redirectAppErr(request, "oauth_denied");
  }
  if (errorParam) {
    return redirectAppErr(request, "oauth");
  }

  // E3 — CSRF state check + verifier presence (PKCE)
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  const cookieVerifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  if (
    !cookieState ||
    !state ||
    cookieState !== state ||
    !cookieVerifier
  ) {
    return jsonErrAndClearCookies("OAuth state mismatch (CSRF)", 403);
  }

  if (!code) {
    return jsonErrAndClearCookies("Missing authorization code", 400);
  }

  // E1 — env vars
  const clientId = process.env.AIRTABLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.AIRTABLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.AIRTABLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return jsonErrAndClearCookies(
      "AIRTABLE_OAUTH_CLIENT_ID/CLIENT_SECRET/REDIRECT_URI not configured",
      500,
    );
  }

  // E4 + E5 — token exchange
  let tokens;
  try {
    tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: cookieVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });
  } catch (err) {
    // RNF3 — log error sans exposer code/verifier/secret. Message AirtableOAuthError
    // est `Airtable OAuth error: <code> — <description>` qui n'embarque pas les secrets.
    console.error(
      "[OAuth Airtable callback] token exchange failed:",
      err instanceof AirtableOAuthError
        ? `${err.code}: ${err.message}`
        : "unknown error",
    );
    return redirectAppErr(request, "oauth_token");
  }

  // E6 — user logué (vérifié APRÈS exchange comme P14.4 Stripe — cohérent)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonErrAndClearCookies("Non authentifié", 401);
  }

  // E7 — workspace
  const { data: workspaceRow } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!workspaceRow) {
    return jsonErrAndClearCookies("Workspace introuvable", 404);
  }

  const workspaceId = (workspaceRow as { id: string }).id;

  // R6 — fetch bases accessibles
  let bases;
  try {
    bases = await fetchBases(tokens.access_token);
  } catch (err) {
    console.error(
      "[OAuth Airtable callback] fetchBases failed:",
      err instanceof Error ? err.message : "unknown error",
    );
    return redirectAppErr(request, "oauth_bases");
  }

  // R7 — cookie session chiffré pour passer à la page select-base
  const expiresAt = Date.now() + tokens.expires_in * 1000;
  const sessionPayload = JSON.stringify({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    scope: tokens.scope,
    bases,
    workspaceId,
    userId: user.id,
  });
  const encryptedSession = encrypt(sessionPayload);

  const res = NextResponse.redirect(
    new URL("/onboarding/select-airtable-base", request.url),
    307,
  );
  res.cookies.set(SESSION_COOKIE, encryptedSession, SESSION_COOKIE_OPTS);
  // Purge state + verifier (utilisés)
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(VERIFIER_COOKIE);
  return res;
}
