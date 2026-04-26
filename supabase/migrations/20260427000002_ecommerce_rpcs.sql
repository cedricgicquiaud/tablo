-- E-commerce RPCs (Phase 04 — R1, R2, R3, R4, R5, R7, R8).
-- Toutes en `language sql security invoker stable`.
-- Les catégories proviennent du domaine commerce.ts ; pad à 0 via VALUES.

-- ======================
-- R1 — revenue_kpi
-- ======================
create or replace function public.revenue_kpi()
returns table (
  current_cents bigint,
  previous_cents bigint,
  delta_pct numeric,
  sparkline_cents bigint[]
)
language sql
security invoker
stable
as $$
  with current as (
    select coalesce(sum(o.total_cents), 0)::bigint as cents
    from public.orders o
    where o.status = 'paid'
      and o.paid_at >= date_trunc('month', now())
  ),
  prev as (
    select coalesce(sum(o.total_cents), 0)::bigint as cents
    from public.orders o
    where o.status = 'paid'
      and o.paid_at >= date_trunc('month', now()) - interval '1 month'
      and o.paid_at <  date_trunc('month', now())
  ),
  months_series as (
    select date_trunc('month', now() - make_interval(months => i))::date as m
    from generate_series(0, 11) as g(i)
  ),
  spark as (
    select array_agg(coalesce(monthly.cents, 0)::bigint order by ms.m asc) as arr
    from months_series ms
    left join lateral (
      select coalesce(sum(o.total_cents), 0)::bigint as cents
      from public.orders o
      where o.status = 'paid'
        and o.paid_at >= ms.m
        and o.paid_at <  ms.m + interval '1 month'
    ) monthly on true
  )
  select
    current.cents,
    prev.cents,
    case
      when prev.cents = 0 then 0
      else round((current.cents - prev.cents)::numeric / prev.cents * 100)
    end as delta_pct,
    spark.arr
  from current, prev, spark;
$$;

-- ======================
-- R2 — orders_kpi(days)
-- ======================
create or replace function public.orders_kpi(days int default 7)
returns table (
  count bigint,
  delta_pct numeric,
  daily_cents bigint[]
)
language sql
security invoker
stable
as $$
  with bounds as (
    select
      (date_trunc('day', now()) - make_interval(days => days - 1))::timestamptz as start_at,
      date_trunc('day', now()) + interval '1 day' as end_at
  ),
  current_count as (
    select count(*)::bigint as c
    from public.orders, bounds
    where orders.status = 'paid'
      and orders.paid_at >= bounds.start_at
      and orders.paid_at <  bounds.end_at
  ),
  prev_count as (
    select count(*)::bigint as c
    from public.orders
    where orders.status = 'paid'
      and orders.paid_at >= (date_trunc('day', now()) - make_interval(days => days * 2 - 1))
      and orders.paid_at <  (date_trunc('day', now()) - make_interval(days => days - 1))
  ),
  days_series as (
    select (date_trunc('day', now()) - make_interval(days => days - 1 - i))::timestamptz as d
    from generate_series(0, days - 1) as g(i)
  ),
  daily as (
    select array_agg(coalesce(stat.cents, 0)::bigint order by ds.d asc) as arr
    from days_series ds
    left join lateral (
      select coalesce(sum(o.total_cents), 0)::bigint as cents
      from public.orders o
      where o.status = 'paid'
        and o.paid_at >= ds.d
        and o.paid_at <  ds.d + interval '1 day'
    ) stat on true
  )
  select
    current_count.c,
    case
      when prev_count.c = 0 then 0
      else round((current_count.c - prev_count.c)::numeric / prev_count.c * 100)
    end as delta_pct,
    daily.arr
  from current_count, prev_count, daily;
$$;

-- ======================
-- R3 — basket_kpi
-- ======================
create or replace function public.basket_kpi()
returns table (
  avg_cents bigint,
  delta_pct numeric
)
language sql
security invoker
stable
as $$
  with current as (
    select
      coalesce(round(avg(o.total_cents)), 0)::bigint as avg_c
    from public.orders o
    where o.status = 'paid'
      and o.paid_at >= date_trunc('month', now())
  ),
  prev as (
    select
      coalesce(round(avg(o.total_cents)), 0)::bigint as avg_c
    from public.orders o
    where o.status = 'paid'
      and o.paid_at >= date_trunc('month', now()) - interval '1 month'
      and o.paid_at <  date_trunc('month', now())
  )
  select
    current.avg_c,
    case
      when prev.avg_c = 0 then 0
      else round((current.avg_c - prev.avg_c)::numeric / prev.avg_c * 100)
    end as delta_pct
  from current, prev;
