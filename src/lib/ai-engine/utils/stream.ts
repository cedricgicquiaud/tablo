/**
 * Helper Server-Sent Events pour Phase 17 cycle A.
 *
 * Produit un ReadableStream<Uint8Array> consommable par fetch().body.getReader()
 * côté client. Format SSE conforme : event: <type>\ndata: <json>\n\n.
 *
 * Le champ `type` du payload détermine l'event SSE (defaut "message").
 * Permet au client de filtrer par event sans parser le JSON.
 */

const encoder = new TextEncoder();

export type SSEStream<T> = {
  /** ReadableStream à passer à `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' }})`. */
  stream: ReadableStream<Uint8Array>;
  /** Envoie un chunk au client. No-op si le stream est déjà fermé. */
  send: (payload: T) => void;
  /** Termine le stream. send() après close() est ignoré silencieusement. */
  close: () => void;
};

export function createSSEStream<T extends Record<string, unknown>>(): SSEStream<T> {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      // Le client a annulé (abort signal, navigate away, refresh).
      // On marque closed pour empêcher les futurs send/close de throw.
      closed = true;
      controller = null;
    },
  });

  return {
    stream,
    send(payload: T) {
      if (closed || !controller) return;
      try {
        const eventType = typeof payload.type === "string" ? payload.type : "message";
        const json = JSON.stringify(payload);
        const chunk = `event: ${eventType}\ndata: ${json}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      } catch {
        // ERR_INVALID_STATE : stream cancelled extérieurement (client abort).
        // On marque fermé pour bloquer les futurs send et libérer la ref.
        closed = true;
        controller = null;
      }
    },
    close() {
      if (closed || !controller) return;
      closed = true;
      try {
        controller.close();
      } catch {
        // Stream peut avoir été cancelled extérieurement entre le check
        // et le close (race condition rare). Ignore : le stream est fermé.
      }
      controller = null;
    },
  };
}
