import { NextResponse, type NextRequest } from "next/server";
import { decideAuthRedirect } from "@/lib/auth/redirect";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy-client";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseProxyClient(request, response);
  // getSession() : lecture cookie + refresh éventuel, pas de network call
  // pour vérifier le token. La vérification a lieu dans le layout RSC
  // (defense in depth). Ce proxy est une porte optimiste.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const decision = decideAuthRedirect(request.nextUrl.pathname, Boolean(session?.user));
  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.nextUrl));
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)",
  ],
};
