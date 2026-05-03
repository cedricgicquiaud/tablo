/**
 * StripeDataSource — Phase 14.3 C2.
 *
 * Adapter implémentant l'interface `DataSource` (Phase 14.1) pour Stripe.
 * Stratégie acté SPEC R3 + SPIKE-LOG R13 :
 *
 *  1. À la 1ère query d'une session, fetch tous les Stripe objects
 *     (Customers + Subs + Invoices + Charges) paginés via SDK,
 *     cap 1000 rows par table (R5).
 *  2. Aplatissement via flattenStripe* en arrays mémoire.
 *  3. alasql exécute le SQL contre les arrays. Le SQL Postgres-style
 *     est traduit en alasql-style via translateSqlPgToAlasql.
 *  4. Cache module-level TTL 5 min (R6, RNF4).
 *  5. Coalescing concurrent (R14) : 2 fetches parallèles sur la même
 *     connectionId → 1 seul appel SDK.
 */

import alasqlImport from "alasql";
import type Stripe from "stripe";
import { withRetry } from "@/lib/utils/retry";
import { validateReadOnlySql } from "../sql-validation";
import type {
  ColumnInfo,
  DataSource,
  QueryRow,
  TableDetail,
  TableInfo,
} from "../types";
import {
  flattenStripeCharge,
  flattenStripeCustomer,
  flattenStripeInvoice,
  flattenStripeSubscription,
  type StripeRow,
} from "./flatten";
import { translateSqlPgToAlasql } from "./translate-sql";

type AlasqlDatabase = {
  tables: Record<string, { data: unknown[] }>;
  exec: (sql: string) => unknown[];
};

const alasql = alasqlImport as unknown as ((sql: string) => unknown[]) & {
  tables: Record<string, { data: unknown[] }>;
  Database: new () => AlasqlDatabase;
};

/* -------------------------------------------------------------------------- */
/*                              Constants                                     */
/* -------------------------------------------------------------------------- */

const TABLE_NAMES = [
  "stripe_customers",
  "stripe_subscriptions",
  "stripe_invoices",
  "stripe_charges",
] as const;

type TableName = (typeof TABLE_NAMES)[number];

const ROW_CAP_PER_TABLE = 1000;
const PAGE_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 300_000 ms

/* -------------------------------------------------------------------------- */
/*                              Schema hardcoded                              */
/* -------------------------------------------------------------------------- */

const SCHEMAS: Record<TableName, ColumnInfo[]> = {
  stripe_customers: [
    { name: "id", type: "text", nullable: false },
    { name: "email", type: "text", nullable: true },
    { name: "name", type: "text", nullable: true },
    { name: "description", type: "text", nullable: true },
    { name: "created_at", type: "text", nullable: false },
    { name: "delinquent", type: "boolean", nullable: false },
    { name: "currency", type: "text", nullable: true },
    { name: "crm_company_id", type: "text", nullable: true },
    { name: "tablo_seed", type: "text", nullable: true },
  ],
  stripe_subscriptions: [
    { name: "id", type: "text", nullable: false },
    { name: "customer_id", type: "text", nullable: false },
    { name: "status", type: "text", nullable: false },
    { name: "plan_id", type: "text", nullable: false },
    { name: "plan_nickname", type: "text", nullable: false },
    { name: "unit_amount_cents", type: "integer", nullable: true },
    { name: "currency", type: "text", nullable: false },
    { name: "interval", type: "text", nullable: true },
    { name: "current_period_start", type: "text", nullable: true },
    { name: "current_period_end", type: "text", nullable: true },
    { name: "created_at", type: "text", nullable: false },
    { name: "canceled_at", type: "text", nullable: true },
    { name: "collection_method", type: "text", nullable: false },
    { name: "crm_company_id", type: "text", nullable: true },
  ],
  stripe_invoices: [
    { name: "id", type: "text", nullable: false },
    { name: "customer_id", type: "text", nullable: true },
    { name: "subscription_id", type: "text", nullable: true },
    { name: "amount_due_cents", type: "integer", nullable: false },
    { name: "amount_paid_cents", type: "integer", nullable: false },
    { name: "amount_remaining_cents", type: "integer", nullable: false },
    { name: "currency", type: "text", nullable: false },
    { name: "status", type: "text", nullable: false },
    { name: "created_at", type: "text", nullable: false },
    { name: "due_date", type: "text", nullable: true },
    { name: "paid", type: "boolean", nullable: false },
    { name: "crm_deal_id", type: "text", nullable: true },
  ],
  stripe_charges: [
    { name: "id", type: "text", nullable: false },
    { name: "customer_id", type: "text", nullable: true },
    { name: "amount_cents", type: "integer", nullable: false },
    { name: "currency", type: "text", nullable: false },
    { name: "status", type: "text", nullable: false },
    { name: "paid", type: "boolean", nullable: false },
    { name: "refunded", type: "boolean", nullable: false },
    { name: "created_at", type: "text", nullable: false },
    { name: "payment_method_type", type: "text", nullable: true },
  ],
};

