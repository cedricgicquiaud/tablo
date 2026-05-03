import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  generateChallenge,
  generateVerifier,
} from "@/lib/connectors/oauth-pkce";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

const SCOPES = ["database:write", "projects:read", "rest:read"];

export async function GET() {
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.SUPABASE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OAuth Supabase non configuré : SUPABASE_OAUTH_CLIENT_ID et SUPABASE_OAUTH_REDIRECT_URI requis." },
      { status: 500 },
    );
  }

  const verifier = generateVerifier();
  const state = randomUUID();
  const challenge = generateChallenge(verifier);
  const url = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
    scopes: SCOPES,
  });

  const res = NextResponse.redirect(url, 302);
  res.cookies.set("tablo_oauth_verifier", verifier, COOKIE_OPTS);
  res.cookies.set("tablo_oauth_state", state, COOKIE_OPTS);
  return res;
}
