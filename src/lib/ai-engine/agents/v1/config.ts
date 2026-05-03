/**
 * Configuration agent v1 — Phase 17 cycle A.
 *
 * Centralise les constantes du moteur AI : modèle Anthropic, max tokens,
 * MAX_ITERATIONS, retry caps, budget cap, et les prix de référence pour
 * le calcul du coût par session.
 *
 * Constants prix (I7) : à valider à chaque release Anthropic.
 * Source : https://www.anthropic.com/api#pricing (consulté 2026-05-02)
 */

import type Anthropic from "@anthropic-ai/sdk";

/** Modèle utilisé. Constante alignée avec `src/lib/ai/anthropic.ts` legacy. */
export const AI_MODEL: Anthropic.Messages.MessageCreateParams["model"] =
  "claude-haiku-4-5-20251001";

/** Tokens max par appel LLM (par turn). Préservé du legacy. */
export const MAX_TOKENS_PER_TURN = 2500;

/**
 * Iterations max dans une session runAgent (R5).
 *
 * Augmenté de 6 (legacy) à 10 pour laisser de la marge à `execute_sql`
 * exploratoire en cycle C. Si médiane d'iterations >> 7 en prod, ajuster
 * en LEARN P17 (voir RETRO C2).
 */
export const MAX_ITERATIONS = 10;

/**
 * Cap retries par tool dans une session (R8bis).
 *
 * Si l'IA appelle 4 fois le même tool dans une session, retour erreur
 * `tool X failed N times`. Empêche les boucles infinies sur erreurs
 * répétées.
 */
export const MAX_RETRIES_PER_TOOL = 3;

/**
 * Budget cap dollars par session runAgent (R5bis).
 *
 * Si la consommation cumulée (input × INPUT_PRICE + output × OUTPUT_PRICE)
 * dépasse ce seuil, on abort avec `{ ok: false, error: 'budget exceeded' }`.
 */
export const BUDGET_CAP_USD = 0.05;

/**
 * Prix Anthropic par million de tokens (I7).
 *
 * **À valider à chaque release Anthropic** : https://www.anthropic.com/api#pricing
 *
 * Actuel `claude-haiku-4-5-20251001` (consulté 2026-05-03) :
 * - Input non-caché : $1 / 1M
 * - Cache write (creation) : $1.25 / 1M (1.25× input)
 * - Cache read : $0.10 / 1M (0.10× input)
 * - Output : $5 / 1M
 */
export const INPUT_PRICE_PER_MILLION = 1;
export const CACHE_WRITE_PRICE_PER_MILLION = 1.25;
export const CACHE_READ_PRICE_PER_MILLION = 0.1;
export const OUTPUT_PRICE_PER_MILLION = 5;

/**
 * Calcule le coût d'une session en dollars.
 *
 * P17.1 Cycle B : breakdown cache. `cacheCreationTokens` (cache miss) facturés
 * à 1.25× input price, `cacheReadTokens` (cache hit) facturés à 0.10× input
 * price. Compatible avec l'appel legacy 2-args (cache tokens à 0).
 */
export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number = 0,
  cacheReadTokens: number = 0,
): number {
  return (
    (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION +
    (cacheCreationTokens / 1_000_000) * CACHE_WRITE_PRICE_PER_MILLION +
    (cacheReadTokens / 1_000_000) * CACHE_READ_PRICE_PER_MILLION +
    (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION
  );
}

/**
 * Longueur minimale de la narrative texte retournée (R8, B1).
 *
 * Si `lastText.length < NARRATIVE_MIN_CHARS` à la fin de la session,
 * retour `{ ok: false, error: 'narrative manquante' }`.
 */
export const NARRATIVE_MIN_CHARS = 20;