/* -------------------------------------------------------------------------- */
/*                              Cache types                                   */
/* -------------------------------------------------------------------------- */

type TableCacheEntry = {
  fetchedAt: number;
  rows: StripeRow[];
  truncated: boolean;
};

// Cache à 2 niveaux : par connection × par table virtuelle.
// Permet le lazy-fetch per-table — `runQuery` ne fetch que les tables
// référencées dans la SQL au lieu de tout charger d'un coup.
const cacheByConnection = new Map<string, Map<TableName, TableCacheEntry>>();
const inflightByConnection = new Map<string, Map<TableName, Promise<TableCacheEntry>>>();

/** Test escape hatch (R6 + R14 — reset caches entre tests). */
export function __resetStripeCacheForTests(): void {
  cacheByConnection.clear();
  inflightByConnection.clear();
}

/* -------------------------------------------------------------------------- */
/*                          Détection tables référencées                      */
/* -------------------------------------------------------------------------- */

/**
 * Extrait les noms de tables virtuelles Stripe référencées dans le SQL.
 * Heuristic : recherche `stripe_<table_name>` (avec ou sans backticks /
 * double-quotes). Renvoie un sous-ensemble de TABLE_NAMES.
 *
 * Pour les SQL d'agent IA réalistes (SELECT/JOIN/GROUP BY), tous les noms
 * de table sont précédés de `FROM` ou `JOIN`. Mais en cas d'usage exotique
 * (subquery, CTE), on peut récupérer un superset — ce n'est pas grave car
 * fetch en plus = pas de bug, juste un peu plus de latence évitable.
 */
function detectReferencedTables(sql: string): TableName[] {
  const detected = new Set<TableName>();
  for (const name of TABLE_NAMES) {
    // word-boundary match insensible à la casse, peu importe les
    // backticks/double-quotes/qualifiers `db.table` autour.
    if (new RegExp(`\\b${name}\\b`, "i").test(sql)) {
      detected.add(name);
    }
  }
  return Array.from(detected);
}

/* -------------------------------------------------------------------------- */
/*                              Adapter class                                 */
/* -------------------------------------------------------------------------- */

export type StripeDataSourceDeps = {
  connectionId: string;
  getStripeClient: () => Stripe;
  /** Test-only escape hatch : retryDelaysMs:[0,0,0] pour ne pas sleep en test. */
  retryDelaysMs?: number[];
};

export class StripeDataSource implements DataSource {
  constructor(private deps: StripeDataSourceDeps) {}

  async listTables(): Promise<TableInfo[]> {
    // Lazy : on retourne les 4 noms hardcodés. Le rowCount est lu depuis
    // le cache si déjà fetché, sinon 0 (l'agent IA peut toujours déclencher
    // un fetch via inspectTable / runQuery). Évite de charger les 4 tables
    // juste pour afficher des compteurs.
    const cached = cacheByConnection.get(this.deps.connectionId);
    return TABLE_NAMES.map((name) => ({
      name,
      rowCount: cached?.get(name)?.rows.length ?? 0,
    }));
  }

  async inspectTable(name: string): Promise<TableDetail | null> {
    if (!isTableName(name)) return null;
    const entry = await this.ensureTableCache(name);
    const samples = entry.rows.slice(0, 3) as unknown as Record<
      string,
      unknown
    >[];
    return {
      name,
      columns: SCHEMAS[name],
      samples,
    };
  }

  async runQuery(sql: string): Promise<QueryRow[]> {
    validateReadOnlySql(sql);

    // Lazy-fetch : on ne fetch que les tables réellement référencées dans le SQL.
    // Pour "MRR par plan" → fetch que stripe_subscriptions (~1.5s) au lieu
    // des 4 tables (~5s). Audit verifier 14.3 — perf optim option B.
    const referenced = detectReferencedTables(sql);
    const tablesToFetch = referenced.length > 0 ? referenced : TABLE_NAMES;
    const entries = await Promise.all(
      tablesToFetch.map((name) => this.ensureTableCache(name)),
    );

    // Database alasql isolée par appel : évite la fuite cross-tenant via
    // le singleton `alasql.tables` global (audit verifier 14.3 — bloquant).
    const db = new alasql.Database();
    for (let i = 0; i < tablesToFetch.length; i++) {
      db.tables[tablesToFetch[i]] = { data: entries[i].rows };
    }

    const translated = translateSqlPgToAlasql(sql);
    const rows = db.exec(translated) as unknown[];

    // alasql retourne `undefined` pour les colonnes side-droite d'un LEFT JOIN
    // sans match. Sémantique SQL standard (R15) → normaliser en `null`.
    return (rows as Record<string, unknown>[]).map(normalizeUndefinedToNull) as QueryRow[];
  }

  /* --------------------------- Cache + coalescing -------------------------- */

