/**
 * POC streaming Next.js 16 — Phase 17 cycle A T1.1.
 *
 * Endpoint test minimal pour valider :
 * - Streaming SSE via ReadableStream + new Response()
 * - Auth cookies SSR via createSupabaseServerClient()
 * - Abort signal côté client (reader.cancel)
 *
 * @deprecated POC uniquement, à supprimer en T1.8 cleanup.
 *   La vraie route est `/api/ai/generate/route.ts` (T1.4).
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSSEStream } from "@/lib/ai-engine/utils/stream";

export async function POST(_request: Request): Promise<Response> {
  // Auth check : 401 si pas de session valide (R1 IDOR cycle A POC)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Stream 3 messages de démonstration
  const { stream, send, close } = createSSEStream<{
    type: string;
    text?: string;
  }>();

  // Async loop : envoie les chunks puis ferme
  (async () => {
    send({ type: "message_start" });
    send({ type: "content_block_delta", text: "Bonjour" });
    send({ type: "done" });
    close();
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
