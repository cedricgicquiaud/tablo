/**
 * Tests d'intégration runAgent — Phase 17.1.
 *
 * Mock le client Anthropic + DataSource + readSchemaCache pour valider
 * le comportement bout-en-bout de la boucle agent (streaming, tool calls,
 * caching) sans appels API réels.
 *
 * Pattern de mock : `vi.hoisted()` pour partager les vi.fn() avec vi.mock().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SchemaCacheEntry } from "./schema-cache/types";
import { createSSEStream } from "./utils/stream";
import type { StreamEvent } from "./types/agent";

// Hoist mocks pour qu'ils soient visibles depuis les vi.mock() inline.
const {
  mockCreate,
  mockStream,
  mockListTables,
  mockInspectTable,
  mockRunQuery,
  mockReadSchemaCache,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockStream: vi.fn(),
  mockListTables: vi.fn(),
  mockInspectTable: vi.fn(),
  mockRunQuery: vi.fn(),
  mockReadSchemaCache: vi.fn(async (): Promise<SchemaCacheEntry | null> => null),
}));

vi.mock("@/lib/ai/anthropic", () => ({
  getAnthropicClient: () => ({
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  }),
  AI_MODEL: "claude-haiku-test",
}));

vi.mock("./load-data-source", () => ({
  loadDataSource: vi.fn(async () => ({
    listTables: mockListTables,
    inspectTable: mockInspectTable,
    runQuery: mockRunQuery,
  })),
}));

vi.mock("./schema-cache/read", () => ({
  readSchemaCache: mockReadSchemaCache,
}));

// Import après les vi.mock pour que les remplacements soient appliqués.
const { runAgent } = await import("./index");

/**
 * Simule un MessageStream Anthropic minimal : itérable async + finalMessage().
 * Yield des events `content_block_delta` (text_delta) avec un `await tick`
 * entre chaque pour simuler du streaming réel.
 */
function makeMockStream(textChunks: string[], finalMsg: unknown) {
  return {
    async *[Symbol.asyncIterator]() {
      yield {
        type: "message_start",
        message: { id: "msg1", usage: { input_tokens: 100, output_tokens: 0 } },
      };
      yield {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      };
      for (const chunk of textChunks) {
        yield {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: chunk },
        };
        // Petit délai pour démontrer que les chunks arrivent en live (pas batch).
        await new Promise((r) => setTimeout(r, 1));
      }
      yield { type: "content_block_stop", index: 0 };
      yield {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 50 },
      };
      yield { type: "message_stop" };
    },
    finalMessage: async () => finalMsg,
  };
}

/**
 * Helper : exécute runAgent avec un mock SSE et collecte tous les events
 * texte/JSON émis pendant la session.
 */
async function runAndCollectEvents(
  overrides: { connectionId?: string; prompt?: string } = {},
): Promise<StreamEvent[]> {
  const sse = createSSEStream<StreamEvent>();
  const events: StreamEvent[] = [];
  const reader = sse.stream.getReader();
  const decoder = new TextDecoder();

  const consume = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            events.push(JSON.parse(line.slice(6)) as StreamEvent);
          } catch {
            // ignore lignes non-JSON
          }
        }
      }
    }
  })();

  const ac = new AbortController();
  const run = runAgent(
    {
      prompt: overrides.prompt ?? "test",
      workspaceId: "ws-test",
      userId: "u-test",
      connectionId: overrides.connectionId,
      signal: ac.signal,
    },
    sse,
  ).finally(() => sse.close());

  await Promise.all([consume, run]);
  return events;
}

describe("runAgent — streaming natif (Phase 17.1 Cycle A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("T_A1 — émet plusieurs text_delta SSE au fil du stream (token-par-token)", async () => {
    // Simulation : LLM streame 3 chunks texte distincts puis termine sans tool_use.
    const chunks = [
      "Bonjour, ",
      "je vais analyser ",
      "ta question avec attention.",
    ];
    const finalMsg = {
      id: "msg1",
      role: "assistant",
      content: [{ type: "text", text: chunks.join("") }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    mockStream.mockReturnValue(makeMockStream(chunks, finalMsg));
    // Backup : si le code utilise encore .create() (avant migration), retourner
    // le finalMessage pour ne pas planter — le test échouera quand même sur le count.
    mockCreate.mockResolvedValue(finalMsg);

    const events = await runAndCollectEvents();

    const textDeltas = events.filter((e) => e.type === "text_delta");
    // Cycle A target : streaming token-par-token doit émettre ≥ 2 text_delta
    // distincts pendant un seul turn LLM (vs 1 unique avec messages.create()).
    expect(textDeltas.length).toBeGreaterThanOrEqual(2);
  });
});

