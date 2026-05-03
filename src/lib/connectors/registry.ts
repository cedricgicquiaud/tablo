import { getStripeClient } from "@/lib/stripe/client";
import { DemoDataSource } from "./demo";
import { StripeDataSource } from "./stripe/data-source";
import { SupabaseOAuthDataSource } from "./supabase-oauth";
import { getValidAccessToken } from "./token-refresh";
import type { Connection, DataSource } from "./types";

// Convenience pour les flows qui utilisent encore la demo seule (Phase 14.1a/b).
// Sera retiré en 14.1c quand tous les flows passent une Connection.
export function getDemoDataSource(): DataSource {
  return new DemoDataSource();
}

// Route une Connection vers son implémentation DataSource.
export function getDataSource(connection: Connection): DataSource {
  switch (connection.kind) {
    case "demo":
      return new DemoDataSource();
    case "supabase": {
      const config = connection.configJsonb as { project_ref?: string };
      if (!config.project_ref) {
        throw new Error(
          `Connection ${connection.id} kind='supabase' sans project_ref dans config_jsonb`,
        );
      }
      return new SupabaseOAuthDataSource({
        projectRef: config.project_ref,
        getAccessToken: () => getValidAccessToken(connection.id),
      });
    }
    case "stripe": {
      const config = connection.configJsonb as {
        env_creds?: boolean;
        access_token?: string;
      };
      // V1 (Phase 14.3) : seul `env_creds: true` est supporté → lit
      // STRIPE_SECRET_KEY de l'env. V2 (Phase 14.4 OAuth) ajoutera la
      // route avec access_token chiffré.
      if (config.access_token) {
        // Fail-fast : V1 ne sait pas consommer un access_token user
        // (cf audit verifier 14.3). V2 retirera ce throw.
        throw new Error(
          `Stripe Connection ${connection.id} : access_token présent mais OAuth non implémenté V1 (Phase 14.4)`,
        );
      }
      if (config.env_creds !== true) {
        throw new Error(
          `Stripe Connection ${connection.id} config_jsonb invalide V1 (attendu env_creds: true)`,
        );
      }
      return new StripeDataSource({
        connectionId: connection.id,
        getStripeClient,
      });
    }
    case "postgres":
    case "csv":
      throw new Error(
        `Connector kind '${connection.kind}' not yet implemented (unsupported, Phase 14.4+).`,
      );
    default: {
      const exhaustive: never = connection.kind;
      throw new Error(`Unknown connection kind: ${String(exhaustive)}`);
    }
  }
}
