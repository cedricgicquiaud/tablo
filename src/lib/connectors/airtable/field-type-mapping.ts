/**
 * Mapping types Airtable → types SQL — Phase 14.5 B.1.
 *
 * V1 simple (D7 SPEC) : 5 types SQL — text, numeric, boolean, date, timestamp.
 * Tout type inconnu ou complexe (formula, lookup, rollup, multi-array) →
 * fallback `text` (la valeur sera flatten en string CSV/JSON par
 * `flattenAirtableRecord` côté B.2).
 *
 * V2 (futur) : inférer les formula/lookup via `result.type` exposé par
 * l'API meta tables (`fields[].options.result.type` quand applicable).
 *
 * Cf docs : https://airtable.com/developers/web/api/field-model
 */

const TEXT_TYPES = new Set([
  "singleLineText",
  "multilineText",
  "email",
  "url",
  "phoneNumber",
  "richText",
  "singleSelect",
  "barcode",
  "singleCollaborator",
  "createdBy",
  "lastModifiedBy",
  "externalSyncSource",
  "aiText",
  "button",
  // Multi/array types V1 → flatten en CSV string (D7)
  "multipleSelects",
  "multipleRecordLinks",
  "multipleAttachments",
  "multipleCollaborators",
  // Complex types V1 fallback (D7) — peuvent retourner n'importe quel type
  // Airtable selon l'expression. V1 : on les traite text. V2 (futur) : inférer
  // via `result.type` du field schema.
  "formula",
  "lookup",
  "rollup",
]);

const NUMERIC_TYPES = new Set([
  "number",
  "percent",
  "currency",
  "rating",
  "count",
  "autoNumber",
  "duration",
]);

const TIMESTAMP_TYPES = new Set([
  "dateTime",
  "createdTime",
  "lastModifiedTime",
]);

export function airtableFieldToSqlType(airtableType: string): string {
  if (TEXT_TYPES.has(airtableType)) return "text";
  if (NUMERIC_TYPES.has(airtableType)) return "numeric";
  if (TIMESTAMP_TYPES.has(airtableType)) return "timestamp";
  if (airtableType === "checkbox") return "boolean";
  if (airtableType === "date") return "date";
  // Fallback safety : type inconnu / future → text (flatten ASCII)
  return "text";
}
