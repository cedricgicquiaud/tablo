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
 * Actuel `claude-haiku-4-5-20251001` (consulté 2026-05-02) :
 * - Input : $1 / 1M tokens
 * - Output : $5 / 1M tokens
 */
export const INPUT_PRICE_PER_MILLION = 1;
export const OUTPUT_PRICE_PER_MILLION = 5;

/**
 * Calcule le coût d'une session en dollars.
 */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION +
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
