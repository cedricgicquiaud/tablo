/**
 * Types pour les tools du moteur AI Phase 17.
 *
 * Inspiré du pattern Nao (`apps/backend/src/types/tools.ts`) mais adapté à
 * notre stack : Anthropic SDK direct (pas Vercel `ai` SDK), pas de Drizzle,
 * RetryCounter par session.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { DataSource } from "@/lib/connectors/types";

/**
 * Contexte passé à chaque exécution de tool.
 *
 * `retryCounters` : map mutable du nom du tool vers le nombre d'appels dans
 * la session. Géré par l'agent loop (incrémenté à chaque tool_use).
 * Cap : 3 appels par tool (R8bis).
 */
export type ToolContext = {
  workspaceId: string;
  userId: string;
  connectionId?: string;
  dataSource: DataSource;
  retryCounters: Map<string, number>;
};

/**
 * Résultat d'un tool. Aligné format Anthropic ToolResult.
 */
export type ToolResult = {
  /** Stringified content envoyé au LLM. */
  content: string;
  /** True si le tool a échoué (l'IA peut retry, jusqu'à cap R8bis). */
  is_error: boolean;
};

/**
 * Définition d'un tool registrable dans l'agent loop.
 *
 * `name` : exposé au LLM (snake_case par convention Anthropic).
 * `description` : guide le LLM dans le choix du tool (concis, actionable).
 * `inputSchema` : Anthropic Tool format (JSON Schema).
 * `execute` : fonction async qui reçoit l'input parsé et le contexte.
 */
export type ToolDef<TInput = unknown> = {
  name: string;
  description: string;
  inputSchema: Anthropic.Messages.Tool["input_schema"];
  execute: (input: TInput, context: ToolContext) => Promise<ToolResult>;
};
