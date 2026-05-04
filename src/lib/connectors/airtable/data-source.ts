/**
 * AirtableDataSource — Phase 14.5 Cycle B.
 *
 * Implémente l'interface `DataSource` pour Airtable.
 *
 * - `listTables()` : fetch schema via API meta `/v0/meta/bases/{baseId}/tables`.
 * - `inspectTable(name)` : retourne ColumnInfo[] avec types SQL mappés (B.1).
 * - `runQuery(sql)` : (B.4) fetch records via `/v0/{baseId}/{tableName}` →
 *   flatten (B.2) → alasql in-memory query.
 *
 * Cache schema TTL 5min partagé entre listTables et inspectTable (R17).
 *
 * Pattern symétrique StripeDataSource (P14.3) : pure logic + DI via
 * `getAccessToken` + `fetchTablesSchemaFn` overridables pour testabilité.
 */

import type {
  ColumnInfo,
  DataSource,
  QueryRow,
  TableDetail,
  TableInfo,
} from "../types";
import { airtableFieldToSqlType } from "./field-type-mapping";
import {
  fetchTablesSchema as defaultFetchTablesSchema,
  type AirtableTableSchema,
} from "./meta-api";
import { normalizeColumnName } from "./flatten";

const SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000;

type SchemaCacheEntry = {
  schema: AirtableTableSchema[];
  cachedAt: number;
};

// Cache module-level, keyé par baseId. Symétrie StripeDataSource (P14.3).
const schemaCache = new Map<string, SchemaCacheEntry>();
const schemaInflight = new Map<string, Promise<AirtableTableSchema[]>>();

/** Helper test-only pour reset le cache entre tests. */
export function __resetAirtableCacheForTests() {
  schemaCache.clear();
  schemaInflight.clear();
}

export type AirtableDataSourceOpts = {
  connectionId: string;
  baseId: string;
  /** Retourne un access_token frais (refresh-aware, cf airtable-token-refresh). */
  getAccessToken: () => Promise<string>;
  /** Override pour tests. Default = `meta-api.fetchTablesSchema`. */
  fetchTablesSchemaFn?: (
    accessToken: string,
    baseId: string,
  ) => Promise<AirtableTableSchema[]>;
};

export class AirtableDataSource implements DataSource {
  private readonly connectionId: string;
  private readonly baseId: string;
  private readonly getAccessToken: () => Promise<string>;
  private readonly fetchTablesSchemaFn: (
    accessToken: string,
    baseId: string,
  ) => Promise<AirtableTableSchema[]>;

  constructor(opts: AirtableDataSourceOpts) {
    this.connectionId = opts.connectionId;
    this.baseId = opts.baseId;
    this.getAccessToken = opts.getAccessToken;
    this.fetchTablesSchemaFn =
      opts.fetchTablesSchemaFn ?? defaultFetchTablesSchema;
  }

  async listTables(): Promise<TableInfo[]> {
    const schema = await this.getCachedSchema();
    // V1 : rowCount = 0 (l'API meta ne retourne pas le total. fetch-and-count
    // serait coûteux à listTables. Si l'AI engine en a besoin, ajout V2 via
    // un fetch all + count en async background).
    return schema.map((table) => ({
      name: table.name,
      rowCount: 0,
    }));
  }

  async inspectTable(name: string): Promise<TableDetail | null> {
    const schema = await this.getCachedSchema();

    // Lookup case-insensitive sur name original ET name normalisé (cohérence
    // avec ce que l'AI demande après avoir vu listTables ou un SELECT SQL).
    const target = schema.find(
      (t) =>
        t.name.toLowerCase() === name.toLowerCase() ||
        normalizeColumnName(t.name) === normalizeColumnName(name),
    );
    if (!target) return null;

    const columns: ColumnInfo[] = target.fields.map((field) => ({
      name: normalizeColumnName(field.name),
      type: airtableFieldToSqlType(field.type),
      // Airtable n'expose pas un strict NOT NULL. V1 : nullable=true.
      // L'utilisateur peut toujours filter via SQL `WHERE col IS NOT NULL`.
      nullable: true,
    }));

    return {
      name: target.name,
      columns,
      // V1 : pas de samples (couvert par B.4 quand on fetch records SQL).
      samples: [],
    };
  }

  async runQuery(_sql: string): Promise<QueryRow[]> {
    throw new Error("AirtableDataSource.runQuery : not implemented yet (B.4)");
  }

  /* ---------- internals ---------- */

  private async getCachedSchema(): Promise<AirtableTableSchema[]> {
    const cacheKey = this.baseId;
    const now = Date.now();
    const cached = schemaCache.get(cacheKey);
    if (cached && now - cached.cachedAt < SCHEMA_CACHE_TTL_MS) {
      return cached.schema;
    }

    // Coalescing : si un fetch est déjà en cours pour ce baseId, await
    // (R18 light pour schema. R18 strict pour records en B.4).
    const inflight = schemaInflight.get(cacheKey);
    if (inflight) return inflight;

    const promise = (async () => {
      const token = await this.getAccessToken();
      const schema = await this.fetchTablesSchemaFn(token, this.baseId);
      schemaCache.set(cacheKey, { schema, cachedAt: Date.now() });
      return schema;
    })();
    schemaInflight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      schemaInflight.delete(cacheKey);
    }
  }
}
