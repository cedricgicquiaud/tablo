/**
 * Translator SQL Postgres-style → alasql-style — Phase 14.3 C1 (cas B SPIKE-LOG R13).
 *
 * alasql ne supporte pas les identifiants double-quotés Postgres (`"col"`).
 * Cette fonction pure réécrit `"foo"` en `` `foo` `` (backticks alasql)
 * sans toucher aux strings entre simple-quotes (`'paid'` reste intact).
 *
 * Naïf v1 : un seul `String.replace` regex. Couvre 100% des SQL générés
 * par le profiler P17 (post-rename alias `val`/`cnt`) et l'IA Tablo.
 *
 * Cas écartés (V2 si signal) :
 * - Strings contenant `"` interne (ex : `'foo "bar" baz'`) → faux-positif
 *   théorique, jamais rencontré dans nos SQL réels.
 * - Identifier mot-clé alasql (ex : `"value"`, `"count"`) → résolu en amont
 *   par convention de nommage cross-dialect (alias `val`/`cnt`).
 */

export function translateSqlPgToAlasql(sql: string): string {
  return sql.replace(/"([^"]+)"/g, "`$1`");
}
