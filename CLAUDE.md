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

**Phase 14.1 — Connecteur Supabase OAuth** : code-complete sur `feature/14-user-connector`, en attente du test live + restyle modale Tablo (alignement avec le design system 02-connect.jsx). Reprendre depuis `.workflow/sessions/2026-04-28-phase14-mvp-code-complete.md`.

**Phase 15 — Tablo Design System** : mergée le 2026-04-30 (PR #17). Apporte les 4 palettes Tablo (steel/spectrum/sunset/citrus) additives aux 5 legacy → 9 palettes au total, la page `/app/settings/appearance` (Server Component, live preview), le wordmark `tablo` SVG palette-aware, fonts Inter Tight + JetBrains Mono, composants `<TabloWordmark>` + `<SectionLabel>`, sidebar/dashboard/chat/empty-states alignés sur le design system Tablo, mobile shell responsive (drawer + top-bar). Voir `.workflow/phases/15-design-tablo/{PRD,SPEC,PLAN}.md`.

**Pivot scope 2026-04-26** : passage SaaS Analytics → E-commerce après réception du design handoff (`design_handoff_dashboard_widgets/`). Voir `.workflow/PRD.md` v2 et D006/D007 dans `.workflow/DECISIONS.md`.

Phases livrées :
- Phase 02 (data access infrastructure) — PR #2 mergée.
- Phase 03 (auth login + proxy Next.js 16) — PR #3 mergée.
- Phase 04 (e-commerce schema + RPCs core R1-R5/R7-R8 + seed faker) — PR #4 mergée.
- Phase 05 (commerce wrappers TS : 7 fonctions camelCase + Date) — PR #5 mergée.
- Phase 06 (design tokens terracotta+crème, restyle login/dashboard, tweaks theme+radius) — PR #6 mergée.
- Phase 07 (KPI widgets W01-W04 + format helpers) — PR #7 mergée.
- Phase 08 (Charts widgets W05-W08) — PR #8 mergée.
- Phase 09 (Advanced widgets W09-W12 + RPCs R9-R12) — PR #9 mergée.
- Phase 10 (List widgets W13-W16 + RPCs R13-R16) — PR #10 mergée. **Le dashboard contient les 16 widgets complets.**
- Phase 11 (DELIVER : README final + bundle audit + UAT global + Vercel deploy guide) — PR à créer. **Fin du template.**

**Template livré :** 11 phases mergées (PR #1 à #10 + #11 à venir), 16 widgets, 60 tests verts, build & lint propres, bundle client audité (0 fuite service_role).

Prochaines évolutions possibles (backlog secondaire) :
- Filtres date globaux (7j/30j/12m) qui impactent tous les widgets
- Tests E2E Playwright (parcours login → dashboard → tri table → toggle theme)
- Skeleton loaders sur tous les widgets
- Tweak typo (Inter / IBM / Geist via Google Fonts)
- Vraie carte (Mapbox / MapLibre) en remplacement de la map abstraite
- OAuth providers (Google / GitHub)

> Design handoff : tous les widgets et tokens sont décrits dans `design_handoff_dashboard_widgets/README.md` — fidélité hifi exigée (D007).

## Décisions

Voir .workflow/DECISIONS.md

## Conventions

Voir .claude/rules/01-conventions.md

## Architecture

Voir .claude/rules/02-architecture.md

## Tests

Voir .claude/rules/03-testing.md
