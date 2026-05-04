import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildAirtableAuthorizeUrl } from "@/lib/connectors/airtable/oauth";
import {
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

const SCOPES = [
  "data.records:read",
  "schema.bases:read",
  "user.email:read",
];

export async function GET() {
  const clientId = process.env.AIRTABLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.AIRTABLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "OAuth Airtable non configuré : AIRTABLE_OAUTH_CLIENT_ID et AIRTABLE_OAUTH_REDIRECT_URI requis.",
      },
      { status: 500 },
    );
  }

  const verifier = generateVerifier();
  const state = randomUUID();
  const challenge = generateChallenge(verifier);
  const url = buildAirtableAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
    scopes: SCOPES,
  });

  const res = NextResponse.redirect(url, 307);
  res.cookies.set("tablo_airtable_oauth_verifier", verifier, COOKIE_OPTS);
  res.cookies.set("tablo_airtable_oauth_state", state, COOKIE_OPTS);
  return res;
}
