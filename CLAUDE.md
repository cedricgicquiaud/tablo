@AGENTS.md

# Dashboard

Template réutilisable de dashboard Next.js 16 + Supabase, illustré par une demo SaaS Analytics (MRR, churn, signups, plans, users).

## Stack

- Runtime : Bun 1.3.x (fallback Node 22+)
- Framework : Next.js 16 (App Router, Turbopack) + TypeScript strict
- Base de données : Supabase (Postgres 15) + RLS, accès via `@supabase/supabase-js` + `@supabase/ssr`
- Tests : Vitest (unit) + Playwright (E2E, optionnel phase ultérieure)
- Styling : Tailwind CSS v4 (CSS-first, via `@tailwindcss/postcss`) + shadcn/ui (Radix)
- Charts : Recharts via shadcn/ui `<Chart>`

> Avertissement : ce projet utilise **Next.js 16**. Les APIs ont des breaking changes vs Next.js 15 — consulter `node_modules/next/dist/docs/` ou Context7 MCP avant d'écrire du code.

## Commandes

- `bun run dev` — serveur de dev Next.js (Turbopack)
- `bun run test` — tests unitaires Vitest (NB : `bun test` invoque le runner natif Bun, pas Vitest — utiliser le script npm)
- `bun run test:e2e` — tests E2E Playwright (phase ultérieure)
- `bun run lint` — ESLint
- `bun run build` — build production Next.js
- `bun run db:reset` — `supabase db reset` (recharge schéma + seed)
- `bun run db:types` — `supabase gen types typescript` → `src/lib/supabase/database.types.ts`

## Structure (cible)

```
src/
  app/
    layout.tsx
    page.tsx              # redirige vers /dashboard ou /login
    login/page.tsx
    dashboard/page.tsx    # Server Component
    globals.css           # Tailwind v4 (@import "tailwindcss";)
  lib/
    supabase/
      server.ts           # createServerClient (SSR)
      client.ts           # createBrowserClient (CSR)
      database.types.ts   # généré
    queries/
      analytics.ts        # getMRR, getSignups, getPlanDistribution, getRecentUsers
  components/
    kpi-card.tsx
    charts/
      mrr-line.tsx
      signups-bar.tsx
      plans-pie.tsx
    users-table.tsx
  middleware.ts           # protection des routes (Next.js 16 — vérifier API)
supabase/
  config.toml
  migrations/             # schéma users / subscriptions / events
  seed.sql                # données fictives reproductibles
```

## Phase en cours

**Pivot scope 2026-04-26** : passage SaaS Analytics → E-commerce après réception du design handoff (`design_handoff_dashboard_widgets/`). Voir `.workflow/PRD.md` v2 et D006/D007 dans `.workflow/DECISIONS.md`.

Phases livrées :
- Phase 02 (data access infrastructure) — PR #2 mergée.
- Phase 03 (auth login + proxy Next.js 16) — PR #3 mergée.
- Phase 04 (e-commerce schema + RPCs core R1-R5/R7-R8 + seed faker) — PR #4 mergée.
- Phase 05 (commerce wrappers TS : 7 fonctions camelCase + Date) — PR #5 mergée.
- Phase 06 (design tokens terracotta+crème, restyle login/dashboard, tweaks theme+radius) — PR à créer.

Prochaine : **Phase 07** — KPI widgets W01-W04 (KpiEditorial revenu, KpiBars visiteurs 7j, KpiTypo panier moyen, KpiRing objectif mensuel) en consommant les wrappers Phase 05 (`getRevenueKpi`, `getOrdersKpi`, `getBasketKpi`, `getTargetProgress`).

> Design handoff : tous les widgets et tokens sont décrits dans `design_handoff_dashboard_widgets/README.md` — fidélité hifi exigée (D007).

## Décisions

Voir .workflow/DECISIONS.md

## Conventions

Voir .claude/rules/01-conventions.md

## Architecture

Voir .claude/rules/02-architecture.md

## Tests

Voir .claude/rules/03-testing.md
