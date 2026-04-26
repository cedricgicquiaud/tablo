import { cookies } from "next/headers";
import { createSsrClient } from "@/lib/supabase/ssr-factory";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createSsrClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Server Component context : cookie store en lecture seule. Le refresh
        // de session est délégué au proxy (cf. doc @supabase/ssr).
      }
    },
  });
}
