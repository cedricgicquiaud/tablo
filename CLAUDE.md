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

**Phase 14.5 — Airtable OAuth + DataSource** : PR à créer (branche `feature/14.5-airtable-oauth`). 3ème provider data Tablo (Supabase ✓ + Stripe ✓ + Airtable). Cycle A (OAuth PKCE + select-base + refresh) : routes `/oauth/airtable/{start,callback}` (PKCE S256, cookies httpOnly TTL 600s avec préfixe `tablo_airtable_oauth_*` distinct), exchange + refresh single-use rotation R11 critique, page `/onboarding/select-airtable-base` (cookie session AES-256-GCM contenant tokens + bases), Server Action `createConnectionFromAirtableBase` avec idempotence par `(workspace_id, kind, base_id)` (index DB partial), modale `<ConnectSourceDialog>` Airtable status `active` (3 fournisseurs actifs / 6 soon). Cycle B (DataSource) : `field-type-mapping.ts` (10 types Airtable → 5 SQL — text/numeric/boolean/date/timestamp), `flatten.ts` (records → row plat snake_case ASCII + multi-types CSV/JSON V1), `meta-api.ts` (fetchBases + fetchTablesSchema), `records-api.ts` (pagination offset cap 1000 V1 + retry 429), `data-source.ts` (listTables + inspectTable avec 3 samples + runQuery via alasql lazy-fetch + cache TTL 5min keyé `connectionId::tableName` cross-tenant safe + mutex coalescing). Cycle C (intégration) : `registry.ts` route `kind=airtable` avec `getValidAirtableAccessToken` refresh-aware + status `expired` (E9). Pattern pure logic + DI 6ème occurrence (oauth, refresh, create-connection, profile-after-oauth, data-source, retry). 17 commits, 435 tests verts (+101 vs main 14.4 : 9 oauth helpers + 6 start route + 5 meta-api + 10 callback + 10 refresh + 6 create-connection pure logic + 9 field-type + 15 flatten + 8 data-source listTables/inspect + 6 records-api + 10 data-source runQuery + 1 modale + 3 registry + 11 cumulés P0). Bench RNF1 ✓ (cold P95 423ms < 5000ms) + RNF2 ✓ (warm P95 1ms < 200ms). 2 frictions doc/réalité découvertes au smoke : (1) `connections_kind_check` ne listait pas 'airtable' → migration `20260504100002_airtable_connection_kind.sql` ; (2) inspectTable retournait `samples=[]` → l'AI baillait sur end_turn sans propose_widget → fix fetch 3 records via fetchTableRecordsFn. Smoke S1-S9 ✓ end-to-end Cedric : OAuth + select-base + connection sidebar + chat IA "21 conférences" widget metric_card + "taux présence 48,5%" widget multi-tables + bar chart 19 catégories + S8 reconnect idempotence + S9 régression Stripe/Supabase. Voir `.workflow/phases/14.5-airtable-oauth/{SPEC,PLAN,BENCH-PHASE-14.5}.md`.

