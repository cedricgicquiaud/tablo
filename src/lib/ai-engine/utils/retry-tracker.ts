/**
 * Retry tracker par tool dans une session runAgent (R8bis).
 *
 * Phase 17 cycle A T1.6 — révisé cycle C : ne compte QUE les échecs
 * consécutifs (pas les succès). Le cap protège contre les boucles
 * infinies sur erreur, pas contre l'exploration légitime (execute_sql
 * peut être appelé 5-6 fois pour valider des hypothèses).
 *
 * API :
 * - `recordToolCall(counters, toolName, isError)` : à appeler APRÈS
 *   chaque exécution. Si succès → reset le compteur. Si échec →
 *   incrémente. Si > cap → retour { ok: false }.
 * - `peekRetryCount(counters, toolName)` : lecture sans modification.
 *
 * Mute le Map en place (mutable counters Map<string, number>).
 */

import { MAX_RETRIES_PER_TOOL } from "../agents/v1/config";

export type RetryCheck =
  | { ok: true; count: number }
  | { ok: false; count: number; error: string };

/**
 * Met à jour le compteur après l'exécution d'un tool.
 *
 * - Si `isError === false` → reset à 0 (le tool a marché, exploration OK)
 * - Si `isError === true` → incrémente. Si > cap → return { ok: false }
 */
export function recordToolCall(
  counters: Map<string, number>,
  toolName: string,
  isError: boolean,
): RetryCheck {
  if (!isError) {
    counters.set(toolName, 0);
    return { ok: true, count: 0 };
  }

  const previous = counters.get(toolName) ?? 0;
  const next = previous + 1;

  if (next > MAX_RETRIES_PER_TOOL) {
    return {
      ok: false,
      count: previous,
      error: `tool ${toolName} failed ${MAX_RETRIES_PER_TOOL} times consecutively — abandon`,
    };
  }

  counters.set(toolName, next);
  return { ok: true, count: next };
}

/**
 * @deprecated Conservé pour compat tests TA5. Préférer `recordToolCall(counters, name, isError)`.
 * Comportement legacy : compte tous les appels (succès + échecs).
 */
export function incrementRetry(
  counters: Map<string, number>,
  toolName: string,
): RetryCheck {
  const previous = counters.get(toolName) ?? 0;
  const next = previous + 1;

  if (next > MAX_RETRIES_PER_TOOL) {
    return {
      ok: false,
      count: previous,
      error: `tool ${toolName} failed ${MAX_RETRIES_PER_TOOL} times — abandon`,
    };
  }

  counters.set(toolName, next);
  return { ok: true, count: next };
}
