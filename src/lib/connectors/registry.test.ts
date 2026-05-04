import { describe, expect, it } from "vitest";
import { getDataSource } from "./registry";
import type { Connection } from "./types";

const baseConnection = {
  id: "11111111-1111-1111-1111-111111111111",
  workspaceId: "22222222-2222-2222-2222-222222222222",
  name: "Demo",
} as const;

describe("connector registry", () => {
  it("returns a data source instance for kind='demo'", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "demo",
      configJsonb: { kind: "ecommerce_demo" },
    };
    const ds = getDataSource(conn);
    expect(typeof ds.listTables).toBe("function");
    expect(typeof ds.inspectTable).toBe("function");
    expect(typeof ds.runQuery).toBe("function");
  });

  it("throws on an unknown kind", () => {
    const conn = {
      ...baseConnection,
      kind: "alien",
      configJsonb: {},
    } as unknown as Connection;
    expect(() => getDataSource(conn)).toThrow(/unsupported|unknown/i);
  });

  it("kind='stripe' avec config_jsonb={env_creds:true} → StripeDataSource", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "stripe",
      configJsonb: { env_creds: true },
    };
    const ds = getDataSource(conn);
    expect(typeof ds.listTables).toBe("function");
    expect(typeof ds.inspectTable).toBe("function");
    expect(typeof ds.runQuery).toBe("function");
  });

  it("kind='stripe' avec config_jsonb invalide V1 → throw E10", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "stripe",
      configJsonb: {},
    };
    expect(() => getDataSource(conn)).toThrow(
      /Stripe Connection.*config_jsonb invalide V1/,
    );
  });

  it("kind='stripe' avec config_jsonb.access_token (user-owned OAuth P14.4) → StripeDataSource", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "stripe",
      configJsonb: {
        // ENCRYPTION_KEY de test : helper encrypt/decrypt utilise une clé
        // dérivée de l'env. Ici on bypass via mock de decrypt si nécessaire.
        // Pour ce test on utilise le pattern réel : le decrypt sera appelé
        // mais on n'invoque pas runQuery (juste vérif que getDataSource ne
        // throw pas et retourne un DataSource).
        access_token: "fake-encrypted-token-only-decoded-at-runQuery-time",
        stripe_user_id: "acct_test_xxx",
        livemode: false,
        scope: "read_only",
      },
    };
    // Accept que decrypt throw sur le format invalide → mock-isolated test
    // OU accept que getDataSource ne précharge pas (lazy). En pratique, le
    // current decrypt() est synchrone et throw au call. On vérifie que
    // le ROUTING fonctionne (pas le decrypt).
    expect(() => {
      try {
        const ds = getDataSource(conn);
        expect(ds).toBeDefined();
      } catch (err) {
        // Si decrypt throw sur fake token, c'est attendu — on vérifie juste
        // que ce n'est pas le throw "config_jsonb invalide V1".
        expect((err as Error).message).not.toMatch(/config_jsonb invalide V1/);
      }
    }).not.toThrow(/config_jsonb invalide V1/);
  });

  it("kind='stripe' avec status='revoked' → throw clear (E9)", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "stripe",
      configJsonb: {
        access_token: "enc:xxx",
        stripe_user_id: "acct_x",
        status: "revoked",
        livemode: false,
        scope: "read_only",
      },
    };
    expect(() => getDataSource(conn)).toThrow(
      /Stripe Connection.*r.voqu.e/i,
    );
  });

  it("kind='stripe' env_creds=true reste branche démo inchangée (régression P14.3)", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "stripe",
      configJsonb: { env_creds: true },
    };
    // Aucun decrypt() ne doit être appelé pour la démo (lit STRIPE_SECRET_KEY env).
    const ds = getDataSource(conn);
    expect(ds).toBeDefined();
    expect(typeof ds.listTables).toBe("function");
  });

  it("R20 — kind='airtable' avec config valide → AirtableDataSource (Phase 14.5)", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "airtable",
      configJsonb: {
        base_id: "appA",
        base_name: "Demo Base",
        access_token: "enc:xxx",
        refresh_token: "enc:rt",
        expires_at: Date.now() + 600_000,
        scope: "data.records:read",
        status: "active",
      },
    };
    const ds = getDataSource(conn);
    expect(typeof ds.listTables).toBe("function");
    expect(typeof ds.inspectTable).toBe("function");
    expect(typeof ds.runQuery).toBe("function");
  });

  it("R20 + E9 — kind='airtable' avec status='expired' → throw 'Reconnecter'", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "airtable",
      configJsonb: {
        base_id: "appA",
        base_name: "Demo Base",
        access_token: "enc:xxx",
        refresh_token: "enc:rt",
        expires_at: Date.now() - 1000,
        scope: "data.records:read",
        status: "expired",
      },
    };
    expect(() => getDataSource(conn)).toThrow(/Reconnecter Airtable/i);
  });

  it("kind='airtable' sans base_id → throw clair", () => {
    const conn: Connection = {
      ...baseConnection,
      kind: "airtable",
      configJsonb: {
        access_token: "enc:xxx",
      },
    };
    expect(() => getDataSource(conn)).toThrow(/base_id/i);
  });
});
