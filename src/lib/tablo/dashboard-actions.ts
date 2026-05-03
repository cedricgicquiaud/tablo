"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyWorkspace } from "@/lib/queries/tablo";

export type CreateDashboardState = { error: string | null };

export async function createDashboard(
  _prev: CreateDashboardState,
  formData: FormData,
): Promise<CreateDashboardState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom est requis." };
  if (name.length > 80) return { error: "80 caractères max." };

  const supabase = await createSupabaseServerClient();
  const workspace = await getMyWorkspace(supabase);
  if (!workspace) return { error: "Workspace introuvable." };

  const { data, error } = await supabase
    .from("dashboards")
    .insert({ workspace_id: workspace.id, name })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/app", "layout");
  redirect(`/app/dashboards/${data.id}`);
}

export async function deleteDashboard(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("dashboards").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app", "layout");
}
