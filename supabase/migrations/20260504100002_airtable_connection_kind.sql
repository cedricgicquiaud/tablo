-- Phase 14.5 — Étend connections_kind_check pour autoriser kind='airtable'.
-- Friction découverte au smoke test : le constraint CHECK ne listait pas
-- 'airtable' parmi les valeurs autorisées (héritée de P14.4 stripe), donc
-- l'INSERT côté Server Action select-airtable-base/actions.ts échoue avec
-- "violates check constraint connections_kind_check".

alter table public.connections drop constraint if exists connections_kind_check;
alter table public.connections add constraint connections_kind_check
  check (kind in ('supabase', 'postgres', 'csv', 'demo', 'stripe', 'airtable'));