$$;

-- ======================
-- R4 — target_progress
-- ======================
create or replace function public.target_progress()
returns table (
  current_cents bigint,
  target_cents bigint,
  pct numeric,
  online_cents bigint,
  store_cents bigint
)
language sql
security invoker
stable
as $$
  with month_revenue as (
    select
      coalesce(sum(o.total_cents) filter (where o.channel = 'online'), 0)::bigint as online_c,
      coalesce(sum(o.total_cents) filter (where o.channel = 'store'), 0)::bigint as store_c,
      coalesce(sum(o.total_cents), 0)::bigint as total_c
    from public.orders o
    where o.status = 'paid'
      and o.paid_at >= date_trunc('month', now())
  ),
  month_target as (
    select coalesce(
      (select revenue_cents from public.targets where month = date_trunc('month', now())::date),
      0
    )::bigint as target_c
  )
  select
    mr.total_c,
    mt.target_c,
    case
      when mt.target_c = 0 then 0
      else round(mr.total_c::numeric / mt.target_c * 100)
    end as pct,
    mr.online_c,
    mr.store_c
  from month_revenue mr, month_target mt;
$$;

-- ======================
-- R5 — revenue_monthly(months)
-- ======================
create or replace function public.revenue_monthly(months int default 12)
returns table (
  month date,
  revenue_cents bigint
)
language sql
security invoker
stable
as $$
  with months_series as (
    select date_trunc('month', now() - make_interval(months => months - 1 - i))::date as m
    from generate_series(0, months - 1) as g(i)
  )
  select
    ms.m as month,
    coalesce(sum(o.total_cents), 0)::bigint as revenue_cents
  from months_series ms
  left join public.orders o
    on o.status = 'paid'
   and o.paid_at >= ms.m
   and o.paid_at <  (ms.m + interval '1 month')
  group by ms.m
  order by ms.m asc;
$$;

-- ======================
-- R7 — revenue_by_category
-- ======================
create or replace function public.revenue_by_category()
returns table (
  category text,
  revenue_cents bigint
)
language sql
security invoker
stable
as $$
  with cats(category) as (
    values ('apparel'), ('home'), ('beauty'), ('tech'), ('accessories')
  )
  select
    c.category,
    coalesce(
      sum(oi.quantity * oi.unit_price_cents) filter (where o.id is not null),
      0
    )::bigint as revenue_cents
  from cats c
  left join public.products p on p.category = c.category
  left join public.order_items oi on oi.product_id = p.id
  left join public.orders o on o.id = oi.order_id and o.status = 'paid'
  group by c.category
  order by c.category asc;
$$;

-- ======================
-- R8 — target_vs_actual_by_category
-- ======================
-- Target = répartition fixe (paramétrée ici, mêmes 5 catégories). Phase ultérieure
-- pourrait extraire dans une table category_targets si besoin.
create or replace function public.target_vs_actual_by_category()
returns table (
  category text,
  actual_cents bigint,
  target_cents bigint
)
language sql
security invoker
stable
as $$
  with cats(category, target) as (
    values
      ('apparel', 1500000::bigint),
      ('home', 1200000::bigint),
      ('beauty', 800000::bigint),
      ('tech', 2000000::bigint),
      ('accessories', 600000::bigint)
  )
  select
    c.category,
    coalesce(
      sum(oi.quantity * oi.unit_price_cents) filter (where o.id is not null),
      0
    )::bigint as actual_cents,
    c.target as target_cents
  from cats c
  left join public.products p on p.category = c.category
  left join public.order_items oi on oi.product_id = p.id
  left join public.orders o on o.id = oi.order_id and o.status = 'paid'
   and o.paid_at >= date_trunc('month', now())
  group by c.category, c.target
  order by c.category asc;
$$;
