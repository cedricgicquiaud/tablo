/**
 * Tool suggest_follow_ups — Phase 17 cycle C T3.5.
 *
 * @see Adapté de getnao/nao apps/backend/src/agents/tools/suggest-follow-ups.ts
 *      (commit 192b377, Apache License 2.0). Voir NOTICE.md à la racine.
 *
 * Tool quasi-vide qui signale au LLM de générer 1-3 questions de drill-down
 * avant de terminer (R60). Le LLM passe les suggestions en input, le tool
 * les normalise (clamp 0..3, trim, filter empty) et les renvoie au runAgent
 * qui les expose dans AgentResult.followUps.
 *
 * Feature flag : process.env.AI_ENGINE_FOLLOW_UPS_ENABLED (default 'true').
 * Si 'false' → tool retiré de la liste exposée au LLM (R61, R62).
 */

import type { ToolResult } from "../types/tool";

export type SuggestFollowUpsInput = {
  suggestions: string[];
};

const MAX_SUGGESTIONS = 3;

export function executeSuggestFollowUps(input: SuggestFollowUpsInput): ToolResult {
  const cleaned = (input.suggestions ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0)
    .slice(0, MAX_SUGGESTIONS);

  if (cleaned.length === 0) {
    return {
      content: "Aucune suggestion valide fournie.",
      is_error: true,
    };
  }

  return {
    content: JSON.stringify({ suggestions: cleaned, success: true }),
    is_error: false,
  };
}

export function isSuggestFollowUpsEnabled(): boolean {
  return process.env.AI_ENGINE_FOLLOW_UPS_ENABLED !== "false";
}
