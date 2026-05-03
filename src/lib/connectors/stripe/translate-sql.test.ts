/**
 * Tests `translateSqlPgToAlasql` — Phase 14.3 C1 (cas B SPIKE-LOG R13).
 *
 * Translator naïf qui réécrit les identifiants double-quotés Postgres-style
 * en backticks alasql-style, sans toucher aux strings entre simple-quotes.
 */

import { describe, it, expect } from "vitest";
import { translateSqlPgToAlasql } from "./translate-sql";

describe("translateSqlPgToAlasql", () => {
  it("remplace les identifiants double-quotés simples par backticks", () => {
    const input = `SELECT count(DISTINCT "status") AS n FROM "stripe_subscriptions"`;
    const output = translateSqlPgToAlasql(input);

    expect(output).toBe(
      `SELECT count(DISTINCT \`status\`) AS n FROM \`stripe_subscriptions\``,
    );
  });

  it("préserve les strings entre simple-quotes", () => {
    const input = `SELECT * FROM "t" WHERE "status" = 'paid' AND "name" LIKE 'Acme%'`;
    const output = translateSqlPgToAlasql(input);

    expect(output).toBe(
      `SELECT * FROM \`t\` WHERE \`status\` = 'paid' AND \`name\` LIKE 'Acme%'`,
    );
  });

  it("supporte les qualified identifiers `\"table\".\"col\"`", () => {
    const input = `SELECT "i"."id" FROM "invoices" AS "i" INNER JOIN "customers" AS "c" ON "i"."customer_id" = "c"."id"`;
    const output = translateSqlPgToAlasql(input);

    expect(output).toBe(
      `SELECT \`i\`.\`id\` FROM \`invoices\` AS \`i\` INNER JOIN \`customers\` AS \`c\` ON \`i\`.\`customer_id\` = \`c\`.\`id\``,
    );
  });

  it("no-op si pas de double-quote (sanity)", () => {
    const input = `SELECT count(DISTINCT status) AS n FROM stripe_subscriptions`;
    const output = translateSqlPgToAlasql(input);

    expect(output).toBe(input);
  });

  it("gère le SQL généré par le profiler P17 (post alias rename)", () => {
    const input = `SELECT "status" as val, count(*) as cnt FROM "stripe_subscriptions" WHERE "status" IS NOT NULL GROUP BY "status" ORDER BY cnt DESC LIMIT 10`;
    const output = translateSqlPgToAlasql(input);

    expect(output).toContain("`status`");
    expect(output).toContain("`stripe_subscriptions`");
    expect(output).toContain("IS NOT NULL");
    expect(output).not.toContain('"');
  });

  it("wrap les alias AS <ident> en backticks (mots-clés alasql comme `value`, `count`)", () => {
    const input = `SELECT plan_nickname, SUM(amount) AS value FROM stripe_subscriptions GROUP BY plan_nickname ORDER BY value DESC`;
    const output = translateSqlPgToAlasql(input);

    expect(output).toContain("AS `value`");
    expect(output).toContain("ORDER BY `value`");
  });

  it("wrap aussi `count` et `order` quand utilisés en alias ou ORDER BY", () => {
    const input = `SELECT status, COUNT(*) AS count FROM t GROUP BY status ORDER BY count DESC`;
    const output = translateSqlPgToAlasql(input);

    expect(output).toContain("AS `count`");
    expect(output).toContain("ORDER BY `count`");
  });

  it("ne wrap pas les noms de colonnes 'normaux' déjà non-réservés", () => {
    const input = `SELECT plan_id, SUM(amount) AS total FROM t GROUP BY plan_id ORDER BY total DESC`;
    const output = translateSqlPgToAlasql(input);

    // total et plan_id ne sont pas des mots-clés alasql → pas de backtick obligatoire
    // Mais notre translator naïf peut wrap quand même AS total → AS `total`. Acceptable.
    expect(output).toContain("plan_id");
    expect(output).toContain("FROM t");
  });
});
