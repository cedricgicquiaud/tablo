/**
 * Helpers Airtable Records API — Phase 14.5 B.4.
 *
 * - `fetchTableRecords(opts)` : fetch records d'une table avec pagination
 *   `offset` jusqu'à `maxRecords` (default 1000 V1, cap E14).
 *
 * Retry 429 via `withRetry` (P0 helper FORGE).
 *
 * Cf docs : https://airtable.com/developers/web/api/list-records
 */

import { withRetry } from "@/lib/utils/retry";
import { AirtableMetaApiError } from "./meta-api";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";
const PAGE_SIZE = 100; // max accepté par Airtable
const DEFAULT_MAX_RECORDS = 1000;

export type FetchTableRecordsOpts = {
  accessToken: string;
  baseId: string;
  /** Nom de la table tel que retourné par l'API meta (peut contenir des espaces). */
  tableName: string;
  /** Cap V1 (E14). Default 1000. */
  maxRecords?: number;
  retryDelaysMs?: number[];
};

export type FetchTableRecordsResult = {
  records: Array<{
    id: string;
    createdTime: string;
    fields: Record<string, unknown>;
  }>;
  /** True si on a atteint maxRecords avant d'épuiser la pagination → user
   *  doit savoir que les rows sont tronquées (cohérence E14 SPEC). */
  truncated: boolean;
};

export async function fetchTableRecords(
  opts: FetchTableRecordsOpts,
): Promise<FetchTableRecordsResult> {
  const max = opts.maxRecords ?? DEFAULT_MAX_RECORDS;
  const baseUrl = `${AIRTABLE_API_BASE}/${opts.baseId}/${encodeURIComponent(opts.tableName)}`;

  const allRecords: FetchTableRecordsResult["records"] = [];
  let offset: string | undefined;
  let truncated = false;

  while (true) {
    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
    if (offset) params.set("offset", offset);
    const url = `${baseUrl}?${params.toString()}`;

    const body = await withRetry(
      async () => {
        const res = await fetch(url, {
          method: "GET",
          headers: { authorization: `Bearer ${opts.accessToken}` },
        });

        if (res.status === 429) {
          throw new AirtableMetaApiError(429, "Airtable API rate limited");
        }

        if (!res.ok) {
          throw new AirtableMetaApiError(
            res.status,
            `Airtable Records API error ${res.status}`,
          );
        }

        return (await res.json()) as {
          records?: FetchTableRecordsResult["records"];
          offset?: string;
        };
      },
      {
        retryDelaysMs: opts.retryDelaysMs,
        isRetryable: (err) =>
          err instanceof AirtableMetaApiError && err.status === 429,
        label: `airtable-records-${opts.tableName}`,
      },
    );

    const page = body.records ?? [];
    // Cap maxRecords V1 — si on dépasse, slice et stop.
    const remaining = max - allRecords.length;
    if (page.length >= remaining) {
      allRecords.push(...page.slice(0, remaining));
      // truncated si reste pages potentielles OU si on a trim la page en cours
      if (body.offset || page.length > remaining) {
        truncated = true;
      }
      break;
    }
    allRecords.push(...page);

    if (!body.offset) break; // fin de pagination
    offset = body.offset;
  }

  return { records: allRecords, truncated };
}
