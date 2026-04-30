import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exchangeCodeForTokens, fetchProjects, refreshAccessToken } from "./oauth-supabase-api";

const fetchMock = vi.fn();

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("exchangeCodeForTokens", () => {
  it("POST /v1/oauth/token avec PKCE verifier et retourne les tokens", async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        access_token: "at-123",
        refresh_token: "rt-456",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    );
    const tokens = await exchangeCodeForTokens({
      code: "abc",
      verifier: "verifier-x",
      clientId: "cid",
      clientSecret: "csecret",
      redirectUri: "http://localhost/cb",
    });
    expect(tokens.access_token).toBe("at-123");
    expect(tokens.refresh_token).toBe("rt-456");
    expect(tokens.expires_in).toBe(3600);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.supabase.com/v1/oauth/token");
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("abc");
    expect(body.get("code_verifier")).toBe("verifier-x");
    expect(body.get("redirect_uri")).toBe("http://localhost/cb");
    expect(body.get("client_id")).toBe("cid");
  });

  it("throws si la réponse Supabase est non-OK", async () => {
    fetchMock.mockResolvedValueOnce(ok({ error: "invalid_grant" }, 400));
    await expect(
      exchangeCodeForTokens({
        code: "x",
        verifier: "y",
        clientId: "cid",
        clientSecret: "cs",
        redirectUri: "http://localhost/cb",
      }),
    ).rejects.toThrow(/invalid_grant|400/);
  });
});

describe("refreshAccessToken", () => {
  it("POST /v1/oauth/token avec grant_type=refresh_token", async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        access_token: "at-new",
        refresh_token: "rt-new",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    );
    const tokens = await refreshAccessToken({
      refreshToken: "rt-old",
      clientId: "cid",
      clientSecret: "cs",
    });
    expect(tokens.access_token).toBe("at-new");

    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("rt-old");
  });

  it("throws si refresh échoue (token invalide)", async () => {
    fetchMock.mockResolvedValueOnce(ok({ error: "invalid_grant" }, 400));
    await expect(
      refreshAccessToken({
        refreshToken: "x",
        clientId: "cid",
        clientSecret: "cs",
      }),
    ).rejects.toThrow();
  });
});

describe("fetchProjects", () => {
  it("GET /v1/projects avec Bearer token", async () => {
    fetchMock.mockResolvedValueOnce(
      ok([
        { id: "p1", ref: "abcd", name: "Proj A", organization_id: "org1" },
        { id: "p2", ref: "efgh", name: "Proj B", organization_id: "org2" },
      ]),
    );
    const projects = await fetchProjects("at-123");
    expect(projects).toHaveLength(2);
    expect(projects[0].ref).toBe("abcd");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.supabase.com/v1/projects");
    expect(init.headers.Authorization).toBe("Bearer at-123");
  });
});