**Phase 14.4 — OAuth Stripe Connect Standard + Modal sélection fournisseur** : mergée le 2026-05-04 (PR [#26](https://github.com/AlanZien/dashboard/pull/26)). Modal commune `<ConnectSourceDialog>` (9 fournisseurs grille 2 cols, pattern select-then-submit, simple-icons + Lucide fallback Salesforce/Excel) remplace `+ Connecter Supabase` par `+ Connecter une source`. Flow OAuth Stripe Connect Standard complet : routes `/oauth/stripe/start` (CSRF state cookie httpOnly TTL 600s) → `/oauth/stripe/callback` (token exchange + AES-256-GCM encryption tokens + idempotence par `stripe_user_id` via index expression partial + `after()` profileConnection fire-and-forget extrait en pure logic + DI). Routing `kind=stripe` user-owned vs démo (`env_creds=true` P14.3) dans `registry.ts` + status `revoked` (E9). 11 commits + 1 force-push post-rebase 14.3, 334 tests verts (+90 vs main : helpers `oauth.ts` pure + zod + `StripeOAuthError`, callback flow E2-E11 + R7-R13, modale 8 tests + R6 footer disabled state, registry routing 7 tests, anti-régression `validateReadOnlySql` INSERT/UPDATE/DELETE pour scope OAuth `read_write`, profile-after-oauth pure logic 4 tests). Audit verifier CRITIQUE traité (1 bloquant `.env.example` + 5 importants : state cookie purge sur erreurs, refactor `after()`, HTTP 307 harmonisé Stripe/Supabase, scope `read_write` justifié + tests anti-régression ; 10 mineurs reportés au BACKLOG). Smoke S1-S11 ✓ (S8 idempotence + S12 livemode skip mode test, couverts unit). 7 frictions doc/réalité Stripe découvertes + 3 hotfix smoke (scope, URL `/oauth/token` sans v2, log error). Voir `.workflow/phases/14.4-stripe-oauth-modal-sources/{SPEC,PLAN,REVIEW}.md`.

**Phase 14.3 — DataSource Stripe** : PR [#25](https://github.com/AlanZien/dashboard/pull/25) (à merger). Adapter `StripeDataSource` (interface `DataSource` P14.1) avec 4 tables virtuelles SQL (`stripe_customers/subscriptions/invoices/charges`) via `alasql` in-memory. Stratégie 1 (fetch all → flatten → SQL local). Cache module-level TTL 5 min + coalescing R14 par-table + cap 1000 rows/table. **Lazy-fetch per-table** post-DELIVER (option B advisor) : `runQuery` ne charge que les tables référencées dans le SQL → bench RNF1 P95 644ms (gain 8x vs 5071ms baseline) + RNF2 1ms. 3 cycles atomiques + helper `withRetry` extrait en P0 (3ème occurrence règle FORGE). Translator `translateSqlPgToAlasql` : tokenizer 3 états + wrap mots-clés alasql (`value/count/interval/key`) + strip `;` final + exclusion function calls. Migration `20260503201114_stripe_connection.sql` provisionne auto la connection "Stripe demo" par workspace (env_creds=true, sentinel V1). 300 tests verts (+56), 6 commits labellisés `[P0]/[C1]/[C2]/[C3]/post-DELIVER`. Audit verifier appliqué (2 bloquants + 4 importants + 2 mineurs). Smoke E2E confirmé : "MRR par plan" → starter+business, "Subscriptions par interval" → month 166. Voir `.workflow/phases/14.3-stripe-datasource/{SPEC,PLAN,SPIKE-LOG,BENCH-PHASE-14.3,REVIEW}.md`.

**Phase 14.2 — Stripe seed Cycle A + rename Tablo** : mergée le 2026-05-03 (PR #24). Script CLI qui peuple un compte Stripe test depuis la base CRM distante : 200 Customers + 166 Subscriptions + 168 Invoices, metadata `tablo_seed=v1` + `crm_company_id`/`crm_deal_id`. **DB CRM intouchée** (read-only). Persona Stripe Product = `Cipher` (distinct de l'app Tablo). 9 tests TDD (helpers `companySizeToPlan` + `getStripeClient`). Pattern retry 429 réutilisé de P14.1.1. 1 hotfix smoke `collection_method='send_invoice'` (B2B-réaliste). Rename app Pinpoint→Tablo en parallèle (57 fichiers, persona Stripe Tablo→Cipher pour résoudre collision). 244 tests verts. Voir `.workflow/phases/14.2-stripe-seed/{SPEC,PLAN,CYCLE-A,REVIEW}.md`.

**Phase 18 — Auto-generated starter dashboard** : mergée le 2026-05-03 (PR #22). À la création d'une connexion OAuth, l'IA détecte le type de business via Haiku light (5 SourceKinds : ecommerce/crm/saas/finance/generic) et génère automatiquement 4-5 widgets contextualisés (kits pré-définis). Wow effect onboarding ~30s vs écran vide. Bench RNF1 ✓ (34s ≤ 45s), RNF2 ✓ ($0.093 ≤ $0.15). 17 commits dont 2 hotfix issus du smoke testing manuel (`after()` Next.js 16 chaîné, idempotence basée uniquement sur `starter_generated_at`). 231 tests verts. Voir `.workflow/phases/18-auto-starter-dashboard/{SPEC,PLAN,BENCH-PHASE-18,REVIEW}.md`.

**Phase 17.1 — Optim moteur AI** : mergée le 2026-05-03 (PR #21). 3 cycles : A streaming `messages.stream()` natif (token-par-token UX), B `cache_control: ephemeral` + tracking cache tokens + breakdown `estimateCostUsd` (caching inopérant en pratique sous seuil ~5000 tokens Haiku 4.5, code future-proof), C fast-path schema injection (filtre `list_tables`/`inspect_table` + préfixe user prompt avec markdown du schema → -2 turns LLM). Bench RNF : RNF3 ✓ ($0.0182 < $0.02), RNF2 -35% (6298ms vs 9759ms baseline), RNF1 dans le bruit. 204 tests verts. Voir `.workflow/phases/17.1-ai-engine-optim/{PLAN,REVIEW,BENCH-CYCLE-A,BENCH-CYCLE-B,BENCH-CYCLE-C}.md`.

**Phase 17 — Moteur AI modulaire** : mergée le 2026-05-03 (PR #20). Refactor complet `src/lib/ai/generate-widget.ts` (343 lignes monolithique) en library modulaire `src/lib/ai-engine/` (25+ fichiers) inspirée Nao Apache 2.0. 4 capacités majeures : streaming SSE Web Streams natif, profiling fire-and-forget au connect, schema cache populé/lu (résout R22 R23 bug `closed_won`), `suggest_follow_ups` avec feature flag. 3 cycles A/B/C avec TDD strict + advisor critique appliquée. 7 hotfix issus du smoke testing manuel. 183 tests verts. Audit table `ai_engine_audit`. Bench script `bun run bench:ai`. Voir `.workflow/phases/17-ai-engine/{SPEC,PLAN,REVIEW}.md`.

**Phase 15 — Tablo Design System** : mergée le 2026-04-30 (PR #17). Apporte les 4 palettes Tablo (steel/spectrum/sunset/citrus) additives aux 5 legacy → 9 palettes au total, la page `/app/settings/appearance` (Server Component, live preview), le wordmark `tablo` SVG palette-aware, fonts Inter Tight + JetBrains Mono, composants `<TabloWordmark>` + `<SectionLabel>`, sidebar/dashboard/chat/empty-states alignés sur le design system Tablo, mobile shell responsive (drawer + top-bar). Voir `.workflow/phases/15-design-tablo/{PRD,SPEC,PLAN}.md`.

**Phase 14.1 — Connecteur Supabase OAuth** : mergée le 2026-04-30 (PR #18). Connexion OAuth d'une DB Supabase user, multi-source via `DataSource` interface, IDOR guard sur `connectionId`, `connections.config_jsonb` chiffré AES-256-GCM. Voir `.workflow/phases/14-user-connector/`.

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
