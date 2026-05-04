"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { after } from "next/server";
import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runProfileConnectionAfterOAuth } from "@/lib/connectors/profile-after-oauth";
import type { Json } from "@/lib/supabase/database.types";
import {
  createConnectionFromAirtableBaseWithDeps,
  type AirtableSessionPayload,
} from "./create-connection-from-airtable-base";

const SESSION_COOKIE = "tablo_airtable_oauth_session";

export async function createConnectionFromAirtableBase(formData: FormData) {
  const baseId = formData.get("base_id");
  if (typeof baseId !== "string" || !baseId) {
    throw new Error("base_id manquant");
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    redirect("/oauth/airtable/start");
  }

  let session: AirtableSessionPayload;
  try {
    session = JSON.parse(decrypt(sessionCookie)) as AirtableSessionPayload;
  } catch {
    redirect("/oauth/airtable/start");
  }

  const admin = createSupabaseAdminClient();

  const result = await createConnectionFromAirtableBaseWithDeps(
    { baseId, session },
    {
      findExistingConnection: async ({ workspaceId, baseId }) => {
        const { data } = await admin
          .from("connections")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("kind", "airtable")
          .eq("config_jsonb->>base_id", baseId)
          .maybeSingle();
        return data ? (data as { id: string }).id : null;
      },
      insertConnection: async ({ workspaceId, name, kind, config }) => {
        const { data, error } = await admin
          .from("connections")
          .insert({
            workspace_id: workspaceId,
            name,
            kind,
            config_jsonb: config as unknown as Json,
          })
          .select("id")
          .single();
        if (error || !data) {
          throw new Error(`Insert connection: ${error?.message ?? "unknown"}`);
        }
        return { id: (data as { id: string }).id, isReconnect: false };
      },
      updateConnection: async (connectionId, config) => {
        const { error } = await admin
          .from("connections")
          .update({
            config_jsonb: config as unknown as Json,
          })
          .eq("id", connectionId);
        if (error) {
          throw new Error(`Update connection: ${error.message}`);
        }
      },
      encryptToken: encrypt,
      triggerAfterProfileConnection: ({ connectionId, encryptedAccessToken }) => {
        // R21 — fire-and-forget profileConnection (réutilise helper P0.4
        // cross-providers profile-after-oauth.ts).
        after(async () => {
          // Cycle B pas encore livré → AirtableDataSource throw "not implemented".
          // Le profileConnection catch silently via runProfileConnectionAfterOAuth
          // (logWarn fire-and-forget). Quand B.3-B.4 seront livrés, le profiling
          // marchera automatiquement sans changer A.5.
          const { AirtableDataSource } = await import(
            "@/lib/connectors/airtable/data-source"
          );
          const { profileConnection } = await import(
            "@/lib/ai-engine/schema-cache/populate"
          );

          await runProfileConnectionAfterOAuth(
            { connectionId, encryptedAccessToken },
            {
              decryptToken: decrypt,
              buildDataSource: (token) =>
                new AirtableDataSource({
                  connectionId,
                  getAccessToken: () => Promise.resolve(token),
                }),
              profileConnection,
              saveSchemaCache: async (id, cache) => {
                await admin
                  .from("connections")
                  .update({
                    schema_cache_jsonb: cache,
                    schema_synced_at: cache.synced_at,
                  })
                  .eq("id", id);
              },
            },
          );
        });
      },
    },
  );

  // Cleanup cookie session
  cookieStore.delete(SESSION_COOKIE);

  const redirectKey = result.isReconnect ? "reconnected" : "connected";
  redirect(`/app?${redirectKey}=airtable`);
}
