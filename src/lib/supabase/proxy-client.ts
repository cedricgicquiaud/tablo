import type { NextRequest, NextResponse } from "next/server";
import { createSsrClient } from "@/lib/supabase/ssr-factory";

export function createSupabaseProxyClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createSsrClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set({ name, value, ...options });
      }
    },
  });
}
