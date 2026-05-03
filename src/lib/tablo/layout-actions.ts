"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WidgetPosition = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

// Update bulk des positions des widgets après drag/resize.
// Pas de validation lourde — les valeurs sortent de react-grid-layout
// et la RLS garantit que le user ne peut update que ses propres widgets.
export async function updateWidgetsLayout(
  dashboardId: string,
  positions: WidgetPosition[],
): Promise<{ ok: boolean; error?: string }> {
  if (positions.length === 0) return { ok: true };

  const supabase = await createSupabaseServerClient();
  // Updates parallèles (sécurisé par RLS workspace_id).
  const results = await Promise.all(
    positions.map((p) =>
      supabase
        .from("widgets")
        .update({ position_jsonb: { x: p.x, y: p.y, w: p.w, h: p.h } })
        .eq("id", p.id)
        .eq("dashboard_id", dashboardId),
    ),
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { ok: false, error: failed.error.message };
  }
  revalidatePath(`/app/dashboards/${dashboardId}`);
  return { ok: true };
}
