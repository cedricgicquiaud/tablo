/**
 * Client-side helper pour consommer le stream SSE de /api/ai/generate.
 *
 * Phase 17 cycle A T1.8. Bridge entre le ReadableStream natif et
 * des callbacks ergonomiques pour les composants React.
 *
 * Parser SSE simple : split sur "\n\n" → blocks "event: X\ndata: Y" → JSON parse.
 *
 * Compatible Web Streams API (Next.js 16, navigateurs modernes).
 */

import type { AgentResult, StreamEvent } from "./types/agent";

export type GenerateCallbacks = {
  onTextDelta?: (text: string) => void;
  onToolUseNotif?: (name: string, summary: string) => void;
  onDone?: (result: AgentResult) => void;
  onError?: (error: string) => void;
};

/**
 * Lance une génération de widget en streaming.
 *
 * @returns Promise qui résout au `done` event ou rejette si erreur fatale.
 *   `signal` peut être passé via AbortController côté caller pour interrompre
 *   le stream (R74).
 */
export async function generateWidgetStreaming(
  prompt: string,
  options: {
    connectionId?: string;
    signal?: AbortSignal;
    callbacks?: GenerateCallbacks;
  } = {},
): Promise<AgentResult> {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, connectionId: options.connectionId }),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Erreur réseau");
    const errorMsg =
      response.status === 401
        ? "Non authentifié — recharge la page"
        : response.status === 403
          ? "Accès refusé à cette connexion"
          : response.status === 400
            ? errorText || "Requête invalide"
            : `Erreur ${response.status}: ${errorText}`;
    options.callbacks?.onError?.(errorMsg);
    return { ok: false, error: errorMsg };
  }

  if (!response.body) {
    const errorMsg = "Pas de body dans la réponse stream";
    options.callbacks?.onError?.(errorMsg);
    return { ok: false, error: errorMsg };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: AgentResult | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse les blocks complets séparés par \n\n
      let blockEnd = buffer.indexOf("\n\n");
      while (blockEnd !== -1) {
        const block = buffer.slice(0, blockEnd);
        buffer = buffer.slice(blockEnd + 2);

        const event = parseSSEBlock(block);
        if (event) {
          dispatchEvent(event, options.callbacks ?? {});
          if (event.type === "done") finalResult = event.result;
        }

        blockEnd = buffer.indexOf("\n\n");
      }
    }
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      const msg = "Génération annulée";
      options.callbacks?.onError?.(msg);
      return { ok: false, error: msg };
    }
    throw err;
  }

  if (!finalResult) {
    const msg = "Stream terminé sans résultat final";
    options.callbacks?.onError?.(msg);
    return { ok: false, error: msg };
  }

  return finalResult;
}

/**
 * Parse un block SSE "event: X\ndata: <json>" en StreamEvent typé.
 * Retourne null si le block est mal formé.
 */
function parseSSEBlock(block: string): StreamEvent | null {
  const lines = block.split("\n");
  let dataLine: string | null = null;

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      dataLine = line.slice(6);
    }
  }

  if (!dataLine) return null;

  try {
    return JSON.parse(dataLine) as StreamEvent;
  } catch {
    return null;
  }
}

function dispatchEvent(event: StreamEvent, callbacks: GenerateCallbacks): void {
  switch (event.type) {
    case "text_delta":
      callbacks.onTextDelta?.(event.text);
      break;
    case "tool_use_notif":
      callbacks.onToolUseNotif?.(event.name, event.input_summary);
      break;
    case "done":
      callbacks.onDone?.(event.result);
      break;
    case "error":
      callbacks.onError?.(event.error);
      break;
  }
}
