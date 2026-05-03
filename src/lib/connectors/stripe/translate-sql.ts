/**
 * Translator SQL Postgres-style → alasql-style — Phase 14.3 C1 (cas B SPIKE-LOG R13).
 *
 * 2 transformations :
 *
 *  1. **Identifiants double-quotés Postgres** `"foo"` → `` `foo` `` (backticks alasql).
 *     Préserve les strings simple-quotes (`'paid'` reste intact).
 *
 *  2. **Mots-clés alasql utilisés comme alias / ORDER BY** wrap en backticks.
 *     Ex : l'IA Tablo génère `AS value`, `AS count` etc. — `value` et `count`
 *     sont des mots-clés alasql et déclenchent un parse error. On les
 *     échappe en `` `value` `` `` `count` ``.
 *
 * Naïf v1 : `String.replace` regex. Couvre les SQL générés par le profiler
 * P17 (post-rename `val`/`cnt`) et l'IA Tablo (mots-clés `value`/`count`/etc).
 *
 * Cas écartés (V2 si signal) :
 * - Strings contenant `"` interne (ex : `'foo "bar" baz'`) → faux-positif
 *   théorique, jamais rencontré dans nos SQL réels.
 * - Mots-clés alasql autres que la liste ci-dessous utilisés comme identifier
 *   (rare en pratique).
 */

/**
 * Mots-clés alasql qui déclenchent un parse error si utilisés comme
 * identifier (alias ou nom de colonne dans ORDER BY / GROUP BY).
 *
 * Liste pragmatique basée sur les bugs observés en smoke + SPIKE-LOG.
 * À étendre si nouveaux faux-positifs.
 */
const ALASQL_KEYWORDS_AS_IDENT = [
  "value",
  "count",
  "order",
  "key",
  "status", // pas mot-clé alasql mais souvent utilisé en alias par l'IA
  "type",
];

export function translateSqlPgToAlasql(sql: string): string {
  // 1. Identifiants double-quotés Postgres → backticks
  let out = sql.replace(/"([^"]+)"/g, "`$1`");

  // 2. Wrap les mots-clés alasql utilisés comme alias `AS xxx` ou
  //    référencés en `ORDER BY xxx` / `GROUP BY xxx`. Sans regard
  //    arrière, on wrap tous les `AS <keyword>` et `(ORDER|GROUP) BY <keyword>`.
  for (const kw of ALASQL_KEYWORDS_AS_IDENT) {
    const aliasRe = new RegExp(`\\b(AS\\s+)${kw}\\b`, "gi");
    out = out.replace(aliasRe, `$1\`${kw}\``);

    const orderByRe = new RegExp(`\\b((?:ORDER|GROUP)\\s+BY\\s+)${kw}\\b`, "gi");
    out = out.replace(orderByRe, `$1\`${kw}\``);
  }

  return out;
}
