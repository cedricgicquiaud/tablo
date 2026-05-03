/**
 * Types pour l'agent loop Phase 17.
 *
 * `AgentResult` : résultat final retourné via l'event SSE `done`.
 * `StreamEvent` : type union de tous les events SSE émis pendant le run.
 *
 * Format SSE aligné `Anthropic.MessageStreamEvent` quand pertinent (R71, I8) :
 * on relaie les chunks natifs Anthropic + on ajoute nos events custom
 * (`tool_use_notif`, `done`).
 */

import type { WidgetConfig } from "./widget-schema";
import type { WidgetData } from "@/lib/ai/extract-preview";

/**
 * Tokens consommés par une session runAgent.
 *
 * P17.1 Cycle B : breakdown cache. `cacheCreation` (cache miss, 1.25× input
 * price) et `cacheRead` (cache hit, 0.10× input price) optionnels. Si non
 * fournis, tarif input non-caché ($1/M) appliqué par `estimateCostUsd`.
 */
export type AgentTokens = {
  input: number;
  output: number;
  cacheCreation?: number;
  cacheRead?: number;
};

/**
 * Résultat final de `runAgent()`. Émis dans l'event SSE `done`.
 *
 * `tokens` permet de calculer le coût a posteriori (cycle B+ logging).
 */
export type AgentResult =
  | {
      ok: true;
      config: WidgetConfig;
      data: WidgetData;
      explanation: string;
      tokens: AgentTokens;
      followUps?: string[];
    }
  | {
      ok: false;
      error: string;
      tokens?: AgentTokens;
    };

/**
 * Event SSE émis pendant le run de l'agent.
 *
 * - `text_delta` : token texte du LLM (relay direct content_block_delta Anthropic)
 * - `tool_use_notif` : notification d'appel de tool (UX visible, pas le JSON brut)
 * - `done` : fin du run avec AgentResult complet
 * - `error` : erreur fatale qui termine le stream prématurément
 */
export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_notif"; name: string; input_summary: string }
  | { type: "done"; result: AgentResult }
  | { type: "error"; error: string };

/**
 * Input minimal de runAgent. La résolution de DataSource + auth
 * est faite côté Route Handler avant d'invoquer runAgent.
 */
export type RunAgentInput = {
  prompt: string;
  workspaceId: string;
  userId: string;
  connectionId?: string;
  signal: AbortSignal;
};
