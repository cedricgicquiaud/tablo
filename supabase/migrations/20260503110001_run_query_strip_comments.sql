-- Phase 17 cycle C — Améliore run_readonly_query pour accepter les SQLs
-- préfixés par des commentaires (cas observé : l'IA met `-- explanation\n`
-- avant le SELECT, ce qui faisait échouer le check `like 'select%'`).
--
-- Stripe les commentaires SQL en début (-- ... \n et /* ... */) avant le
-- check, mais préserve le SQL original pour l'exécution (les commentaires
-- ne posent pas de problème à Postgres lui-même).

create or replace function public.run_readonly_query(query_sql text)
returns jsonb
language plpgsql
security invoker
stable
as $$
declare
  result jsonb;
  trimmed text;
  cleaned text;
begin
  trimmed := trim(both from query_sql);

  -- Strip leading SQL comments (-- single-line, /* */ multi-line) puis re-trim.
  -- Cycle C : nécessaire car le LLM ajoute parfois `-- analyse: ...\n` avant SELECT.
  cleaned := regexp_replace(
    trimmed,
    '^((--[^\n]*\n|/\*[\s\S]*?\*/|\s)+)',
    '',
    ''
  );

  -- Doit commencer par SELECT ou WITH (après strip commentaires)
  if not (lower(cleaned) like 'select%' or lower(cleaned) like 'with%') then
    raise exception 'Only SELECT/WITH queries allowed';
  end if;

  -- Bloque les mots-clés dangereux (DDL/DML basique) sur le SQL cleaned.
  if lower(cleaned) ~ '\m(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|do)\m' then
    raise exception 'DDL/DML keywords forbidden';
  end if;

  -- Exécute le SQL ORIGINAL (commentaires ok pour Postgres) via CTE wrapper,
  -- limite hard à 100 lignes.
  execute format(
    'with q as (%s) select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from q limit 100) t',
    trimmed
  ) into result;

  return result;
end;
$$;
