import { DemoDataSource } from "./demo";
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
    case "postgres":
    case "csv":
      throw new Error(
        `Connector kind '${connection.kind}' not yet implemented (Phase 14.3+).`,
      );
    default: {
      const exhaustive: never = connection.kind;
      throw new Error(`Unknown connection kind: ${String(exhaustive)}`);
    }
  }
}
