@AGENTS.md

# Tablo

Constructeur de dashboards : on connecte une source (Supabase, Stripe, Airtable) et on demande un widget en langage
courant ; un agent IA explore le schéma, écrit une requête SQL en lecture seule et propose le widget.
Vue d'ensemble, installation et architecture : `README.md`.

## Stack

- Runtime : Bun 1.3.x (fallback Node 22+)
- Framework : Next.js 16 (App Router, Turbopack) + TypeScript strict
- Base de données : Supabase (Postgres) + RLS, accès via `@supabase/supabase-js` + `@supabase/ssr`
- IA : SDK Anthropic (`@anthropic-ai/sdk`), modèle Claude Haiku 4.5, boucle d'agent dans `src/lib/ai-engine/`
- Sources : `DataSource` commune (`src/lib/connectors/types.ts`) ; Stripe et Airtable interrogés en SQL via AlaSQL
- Styling : Tailwind CSS v4 (CSS-first) + shadcn/ui ; charts : Recharts
- Tests : Vitest (projets `unit`, `db-integration`, `db-seed`)

> Avertissement : ce projet utilise **Next.js 16**. Les APIs ont des breaking changes vs Next.js 15 — consulter
> `node_modules/next/dist/docs/` avant d'écrire du code.

## Commandes

- `bun run dev` — serveur de dev Next.js (Turbopack)
- `bun run test` — tests unitaires Vitest (NB : `bun test` invoque le runner natif Bun, pas Vitest)
- `bun run test:integration` — tests base de données (Supabase local requis)
- `bun run typecheck` — `tsc --noEmit`
- `bun run lint` — ESLint
- `bun run build` — build production
- `bun run db:reset` — `supabase db reset` (ré-applique les migrations)
- `bun run db:seed` — données e-commerce fictives + compte `demo@demo.io` / `demodemo`
- `bun run db:types` — régénère `src/lib/supabase/database.types.ts`

La CI (`.github/workflows/ci.yml`) lance typecheck, lint, tests unitaires et build sur chaque PR.
`CONNECTOR_ENCRYPTION_KEY` est requise par 5 tests unitaires (`openssl rand -hex 32`).

## Conventions

Voir `.claude/rules/01-conventions.md`

## Architecture

Voir `.claude/rules/02-architecture.md`

## Tests

Voir `.claude/rules/03-testing.md`
