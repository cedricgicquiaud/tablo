-- RPC pour exécuter une SELECT générée par AI, en mode read-only.
-- Sécurité multi-niveaux :
-- 1. Le SQL doit commencer par SELECT/WITH (validation côté SQL).
-- 2. Aucun mot-clé DDL/DML autorisé (validation côté SQL via regex).
-- 3. Limite de lignes hard-coded à 100.
-- 4. Le rôle Postgres effective est l'appelant (security invoker).
-- 5. Côté TS : filtre supplémentaire en JS avant appel.
-- Phase 15 : appel via service-role admin client (bypass RLS demo data fictive).
-- Phase 14+ : appel via rôle dédié read-only restrictif sur la DB user.

create or replace function public.run_readonly_query(query_sql text)
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
  result jsonb;
  trimmed text;
begin
  trimmed := trim(both from query_sql);

  -- Doit commencer par SELECT ou WITH
  if not (lower(trimmed) like 'select%' or lower(trimmed) like 'with%') then
    raise exception 'Only SELECT/WITH queries allowed';
  end if;

  -- Bloque les mots-clés dangereux (DDL/DML basique).
  if lower(trimmed) ~ '\m(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|do)\m' then
    raise exception 'DDL/DML keywords forbidden';
  end if;

  -- Exécute via CTE wrapper, limite hard à 100 lignes.
  execute format(
    'with q as (%s) select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from q limit 100) t',
    trimmed
  ) into result;

  return result;
end;
$$;
