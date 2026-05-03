import { withRetry, type RetryOpts as SharedRetryOpts } from "@/lib/utils/retry";
import { validateReadOnlySql } from "./sql-validation";
import type { ColumnInfo, DataSource, QueryRow, TableDetail, TableInfo } from "./types";

const QUERY_ENDPOINT = (ref: string) =>
  `https://api.supabase.com/v1/projects/${ref}/database/query`;

const LIST_TABLES_SQL = `
  SELECT t.table_name AS table_name,
         COALESCE(pg_class.reltuples::bigint, 0) AS row_count
  FROM information_schema.tables t
  LEFT JOIN pg_class ON pg_class.relname = t.table_name
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name
`;

const COLUMNS_SQL = (tableName: string) => `
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = '${escapeIdent(tableName)}'
  ORDER BY ordinal_position
`;

const SAMPLES_SQL = (tableName: string) =>
  `SELECT * FROM "${escapeIdent(tableName)}" LIMIT 3`;

// Sanitisation minimale des identifiants de tables (whitelist alphanumeric + _).
// Anything d'autre est éjecté → empêche les SQL injections via tableName.
function escapeIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(name)) {
    throw new Error(`Identifier invalide : ${name}`);
  }
  return name;
}

export type SupabaseOAuthDataSourceOpts = {
  projectRef: string;
  getAccessToken: () => Promise<string>;
};

export type RetryOpts = Pick<SharedRetryOpts, "retryDelaysMs">;

export class SupabaseOAuthDataSource implements DataSource {
  constructor(private opts: SupabaseOAuthDataSourceOpts) {}

  /**
   * POST avec retry exponentiel sur 429 (Phase 14.1.1, helper extrait P14.3).
   *
   * Supabase Management API a un rate limit (~60 req/min sur certains endpoints).
   * Le helper `withRetry` gère le retry sur status 429 ; les autres status sont
   * throw immédiatement.
   */
  private async post(query: string, retry: RetryOpts = {}): Promise<QueryRow[]> {
    const accessToken = await this.opts.getAccessToken();
    const url = QUERY_ENDPOINT(this.opts.projectRef);
    const init = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query }),
    };

    return withRetry(
      async () => {
        const res = await fetch(url, init);
        if (res.ok) {
          const data = await res.json();
          if (!Array.isArray(data)) {
            throw new Error("Management API: réponse inattendue (non-array)");
          }
          return data as QueryRow[];
        }
        const text = await res.text();
        throw new Error(`Supabase Management API ${res.status}: ${text}`);
      },
      { retryDelaysMs: retry.retryDelaysMs },
    );
  }

  async runQuery(sql: string, retry?: RetryOpts): Promise<QueryRow[]> {
    validateReadOnlySql(sql);
    return this.post(sql, retry);
  }

  async listTables(): Promise<TableInfo[]> {
    const rows = await this.post(LIST_TABLES_SQL);
    return rows.map((r) => ({
      name: String(r.table_name),
      rowCount: Number(r.row_count) || 0,
    }));
  }

  async inspectTable(name: string): Promise<TableDetail | null> {
    const colRows = await this.post(COLUMNS_SQL(name));
    if (colRows.length === 0) return null;
    const columns: ColumnInfo[] = colRows.map((r) => ({
      name: String(r.column_name),
      type: String(r.data_type),
      nullable: r.is_nullable === "YES",
    }));
    const samples = await this.post(SAMPLES_SQL(name));
    return { name, columns, samples };
  }
}
