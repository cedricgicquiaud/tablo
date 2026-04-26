-- E-commerce RPCs avancés (Phase 04bis — R9-R12).
-- Toutes en `language sql security invoker stable`.

-- ======================
-- R9 — orders_by_hour_dow
-- ======================
-- 7 jours (1=lundi → 7=dimanche, ISO) × 8 plages horaires (0,3,6,9,12,15,18,21)
-- Toujours 56 lignes max via cross-join, 0 si vide.
create or replace function public.orders_by_hour_dow(days int default 90)
returns table (
  dow int,
  hour_bucket int,
  orders_count int
)
language sql
security invoker
stable
as $$
  with dow_series as (
    select i as dow from generate_series(1, 7) as g(i)
  ),
  hour_series as (
    select unnest(array[0, 3, 6, 9, 12, 15, 18, 21]) as hour_bucket
  ),
  filtered as (
    select
      extract(isodow from o.paid_at)::int as dow,
      (extract(hour from o.paid_at)::int / 3) * 3 as hour_bucket
    from public.orders o
    where o.status = 'paid'
      and o.paid_at >= now() - make_interval(days => days)
  )
  select
    d.dow,
    h.hour_bucket,
    coalesce(count(f.dow), 0)::int as orders_count
  from dow_series d
  cross join hour_series h
  left join filtered f on f.dow = d.dow and f.hour_bucket = h.hour_bucket
  group by d.dow, h.hour_bucket
  order by d.dow, h.hour_bucket;
$$;

-- ======================
-- R10 — orders_funnel(days)
-- ======================
-- 4 étapes (visit / add_to_cart / checkout / paid), counts events sur period.
create or replace function public.orders_funnel(days int default 30)
returns table (
  step text,
  step_order int,
  count bigint
)
language sql
security invoker
stable
as $$
  with steps(step, step_order) as (
    values ('visit', 1), ('add_to_cart', 2), ('checkout', 3), ('paid', 4)
  )
  select
    s.step,
    s.step_order,
    coalesce(count(e.id), 0)::bigint as count
  from steps s
  left join public.events e
    on e.type = s.step
   and e.occurred_at >= now() - make_interval(days => days)
  group by s.step, s.step_order
  order by s.step_order;
$$;

-- ======================
-- R11 — shipments_by_hub
-- ======================
create or replace function public.shipments_by_hub()
returns table (
  hub text,
  in_transit int,
  delivered int,
  total int
)
language sql
security invoker
stable
as $$
  with hubs(hub) as (
    values ('paris'), ('lyon'), ('marseille'), ('bordeaux'), ('lille'), ('strasbourg')
  )
  select
    h.hub,
    coalesce(count(*) filter (where s.status = 'in_transit'), 0)::int as in_transit,
    coalesce(count(*) filter (where s.status = 'delivered'), 0)::int as delivered,
    coalesce(count(s.id), 0)::int as total
  from hubs h
  left join public.shipments s on s.hub = h.hub
  group by h.hub
  order by h.hub asc;
$$;

-- ======================
-- R12 — top_countries(limit_n)
-- ======================
-- Top N pays par revenu mois courant + delta vs mois précédent.
create or replace function public.top_countries(limit_n int default 5)
returns table (
  country text,
  revenue_cents bigint,
  delta_pct numeric
)
language sql
security invoker
stable
as $$
  with current_month as (
    select c.country, coalesce(sum(o.total_cents), 0)::bigint as cents
    from public.customers c
    left join public.orders o on o.customer_id = c.id
      and o.status = 'paid'
      and o.paid_at >= date_trunc('month', now())
    group by c.country
  ),
  previous_month as (
    select c.country, coalesce(sum(o.total_cents), 0)::bigint as cents
    from public.customers c
    left join public.orders o on o.customer_id = c.id
      and o.status = 'paid'
      and o.paid_at >= date_trunc('month', now()) - interval '1 month'
      and o.paid_at <  date_trunc('month', now())
    group by c.country
  )
  select
    cm.country,
    cm.cents as revenue_cents,
    case
      when coalesce(pm.cents, 0) = 0 then 0
      else round((cm.cents - pm.cents)::numeric / pm.cents * 100)
    end as delta_pct
  from current_month cm
  left join previous_month pm on pm.country = cm.country
  where cm.cents > 0
  order by cm.cents desc
  limit greatest(limit_n, 0);
$$;
