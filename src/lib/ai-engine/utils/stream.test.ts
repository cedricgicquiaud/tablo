/**
 * Tests pour createSSEStream — Phase 17 cycle A T1.2 (TA1).
 *
 * Le helper produit un ReadableStream conforme au format Server-Sent Events
 * que le client peut consommer via fetch().body.getReader() (Next.js 16 streaming).
 */

import { describe, it, expect } from "vitest";
import { createSSEStream } from "./stream";

describe("createSSEStream", () => {
  it("envoie 3 chunks formatés SSE et le reader les reçoit dans l'ordre", async () => {
    const { stream, send, close } = createSSEStream<{ type: string; text?: string }>();

    // Send 3 events de types différents
    send({ type: "message_start" });
    send({ type: "content_block_delta", text: "Hello" });
    send({ type: "done" });
    close();

    // Lire le stream complet
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let received = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += decoder.decode(value);
    }

    // Format SSE : "event: <type>\ndata: <json>\n\n" pour chaque event
    expect(received).toContain('event: message_start\ndata: {"type":"message_start"}\n\n');
    expect(received).toContain(
      'event: content_block_delta\ndata: {"type":"content_block_delta","text":"Hello"}\n\n',
    );
    expect(received).toContain('event: done\ndata: {"type":"done"}\n\n');

    // Ordre conservé
    const startIdx = received.indexOf("message_start");
    const deltaIdx = received.indexOf("content_block_delta");
    const doneIdx = received.indexOf("event: done");
    expect(startIdx).toBeLessThan(deltaIdx);
    expect(deltaIdx).toBeLessThan(doneIdx);
  });

  it("close() termine le stream sans envoyer de chunk supplémentaire", async () => {
    const { stream, send, close } = createSSEStream<{ type: string }>();
    send({ type: "ping" });
    close();
    // send après close = no-op silencieux (pas de throw)
    send({ type: "after_close" });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let received = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += decoder.decode(value);
    }

    expect(received).toContain("ping");
    expect(received).not.toContain("after_close");
  });

  it("type sans event détectable utilise event: 'message' par défaut", async () => {
    const { stream, send, close } = createSSEStream<{ text: string }>();
    send({ text: "hello" }); // pas de champ "type"
    close();

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let received = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += decoder.decode(value);
    }

    expect(received).toContain('event: message\ndata: {"text":"hello"}\n\n');
  });
});
