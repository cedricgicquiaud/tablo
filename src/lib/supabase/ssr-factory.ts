import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { DashboardClient } from "@/lib/supabase/types";

export function createSsrClient(cookies: CookieMethodsServer): DashboardClient {
  const { url, anonKey } = getSupabaseEnv();
  return createServerClient<Database>(url, anonKey, { cookies });
}
