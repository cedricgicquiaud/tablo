"use server";

import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/auth/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignUpState = { error: string | null };

export async function signUp(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }
  if (password.length < 8) {
    return { error: "Mot de passe : 8 caractères minimum." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: error.message };
  }
  redirect(ROUTES.APP);
}
