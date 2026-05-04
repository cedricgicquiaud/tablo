/**
 * Tests Airtable records-api — Phase 14.5 B.4.
 *
 * Couvre fetch GET /v0/{baseId}/{tableName} avec pagination offset, cap 1000
 * rows V1 (E14), retry 429 (RNF6).
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchTableRecords } from "./records-api";

describe("fetchTableRecords (R16, E14, RNF6)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("happy path — GET /v0/{baseId}/{tableName} avec Bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          records: [
            {
              id: "rec1",
              createdTime: "2024-01-15T10:00:00.000Z",
              fields: { Name: "X" },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock;

    const result = await fetchTableRecords({
      accessToken: "tok",
      baseId: "appA",
      tableName: "Customers",
    });

    const [calledUrl, calledOpts] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toContain(
      "https://api.airtable.com/v0/appA/Customers",
    );
    expect((calledOpts.headers as Record<string, string>)["authorization"]).toBe(
      "Bearer tok",
    );

    expect(result.records).toHaveLength(1);
    expect(result.truncated).toBe(false);
  });

  it("table name avec espaces → URL-encoded", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ records: [] }), { status: 200 }),
    );
    global.fetch = fetchMock;

    await fetchTableRecords({
      accessToken: "tok",
      baseId: "appA",
      tableName: "Customer Orders",
    });

    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("appA/Customer%20Orders");
  });

  it("R16 — pagination via offset jusqu'à epuisement", async () => {
    const records1 = [{ id: "r1", createdTime: "t", fields: {} }];
    const records2 = [{ id: "r2", createdTime: "t", fields: {} }];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ records: records1, offset: "off1" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ records: records2 }), { status: 200 }),
      );
    global.fetch = fetchMock;

    const result = await fetchTableRecords({
      accessToken: "tok",
      baseId: "appA",
      tableName: "T",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.records).toHaveLength(2);
    expect(result.truncated).toBe(false);

    // 2nd call passe offset
    const [, opts2] = fetchMock.mock.calls[1] as [string, RequestInit];
    const url2 = fetchMock.mock.calls[1][0] as string;
    expect(url2).toContain("offset=off1");
  });

  it("E14 — cap 1000 rows : si pagination dépasse → truncated=true et stop", async () => {
    // Simule 12 pages de 100 records (1200 records, cap 1000)
    const makePage = (n: number) => ({
      records: Array.from({ length: 100 }, (_, i) => ({
        id: `rec_${n}_${i}`,
        createdTime: "t",
        fields: {},
      })),
      offset: n < 11 ? `off_${n + 1}` : undefined,
    });

    let n = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      const page = makePage(n);
      n++;
      return new Response(JSON.stringify(page), { status: 200 });
    });
    global.fetch = fetchMock;

    const result = await fetchTableRecords({
      accessToken: "tok",
      baseId: "appA",
      tableName: "T",
      maxRecords: 1000,
    });

    expect(result.records).toHaveLength(1000);
    expect(result.truncated).toBe(true);
    // 10 pages de 100 = 1000 → stop, pas d'appel pour la page 11
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it("RNF6 — retry 429 puis succès", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 429 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ records: [] }), { status: 200 }),
      );
    global.fetch = fetchMock;

    await fetchTableRecords({
      accessToken: "tok",
      baseId: "appA",
      tableName: "T",
      retryDelaysMs: [0, 0, 0],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("E13 — table inexistante (404) → throw", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "NOT_FOUND" }), { status: 404 }),
    );

    await expect(
      fetchTableRecords({
        accessToken: "tok",
        baseId: "appA",
        tableName: "NoSuchTable",
        retryDelaysMs: [0, 0, 0],
      }),
    ).rejects.toThrow();
  });
});
