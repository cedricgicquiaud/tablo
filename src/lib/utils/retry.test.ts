/**
 * Tests `withRetry` — Phase 14.3 P0.
 *
 * Helper retry exponentiel partagé entre les call-sites Supabase Management
 * API (P14.1.1) et Stripe SDK (P14.2 + P14.3). Promu en helper après 3
 * occurrences (règle FORGE).
 */

import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  it("retourne la valeur si fn réussit au 1er essai (pas de retry)", async () => {
    const fn = vi.fn().mockResolvedValue("ok");

    const result = await withRetry(fn);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retry sur erreur retryable puis retourne la valeur au 2ème essai", async () => {
    const retryableErr = Object.assign(new Error("429 rate limit"), {
      statusCode: 429,
    });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(retryableErr)
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, { retryDelaysMs: [0] });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throw immédiatement sur erreur non-retryable (pas de retry)", async () => {
    const nonRetryableErr = Object.assign(new Error("401 unauthorized"), {
      statusCode: 401,
    });
    const fn = vi.fn().mockRejectedValue(nonRetryableErr);

    await expect(withRetry(fn, { retryDelaysMs: [0, 0, 0] })).rejects.toThrow(
      "401 unauthorized",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throw avec la dernière erreur après épuisement des delays", async () => {
    const retryableErr = Object.assign(new Error("429 rate limit"), {
      statusCode: 429,
    });
    const fn = vi.fn().mockRejectedValue(retryableErr);

    await expect(withRetry(fn, { retryDelaysMs: [0, 0, 0] })).rejects.toThrow(
      "429 rate limit",
    );
    // 1 essai initial + 3 retries = 4 appels total
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("retryDelaysMs: [0,0,0] ne sleep pas (test rapide)", async () => {
    const retryableErr = Object.assign(new Error("429 rate limit"), {
      statusCode: 429,
    });
    const fn = vi.fn().mockRejectedValue(retryableErr);

    const start = Date.now();
    await expect(withRetry(fn, { retryDelaysMs: [0, 0, 0] })).rejects.toThrow();
    const elapsed = Date.now() - start;

    // 4 appels avec delays:[0,0,0] doivent prendre <100ms en wall-clock
    expect(elapsed).toBeLessThan(100);
  });

  it("isRetryable custom : pattern Supabase Management API (message contient '429')", async () => {
    const supabaseErr = new Error("Supabase Management API 429: Too Many Requests");
    const fn = vi
      .fn()
      .mockRejectedValueOnce(supabaseErr)
      .mockResolvedValueOnce({ rows: [] });

    const result = await withRetry(fn, {
      retryDelaysMs: [0],
      isRetryable: (err) => err instanceof Error && /429/.test(err.message),
    });

    expect(result).toEqual({ rows: [] });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
