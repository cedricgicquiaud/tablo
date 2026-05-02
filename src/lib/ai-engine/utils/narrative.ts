/**
 * Validation de la narrative texte produite par l'agent (R8, B1).
 *
 * Phase 17 cycle A T1.6. La narrative est le texte explicatif que l'agent
 * écrit en accompagnement du widget — elle doit faire au moins 20 caractères
 * pour garantir une UX acceptable (sinon l'utilisateur voit "[widget]" sans
 * contexte = mauvaise perception qualité).
 */

import { NARRATIVE_MIN_CHARS } from "../agents/v1/config";

export type NarrativeCheck =
  | { ok: true }
  | { ok: false; error: string };

export function validateNarrative(text: string): NarrativeCheck {
  const trimmed = text.trim();
  if (trimmed.length < NARRATIVE_MIN_CHARS) {
    return {
      ok: false,
      error: `narrative manquante (≥ ${NARRATIVE_MIN_CHARS} caractères requis, reçu : ${trimmed.length})`,
    };
  }
  return { ok: true };
}
