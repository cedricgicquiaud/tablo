-- Phase 14.3 — Connecteur Stripe DataSource.
-- 1. Étendre le check kind pour accepter 'stripe'.
-- 2. Modifier le trigger handle_new_user pour provisionner aussi une
--    connexion 'stripe' (kind='stripe', env_creds=true) au signup.
-- 3. Back-fill : provisionner la connection stripe pour les workspaces
--    existants (idempotent via WHERE NOT EXISTS).
--
-- Ne touche pas la connection 'demo' existante (P14.1a). User aura donc
-- 2 connections par workspace : Demo (e-commerce) + Stripe demo.
--
-- LIMITATION V1 (audit verifier 14.3) : la connection "Stripe demo" est
-- provisionnée pour TOUS les workspaces, sans vérifier que
-- STRIPE_SECRET_KEY est défini. En production sans clé Stripe, le
-- 1er chat sur cette connection throw E1 ("STRIPE_SECRET_KEY env var
-- manquant") — UX dégradée mais sécurisé (pas de fuite). Phase 14.4
-- (OAuth Stripe Connect) retire ce sentinel V1 et remplace par des
-- access_token user-owned chiffrés.

alter table public.connections drop constraint if exists connections_kind_check;
alter table public.connections add constraint connections_kind_check
  check (kind in ('supabase', 'postgres', 'csv', 'demo', 'stripe'));

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

  insert into public.connections (workspace_id, name, kind, config_jsonb)
  values (new_workspace_id, 'Stripe demo', 'stripe', jsonb_build_object('env_creds', true));

  return new;
end;
$$;

-- Provisionner aussi une connexion stripe pour les workspaces déjà créés (back-fill).
insert into public.connections (workspace_id, name, kind, config_jsonb)
select w.id, 'Stripe demo', 'stripe', jsonb_build_object('env_creds', true)
from public.workspaces w
where not exists (
  select 1 from public.connections c
  where c.workspace_id = w.id and c.kind = 'stripe'
);
