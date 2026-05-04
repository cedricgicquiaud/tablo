/**
 * AirtableDataSource — Phase 14.5 Cycle B (stub).
 *
 * Stub minimal posé en A.5 pour permettre l'import dans la Server Action
 * `actions.ts` sans casser TypeScript. Implémentation complète en B.3-B.4.
 */

import type {
  DataSource,
  QueryRow,
  TableDetail,
  TableInfo,
} from "../types";

export type AirtableDataSourceOpts = {
  connectionId: string;
  /** Retourne un access_token frais (refresh-aware, cf airtable-token-refresh). */
  getAccessToken: () => Promise<string>;
};

export class AirtableDataSource implements DataSource {
  constructor(_opts: AirtableDataSourceOpts) {
    // stub
  }

  async listTables(): Promise<TableInfo[]> {
    throw new Error("AirtableDataSource.listTables : not implemented yet (B.3)");
  }

  async inspectTable(_name: string): Promise<TableDetail | null> {
    throw new Error("AirtableDataSource.inspectTable : not implemented yet (B.3)");
  }

  async runQuery(_sql: string): Promise<QueryRow[]> {
    throw new Error("AirtableDataSource.runQuery : not implemented yet (B.4)");
  }
}
