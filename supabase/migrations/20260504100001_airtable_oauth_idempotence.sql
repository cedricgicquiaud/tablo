-- Phase 14.5 — Idempotence OAuth Airtable.
-- Index expression sur connections (workspace_id, kind, base_id) permet le
-- SELECT idempotence R9 en O(1) lors de la création de connection
-- (Server Action page select-airtable-base).
--
-- Quand un user re-OAuth Airtable et choisit la même base (même base_id) →
-- on update les tokens au lieu de créer une duplicate connection.
--
-- Le check se fait via :
--   SELECT id FROM connections
--   WHERE workspace_id = $1 AND kind = 'airtable'
--     AND config_jsonb->>'base_id' = $2;
--
-- Pattern symétrique au stripe_oauth_idempotence (P14.4).

create index if not exists connections_airtable_base_id_idx
  on public.connections (workspace_id, kind, ((config_jsonb->>'base_id')))
  where kind = 'airtable' and config_jsonb ? 'base_id';
