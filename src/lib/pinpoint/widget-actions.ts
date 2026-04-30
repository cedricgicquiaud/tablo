"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WidgetSchema } from "@/lib/ai/widget-schema";
import type { PinResult } from "./widget-actions.types";

// Tailles par défaut react-grid-layout selon le kind du widget.
const DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  metric_card: { w: 3, h: 3 },
  time_series: { w: 8, h: 4 },
  bar_chart: { w: 6, h: 4 },
  donut: { w: 5, h: 4 },
};

export async function pinWidget(
  dashboardId: string,
  configJson: unknown,
  connectionId?: string,
): Promise<PinResult> {
  const parsed = WidgetSchema.safeParse(configJson);
  if (!parsed.success) {
    return { ok: false, error: "Config widget invalide." };
  }
  const size = DEFAULT_SIZE[parsed.data.kind] ?? { w: 4, h: 4 };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("widgets")
    .insert({
      dashboard_id: dashboardId,
      connection_id: connectionId ?? null,
      kind: parsed.data.kind,
      config_jsonb: parsed.data,
      position_jsonb: { x: 0, y: 0, w: size.w, h: size.h },
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/app/dashboards/${dashboardId}`);
  return { ok: true, widgetId: data.id };
}

export async function deleteWidget(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const dashboardId = String(formData.get("dashboardId") ?? "");
  if (!id || !dashboardId) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("widgets").delete().eq("id", id);
  revalidatePath(`/app/dashboards/${dashboardId}`);
}
