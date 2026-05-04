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
// Mots-clés réservés alasql vérifiés en smoke + spike. Wrappés en backticks
// partout où ils apparaissent comme identifier (alias, colonne, ORDER/GROUP/
// WHERE/SELECT). À étendre quand un nouveau parse error reproductible le
// motive.
//
// Important : `order` n'est PAS dans la liste — il déclenche un wrap sur
// `ORDER BY` qui casse la SQL. Les vraies utilisations de `order` comme
// identifier (rare) restent un faux-positif assumé.
//
// `count` est dans la liste mais le translator évite explicitement le cas
// function-call `count(*)` via le lookahead `(?!\s*\()`.
const ALASQL_KEYWORDS_AS_IDENT = [
  "value", // smoke 14.3 round 2 : `AS value` → parse error
  "count", // spike R13 : `ORDER BY count` → parse error (mais pas count(*))
  "interval", // smoke 14.3 round 3 : `WHERE interval = 'month'` → parse error
  "key",
];

export function translateSqlPgToAlasql(sql: string): string {
  // 1. Tokenizer 3 états : default / single-quote string / double-quote ident /
  //    backtick (pour ne pas double-wrap si déjà escapé). Le translator copie
  //    verbatim les strings simple-quote (audit verifier — bloquant 14.3) et
  //    réécrit les identifiants Postgres `"foo"` en backticks alasql.
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "'") {
      // string simple-quote : copier verbatim jusqu'au prochain `'` non échappé.
      // Postgres `''` à l'intérieur d'une string = échappement.
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
      let ident = "";
      i++;
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

    if (ch === "`") {
      // déjà backtick : copier verbatim
      out += "`";
      i++;
      while (i < sql.length) {
        if (sql[i] === "`") {
          out += "`";
          i++;
          break;
        }
        out += sql[i];
        i++;
      }
      continue;
    }

    out += ch;
    i++;
  }

  // 2. Wrap les mots-clés alasql utilisés comme identifier dans le code
  //    hors-strings. Le wrap est systématique (peu importe la position :
  //    SELECT, WHERE, AND, GROUP BY, ORDER BY, alias…) — un faux-positif
  //    sur un mot-clé légitime (ex `INTERVAL '1 day'` Postgres) reste
  //    théorique car l'IA Tablo génère SQL standard sans constructions
  //    Postgres-specific.
  //
  //    Important : on ne touche pas aux strings (déjà préservées au passage 1)
  //    ni aux identifiers déjà entre backticks (le regex `\bxxx\b` ne match
  //    pas xxx précédé/suivi de `).
  for (const kw of ALASQL_KEYWORDS_AS_IDENT) {
    // Match `kw` en word-boundary, sauf :
    // - précédé d'un backtick (déjà escapé) → `(^|[^\`])`
    // - suivi d'un backtick (déjà escapé) → `(?!\`)`
    // - suivi de `(` (function call comme count(*)) → `(?!\s*\()`
    const re = new RegExp(`(^|[^\`])\\b${kw}\\b(?!\`)(?!\\s*\\()`, "gi");
    out = out.replace(re, `$1\`${kw}\``);
  }

  // 3. Strip le `;` final éventuel (alasql refuse `;` à la fin d'une query).
  out = out.replace(/;\s*$/, "");

  return out;
}
