/**
 * Injection LIMIT dans une requête SQL — Phase 17 cycle C T3.1 (R32, I9).
 *
 * Règles :
 * 1. Si requête contient déjà LIMIT n (insensible casse, hors strings/comments)
 *    → laisser tel quel.
 * 2. Sinon → append ` LIMIT <max>` à la fin avant le `;` final éventuel.
 * 3. Pour CTE (`WITH ... SELECT`), LIMIT appliqué au SELECT externe.
 *
 * Approche : on retire les commentaires et les strings du SQL pour la
 * détection LIMIT, mais on injecte dans le SQL original.
 */

/**
 * Retire commentaires (-- ... \n et /* ... *\/) et strings ('...') du SQL
 * pour faciliter le matching de keywords sans faux positifs.
 */
function stripCommentsAndStrings(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ") // commentaires fin de ligne
    .replace(/\/\*[\s\S]*?\*\//g, " ") // commentaires multi-lignes
    .replace(/'(?:[^']|'')*'/g, "''"); // strings (laisse '')
}

export function appendLimitIfMissing(sql: string, max: number): string {
  const cleaned = stripCommentsAndStrings(sql);

  // Détecte LIMIT n APRÈS le dernier SELECT (ignore LIMIT dans CTEs internes)
  // Approche : on cherche le dernier SELECT/UNION du cleaned, puis on regarde
  // si LIMIT \d+ apparaît après.
  //
  // Plus simple : on retire les contenus entre parenthèses (qui contiennent
  // les CTEs) et on regarde s'il reste un LIMIT après.
  const withoutParens = stripParens(cleaned);
  if (/\bLIMIT\s+\d+\b/i.test(withoutParens)) {
    return sql;
  }

  // Pas de LIMIT externe → injection
  // Strategie : retirer trailing whitespace, identifier le ;, préserver
  // un éventuel \n final (formatage SQL).
  const trailingMatch = sql.match(/(;?)\s*$/);
  const trailingSemi = trailingMatch?.[1] ?? "";
  const trailingNewline = sql.endsWith("\n") ? "\n" : "";
  // Body = SQL sans le trailing (espaces + ; + newline)
  const body = sql.replace(/\s*;?\s*$/, "");
  return `${body} LIMIT ${max}${trailingSemi}${trailingNewline}`;
}

/**
 * Retire les contenus entre parenthèses (récursif).
 * Permet d'isoler la requête externe d'une CTE pour la détection LIMIT.
 */
function stripParens(s: string): string {
  let result = s;
  let prev = "";
  while (result !== prev) {
    prev = result;
    result = result.replace(/\([^()]*\)/g, " ");
  }
  return result;
}
