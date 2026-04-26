-- E-commerce RPCs lists (Phase 04bis cont. — R13-R16).
-- Toutes en `language sql security invoker stable`.

-- ======================
-- R13 — revenue_by_segment_monthly(months)
-- ======================
-- 6 mois × 3 segments (basic/standard/premium) — segment customer.
create or replace function public.revenue_by_segment_monthly(months int default 6)
returns table (
  month date,
  segment text,
  revenue_cents bigint
)
language sql
security invoker
stable
as $$
  with months_series as (
    select date_trunc('month', now() - make_interval(months => months - 1 - i))::date as m
    from generate_series(0, months - 1) as g(i)
  ),
  segments(segment) as (
    values ('basic'), ('standard'), ('premium')
  )
  select
    ms.m as month,
    s.segment,
    coalesce(sum(o.total_cents), 0)::bigint as revenue_cents
  from months_series ms
  cross join segments s
  left join public.customers c on c.segment = s.segment
  left join public.orders o
    on o.customer_id = c.id
   and o.status = 'paid'
   and o.paid_at >= ms.m
   and o.paid_at <  ms.m + interval '1 month'
  group by ms.m, s.segment
  order by ms.m asc, s.segment asc;
$$;

-- ======================
-- R14 — recent_activity(limit_n)
-- ======================
-- Timeline humanisée : email customer + verbe + détail + occurred_at.
create or replace function public.recent_activity(limit_n int default 10)
returns table (
  customer_email text,
  type text,
  action_label text,
  detail text,
  occurred_at timestamptz
)
language sql
security invoker
stable
as $$
  select
    coalesce(c.email, 'visiteur')::text as customer_email,
    e.type,
    case e.type
      when 'paid' then 'a payé une commande'
      when 'add_to_cart' then 'a ajouté au panier'
      when 'checkout' then 'a démarré un checkout'
      when 'visit' then 'a visité le site'
      when 'login' then 's''est connecté'
      when 'signup' then 's''est inscrit'
      else e.type
    end::text as action_label,
    coalesce(c.country, '—')::text as detail,
    e.occurred_at
  from public.events e
  left join public.customers c on c.id = e.customer_id
  order by e.occurred_at desc
  limit greatest(limit_n, 0);
$$;

-- ======================
-- R15 — products_paginated(search, sort_col, sort_dir, limit_n, offset_n)
-- ======================
-- ILIKE search sur name. Tri whitelist via CASE pour éviter SQL injection.
-- Retourne rows JSON + total bigint pour pagination.
create or replace function public.products_paginated(
  search text default '',
  sort_col text default 'created_at',
  sort_dir text default 'desc',
  limit_n int default 20,
  offset_n int default 0
)
returns table (
  rows jsonb,
  total bigint
)
language sql
security invoker
stable
as $$
  with filtered as (
    select * from public.products
    where (search = '' or name ilike '%' || search || '%')
  ),
  total_count as (
    select count(*)::bigint as total from filtered
  ),
  sorted as (
    select * from filtered
    order by
      case when sort_col = 'created_at' and sort_dir = 'asc'  then created_at end asc nulls last,
      case when sort_col = 'created_at' and sort_dir = 'desc' then created_at end desc nulls last,
      case when sort_col = 'price_cents' and sort_dir = 'asc'  then price_cents end asc nulls last,
      case when sort_col = 'price_cents' and sort_dir = 'desc' then price_cents end desc nulls last,
      case when sort_col = 'stock' and sort_dir = 'asc'  then stock end asc nulls last,
      case when sort_col = 'stock' and sort_dir = 'desc' then stock end desc nulls last,
      case when sort_col = 'rating' and sort_dir = 'asc'  then rating end asc nulls last,
      case when sort_col = 'rating' and sort_dir = 'desc' then rating end desc nulls last,
      case when sort_col = 'name' and sort_dir = 'asc'  then name end asc nulls last,
      case when sort_col = 'name' and sort_dir = 'desc' then name end desc nulls last,
      created_at desc
    limit greatest(limit_n, 0)
    offset greatest(offset_n, 0)
  ),
  rows_json as (
    select coalesce(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb) as rows from sorted s
  )
  select rows_json.rows, total_count.total
  from rows_json, total_count;
$$;

-- ======================
-- R16 — calendar_upcoming(limit_n)
-- ======================
create or replace function public.calendar_upcoming(limit_n int default 4)
returns table (
  id uuid,
  title text,
  tag text,
  starts_at timestamptz,
  duration_min int
)
language sql
security invoker
stable
as $$
  select id, title, tag, starts_at, duration_min
  from public.calendar_events
  where starts_at >= now()
  order by starts_at asc
  limit greatest(limit_n, 0);
$$;
