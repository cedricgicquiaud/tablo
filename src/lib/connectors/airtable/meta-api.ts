/**
 * Helpers Airtable Meta API — Phase 14.5 A.4.
 *
 * - `fetchBases(accessToken)` : list les bases accessibles à l'access_token
 *   (scope `schema.bases:read` requis).
 *
 * Usage :
 *  - Callback OAuth : fetch les bases pour afficher la page select-base.
 *  - DataSource : (futur) fetch schema des tables d'une base.
 *
 * Retry 429 via `withRetry` (P0 helper FORGE).
 * 401 → throw clair (préparation E9 connection révoquée).
 *
 * Cf docs : https://airtable.com/developers/web/api/list-bases
 */

import { withRetry, type RetryOpts } from "@/lib/utils/retry";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

export type AirtableBase = {
  id: string;
  name: string;
  permissionLevel: string;
};

export class AirtableMetaApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AirtableMetaApiError";
  }
}

export async function fetchBases(
  accessToken: string,
  opts: Pick<RetryOpts, "retryDelaysMs"> = {},
): Promise<AirtableBase[]> {
  const url = `${AIRTABLE_API_BASE}/meta/bases`;

  const body = await withRetry(
    async () => {
      const res = await fetch(url, {
        method: "GET",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 429) {
        // Trigger retry via withRetry default isRetryable
        throw new AirtableMetaApiError(429, "Airtable API rate limited (429)");
      }

      if (!res.ok) {
        // Pas de retry pour les autres erreurs (401, 403, 5xx) — surface direct
        const text = await safeText(res);
        throw new AirtableMetaApiError(
          res.status,
          `Airtable Meta API error ${res.status}: ${text}`,
        );
      }

      return (await res.json()) as { bases?: AirtableBase[] };
    },
    {
      retryDelaysMs: opts.retryDelaysMs,
      isRetryable: (err) =>
        err instanceof AirtableMetaApiError && err.status === 429,
      label: "airtable-meta-fetchBases",
    },
  );

  return body.bases ?? [];
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return "<unparseable body>";
  }
}
