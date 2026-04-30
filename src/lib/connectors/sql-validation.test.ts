import { describe, expect, it } from "vitest";
import { validateReadOnlySql } from "./sql-validation";

describe("validateReadOnlySql", () => {
  // Cas valides : SELECT et WITH passent.
  it("accepte un SELECT simple", () => {
    expect(() => validateReadOnlySql("SELECT * FROM users")).not.toThrow();
  });

  it("accepte un WITH (CTE) suivi d'un SELECT", () => {
    expect(() =>
      validateReadOnlySql("WITH q AS (SELECT 1 AS n) SELECT * FROM q"),
    ).not.toThrow();
  });

  it("accepte du SELECT avec espaces et casse mélangés", () => {
    expect(() =>
      validateReadOnlySql("  \n  select  id  from  orders  "),
    ).not.toThrow();
  });

  // Cas bloqués : DDL/DML.
  it("rejette INSERT", () => {
    expect(() =>
      validateReadOnlySql("INSERT INTO users (id) VALUES (1)"),
    ).toThrow(/select|with/i);
  });

  it("rejette UPDATE", () => {
    expect(() =>
      validateReadOnlySql("UPDATE users SET name='x'"),
    ).toThrow(/select|with/i);
  });

  it("rejette DELETE", () => {
    expect(() => validateReadOnlySql("DELETE FROM users")).toThrow(/select|with/i);
  });

  it("rejette DROP", () => {
    expect(() => validateReadOnlySql("DROP TABLE users")).toThrow(/select|with/i);
  });

  it("rejette CREATE", () => {
    expect(() => validateReadOnlySql("CREATE TABLE x (id int)")).toThrow(
      /select|with/i,
    );
  });

  it("rejette ALTER", () => {
    expect(() => validateReadOnlySql("ALTER TABLE users ADD COLUMN x int")).toThrow(
      /select|with/i,
    );
  });

  it("rejette TRUNCATE", () => {
    expect(() => validateReadOnlySql("TRUNCATE users")).toThrow(/select|with/i);
  });

  // Cas dangereux : trick avec commentaire ou multi-statement.
  it("rejette un multi-statement SELECT; DELETE", () => {
    expect(() =>
      validateReadOnlySql("SELECT 1; DELETE FROM users"),
    ).toThrow(/multi/i);
  });

  it("rejette un commentaire qui masque DROP : SELECT 1 -- ; DROP TABLE x", () => {
    // Multi-statement détecté avant le commentaire, ou commentaire stripped.
    // Quoi qu'il arrive, on ne doit pas valider une ligne contenant un keyword DROP.
    expect(() =>
      validateReadOnlySql("SELECT 1; -- comment\nDROP TABLE x"),
    ).toThrow();
  });

  it("rejette une chaine vide", () => {
    expect(() => validateReadOnlySql("")).toThrow();
  });

  it("rejette une chaine espaces only", () => {
    expect(() => validateReadOnlySql("   \n  ")).toThrow();
  });
});
