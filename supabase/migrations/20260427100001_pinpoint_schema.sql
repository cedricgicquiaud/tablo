-- Pinpoint multi-tenant schema (Phase 13).
-- Tables app : workspaces, connections, dashboards, widgets, ai_threads.
-- RLS scopée par workspace_id. Le user ne voit que SES workspaces.

-- ======================
-- workspaces
-- ======================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  created_at timestamptz not null default now()
);

create index workspaces_owner_idx on public.workspaces(owner_user_id);

-- ======================
-- connections (sources de données externes : Supabase user, Postgres direct, CSV)
-- ======================
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('supabase', 'postgres', 'csv')),
  -- config_jsonb : { url, anon_key_encrypted, service_role_encrypted } pour supabase
  --                { host, port, database, user, password_encrypted, ssl } pour postgres
  --                { storage_path, columns } pour csv
  config_jsonb jsonb not null,
  schema_cache_jsonb jsonb null,
  schema_synced_at timestamptz null,
  created_at timestamptz not null default now()
);

create index connections_workspace_idx on public.connections(workspace_id);

-- ======================
-- dashboards
-- ======================
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  -- layout_jsonb : { cols: 12, rows: [...], breakpoints: {...} } react-grid-layout shape
  layout_jsonb jsonb not null default '{"cols":12,"rows":[]}',
  palette text not null default 'terracotta' check (palette in ('terracotta', 'editorial', 'forest', 'midnight', 'mono')),
  mode text not null default 'light' check (mode in ('light', 'dark')),
  radius text not null default 'soft' check (radius in ('sharp', 'soft', 'pill')),
  custom_accent text null,
  created_at timestamptz not null default now()
);

create index dashboards_workspace_idx on public.dashboards(workspace_id);

-- ======================
-- widgets
-- ======================
create table public.widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  connection_id uuid null references public.connections(id) on delete set null,
  -- kind = generic widget type
  kind text not null check (kind in ('metric_card', 'time_series', 'bar_chart', 'donut', 'gauge', 'data_table', 'funnel', 'event_timeline')),
  -- config_jsonb : { title, query: { type: 'sql'|'rpc', raw, params }, mapping, format }
  config_jsonb jsonb not null,
  -- position : { x, y, w, h } react-grid-layout cell
  position_jsonb jsonb not null default '{"x":0,"y":0,"w":4,"h":4}',
  created_at timestamptz not null default now()
);

create index widgets_dashboard_idx on public.widgets(dashboard_id);
create index widgets_connection_idx on public.widgets(connection_id);

-- ======================
-- ai_threads (historique chat par dashboard)
-- ======================
create table public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  -- messages_jsonb : [{ role: 'user'|'assistant'|'tool', content, tool_calls, tool_result, ts }]
  messages_jsonb jsonb not null default '[]',
  total_tokens int not null default 0,
  cost_cents int not null default 0,
  updated_at timestamptz not null default now()
);

create index ai_threads_dashboard_idx on public.ai_threads(dashboard_id);

-- ======================
-- RLS : un user ne voit que SES workspaces et leurs descendants.
-- ======================
alter table public.workspaces enable row level security;
alter table public.connections enable row level security;
alter table public.dashboards enable row level security;
alter table public.widgets enable row level security;
alter table public.ai_threads enable row level security;

-- workspaces : owner only
create policy workspaces_owner_select on public.workspaces
  for select to authenticated using (owner_user_id = auth.uid());
create policy workspaces_owner_insert on public.workspaces
  for insert to authenticated with check (owner_user_id = auth.uid());
create policy workspaces_owner_update on public.workspaces
  for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy workspaces_owner_delete on public.workspaces
  for delete to authenticated using (owner_user_id = auth.uid());

-- connections : via workspace ownership
create policy connections_via_workspace_select on public.connections
  for select to authenticated using (
    exists (select 1 from public.workspaces w where w.id = connections.workspace_id and w.owner_user_id = auth.uid())
  );
create policy connections_via_workspace_insert on public.connections
  for insert to authenticated with check (
    exists (select 1 from public.workspaces w where w.id = connections.workspace_id and w.owner_user_id = auth.uid())
  );
create policy connections_via_workspace_update on public.connections
  for update to authenticated using (
    exists (select 1 from public.workspaces w where w.id = connections.workspace_id and w.owner_user_id = auth.uid())
  );
create policy connections_via_workspace_delete on public.connections
  for delete to authenticated using (
    exists (select 1 from public.workspaces w where w.id = connections.workspace_id and w.owner_user_id = auth.uid())
  );

-- dashboards : via workspace ownership
create policy dashboards_via_workspace_select on public.dashboards
  for select to authenticated using (
    exists (select 1 from public.workspaces w where w.id = dashboards.workspace_id and w.owner_user_id = auth.uid())
  );
create policy dashboards_via_workspace_insert on public.dashboards
  for insert to authenticated with check (
    exists (select 1 from public.workspaces w where w.id = dashboards.workspace_id and w.owner_user_id = auth.uid())
  );
create policy dashboards_via_workspace_update on public.dashboards
  for update to authenticated using (
    exists (select 1 from public.workspaces w where w.id = dashboards.workspace_id and w.owner_user_id = auth.uid())
  );
create policy dashboards_via_workspace_delete on public.dashboards
  for delete to authenticated using (
    exists (select 1 from public.workspaces w where w.id = dashboards.workspace_id and w.owner_user_id = auth.uid())
  );

-- widgets : via dashboard → workspace ownership
create policy widgets_via_dashboard_select on public.widgets
  for select to authenticated using (
    exists (
      select 1 from public.dashboards d
      join public.workspaces w on w.id = d.workspace_id
      where d.id = widgets.dashboard_id and w.owner_user_id = auth.uid()
    )
  );
create policy widgets_via_dashboard_insert on public.widgets
  for insert to authenticated with check (
    exists (
      select 1 from public.dashboards d
      join public.workspaces w on w.id = d.workspace_id
      where d.id = widgets.dashboard_id and w.owner_user_id = auth.uid()
    )
  );
create policy widgets_via_dashboard_update on public.widgets
  for update to authenticated using (
    exists (
      select 1 from public.dashboards d
      join public.workspaces w on w.id = d.workspace_id
      where d.id = widgets.dashboard_id and w.owner_user_id = auth.uid()
    )
  );
create policy widgets_via_dashboard_delete on public.widgets
  for delete to authenticated using (
    exists (
      select 1 from public.dashboards d
      join public.workspaces w on w.id = d.workspace_id
      where d.id = widgets.dashboard_id and w.owner_user_id = auth.uid()
    )
  );

-- ai_threads : via dashboard
create policy ai_threads_via_dashboard_all on public.ai_threads
  for all to authenticated using (
    exists (
      select 1 from public.dashboards d
      join public.workspaces w on w.id = d.workspace_id
      where d.id = ai_threads.dashboard_id and w.owner_user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.dashboards d
      join public.workspaces w on w.id = d.workspace_id
      where d.id = ai_threads.dashboard_id and w.owner_user_id = auth.uid()
    )
  );

-- ======================
-- Auto-create workspace au signup via trigger
-- ======================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspaces (owner_user_id, name)
  values (new.id, 'Mon workspace');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
