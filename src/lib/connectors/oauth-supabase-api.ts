// Wrappers autour de l'API Management Supabase (OAuth + projets).
// Tous les appels passent par fetch — facile à mocker en tests.

const TOKEN_ENDPOINT = "https://api.supabase.com/v1/oauth/token";
const PROJECTS_ENDPOINT = "https://api.supabase.com/v1/projects";

export type OAuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export type SupabaseProject = {
  id: string;
  ref: string;
  name: string;
  organization_id: string;
};

async function postTokenEndpoint(body: URLSearchParams): Promise<OAuthTokens> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase token endpoint ${res.status}: ${text}`);
  }
  return (await res.json()) as OAuthTokens;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  verifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.verifier,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  return postTokenEndpoint(body);
}

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  return postTokenEndpoint(body);
}

export async function fetchProjects(accessToken: string): Promise<SupabaseProject[]> {
  const res = await fetch(PROJECTS_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase projects endpoint ${res.status}: ${text}`);
  }
  return (await res.json()) as SupabaseProject[];
}