  private async ensureTableCache(name: TableName): Promise<TableCacheEntry> {
    const id = this.deps.connectionId;

    // 1. Cache hit valide ?
    const connCache = cacheByConnection.get(id);
    const existing = connCache?.get(name);
    if (existing && Date.now() - existing.fetchedAt <= CACHE_TTL_MS) {
      return existing;
    }

    // 2. Fetch déjà en cours (coalescing R14, par-table) ?
    let connInflight = inflightByConnection.get(id);
    if (!connInflight) {
      connInflight = new Map();
      inflightByConnection.set(id, connInflight);
    }
    const inflight = connInflight.get(name);
    if (inflight) return inflight;

    // 3. Lance un nouveau fetch table-spécifique
    const promise = this.fetchTable(name).finally(() => {
      connInflight!.delete(name);
    });
    connInflight.set(name, promise);

    const fresh = await promise;
    let store = cacheByConnection.get(id);
    if (!store) {
      store = new Map();
      cacheByConnection.set(id, store);
    }
    store.set(name, fresh);
    return fresh;
  }

  private async fetchTable(name: TableName): Promise<TableCacheEntry> {
    let stripe: Stripe;
    try {
      stripe = this.deps.getStripeClient();
    } catch (err) {
      throw wrapStripeError(err);
    }

    const truncatedTables: string[] = [];
    let rows: StripeRow[];

    switch (name) {
      case "stripe_customers": {
        const raw = await this.fetchPaginated<Stripe.Customer>(
          name,
          () => stripe.customers,
          truncatedTables,
        );
        rows = raw.map(flattenStripeCustomer);
        break;
      }
      case "stripe_subscriptions": {
        const raw = await this.fetchPaginated<Stripe.Subscription>(
          name,
          () => stripe.subscriptions,
          truncatedTables,
        );
        rows = raw.map(flattenStripeSubscription);
        break;
      }
      case "stripe_invoices": {
        const raw = await this.fetchPaginated<Stripe.Invoice>(
          name,
          () => stripe.invoices,
          truncatedTables,
        );
        rows = raw.map(flattenStripeInvoice);
        break;
      }
      case "stripe_charges": {
        const raw = await this.fetchPaginated<Stripe.Charge>(
          name,
          () => stripe.charges,
          truncatedTables,
        );
        rows = raw.map(flattenStripeCharge);
        break;
      }
    }

    return {
      fetchedAt: Date.now(),
      rows,
      truncated: truncatedTables.includes(name),
    };
  }

  private async fetchPaginated<T extends { id: string }>(
    label: string,
    getResource: () => {
      list: (params: { limit: number; starting_after?: string }) => Promise<{
        data: T[];
        has_more: boolean;
      }>;
    },
    truncatedTables: string[],
  ): Promise<T[]> {
    const all: T[] = [];
    let startingAfter: string | undefined = undefined;
    let lastPageHasMore = false;

    while (all.length < ROW_CAP_PER_TABLE) {
      const remaining = ROW_CAP_PER_TABLE - all.length;
      const limit = Math.min(PAGE_SIZE, remaining);

      const page = await withRetry(
        () =>
          getResource().list({
            limit,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          }),
        {
          retryDelaysMs: this.deps.retryDelaysMs,
          isRetryable: (err) =>
            typeof err === "object" &&
            err !== null &&
            "statusCode" in err &&
            (err as { statusCode?: number }).statusCode === 429,
        },
      ).catch((err) => {
        throw wrapStripeError(err);
      });

      all.push(...page.data);
      lastPageHasMore = page.has_more;

      if (!page.has_more) break;
      const last = page.data[page.data.length - 1];
      if (!last) break;
      startingAfter = last.id;
    }

    // Truncation détectée si on a atteint le cap ET la dernière page indiquait
    // encore `has_more`. Réutilise l'info déjà fetchée ; pas d'API call superflu
    // (audit verifier 14.3 — important).
    if (all.length >= ROW_CAP_PER_TABLE && lastPageHasMore) {
      console.warn(
        `[Stripe DataSource] ${label} truncated at ${ROW_CAP_PER_TABLE} rows for connection ${this.deps.connectionId}`,
      );
      truncatedTables.push(label);
    }

    return all;
  }
}

/* -------------------------------------------------------------------------- */
/*                              Helpers                                       */
/* -------------------------------------------------------------------------- */

function isTableName(name: string): name is TableName {
  return (TABLE_NAMES as readonly string[]).includes(name);
}

function normalizeUndefinedToNull(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row)) {
    out[k] = row[k] === undefined ? null : row[k];
  }
  return out;
}

function wrapStripeError(err: unknown): Error {
  if (err instanceof Error) {
    // Erreurs Stripe SDK ont parfois `.type` (StripeAuthenticationError, etc.)
    const errAny = err as Error & { type?: string };
    if (errAny.type === "StripeAuthenticationError") {
      return new Error(
        `Stripe DataSource: clé Stripe invalide ou révoquée (${err.message})`,
      );
    }
    if (errAny.type === "StripeConnectionError") {
      return new Error(`Stripe DataSource: erreur réseau (${err.message})`);
    }
    return new Error(`Stripe DataSource: ${err.message}`);
  }
  return new Error(`Stripe DataSource: ${String(err)}`);
}
