import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/connectors/stripe/oauth";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600,
};

export async function GET() {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "OAuth Stripe non configuré : STRIPE_CONNECT_CLIENT_ID requis. Configurez Stripe Connect Platform dans dashboard.stripe.com (cf README).",
      },
      { status: 500 },
    );
  }

  const state = randomUUID();
  const redirectUri = `${appUrl}/oauth/stripe/callback`;
  const url = buildAuthorizeUrl({
    clientId,
    state,
    redirectUri,
    // Stripe bloque `read_only` pour les nouveaux comptes Connect Standard
    // (réservé aux comptes pré-existants ou via Stripe support). On utilise
    // `read_write` qui marche par défaut. Notre code ne fait que des reads
    // (cf StripeDataSource.runQuery `validateReadOnlySql`), donc le surplus
    // de scope n'est pas exploité côté Tablo.
    // V2 BACKLOG : downgrade vers read_only après whitelist Stripe support.
    scopes: ["read_write"],
  });

  const res = NextResponse.redirect(url, 307);
  res.cookies.set("tablo_stripe_oauth_state", state, COOKIE_OPTS);
  return res;
}
