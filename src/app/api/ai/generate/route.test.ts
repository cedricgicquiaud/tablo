/**
 * Tests Route Handler /api/ai/generate — Phase 17 cycle A T1.4.
 *
 * Couvre TA8 (401), TA9 (403 + ordre check IDOR), partiellement TA10
 * (stub abort path).
 *
 * TA9 critique (B1) : vérifie que `createSupabaseServerClient()` SSR
 * client est appelé AVANT `createSupabaseAdminClient()`. Régression
 * possible si le dev fait l'inverse → IDOR (memoire `feedback_server_actions_ownership`).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Track ordre d'appel SSR vs admin
const callOrder: string[] = [];

const mockGetUser = vi.fn();
const mockFromConnections = vi.fn();
const mockSelectEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => {
    callOrder.push("ssr");
    return {
      auth: { getUser: mockGetUser },
      from: mockFromConnections,
    };
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => {
    callOrder.push("admin");
    return {
      from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }) }),
    };
  }),
}));

// Mock runAgent : on teste l'auth IDOR, pas le moteur AI complet.
// Le mock close() proprement le stream pour valider le pipeline.
vi.mock("@/lib/ai-engine", () => ({
  runAgent: vi.fn(async (_input, sse) => {
    sse.send({ type: "text_delta", text: "Mock runAgent" });
    sse.send({
      type: "done",
      result: { ok: false, error: "mocked" },
    });
  }),
}));

// Mock getMyWorkspace : retourne un workspace fictif (l'auth a déjà validé
// le user, on simule juste le mapping user → workspace pour le runAgent).
vi.mock("@/lib/queries/pinpoint", () => ({
  getMyWorkspace: vi.fn(async () => ({ id: "ws-1", name: "Mon workspace" })),
}));

import { POST } from "./route";

describe("/api/ai/generate (T1.4)", () => {
  beforeEach(() => {
    callOrder.length = 0;
    mockGetUser.mockReset();
    mockFromConnections.mockReset();
    mockSelectEq.mockReset();
    mockSingle.mockReset();

    // Default chain: from('connections').select('id').eq('id', ...).single()
    mockFromConnections.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: mockSingle }) }),
    }));
  });

  it("TA8 — POST sans cookie session → 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new Request("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("TA9 — POST avec connectionId d'un autre workspace → 403 (IDOR guard)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    // SSR scoped RLS retourne null = pas d'accès
    mockSingle.mockResolvedValue({ data: null, error: null });

    const request = new Request("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "test", connectionId: "other-workspace-conn-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("TA9 (B1) — SSR client appelé AVANT admin client (ordre IDOR strict)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const request = new Request("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "test", connectionId: "some-conn-id" }),
    });

    await POST(request);

    // Si admin a été appelé, il doit l'être APRÈS ssr (mais ici 403 → admin pas appelé du tout)
    const ssrIdx = callOrder.indexOf("ssr");
    const adminIdx = callOrder.indexOf("admin");
    expect(ssrIdx).toBeGreaterThanOrEqual(0);
    if (adminIdx >= 0) {
      expect(adminIdx).toBeGreaterThan(ssrIdx);
    }
  });

  it("TA9 (succès) — connectionId valide → 200 stream commence", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    // SSR scoped RLS retourne la row → user a accès
    mockSingle.mockResolvedValue({ data: { id: "owned-conn-id" }, error: null });

    const request = new Request("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "test prompt", connectionId: "owned-conn-id" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    // Lecture du stream pour ne pas laisser fuiter
    const reader = response.body!.getReader();
    await reader.cancel();
  });

  it("TA9 (sans connectionId) — pas de check ownership, démarre stream avec demo source", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const request = new Request("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt: "test prompt" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    // mockSingle ne doit PAS avoir été appelé (pas de connectionId)
    expect(mockSingle).not.toHaveBeenCalled();
    const reader = response.body!.getReader();
    await reader.cancel();
  });

  it("TA8 (input invalide) — body sans prompt → 400", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const request = new Request("http://localhost/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
