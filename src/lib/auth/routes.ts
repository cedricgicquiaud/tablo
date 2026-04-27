export const ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  APP: "/app",
  DEMO: "/demo",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

// Routes publiques d'auth (login/signup) : redirect vers /app si déjà authentifié.
export const PUBLIC_AUTH_ROUTES = [ROUTES.LOGIN, ROUTES.SIGNUP] as const;

// Routes protégées : redirect vers /login si non authentifié.
// /demo n'est PAS protégée (showroom public).
export const PROTECTED_PREFIXES = [ROUTES.APP] as const;
