/**
 * Tests `detectSourceType` — Phase 18 Cycle A T_A2.
 *
 * Helper qui appelle Anthropic Haiku pour identifier le type de business
 * d'un schéma à partir de la liste des tables. Retourne un SourceKind
 * (whitelist 5 valeurs) ou fallback 'generic' en cas d'erreur ou réponse
 * hors whitelist.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock("@/lib/ai/anthropic", () => ({
  getAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
  AI_MODEL: "claude-haiku-test",
}));

const { detectSourceType } = await import("./detect-source-type");

function mockResponse(text: string) {
  return {
    id: "msg",
    role: "assistant",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    usage: { input_tokens: 100, output_tokens: 5 },
  };
}

describe("detectSourceType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T_A2.1 — tables ecommerce → 'ecommerce'", async () => {
    mockCreate.mockResolvedValue(mockResponse("ecommerce"));
    const kind = await detectSourceType([
      { name: "orders", rowCount: 2300 },
      { name: "products", rowCount: 150 },
      { name: "customers", rowCount: 800 },
      { name: "order_items", rowCount: 5400 },
    ]);
    expect(kind).toBe("ecommerce");
  });

  it("T_A2.2 — tables CRM → 'crm'", async () => {
    mockCreate.mockResolvedValue(mockResponse("crm"));
    const kind = await detectSourceType([
      { name: "deals", rowCount: 200 },
      { name: "companies", rowCount: 80 },
      { name: "contacts", rowCount: 400 },
    ]);
    expect(kind).toBe("crm");
  });

  it("T_A2.3 — réponse Haiku hors whitelist → fallback 'generic'", async () => {
    mockCreate.mockResolvedValue(mockResponse("retail-shop"));
    const kind = await detectSourceType([{ name: "items", rowCount: 100 }]);
    expect(kind).toBe("generic");
  });

  it("T_A2.4 — Anthropic throw → fallback 'generic' après 1 retry", async () => {
    mockCreate
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"));
    const kind = await detectSourceType([{ name: "x", rowCount: 1 }]);
    expect(kind).toBe("generic");
    // 2 calls : 1 initial + 1 retry
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("T_A2.5 — réponse multi-mots → extrait le 1er token whitelist", async () => {
    // Haiku peut répondre "ecommerce." ou "ecommerce\n" — on tolère
    mockCreate.mockResolvedValue(mockResponse("  Ecommerce.  "));
    const kind = await detectSourceType([{ name: "orders", rowCount: 1 }]);
    expect(kind).toBe("ecommerce");
  });

  it("T_A2.6 — top 10 tables seulement passées au LLM (schémas larges)", async () => {
    mockCreate.mockResolvedValue(mockResponse("generic"));
    const tables = Array.from({ length: 50 }, (_, i) => ({
      name: `table_${i}`,
      rowCount: 1000 - i * 10,
    }));
    await detectSourceType(tables);
    expect(mockCreate).toHaveBeenCalled();
    const userMsg = (mockCreate.mock.calls[0][0] as { messages: Array<{ content: string }> })
      .messages[0].content;
    // Le prompt user contient les 10 plus grosses tables
    expect(userMsg).toContain("table_0");
    expect(userMsg).toContain("table_9");
    expect(userMsg).not.toContain("table_15");
  });
});
