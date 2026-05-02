/**
 * Profiling au connect — Phase 17 cycle B T2.2.
 *
 * Pour chaque table de la DataSource (max 50, R53), inspecte le schema
 * et accumule les stats dans un SchemaCacheEntry.
 *
 * Politique d'erreur (R55, I7) :
 * - 1+ tables échouent → status `partial` + `partial_tables` listés
 * - Toutes échouent → status `failed`
 * - listTables() throw → status `failed` avec 0 table profilée
 *
 * Cycle B = MVP : on capture row_count, columns (de inspectTable), et
 * les top_values pour les colonnes catégorielles via runQuery (R52).
 *
 * Cycle B+ pourrait étendre : min/max numérique, mean, null_percentage
 * via SQL d'agrégation. Pour l'instant on reste minimaliste sur ce qui
 * résout effectivement le bug `closed_won` (top_values).
 */

import type { DataSource } from "@/lib/connectors/types";
import type {
  ColumnProfile,
  SchemaCacheEntry,
  TableProfile,
  TopValue,
} from "./types";

const MAX_TABLES = 50;
const TOP_VALUES_LIMIT = 10;
const DISTINCT_COUNT_THRESHOLD = 50;

/**
 * Profile une connexion entière. Retourne le SchemaCacheEntry à écrire
 * dans `connections.schema_cache_jsonb`.
 *
 * Aucun throw : tous les cas d'erreur sont capturés et reflétés dans
 * `status` / `partial_tables`.
 */
export async function profileConnection(dataSource: DataSource): Promise<SchemaCacheEntry> {
  const synced_at = new Date().toISOString();

  // 1. Liste des tables (avec garde si listTables throw)
  let allTables: Awaited<ReturnType<DataSource["listTables"]>>;
  try {
    allTables = await dataSource.listTables();
  } catch {
    return {
      version: 1,
      synced_at,
      status: "failed",
      tables: [],
    };
  }

  // 2. Cap à MAX_TABLES (R53)
  const tablesToProfile = allTables.slice(0, MAX_TABLES);

  // 3. Profile chaque table indépendamment
  const profiles: TableProfile[] = [];
  const failedTables: string[] = [];

  for (const tableInfo of tablesToProfile) {
    try {
      const profile = await profileTable(dataSource, tableInfo.name, tableInfo.rowCount);
      profiles.push(profile);
    } catch {
      failedTables.push(tableInfo.name);
    }
  }

  // 4. Détermine le status global
  let status: SchemaCacheEntry["status"];
  if (profiles.length === 0) {
    status = "failed";
  } else if (failedTables.length > 0) {
    status = "partial";
  } else {
    status = "ok";
  }

  return {
    version: 1,
    synced_at,
    status,
    tables: profiles,
    ...(failedTables.length > 0 ? { partial_tables: failedTables } : {}),
  };
}

/**
 * Profile une table : récupère les colonnes via inspectTable, puis
 * pour chaque colonne TEXT non-nullable, calcule distinct_count + top_values
 * via runQuery (résout R22 bug `closed_won`).
 *
 * Throw si inspectTable échoue (capturé par profileConnection).
 */
async function profileTable(
  dataSource: DataSource,
  tableName: string,
  rowCount: number,
): Promise<TableProfile> {
  const detail = await dataSource.inspectTable(tableName);
  if (!detail) {
    throw new Error(`Table ${tableName} introuvable`);
  }

  const columns: ColumnProfile[] = [];

  for (const col of detail.columns) {
    const profile: ColumnProfile = {
      name: col.name,
      type: col.type,
      nullable: col.nullable,
    };

    // Top values pour TEXT non-nullables (R52, R22)
    // Best-effort : si la query échoue, on garde la colonne sans top_values
    if (isTextType(col.type) && !col.nullable) {
      try {
        const topValues = await fetchTopValues(dataSource, tableName, col.name);
        if (topValues) {
          profile.distinct_count = topValues.distinctCount;
          if (topValues.distinctCount <= DISTINCT_COUNT_THRESHOLD) {
            profile.top_values = topValues.values;
          }
        }
      } catch {
        // Best-effort : on continue sans top_values
      }
    }

    columns.push(profile);
  }

  return {
    name: tableName,
    row_count: rowCount,
    columns,
  };
}

/**
 * Récupère le distinct_count + top 10 valeurs d'une colonne TEXT.
 * Utilise SQL standard Postgres (compatible toutes DataSources SQL).
 */
async function fetchTopValues(
  dataSource: DataSource,
  tableName: string,
  columnName: string,
): Promise<{ distinctCount: number; values: TopValue[] } | null> {
  // Échappement basique des identifiants. Postgres : "<table>"."<col>"
  const safeTable = escapeIdentifier(tableName);
  const safeCol = escapeIdentifier(columnName);

  // 1. Distinct count
  const distinctSql = `SELECT count(DISTINCT ${safeCol}) as distinct_count FROM ${safeTable}`;
  const distinctRows = await dataSource.runQuery(distinctSql);
  const distinctCount = Number(distinctRows[0]?.distinct_count ?? 0);

  if (distinctCount > DISTINCT_COUNT_THRESHOLD || distinctCount === 0) {
    return { distinctCount, values: [] };
  }

  // 2. Top N values
  const topSql = `SELECT ${safeCol} as value, count(*) as count FROM ${safeTable} WHERE ${safeCol} IS NOT NULL GROUP BY ${safeCol} ORDER BY count DESC LIMIT ${TOP_VALUES_LIMIT}`;
  const topRows = await dataSource.runQuery(topSql);

  const values: TopValue[] = topRows.map((row) => ({
    value: row.value as TopValue["value"],
    count: Number(row.count),
  }));

  return { distinctCount, values };
}

/**
 * Échappement basique d'identifiant Postgres (table/column).
 * Ne supporte pas les identifiants contenant des `"` (cas extrêmes
 * non rencontrés dans nos seeds).
 */
function escapeIdentifier(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Identifier invalide pour profiling : ${name}`);
  }
  return `"${name}"`;
}

function isTextType(type: string): boolean {
  return /^(text|varchar|char|string)/i.test(type);
}
