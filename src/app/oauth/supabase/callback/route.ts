import { NextResponse, type NextRequest } from "next/server";
import { encrypt } from "@/lib/crypto/encryption";
import {
  exchangeCodeForTokens,
  fetchProjects,
  type SupabaseProject,
} from "@/lib/connectors/oauth-supabase-api";

const SESSION_COOKIE = "pinpoint_oauth_session";
const VERIFIER_COOKIE = "pinpoint_oauth_verifier";
const STATE_COOKIE = "pinpoint_oauth_state";

const SESSION_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  projects: SupabaseProject[];
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/app?oauth_error=${encodeURIComponent(error)}`, request.url),
      302,
    );
  }

  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  const cookieVerifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  if (!cookieState || !cookieVerifier) {
    return NextResponse.json({ error: "Missing OAuth cookies (state/verifier)." }, { status: 400 });
  }
  if (!state || state !== cookieState) {
    return NextResponse.json({ error: "State mismatch (CSRF protection)." }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });
  }

  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.SUPABASE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "OAuth Supabase not configured." }, { status: 500 });
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens({
      code,
      verifier: cookieVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token exchange failed" },
      { status: 400 },
    );
  }

  let projects: SupabaseProject[];
  try {
    projects = await fetchProjects(tokens.access_token);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch projects" },
      { status: 502 },
    );
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const payload: SessionPayload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    projects,
  };
  const ciphertext = encrypt(JSON.stringify(payload));

  const res = NextResponse.redirect(new URL("/onboarding/select-project", request.url), 302);
  res.cookies.set(SESSION_COOKIE, ciphertext, SESSION_OPTS);
  res.cookies.delete(VERIFIER_COOKIE);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
