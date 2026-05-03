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
// Mots-clés réservés alasql vérifiés au spike (cf SPIKE-LOG R13). Liste
// volontairement courte — chaque entrée est associée à un cas de parse
// error reproductible. À étendre uniquement quand un bug le motive.
const ALASQL_KEYWORDS_AS_IDENT = [
  "value", // smoke 14.3 round 2 : "AS value" → parse error
  "count", // bug spike R13 : "ORDER BY count" → parse error
  "order",
  "key",
];

export function translateSqlPgToAlasql(sql: string): string {
  // 1. Tokenizer 3 états (default / single-quote string / double-quote ident)
  //    pour ne PAS toucher aux strings simple-quotes contenant des `"`.
  //    Audit verifier 14.3 — bloquant : ancien `replace` regex naïf cassait
  //    `WHERE name = 'A "B" C'` en `WHERE name = 'A `B` C'`.
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "'") {
      // string simple-quote : copier verbatim jusqu'au prochain `'` non échappé.
      // Postgres double-quote `''` à l'intérieur d'une string = échappement.
      out += "'";
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          out += "''";
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          out += "'";
          i++;
          break;
        }
        out += sql[i];
        i++;
      }
      continue;
    }

    if (ch === '"') {
      // identifier double-quote Postgres → backtick alasql.
      // Postgres double-quote `""` à l'intérieur = échappement (rare mais valide).
      let ident = "";
      i++; // skip opening "
      while (i < sql.length) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          ident += '"';
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i++;
          break;
        }
        ident += sql[i];
        i++;
      }
      out += "`" + ident + "`";
      continue;
    }

    out += ch;
    i++;
  }

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
