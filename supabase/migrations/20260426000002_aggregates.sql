-- RPC kpi_snapshot — 4 KPIs courants
create or replace function public.kpi_snapshot()
returns table (
  mrr_cents     bigint,
  churn_pct     integer,
  active_users  bigint,
  arpu_cents    bigint
)
language sql
security invoker
stable
as $$
  with
    cutoff as (
      -- borne basse cohérente entre numérateur et dénominateur du churn
      select (now() - interval '30 days') as ts
    ),
    mrr as (
      select coalesce(sum(s.mrr_cents) filter (where s.status = 'active'), 0)::bigint as v
      from public.subscriptions s
    ),
    churn as (
      select
        case
          when den.v = 0 then 0
          else round((num.v::numeric / den.v::numeric) * 100)::integer
        end as v
      from
        (select count(*)::bigint as v
         from public.subscriptions, cutoff
         where status = 'canceled'
           and canceled_at > cutoff.ts) as num,
        (select count(*)::bigint as v
         from public.subscriptions, cutoff
         where started_at <= cutoff.ts
           and (status = 'active' or canceled_at > cutoff.ts)) as den
    ),
    active as (
      select coalesce(count(distinct user_id), 0)::bigint as v
      from public.events, cutoff
      where occurred_at >= cutoff.ts
    )
  select
    mrr.v as mrr_cents,
    churn.v as churn_pct,
    active.v as active_users,
    case when active.v = 0 then 0::bigint
         else round(mrr.v::numeric / active.v::numeric)::bigint
    end as arpu_cents
  from mrr, churn, active;
$$;

-- RPC mrr_monthly(months) — MRR à la fin de chaque mois sur la période demandée
create or replace function public.mrr_monthly(months integer default 12)
returns table (
  month      date,
  mrr_cents  bigint
)
language sql
security invoker
stable
as $$
  with months_series as (
    select date_trunc('month', now() - make_interval(months => i))::date as m
    from generate_series(0, months - 1) as g(i)
  )
  select
    ms.m as month,
    coalesce(sub.mrr, 0)::bigint as mrr_cents
  from months_series ms
  left join lateral (
    select sum(s.mrr_cents) as mrr
    from public.subscriptions s
    where s.started_at <= (ms.m + interval '1 month' - interval '1 microsecond')
      and (
        s.status = 'active'
        or s.canceled_at > (ms.m + interval '1 month' - interval '1 microsecond')
      )
  ) sub on true
  order by ms.m asc;
$$;

-- RPC signups_weekly(weeks) — count des events 'signup' par semaine ISO (lundi UTC)
create or replace function public.signups_weekly(weeks integer default 12)
returns table (
  week_start     date,
  signups_count  bigint
)
language sql
security invoker
stable
as $$
  with weeks_series as (
    select date_trunc('week', now() - make_interval(weeks => i))::date as w
    from generate_series(0, weeks - 1) as g(i)
  )
  select
    ws.w as week_start,
    coalesce(sub.n, 0)::bigint as signups_count
  from weeks_series ws
  left join lateral (
    select count(*) as n
    from public.events e
    where e.type = 'signup'
      and e.occurred_at >= ws.w
      and e.occurred_at < ws.w + interval '7 days'
  ) sub on true
  order by ws.w asc;
$$;

-- RPC plan_distribution — count des subs actives par plan, toujours 3 lignes
create or replace function public.plan_distribution()
returns table (
  plan         text,
  users_count  bigint
)
language sql
security invoker
stable
as $$
  with plans(plan) as (
    values ('free'), ('pro'), ('enterprise')
  )
  select
    p.plan,
    coalesce(count(s.id) filter (where s.status = 'active'), 0)::bigint as users_count
  from plans p
  left join public.subscriptions s on s.plan = p.plan
  group by p.plan
  order by p.plan asc;
$$;

-- RPC recent_users(limit_n) — derniers users avec leur plan/mrr actif
create or replace function public.recent_users(limit_n integer default 10)
returns table (
  id          uuid,
  email       text,
  full_name   text,
  country     text,
  created_at  timestamptz,
  plan        text,
  mrr_cents   integer
)
language sql
security invoker
stable
as $$
  select
    u.id,
    u.email,
    u.full_name,
    u.country,
    u.created_at,
    s.plan,
    s.mrr_cents
  from public.users u
  left join public.subscriptions s on s.user_id = u.id and s.status = 'active'
  order by u.created_at desc
  limit greatest(limit_n, 0);
$$;
