/**
 * Types pour le schema cache — Phase 17 cycle B T2.1.
 *
 * Le cache est stocké dans `connections.schema_cache_jsonb` (colonne posée
 * Phase 13, jamais utilisée jusqu'ici). Populé au connect en fire-and-forget
 * (R67 B2), lu par les tools `list_tables` / `inspect_table` (R10/R20),
 * refreshable manuellement avec rate limit (R65 B3).
 *
 * Format JSON sérialisable (pas de Date, juste des strings ISO).
 */

/**
 * Statut global du profiling pour une connexion (R55).
 *
 * - `ok` : toutes les tables profilées avec succès
 * - `partial` : 1+ tables ont échoué (timeout, perm denied, etc.) mais
 *   au moins 1 table OK. Cache utilisable, refresh recommandé.
 * - `failed` : 0 table profilée. Connexion utilisable mais sans cache.
 *   UI propose "Retry profiling".
 * - `not_applicable` : DataSource ne supporte pas l'introspection (CSV
 *   futur, par ex). Profiling skippé silencieusement (C10).
 */
export type SchemaStatus = "ok" | "partial" | "failed" | "not_applicable";

/**
 * Top value pour une colonne catégorielle (R52, R22).
 * Permet à l'IA de connaître les valeurs réelles (résout bug `closed_won`).
 */
export type TopValue = {
  value: string | number | boolean | null;
  count: number;
};

/**
 * Profil d'une colonne (R51, R52).
 *
 * Champs optionnels selon le type :
 * - TEXT : `distinct_count`, `top_values` (si distinct ≤ 50)
 * - INTEGER / NUMERIC : `min`, `max`, `mean`
 * - DATE / TIMESTAMP : `min`, `max` (ISO string)
 * - Tous : `null_percentage`
 */
export type ColumnProfile = {
  name: string;
  type: string;
  nullable: boolean;
  null_percentage?: number;
  distinct_count?: number;
  top_values?: TopValue[];
  min?: string | number;
  max?: string | number;
  mean?: number;
};

/**
 * Profil d'une table.
 *
 * `partial_reason` non-null si seule une partie des colonnes a été profilée
 * (timeout intermédiaire). Les colonnes manquantes ne sont pas listées.
 */
export type TableProfile = {
  name: string;
  row_count: number;
  columns: ColumnProfile[];
  partial_reason?: string;
};

/**
 * Entry complète du cache stocké dans `schema_cache_jsonb`.
 *
 * `version` = 1 pour le format Phase 17. Augmenter si breaking change
 * (nouveau champ obligatoire, format changé).
 *
 * `synced_at` = timestamp ISO de la dernière sync réussie (full ou partial).
 *
 * `partial_tables` non-null si status='partial' : liste des table names
 * qui ont échoué.
 */
export type SchemaCacheEntry = {
  version: 1;
  synced_at: string;
  status: SchemaStatus;
  tables: TableProfile[];
  partial_tables?: string[];
};
