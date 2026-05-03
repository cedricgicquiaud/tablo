-- Phase 14.4 — Idempotence OAuth Stripe Connect.
-- Index expression sur connections (workspace_id, kind, stripe_user_id)
-- permet le SELECT idempotence R11 en O(1) lors du callback OAuth.
--
-- Quand un user re-OAuth le même compte Stripe (même stripe_user_id) → on
-- update les tokens au lieu de créer une duplicate connection.
--
-- Le check se fait via :
--   SELECT id FROM connections
--   WHERE workspace_id = $1 AND kind = 'stripe'
--     AND config_jsonb->>'stripe_user_id' = $2;
--
-- Note : pas un index UNIQUE strict car la connection démo (env_creds=true)
-- n'a pas de stripe_user_id et plusieurs workspaces peuvent partager le
-- pattern. L'index est expression-based + partial pour optimiser la query.

create index if not exists connections_stripe_user_id_idx
  on public.connections (workspace_id, kind, ((config_jsonb->>'stripe_user_id')))
  where kind = 'stripe' and config_jsonb ? 'stripe_user_id';
