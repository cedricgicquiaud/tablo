import { ROUTES, type Route } from "./routes";

export type AuthDecision =
  | { kind: "next" }
  | { kind: "redirect"; to: Route };

export function decideAuthRedirect(pathname: string, hasUser: boolean): AuthDecision {
  const isProtected =
    pathname === ROUTES.DASHBOARD || pathname.startsWith(`${ROUTES.DASHBOARD}/`);
  const isLogin = pathname === ROUTES.LOGIN;
  const isRoot = pathname === "/";

  if (isRoot) {
    return { kind: "redirect", to: hasUser ? ROUTES.DASHBOARD : ROUTES.LOGIN };
  }
  if (isProtected && !hasUser) {
    return { kind: "redirect", to: ROUTES.LOGIN };
  }
  if (isLogin && hasUser) {
    return { kind: "redirect", to: ROUTES.DASHBOARD };
  }
  return { kind: "next" };
}
