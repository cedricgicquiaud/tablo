type PublicEnv = {
  url: string;
  anonKey: string;
};

type AdminEnv = PublicEnv & {
  serviceRoleKey: string;
};

export function getSupabaseEnv(): PublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Run `supabase start` and copy values from `supabase status` into .env.local",
    );
  }
  return { url, anonKey };
}

// Server-only : ne JAMAIS importer depuis un fichier consommé côté client.
// Le bundler client ne doit pas voir ce nom de variable d'env.
export function getSupabaseAdminEnv(): AdminEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return { url, anonKey, serviceRoleKey };
}
