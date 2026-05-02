/**
 * Mapping erreurs Anthropic SDK → messages structurés FR.
 *
 * Phase 17 cycle A T1.6 (R6, I1). Préserve la logique du legacy
 * `src/lib/ai/generate-widget.ts:217-238`.
 *
 * Cas couverts :
 * - Rate limit → message FR avec conseil retry
 * - Auth invalide → message FR avec mention de l'env var
 * - Credit balance insuffisant → message FR avec lien billing
 * - Erreur inconnue → fallback générique préservant le message original
 * - Non-Error thrown (string, undefined, etc.) → fallback safe
 */

export function mapAnthropicError(err: unknown): string {
  const message = err instanceof Error ? err.message : "Erreur Anthropic inconnue";

  // Credit balance insuffisant — match avant rate_limit (mots-clés "credit" + "invalid_request")
  if (/credit balance|invalid_request_error.*credit/i.test(message)) {
    return "Crédits Anthropic insuffisants. Recharge ton compte sur https://console.anthropic.com/settings/billing";
  }

  // Auth invalide
  if (/authentication|invalid.*key|invalid api key/i.test(message)) {
    return "Clé Anthropic invalide. Vérifie ANTHROPIC_API_KEY dans .env.local.";
  }

  // Rate limit
  if (/rate.?limit/i.test(message)) {
    return "Rate limit Anthropic atteint. Réessaie dans quelques secondes.";
  }

  // Fallback générique
  return `Erreur Anthropic : ${message}`;
}
