// Validation SQL côté Tablo avant envoi à un connecteur.
// L'API Supabase Management exécute en privilèges admin (postgres user) → on doit empêcher
// toute écriture / DDL / multi-statement / trick qui passerait par notre couche.
//
// Stratégie : strip commentaires + check 1ère keyword + détection ';' qui sépare des statements.

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "CREATE",
  "ALTER",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "VACUUM",
  "REINDEX",
  "CLUSTER",
  "EXECUTE",
  "CALL",
];

function stripComments(sql: string): string {
  // Supprime les commentaires SQL : -- jusqu'à fin de ligne, /* ... */ multi-lignes.
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
}

function stripStringLiterals(sql: string): string {
  // Supprime les contenus entre apostrophes pour ne pas matcher des keywords contenus dans des strings.
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}

export function validateReadOnlySql(sql: string): void {
  if (!sql || typeof sql !== "string") {
    throw new Error("SQL vide ou invalide");
  }
  const trimmed = sql.trim();
  if (trimmed.length === 0) {
    throw new Error("SQL vide");
  }

  const cleaned = stripStringLiterals(stripComments(trimmed));

  // Multi-statement : un ';' suivi de quelque chose de non-vide.
  // On tolère un ';' final (trailing).
  const withoutTrailingSemi = cleaned.replace(/;\s*$/, "");
  if (/;\s*\S/.test(withoutTrailingSemi)) {
    throw new Error("SQL multi-statement interdit (un seul SELECT/WITH)");
  }

  // 1er keyword : doit être SELECT ou WITH.
  const firstKeyword = withoutTrailingSemi.match(/^\s*([A-Za-z]+)/);
  const head = firstKeyword?.[1]?.toUpperCase();
  if (head !== "SELECT" && head !== "WITH") {
    throw new Error(
      `SQL doit commencer par SELECT ou WITH (reçu : ${head ?? "?"})`,
    );
  }

  // Détection des keywords interdits dans le corps (en standalone word).
  const upper = withoutTrailingSemi.toUpperCase();
  for (const kw of FORBIDDEN_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b`);
    if (re.test(upper)) {
      throw new Error(`Keyword interdit : ${kw}`);
    }
  }
}
