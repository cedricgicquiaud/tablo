-- Phase 17 cycle C T3.3 — Table d'audit des appels du moteur AI.
--
-- Chaque exécution d'un tool (execute_sql notamment) insère une ligne
-- pour traçabilité (debug + futur monitoring coût/perf).
--
-- RLS : SELECT pour le workspace owner uniquement (audit ses propres logs).
--       INSERT via service role (admin client backend) — pas de policy
--       insert pour role authenticated, donc impossible côté client.

create table public.ai_engine_audit (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid null references public.connections(id) on delete set null,
  tool text not null,
  sql_truncated text null,
  rows_count int null,
  duration_ms int null,
  status text not null check (status in ('ok', 'error', 'truncated', 'rejected')),
  error_message text null,
  created_at timestamptz not null default now()
);

create index ai_engine_audit_workspace_created_idx
  on public.ai_engine_audit(workspace_id, created_at desc);

create index ai_engine_audit_connection_idx
  on public.ai_engine_audit(connection_id);

alter table public.ai_engine_audit enable row level security;

-- SELECT : seul le workspace owner voit ses audit logs (R36 + I12 RLS)
create policy ai_engine_audit_via_workspace_select on public.ai_engine_audit
  for select to authenticated using (
    exists (
      select 1 from public.workspaces w
      where w.id = ai_engine_audit.workspace_id
        and w.owner_user_id = auth.uid()
    )
  );

-- Pas de policy INSERT pour 'authenticated' → seul le service_role peut insérer
-- (admin client backend lors de l'exécution des tools).

comment on table public.ai_engine_audit is
  'Audit Phase 17 — chaque appel d''un tool execute_sql (ou autre) insère une ligne. RLS : SELECT par workspace owner, INSERT via service role.';
