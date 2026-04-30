import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inspectTable, listTables } from "@/lib/ai/introspect";
import type { DataSource, QueryRow, TableDetail, TableInfo } from "./types";

// Connecteur Demo e-commerce — passe par le admin client local.
// La validation SQL est gérée côté caller (cycle 14.1b).
export class DemoDataSource implements DataSource {
  async listTables(): Promise<TableInfo[]> {
    const admin = createSupabaseAdminClient();
    return listTables(admin);
  }

  async inspectTable(name: string): Promise<TableDetail | null> {
    const admin = createSupabaseAdminClient();
    return inspectTable(admin, name);
  }

  async runQuery(sql: string): Promise<QueryRow[]> {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("run_readonly_query", {
      query_sql: sql,
    });
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) {
      throw new Error("run_readonly_query: réponse inattendue (non-array)");
    }
    return data as QueryRow[];
  }
}
