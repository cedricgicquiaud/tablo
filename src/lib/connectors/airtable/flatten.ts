/**
 * Flatten Airtable record → SQL row — Phase 14.5 B.2.
 *
 * Transforme un record Airtable de la forme :
 *   {id, createdTime, fields: {Name, "Customer Email", Tags, ...}}
 * en row plat :
 *   {id, created_time, name, customer_email, tags, ...}
 *
 * Règles V1 (D7 SPEC) :
 *  - Column names : ASCII snake_case (cohérent avec convention SQL Tablo).
 *  - Strings/numbers/booleans : préservés tel quel.
 *  - Arrays primitive (multipleSelects, linked records) : CSV string.
 *  - Arrays of objects (attachments) : JSON string.
 *  - Single objects (collaborator) : JSON string.
 *  - Empty arrays / undefined : null.
 *
 * V2 (futur) : flatten attachments en `name|url` plus lisible, parser
 * collaborateur en `display_name`, etc.
 */

export type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

/**
 * Normalise un column name Airtable en ASCII snake_case.
 *
 *  "Customer Email"  → "customer_email"
 *  "📧 Email"        → "email"
 *  "Téléphone"       → "telephone"
 *  "Pays/Région"     → "pays_region"
 *  "Field 1"         → "field_1"
 */
export function normalizeColumnName(input: string): string {
  return input
    .normalize("NFD")
    // strip diacritics
    .replace(/[̀-ͯ]/g, "")
    // remplace tout char non-alphanumérique par underscore
    .replace(/[^a-zA-Z0-9]+/g, "_")
    // collapse multiple underscores
    .replace(/_+/g, "_")
    // trim leading/trailing underscores
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

/**
 * Flatten un record Airtable en row plat. Si `expectedFields` est fourni,
 * les fields absents seront `null` (cohérence DB shape pour SQL JOIN).
 */
export function flattenAirtableRecord(
  record: AirtableRecord,
  expectedFields?: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: record.id,
    created_time: record.createdTime,
  };

  // Si expectedFields fourni, init tous à null pour shape cohérente
  if (expectedFields) {
    for (const fieldName of expectedFields) {
      result[normalizeColumnName(fieldName)] = null;
    }
  }

  for (const [fieldName, value] of Object.entries(record.fields)) {
    const col = normalizeColumnName(fieldName);
    result[col] = flattenValue(value);
  }

  return result;
}

function flattenValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    // Array of primitives (string/number) → CSV
    if (value.every((v) => typeof v === "string" || typeof v === "number")) {
      return value.join(",");
    }
    // Array of objects (attachments, multi collaborators) → JSON string
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    // Single collaborator, single attachment, etc → JSON string V1
    return JSON.stringify(value);
  }

  // Fallback safety
  return String(value);
}
