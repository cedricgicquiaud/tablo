import {
  PROTECTED_PREFIXES,
  PUBLIC_AUTH_ROUTES,
  ROUTES,
  type Route,
} from "./routes";

export type AuthDecision =
  | { kind: "next" }
  | { kind: "redirect"; to: Route };

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAuthPage(pathname: string): boolean {
  return (PUBLIC_AUTH_ROUTES as readonly string[]).includes(pathname);
}

export function decideAuthRedirect(pathname: string, hasUser: boolean): AuthDecision {
  if (pathname === "/") {
    return { kind: "redirect", to: hasUser ? ROUTES.APP : ROUTES.LOGIN };
  }
  if (isProtected(pathname) && !hasUser) {
    return { kind: "redirect", to: ROUTES.LOGIN };
  }
  if (isAuthPage(pathname) && hasUser) {
    return { kind: "redirect", to: ROUTES.APP };
  }
  return { kind: "next" };
}
