/**
 * Tests field-type-mapping Airtable → SQL — Phase 14.5 B.1.
 *
 * Couvre R15 (inspectTable retourne types SQL cohérents), D7 (mapping V1
 * simple : text/numeric/boolean/date/timestamp + fallback text).
 */

import { describe, expect, it } from "vitest";
import { airtableFieldToSqlType } from "./field-type-mapping";

describe("airtableFieldToSqlType", () => {
  it("text-like types → 'text'", () => {
    expect(airtableFieldToSqlType("singleLineText")).toBe("text");
    expect(airtableFieldToSqlType("multilineText")).toBe("text");
    expect(airtableFieldToSqlType("email")).toBe("text");
    expect(airtableFieldToSqlType("url")).toBe("text");
    expect(airtableFieldToSqlType("phoneNumber")).toBe("text");
    expect(airtableFieldToSqlType("richText")).toBe("text");
    expect(airtableFieldToSqlType("singleSelect")).toBe("text");
    expect(airtableFieldToSqlType("barcode")).toBe("text");
  });

  it("numeric-like types → 'numeric'", () => {
    expect(airtableFieldToSqlType("number")).toBe("numeric");
    expect(airtableFieldToSqlType("percent")).toBe("numeric");
    expect(airtableFieldToSqlType("currency")).toBe("numeric");
    expect(airtableFieldToSqlType("rating")).toBe("numeric");
    expect(airtableFieldToSqlType("count")).toBe("numeric");
    expect(airtableFieldToSqlType("autoNumber")).toBe("numeric");
    expect(airtableFieldToSqlType("duration")).toBe("numeric");
  });

  it("checkbox → 'boolean'", () => {
    expect(airtableFieldToSqlType("checkbox")).toBe("boolean");
  });

  it("date → 'date'", () => {
    expect(airtableFieldToSqlType("date")).toBe("date");
  });

  it("datetime-like → 'timestamp'", () => {
    expect(airtableFieldToSqlType("dateTime")).toBe("timestamp");
    expect(airtableFieldToSqlType("createdTime")).toBe("timestamp");
    expect(airtableFieldToSqlType("lastModifiedTime")).toBe("timestamp");
  });

  it("D7 — multi/array types V1 simplifiés en 'text' (CSV après flatten)", () => {
    expect(airtableFieldToSqlType("multipleSelects")).toBe("text");
    expect(airtableFieldToSqlType("multipleRecordLinks")).toBe("text");
    expect(airtableFieldToSqlType("multipleAttachments")).toBe("text");
    expect(airtableFieldToSqlType("multipleCollaborators")).toBe("text");
  });

  it("D7 — types complexes (formula/lookup/rollup) V1 fallback 'text'", () => {
    // Formula/lookup/rollup peuvent retourner n'importe quel type Airtable
    // selon leur expression. V1 : on les traite text. V2 (futur) : inférer
    // via `result.type` du field schema.
    expect(airtableFieldToSqlType("formula")).toBe("text");
    expect(airtableFieldToSqlType("lookup")).toBe("text");
    expect(airtableFieldToSqlType("rollup")).toBe("text");
  });

  it("D7 — type inconnu → fallback 'text'", () => {
    expect(airtableFieldToSqlType("unknownFutureType")).toBe("text");
    expect(airtableFieldToSqlType("")).toBe("text");
  });

  it("collaborateurs / metadata → 'text'", () => {
    expect(airtableFieldToSqlType("singleCollaborator")).toBe("text");
    expect(airtableFieldToSqlType("createdBy")).toBe("text");
    expect(airtableFieldToSqlType("lastModifiedBy")).toBe("text");
  });
});
