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

import alasql from "alasql";
import type {
  ColumnInfo,
  DataSource,
  QueryRow,
  TableDetail,
  TableInfo,
} from "../types";
import { validateReadOnlySql } from "../sql-validation";
import { translateSqlPgToAlasql } from "../stripe/translate-sql";
import { airtableFieldToSqlType } from "./field-type-mapping";
import {
  fetchTablesSchema as defaultFetchTablesSchema,
  type AirtableTableSchema,
} from "./meta-api";
import {
  fetchTableRecords as defaultFetchTableRecords,
  type FetchTableRecordsOpts,
  type FetchTableRecordsResult,
} from "./records-api";
import { flattenAirtableRecord, normalizeColumnName } from "./flatten";

const RECORDS_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RECORDS_PER_TABLE = 1000;

const SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000;

type SchemaCacheEntry = {
  schema: AirtableTableSchema[];
  cachedAt: number;
};

// Cache module-level, keyé par baseId. Symétrie StripeDataSource (P14.3).
const schemaCache = new Map<string, SchemaCacheEntry>();
const schemaInflight = new Map<string, Promise<AirtableTableSchema[]>>();

type RecordsCacheEntry = {
  rows: QueryRow[];
  truncated: boolean;
  fetchedAt: number;
};
// Records cache keyé par `baseId::tableName`.
const recordsCache = new Map<string, RecordsCacheEntry>();
const recordsInflight = new Map<string, Promise<RecordsCacheEntry>>();

/** Helper test-only pour reset le cache entre tests. */
export function __resetAirtableCacheForTests() {
  schemaCache.clear();
  schemaInflight.clear();
  recordsCache.clear();
  recordsInflight.clear();
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
  /** Override pour tests. Default = `records-api.fetchTableRecords`. */
  fetchTableRecordsFn?: (
    opts: FetchTableRecordsOpts,
  ) => Promise<FetchTableRecordsResult>;
};

export class AirtableDataSource implements DataSource {
  private readonly connectionId: string;
  private readonly baseId: string;
  private readonly getAccessToken: () => Promise<string>;
  private readonly fetchTablesSchemaFn: (
    accessToken: string,
    baseId: string,
  ) => Promise<AirtableTableSchema[]>;
  private readonly fetchTableRecordsFn: (
    opts: FetchTableRecordsOpts,
  ) => Promise<FetchTableRecordsResult>;

  constructor(opts: AirtableDataSourceOpts) {
    this.connectionId = opts.connectionId;
    this.baseId = opts.baseId;
    this.getAccessToken = opts.getAccessToken;
    this.fetchTablesSchemaFn =
      opts.fetchTablesSchemaFn ?? defaultFetchTablesSchema;
    this.fetchTableRecordsFn =
      opts.fetchTableRecordsFn ?? defaultFetchTableRecords;
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

  async runQuery(sql: string): Promise<QueryRow[]> {
    // RNF5 + E12 — refuse INSERT/UPDATE/DELETE avant tout fetch
    validateReadOnlySql(sql);

    const schema = await this.getCachedSchema();

    // Lazy-fetch : extract table names référencées dans le SQL parmi celles
    // du schema. Pattern P14.3 (option B advisor — bench gain 8x).
    const referenced = detectReferencedTables(sql, schema);
    if (referenced.length === 0) {
      throw new Error(
        `Table inexistante : aucune des tables du SQL ne correspond au schema Airtable (base ${this.baseId}). Tables disponibles : ${schema.map((t) => t.name).join(", ")}`,
      );
    }

    const entries = await Promise.all(
      referenced.map((name) => this.ensureRecordsCache(name)),
    );

    // Cross-tenant isolation : new alasql.Database() per call (audit verifier
    // 14.3 bloquant — évite fuite via singleton alasql.tables global).
    const db = new alasql.Database();
    for (let i = 0; i < referenced.length; i++) {
      db.tables[referenced[i]] = { data: entries[i].rows };
    }

    const translated = translateSqlPgToAlasql(sql);
    const rows = db.exec(translated) as unknown[];

    return (rows as Record<string, unknown>[]).map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = v === undefined ? null : v;
      }
      return out;
    }) as QueryRow[];
  }

  /* ---------- internals ---------- */

  private async getCachedSchema(): Promise<AirtableTableSchema[]> {
    // Key par connectionId pour isolation cross-tenant (cohérence P14.3
    // audit verifier bloquant). Si 2 workspaces ont OAuth la même base
    // physique Airtable, ils ont chacun leur cache + leur token.
    const cacheKey = this.connectionId;
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

  private async ensureRecordsCache(
    tableName: string,
  ): Promise<RecordsCacheEntry> {
    // Key par connectionId (pas par baseId) — cross-tenant safety même si
    // baseId identique (cas rare mais possible : un même base Airtable
    // partagée à 2 workspaces Tablo via OAuth).
    const cacheKey = `${this.connectionId}::${tableName}`;
    const now = Date.now();

    const cached = recordsCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < RECORDS_CACHE_TTL_MS) {
      return cached;
    }

    const inflight = recordsInflight.get(cacheKey);
    if (inflight) return inflight;

    const promise = (async () => {
      const token = await this.getAccessToken();
      const result = await this.fetchTableRecordsFn({
        accessToken: token,
        baseId: this.baseId,
        tableName,
        maxRecords: MAX_RECORDS_PER_TABLE,
      });
      const rows = result.records.map((r) =>
        flattenAirtableRecord(r),
      ) as QueryRow[];
      const entry: RecordsCacheEntry = {
        rows,
        truncated: result.truncated,
        fetchedAt: Date.now(),
      };
      recordsCache.set(cacheKey, entry);
      return entry;
    })();
    recordsInflight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      recordsInflight.delete(cacheKey);
    }
  }
}

/**
 * Détecte les tables Airtable du schema effectivement référencées dans le SQL.
 * Match insensible à la casse + word-boundary. Si aucune match, on retourne []
 * → caller throw E13.
 */
function detectReferencedTables(
  sql: string,
  schema: AirtableTableSchema[],
): string[] {
  const detected: string[] = [];
  for (const table of schema) {
    // Word-boundary insensible casse. Si table name a des espaces, on doit
    // matcher la version quotée OU directement le name (selon le SQL généré
    // par l'AI ; alasql accepte les 2 si on met des "" autour).
    const escaped = table.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`, "i").test(sql)) {
      detected.push(table.name);
    }
  }
  return detected;
}
