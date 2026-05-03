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
});
