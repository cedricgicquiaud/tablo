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

type CacheEntry = {
  fetchedAt: number;
  tables: Record<TableName, StripeRow[]>;
  truncatedTables: string[];
};

const cacheByConnection = new Map<string, CacheEntry>();
const inflightByConnection = new Map<string, Promise<CacheEntry>>();

/** Test escape hatch (R6 + R14 — reset caches entre tests). */
export function __resetStripeCacheForTests(): void {
  cacheByConnection.clear();
  inflightByConnection.clear();
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
    const cache = await this.ensureCache();
    return TABLE_NAMES.map((name) => ({
      name,
      rowCount: cache.tables[name].length,
    }));
  }

  async inspectTable(name: string): Promise<TableDetail | null> {
    if (!isTableName(name)) return null;
    const cache = await this.ensureCache();
    const samples = cache.tables[name].slice(0, 3) as unknown as Record<
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
    const cache = await this.ensureCache();

    // Database alasql isolée par appel : évite la fuite cross-tenant via
    // le singleton `alasql.tables` global (audit verifier 14.3 — bloquant).
    const db = new alasql.Database();
    for (const name of TABLE_NAMES) {
      db.tables[name] = { data: cache.tables[name] };
    }

    const translated = translateSqlPgToAlasql(sql);
    const rows = db.exec(translated) as unknown[];

    // alasql retourne `undefined` pour les colonnes side-droite d'un LEFT JOIN
    // sans match. Sémantique SQL standard (R15) → normaliser en `null`.
    return (rows as Record<string, unknown>[]).map(normalizeUndefinedToNull) as QueryRow[];
  }

  /* --------------------------- Cache + coalescing -------------------------- */

  private async ensureCache(): Promise<CacheEntry> {
    const id = this.deps.connectionId;

    // 1. Cache hit valide ?
    const existing = cacheByConnection.get(id);
    if (existing && Date.now() - existing.fetchedAt <= CACHE_TTL_MS) {
      return existing;
    }

    // 2. Fetch déjà en cours (coalescing R14) ?
    const inflight = inflightByConnection.get(id);
    if (inflight) return inflight;

    // 3. Lance un nouveau fetch et stocke la promise pour coalescing
    const promise = this.fetchAll().finally(() => {
      inflightByConnection.delete(id);
    });
    inflightByConnection.set(id, promise);

    const fresh = await promise;
    cacheByConnection.set(id, fresh);
    return fresh;
  }

  private async fetchAll(): Promise<CacheEntry> {
    let stripe: Stripe;
    try {
      stripe = this.deps.getStripeClient();
    } catch (err) {
      throw wrapStripeError(err);
    }

    const truncatedTables: string[] = [];

    const [customers, subs, invoices, charges] = await Promise.all([
      this.fetchPaginated("stripe_customers", () => stripe.customers, truncatedTables),
      this.fetchPaginated("stripe_subscriptions", () => stripe.subscriptions, truncatedTables),
      this.fetchPaginated("stripe_invoices", () => stripe.invoices, truncatedTables),
      this.fetchPaginated("stripe_charges", () => stripe.charges, truncatedTables),
    ]);

    return {
      fetchedAt: Date.now(),
      tables: {
        stripe_customers: customers.map((c) => flattenStripeCustomer(c as Stripe.Customer)),
        stripe_subscriptions: subs.map((s) => flattenStripeSubscription(s as Stripe.Subscription)),
        stripe_invoices: invoices.map((i) => flattenStripeInvoice(i as Stripe.Invoice)),
        stripe_charges: charges.map((c) => flattenStripeCharge(c as Stripe.Charge)),
      },
      truncatedTables,
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
