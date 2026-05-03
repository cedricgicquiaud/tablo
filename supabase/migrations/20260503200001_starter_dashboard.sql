-- Phase 18 — Auto-generated starter dashboard.
--
-- Ajoute 2 colonnes à `dashboards` pour suivre l'état de la génération
-- automatique post-OAuth :
-- - `starter_generated_at` : timestamp de fin (R2 idempotence)
-- - `starter_generating_at` : timestamp de début (UI progress R7 + stale R10)
--
-- Étend le check `ai_engine_audit.tool` pour accepter `starter_dashboard`
-- (R9 audit dans la table existante).

alter table public.dashboards
  add column if not exists starter_generated_at timestamptz null,
  add column if not exists starter_generating_at timestamptz null;

-- Index pour le polling UI : on filtre les dashboards en cours de génération
-- toutes les 2s côté client. Index partiel pour minimiser la taille.
create index if not exists dashboards_starter_generating_at_idx
  on public.dashboards(starter_generating_at)
  where starter_generating_at is not null;

-- Étendre le check tool pour accepter `starter_dashboard`
alter table public.ai_engine_audit
  drop constraint if exists ai_engine_audit_tool_check;
alter table public.ai_engine_audit
  add constraint ai_engine_audit_tool_check
  check (tool in (
    'list_tables',
    'inspect_table',
    'execute_sql',
    'propose_widget',
    'suggest_follow_ups',
    'starter_dashboard'
  ));
