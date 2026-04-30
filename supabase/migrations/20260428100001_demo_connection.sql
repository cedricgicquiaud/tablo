-- Phase 14.1a — Connecteur Demo.
-- 1. Étendre le check kind pour accepter 'demo'.
-- 2. Modifier le trigger handle_new_user pour provisionner une connexion 'demo' au signup.

alter table public.connections drop constraint if exists connections_kind_check;
alter table public.connections add constraint connections_kind_check
  check (kind in ('supabase', 'postgres', 'csv', 'demo'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces (owner_user_id, name)
  values (new.id, 'Mon workspace')
  returning id into new_workspace_id;

  insert into public.connections (workspace_id, name, kind, config_jsonb)
  values (new_workspace_id, 'Demo (e-commerce)', 'demo', jsonb_build_object('kind', 'ecommerce_demo'));

  return new;
end;
$$;

-- Provisionner aussi une connexion demo pour les workspaces déjà créés (back-fill).
insert into public.connections (workspace_id, name, kind, config_jsonb)
select w.id, 'Demo (e-commerce)', 'demo', jsonb_build_object('kind', 'ecommerce_demo')
from public.workspaces w
where not exists (
  select 1 from public.connections c
  where c.workspace_id = w.id and c.kind = 'demo'
);
