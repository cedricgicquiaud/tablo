import { after, NextResponse, type NextRequest } from "next/server";
import { profileConnection } from "@/lib/ai-engine/schema-cache/populate";
import {
  exchangeAuthorizationCode,
  StripeOAuthError,
} from "@/lib/connectors/stripe/oauth";
import { encrypt } from "@/lib/crypto/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STATE_COOKIE = "tablo_stripe_oauth_state";

function redirectAppErr(request: NextRequest, code: string) {
  return NextResponse.redirect(
    new URL(`/app?error=${encodeURIComponent(code)}`, request.url),
    307,
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // E2 — user a refusé le consent côté Stripe
  if (errorParam === "access_denied") {
    return redirectAppErr(request, "oauth_denied");
  }
  if (errorParam) {
    return redirectAppErr(request, "oauth");
  }

  // E3 (+ E10 consolidé) — CSRF state check
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  if (!cookieState || !state || cookieState !== state) {
    return NextResponse.json(
      { error: "OAuth state mismatch (CSRF)" },
      { status: 403 },
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Missing authorization code" },
      { status: 400 },
    );
  }

  const clientSecret = process.env.STRIPE_SECRET_KEY;
  if (!clientSecret) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY not configured" },
      { status: 500 },
    );
  }

  // E4 + E11 — token exchange
  let tokens;
  try {
    tokens = await exchangeAuthorizationCode(code, clientSecret);
  } catch (err) {
    console.error("[OAuth Stripe callback] token exchange failed:", err);
    if (err instanceof StripeOAuthError && err.code === "application_not_found") {
      return redirectAppErr(request, "oauth_setup");
    }
    return redirectAppErr(request, "oauth_token");
  }

  // E5 — V1 refuse livemode=true
  if (tokens.livemode === true) {
    return redirectAppErr(request, "livemode");
  }

  // E6 — user logué + workspace
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: workspaceRow } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", user.id)
    .single();

  if (!workspaceRow) {
    return NextResponse.json({ error: "Workspace introuvable" }, { status: 404 });
  }

  const workspaceId = (workspaceRow as { id: string }).id;
  const stripeUserId = tokens.stripe_user_id;

  // R11 — idempotence : check si connection existe déjà pour ce stripe_user_id
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("connections")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("kind", "stripe")
    .eq("config_jsonb->>stripe_user_id", stripeUserId)
    .maybeSingle();

  const config_jsonb = {
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token),
    stripe_user_id: stripeUserId,
    livemode: tokens.livemode,
    scope: tokens.scope,
    connected_at: new Date().toISOString(),
  };

  let connectionId: string;
  let isReconnect = false;

  if (existing && (existing as { id: string }).id) {
    // R11 — update tokens (rafraîchit)
    connectionId = (existing as { id: string }).id;
    isReconnect = true;
    const { error: updateErr } = await admin
      .from("connections")
      .update({ config_jsonb })
      .eq("id", connectionId);
    if (updateErr) {
      return redirectAppErr(request, "db");
    }
  } else {
    // Nouvelle connection
    const { data: inserted, error: insertErr } = await admin
      .from("connections")
      .insert({
        workspace_id: workspaceId,
        name: `Stripe (${stripeUserId})`,
        kind: "stripe",
        config_jsonb,
      })
      .select()
      .single();
    if (insertErr || !inserted) {
      return redirectAppErr(request, "db");
    }
    connectionId = (inserted as { id: string }).id;
  }

  // R13 — profiling fire-and-forget (cf REVIEW P14.3 bug schema_cache vide)
  after(async () => {
    try {
      const { StripeDataSource } = await import("@/lib/connectors/stripe/data-source");
      const { decrypt } = await import("@/lib/crypto/encryption");
      const Stripe = (await import("stripe")).default;
      const accessToken = decrypt(config_jsonb.access_token);
      const dataSource = new StripeDataSource({
        connectionId,
        getStripeClient: () => new Stripe(accessToken),
      });
      const cache = await profileConnection(dataSource);
      await admin
        .from("connections")
        .update({
          schema_cache_jsonb: cache,
          schema_synced_at: cache.synced_at,
        })
        .eq("id", connectionId);
    } catch (err) {
      console.warn(
        `[OAuth Stripe callback] profileConnection failed for ${connectionId}:`,
        err,
      );
    }
  });

  // Redirect avec succès
  const redirectKey = isReconnect ? "reconnected" : "connected";
  const res = NextResponse.redirect(
    new URL(`/app?${redirectKey}=stripe`, request.url),
    307,
  );
  res.cookies.delete(STATE_COOKIE);
  return res;
}
