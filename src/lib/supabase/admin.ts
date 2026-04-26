import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAdminEnv } from "@/lib/supabase/env";
import type { DashboardClient } from "@/lib/supabase/types";

export function createSupabaseAdminClient(): DashboardClient {
  const { url, serviceRoleKey } = getSupabaseAdminEnv();
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function truncateDemoTables(admin: DashboardClient): Promise<void> {
  await admin.from("events").delete().gt("id", 0);
  await admin.from("subscriptions").delete().not("id", "is", null);
  await admin.from("users").delete().not("id", "is", null);
}
