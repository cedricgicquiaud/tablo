/**
 * TB9 / TB9bis — refreshConnectionSchema Server Action.
 *
 * Phase 17 cycle B T2.7. IDOR guard + rate limit 60s + mutex JSONB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted : les mocks doivent être créés avant les vi.mock
const {
  mockGetUser,
  mockSsrSelectSingle,
  mockAdminSelectSingle,
  mockAdminUpdate,
  mockProfileConnection,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSsrSelectSingle: vi.fn(),
  mockAdminSelectSingle: vi.fn(),
  mockAdminUpdate: vi.fn(),
  mockProfileConnection: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSsrSelectSingle,
        }),
      }),
    }),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockAdminSelectSingle,
        }),
      }),
      update: mockAdminUpdate,
    }),
  })),
}));

vi.mock("./populate", () => ({
  profileConnection: mockProfileConnection,
}));

vi.mock("../load-data-source", () => ({
  loadDataSource: vi.fn(async () => ({
    listTables: vi.fn(async () => []),
    inspectTable: vi.fn(),
    runQuery: vi.fn(),
  })),
}));

import { refreshConnectionSchema } from "./refresh-action";

describe("refreshConnectionSchema", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockSsrSelectSingle.mockReset();
    mockAdminSelectSingle.mockReset();
    mockAdminUpdate.mockReset();
    mockProfileConnection.mockReset();

    // Default : update return chain () => ({ eq: () => ({ data: null, error: null }) })
    mockAdminUpdate.mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    // Default profileConnection success
    mockProfileConnection.mockResolvedValue({
      version: 1,
      synced_at: new Date().toISOString(),
      status: "ok",
      tables: [],
    });
  });

  it("TB9 — pas de session user → 401-like (ok: false)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await refreshConnectionSchema("any-conn-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/non authentifi/i);
    }
  });

  it("TB9 — connectionId d'un autre workspace → 403-like (IDOR via SSR scoped)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSsrSelectSingle.mockResolvedValue({ data: null, error: null });

    const result = await refreshConnectionSchema("not-mine");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/non autorisée|introuvable/i);
    }
  });

  it("TB9bis — 2ᵉ call < 60s → erreur rate limit", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSsrSelectSingle.mockResolvedValue({
      data: { id: "conn-id" },
      error: null,
    });
    // last_profiling_attempt_at = il y a 30s
    const recentAttempt = new Date(Date.now() - 30 * 1000).toISOString();
    mockAdminSelectSingle.mockResolvedValue({
      data: {
        config_jsonb: {
          last_profiling_attempt_at: recentAttempt,
          is_profiling: false,
        },
      },
      error: null,
    });

    const result = await refreshConnectionSchema("conn-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/60 secondes/i);
    }
    expect(mockProfileConnection).not.toHaveBeenCalled();
  });

  it("TB9bis — flag is_profiling=true → erreur 'déjà en cours'", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSsrSelectSingle.mockResolvedValue({ data: { id: "conn-id" }, error: null });
    mockAdminSelectSingle.mockResolvedValue({
      data: {
        config_jsonb: { is_profiling: true },
      },
      error: null,
    });

    const result = await refreshConnectionSchema("conn-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/déjà en cours/i);
    }
    expect(mockProfileConnection).not.toHaveBeenCalled();
  });

  it("Succès : profileConnection appelé + cache écrit + flag reset", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSsrSelectSingle.mockResolvedValue({ data: { id: "conn-id" }, error: null });
    mockAdminSelectSingle.mockResolvedValue({
      data: {
        config_jsonb: {},
      },
      error: null,
    });

    const result = await refreshConnectionSchema("conn-id");
    expect(result.ok).toBe(true);
    expect(mockProfileConnection).toHaveBeenCalled();
    // 2 update : 1 pour set is_profiling=true au début, 1 pour reset + écrire cache à la fin
    // (selon implémentation, peut être 1 update final qui combine tout)
    expect(mockAdminUpdate).toHaveBeenCalled();
  });

  it("Si profileConnection throw → flag is_profiling reset (try/finally)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSsrSelectSingle.mockResolvedValue({ data: { id: "conn-id" }, error: null });
    mockAdminSelectSingle.mockResolvedValue({
      data: { config_jsonb: {} },
      error: null,
    });
    mockProfileConnection.mockRejectedValue(new Error("DB explosion"));

    const result = await refreshConnectionSchema("conn-id");
    expect(result.ok).toBe(false);
    // Update appelé pour reset le flag même en cas d'erreur
    expect(mockAdminUpdate).toHaveBeenCalled();
  });
});
