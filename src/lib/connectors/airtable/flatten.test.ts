/**
 * Tests flatten Airtable record → SQL row — Phase 14.5 B.2.
 *
 * Couvre R16 (flatten records → row plat), D7 (multi/array → CSV V1,
 * attachments → JSON V1), normalisation column names ASCII snake_case.
 */

import { describe, expect, it } from "vitest";
import { flattenAirtableRecord, normalizeColumnName } from "./flatten";

describe("normalizeColumnName", () => {
  it("simple → snake_case", () => {
    expect(normalizeColumnName("Name")).toBe("name");
    expect(normalizeColumnName("Customer Email")).toBe("customer_email");
    expect(normalizeColumnName("Last Modified Time")).toBe("last_modified_time");
  });

  it("characters spéciaux / accents → ASCII", () => {
    expect(normalizeColumnName("Téléphone")).toBe("telephone");
    expect(normalizeColumnName("Prénom")).toBe("prenom");
    expect(normalizeColumnName("Pays/Région")).toBe("pays_region");
  });

  it("emojis / chars non-alphanumériques → strip", () => {
    expect(normalizeColumnName("📧 Email")).toBe("email");
    expect(normalizeColumnName("Status (active)")).toBe("status_active");
  });

  it("digits préservés", () => {
    expect(normalizeColumnName("Field 1")).toBe("field_1");
    expect(normalizeColumnName("Q4 2024")).toBe("q4_2024");
  });

  it("multiple underscores collapsed", () => {
    expect(normalizeColumnName("A   B")).toBe("a_b");
    expect(normalizeColumnName("__test__")).toBe("test");
  });
});

describe("flattenAirtableRecord", () => {
  it("happy path — record minimal flatten avec id + createdTime + 1 field", () => {
    const record = {
      id: "recABC",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Name: "Acme Corp",
      },
    };
    expect(flattenAirtableRecord(record)).toEqual({
      id: "recABC",
      created_time: "2024-01-15T10:00:00.000Z",
      name: "Acme Corp",
    });
  });

  it("R16 — multiple fields avec normalisation column names", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Name: "X",
        "Customer Email": "x@y.com",
        Status: "Active",
      },
    };
    const result = flattenAirtableRecord(record);
    expect(result).toMatchObject({
      id: "rec1",
      name: "X",
      customer_email: "x@y.com",
      status: "Active",
    });
  });

  it("D7 — multipleSelects (array) → CSV string", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Tags: ["urgent", "B2B", "premium"],
      },
    };
    expect(flattenAirtableRecord(record).tags).toBe("urgent,B2B,premium");
  });

  it("D7 — multipleRecordLinks (array of ids) → CSV string", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        "Linked Deals": ["rec1", "rec2", "rec3"],
      },
    };
    expect(flattenAirtableRecord(record).linked_deals).toBe(
      "rec1,rec2,rec3",
    );
  });

  it("D7 — multipleAttachments (array of objects) → JSON string V1", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Photos: [
          { id: "att1", url: "https://x", filename: "a.png" },
          { id: "att2", url: "https://y", filename: "b.png" },
        ],
      },
    };
    const result = flattenAirtableRecord(record);
    expect(typeof result.photos).toBe("string");
    expect(result.photos).toContain("att1");
    expect(result.photos).toContain("att2");
  });

  it("number/boolean préservés (pas convertis en string)", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Amount: 1500,
        "Is Active": true,
      },
    };
    const result = flattenAirtableRecord(record);
    expect(result.amount).toBe(1500);
    expect(result.is_active).toBe(true);
  });

  it("undefined / champ absent → null (cohérence DB)", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Name: "X",
        // 'Email' field n'est pas dans fields
      },
    };
    const result = flattenAirtableRecord(record, ["Name", "Email"]);
    expect(result.name).toBe("X");
    expect(result.email).toBeNull();
  });

  it("null preservé", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Note: null,
      },
    };
    expect(flattenAirtableRecord(record).note).toBeNull();
  });

  it("array vide → null (V1 simplification)", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        Tags: [],
      },
    };
    expect(flattenAirtableRecord(record).tags).toBeNull();
  });

  it("singleSelect / collaborator object → string ou JSON", () => {
    const record = {
      id: "rec1",
      createdTime: "2024-01-15T10:00:00.000Z",
      fields: {
        // Single collaborator → object {id, name, email}
        Owner: { id: "usr1", name: "Alice", email: "a@x.com" },
      },
    };
    const result = flattenAirtableRecord(record);
    // V1 : object → JSON string
    expect(typeof result.owner).toBe("string");
    expect(result.owner).toContain("Alice");
  });
});
