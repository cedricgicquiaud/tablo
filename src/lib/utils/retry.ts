/**
 * Helper retry exponentiel partagé — Phase 14.3 P0.
 *
 * Promu en helper après 3 occurrences (règle FORGE) :
 * - P14.1.1 : Supabase Management API rate limit (~60 req/min)
 * - P14.2 : Stripe SDK seed (rate limit ~100 req/sec)
 * - P14.3 : Stripe DataSource adapter (même rate limit Stripe)
 *
 * `isRetryable` est injectable pour gérer les conventions différentes
 * (Stripe SDK throw avec `err.statusCode = 429` ; Supabase Management API
 * embed le 429 dans `err.message`).
 */

export type RetryOpts = {
  /**
   * Délais en ms entre les retries. Default `[1000, 2000, 4000]` (3 retries
   * avec backoff exponentiel). Les tests passent `[0, 0, 0]` pour ne pas
   * ralentir la suite vitest.
   */
  retryDelaysMs?: number[];

  /**
   * Détermine si une erreur déclenche un retry. Default : `true` si
   * `err.statusCode === 429` OU `err.message` contient "429".
   */
  isRetryable?: (err: unknown) => boolean;

  /**
   * Label optionnel pour le warning console à chaque retry. Si absent,
   * pas de log.
   */
  label?: string;
};

const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000];

const DEFAULT_IS_RETRYABLE = (err: unknown): boolean => {
  if (typeof err === "object" && err !== null) {
    if ("statusCode" in err && (err as { statusCode?: number }).statusCode === 429) {
      return true;
    }
    // Pattern resserré : `\b429\b` au lieu de `/429/` pour éviter de retry
    // sur un message métier qui contient le nombre 429 (audit verifier 14.3).
    if (err instanceof Error && /\b429\b/.test(err.message)) {
      return true;
    }
  }
  return false;
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const delays = opts.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const isRetryable = opts.isRetryable ?? DEFAULT_IS_RETRYABLE;

  let lastErr: unknown = null;
  // 1 essai initial + delays.length retries (au plus).
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err;
      if (attempt >= delays.length) break;
      if (opts.label) {
        console.warn(
          `[${opts.label}] retryable error, retry dans ${delays[attempt]}ms (${attempt + 1}/${delays.length})`,
        );
      }
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}