describe("runAgent — prompt caching (Phase 17.1 Cycle B)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSchemaCache.mockResolvedValue(null);
  });

  it("T_B4 — runAgent track cache_creation/cache_read dans tokens AgentResult", async () => {
    const finalMsg = {
      id: "msg1",
      role: "assistant",
      content: [{ type: "text", text: "Test narrative cache breakdown." }],
      stop_reason: "end_turn",
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 7500,
      },
    };
    mockStream.mockReturnValue(makeMockStream(["Test"], finalMsg));
    mockCreate.mockResolvedValue(finalMsg);

    const events = await runAndCollectEvents();

    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent).toBeDefined();
    if (doneEvent?.type === "done" && doneEvent.result.tokens) {
      // Phase 17.1 Cycle B : AgentResult.tokens étendu avec breakdown cache
      expect(doneEvent.result.tokens.cacheCreation).toBe(2000);
      expect(doneEvent.result.tokens.cacheRead).toBe(7500);
    } else {
      throw new Error(
        "done event ou tokens missing — runAgent doit toujours retourner tokens",
      );
    }
  });

  it("T_B1 — cache_control ephemeral présent sur system + dernier tool", async () => {
    const finalMsg = {
      id: "msg1",
      role: "assistant",
      content: [{ type: "text", text: "Test narrative pour validation." }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    mockStream.mockReturnValue(makeMockStream(["Test"], finalMsg));
    mockCreate.mockResolvedValue(finalMsg);

    await runAndCollectEvents();

    expect(mockStream).toHaveBeenCalled();
    const params = mockStream.mock.calls[0]?.[0];
    expect(params).toBeDefined();

    // System prompt doit être passé en blocs structurés (pas en string brut)
    // pour permettre cache_control. Le DERNIER bloc text doit porter
    // cache_control: { type: "ephemeral" } (cache prefix Anthropic).
    expect(Array.isArray(params.system)).toBe(true);
    const systemBlocks = params.system as Array<{
      type: string;
      text: string;
      cache_control?: { type: string };
    }>;
    expect(systemBlocks.length).toBeGreaterThan(0);
    const lastSystemBlock = systemBlocks[systemBlocks.length - 1];
    expect(lastSystemBlock.type).toBe("text");
    expect(lastSystemBlock.cache_control).toEqual({ type: "ephemeral" });

    // Le DERNIER tool de la liste doit porter cache_control: ephemeral
    // (cache breakpoint pour le bloc tools entier — Anthropic SDK convention).
    const tools = params.tools as Array<{
      name: string;
      cache_control?: { type: string };
    }>;
    expect(tools.length).toBeGreaterThan(0);
    const lastTool = tools[tools.length - 1];
    expect(lastTool.cache_control).toEqual({ type: "ephemeral" });
  });
});

describe("runAgent — fast-path schema (Phase 17.1 Cycle C)", () => {
  const FULL_CACHE = {
    version: 1 as const,
    synced_at: "2026-05-03T00:00:00Z",
    status: "ok" as const,
    tables: [
      {
        name: "orders",
        row_count: 2300,
        columns: [
          { name: "id", type: "uuid", nullable: false },
          {
            name: "status",
            type: "text",
            nullable: false,
            distinct_count: 3,
            top_values: [
              { value: "paid", count: 1500 },
              { value: "shipped", count: 600 },
              { value: "cancelled", count: 200 },
            ],
          },
          { name: "amount", type: "numeric", nullable: false, min: 5, max: 5000 },
        ],
      },
      {
        name: "customers",
        row_count: 800,
        columns: [
          { name: "id", type: "uuid", nullable: false },
          { name: "email", type: "text", nullable: false },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupSimpleStream() {
    const finalMsg = {
      id: "msg1",
      role: "assistant",
      content: [{ type: "text", text: "Test narrative pour fast-path schema." }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    mockStream.mockReturnValue(makeMockStream(["Test"], finalMsg));
    mockCreate.mockResolvedValue(finalMsg);
  }

  it("T_C1 — schemaCache utilisable → list_tables + inspect_table absents de TOOLS", async () => {
    mockReadSchemaCache.mockResolvedValueOnce(FULL_CACHE);
    setupSimpleStream();

    await runAndCollectEvents({ connectionId: "conn-test" });

    const params = mockStream.mock.calls[0]?.[0];
    expect(params).toBeDefined();
    const toolNames = (params.tools as Array<{ name: string }>).map((t) => t.name);

    // Fast-path : list_tables et inspect_table sont retirés (l'IA a déjà le schema).
    expect(toolNames).not.toContain("list_tables");
    expect(toolNames).not.toContain("inspect_table");
    // execute_sql et propose_widget restent exposés (l'IA peut explorer + proposer).
    expect(toolNames).toContain("execute_sql");
    expect(toolNames).toContain("propose_widget");
  });

  it("T_C2 — schemaCache utilisable → user prompt préfixé avec schema markdown", async () => {
    mockReadSchemaCache.mockResolvedValueOnce(FULL_CACHE);
    setupSimpleStream();

    await runAndCollectEvents({ connectionId: "conn-test" });

    const params = mockStream.mock.calls[0]?.[0];
    const messages = params.messages as Array<{
      role: string;
      content: string | Array<unknown>;
    }>;
    const userMsg = typeof messages[0].content === "string" ? messages[0].content : "";

    // Le markdown du schema apparaît dans le prompt.
    expect(userMsg).toContain("Schema disponible");
    expect(userMsg).toContain("orders");
    expect(userMsg).toContain("paid"); // top_value présent → résout R23 sans inspect_table
    // Le prompt original "test" est conservé après le schema.
    expect(userMsg).toContain("test");
  });

  it("T_C3 — pas de schemaCache → comportement actuel préservé (5 tools, prompt non préfixé)", async () => {
    mockReadSchemaCache.mockResolvedValueOnce(null);
    setupSimpleStream();

    await runAndCollectEvents({ connectionId: "conn-test" });

    const params = mockStream.mock.calls[0]?.[0];
    const toolNames = (params.tools as Array<{ name: string }>).map((t) => t.name);

    // Sans cache, tous les tools sont exposés.
    expect(toolNames).toContain("list_tables");
    expect(toolNames).toContain("inspect_table");
    expect(toolNames).toContain("execute_sql");
    expect(toolNames).toContain("propose_widget");

    // Et le prompt utilisateur n'est pas préfixé.
    const messages = params.messages as Array<{ role: string; content: string }>;
    expect(messages[0].content).not.toContain("Schema disponible");
  });
});
