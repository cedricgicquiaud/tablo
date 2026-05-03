/**
 * Route Handler /api/ai/generate — Phase 17 cycle A T1.4.
 *
 * Streaming SSE des tokens LLM Anthropic vers le client (R7, R70-R74).
 *
 * Auth IDOR strict (R1, B1, mémoire `feedback_server_actions_ownership`) :
 *  1. SSR client lecture session → 401 si pas user
 *  2. Si `connectionId` fourni : SELECT scoped RLS via le client SSR.
 *     Si la connexion n'appartient pas au workspace du user → 403
 *  3. Seulement après : on peut utiliser l'admin client pour charger
 *     le DataSource et le schema_cache (cycle B+)
 *  4. Ouverture du stream `runAgent()` avec `request.signal` propagé
 *
 * Le stream émet des chunks SSE conformes au format défini dans
 * `src/lib/ai-engine/utils/stream.ts`.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSSEStream } from "@/lib/ai-engine/utils/stream";
import type { StreamEvent } from "@/lib/ai-engine/types/agent";
import { runAgent } from "@/lib/ai-engine";
import { getMyWorkspace } from "@/lib/queries/tablo";

type RequestBody = {
  prompt?: string;
  connectionId?: string;
};

export async function POST(request: Request): Promise<Response> {
  // 1. Parse body
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!body.prompt || typeof body.prompt !== "string" || body.prompt.trim().length < 3) {
    return new Response("prompt manquant ou trop court", { status: 400 });
  }

  // 2. Auth check via SSR client (cookies SSR)
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 3. Récupérer le workspace réel du user (FK ai_engine_audit + audit log)
  const workspace = await getMyWorkspace(supabase);
  if (!workspace) {
    return new Response("Workspace introuvable", { status: 403 });
  }

  // 4. IDOR guard sur connectionId (B1, R1) — ORDRE STRICT :
  //    On utilise le SSR client (RLS-scoped) AVANT toute admin client.
  //    Si la connexion n'appartient pas au workspace du user, RLS retourne
  //    null/undefined → 403.
  if (body.connectionId) {
    const { data: ownedConn } = await supabase
      .from("connections")
      .select("id")
      .eq("id", body.connectionId)
      .single();

    if (!ownedConn) {
      return new Response("Connection introuvable ou non autorisée", { status: 403 });
    }
  }

  // 4. Ouvre le stream runAgent
  const sse = createSSEStream<StreamEvent>();

  (async () => {
    try {
      await runAgent(
        {
          prompt: body.prompt!,
          workspaceId: workspace.id, // workspaces.id réel (FK ai_engine_audit)
          userId: user.id,
          connectionId: body.connectionId,
          signal: request.signal,
        },
        sse,
      );
    } catch (err) {
      sse.send({
        type: "error",
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      sse.close();
    }
  })();

  return new Response(sse.stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
