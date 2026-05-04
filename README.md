# Dashboard — Template e-commerce Next.js + Supabase

Template **production-ready** de dashboard branché sur Supabase, illustré par 16 widgets e-commerce pixel-perfect (palette terracotta + crème, light/dark, oklch).

**Stack :** Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind v4 (CSS-first), shadcn/ui, Supabase (Postgres + Auth + RLS), Vitest. Cible : Vercel.

**Demo :** https://dashboard.example.com (à mettre à jour après déploiement)

---

## Aperçu

Le dashboard expose **16 widgets** organisés en 6 rows :

| Row | Widgets |
|---|---|
| 1 | KpiEditorial (revenu) · KpiBars (commandes 7j) · KpiTypo (panier moyen, fond noir) · KpiRing (objectif mensuel) |
| 2 | LineChart (revenu 12m) · Gauge (distribution segmentée) |
| 3 | DonutExploded (revenu × catégorie) · BarChart (réel vs objectif) · Ranking (top pays) |
| 4 | Heatmap (heure × jour) · Funnel (visite → achat) · Map (expéditions par hub) |
| 5 | Stacked (revenu × segment 6m) · Calendar (campagnes) · Activity (timeline) |
| 6 | ProductsTable (sortable + searchable, paginé) |

Toggle theme (light/dark) et radius (sharp/soft/pill) persistés via cookie SSR-coherent.

## Pré-requis

- [Bun](https://bun.sh) ≥ 1.3 (ou Node 22+ + npm/pnpm)
- [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 2.9
- Docker Desktop (pour Supabase local)

## Quickstart local

```bash
# 1. Cloner et installer
git clone <repo> dashboard && cd dashboard
bun install

# 2. Démarrer Supabase local (Docker doit tourner)
supabase start
# La commande affiche les URL/clés. Copier dans .env.local :
cp .env.local.example .env.local
supabase status                 # affiche les URL/keys
# → coller NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY dans .env.local

# 3. Appliquer migrations + seed riche
supabase db reset                # ré-applique toutes les migrations
bun run db:seed                  # ~3000 produits, 5000 customers,
                                 # 10k orders, 30k order_items, 12 targets,
                                 # 4 campagnes, demo@demo.io / demodemo

# 4. Lancer le dashboard
bun run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) → redirige vers `/login`.
**Credentials demo :** `demo@demo.io` / `demodemo`.

## Commandes utiles

| Commande | Effet |
|---|---|
| `bun run dev` | Serveur Next.js (Turbopack) |
| `bun run build` | Build production |
| `bun run start` | Lance le build production |
| `bun run lint` | ESLint |
| `bun run test` | Tests Vitest (60 tests : unit + DB intégration) |
| `bun run test:watch` | Vitest watch |
| `bun run db:reset` | `supabase db reset` (re-applique migrations + seed.sql) |
| `bun run db:seed` | Seed riche e-commerce via faker (déterministe) |
| `bun run db:types` | Régénère `src/lib/supabase/database.types.ts` depuis le schéma |

> ⚠️ Utiliser `bun run test`, **pas** `bun test` (qui invoque le test runner natif de Bun, pas Vitest).

## Structure

```
src/
  app/
    layout.tsx              # Root layout + tweaks SSR-coherent
    page.tsx                # Redirect / → /login
    login/                  # Page + form + Server Actions signIn/signOut
    dashboard/
      layout.tsx            # Defense in depth (getUser → redirect /login si null)
      page.tsx              # Promise.all(15 wrappers) → 16 widgets en grille
  proxy.ts                  # Next.js 16 proxy (file convention, ex-middleware)
  lib/
    auth/
      redirect.ts           # decideAuthRedirect (pure, testée)
      routes.ts             # ROUTES const
      current-user.ts       # cache(getCurrentUser) — dedup intra-render
    domain/
      commerce.ts           # Constantes partagées (CATEGORIES, SEGMENTS, ...)
    format/
      cents.ts              # formatCents, formatCompactCents, formatDeltaPct
    queries/
      commerce.ts           # 15 wrappers TS autour des RPCs Supabase
    supabase/
      env.ts                # getSupabaseEnv (public) / getSupabaseAdminEnv (server-only)
      types.ts              # DashboardClient = SupabaseClient<Database>
      ssr-factory.ts        # createSsrClient(cookieAdapter) partagé server/proxy
      server.ts             # createSupabaseServerClient (RSC)
      client.ts             # createSupabaseBrowserClient (CSR)
      proxy-client.ts       # createSupabaseProxyClient (NextRequest cookies)
      admin.ts              # createSupabaseAdminClient + truncate + ensureDemoAuthUser
      database.types.ts     # Généré par `bun run db:types`
    ui/
      tweaks.ts             # Server Actions readTweaks/setTheme/setRadius
      tweaks-types.ts       # THEMES/RADII const + types (pas dans "use server")
  components/
    sign-out-button.tsx
    tweaks-toggle.tsx
    widgets/                # 16 widgets pixel-perfect vs design handoff
      icon.tsx, sparkline.tsx, bar-spark.tsx,
      kpi-editorial.tsx, kpi-bars.tsx, kpi-typo.tsx, kpi-ring.tsx,
      line-chart.tsx, bar-chart.tsx, donut-exploded.tsx, gauge.tsx,
      heatmap.tsx, funnel.tsx, map.tsx, ranking.tsx,
      calendar.tsx, activity.tsx, products-table.tsx, stacked.tsx
supabase/
  config.toml               # max_rows=50000 (seed insère 30k+ rows)
  migrations/
    20260427000001_ecommerce_schema.sql   # 8 tables + indexes + RLS
    20260427000002_ecommerce_rpcs.sql     # R1-R5, R7-R8 (KPI + charts core)
    20260427000003_advanced_rpcs.sql      # R9-R12 (heatmap/funnel/map/ranking)
    20260427000004_list_rpcs.sql          # R13-R16 (segment/activity/table/calendar)
  seed.sql                  # placeholder (seed riche dans scripts/seed.ts)
scripts/
  seed.ts                   # ~3000 produits / 5000 customers / 10k orders, faker.seed=4242
tests/
  db/                       # 60 tests intégration (e-commerce + RLS + wrappers)
design_handoff_dashboard_widgets/  # Référence design hifi (HTML+JSX+CSS, pas du code prod)
```

## Déploiement Vercel

### 1. Créer un projet Supabase distant
- [Supabase Dashboard](https://supabase.com/dashboard) → New project (free tier OK)
- Récupérer `URL`, `anon key`, `service_role key`

### 2. Pousser le schéma + RPCs
```bash
supabase link --project-ref <ref>
supabase db push        # applique les 4 migrations
```

### 3. Seeder le projet distant (optionnel — demo data)
```bash
ALLOW_SEED_NON_LOCAL=1 \
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon> \
SUPABASE_SERVICE_ROLE_KEY=<service_role> \
bun run scripts/seed.ts
```

> Le script refuse par défaut tout URL non-localhost (sécurité). `ALLOW_SEED_NON_LOCAL=1` est le bypass explicite.

### 4. Importer dans Vercel
- [Vercel Dashboard](https://vercel.com/new) → Import Git Repository → ce repo
- Framework auto-détecté : Next.js 16 (Turbopack)
- Build Command : `bun run build` (ou `next build`)
- Output : auto

### 5. Variables d'environnement Vercel

| Variable | Scope | Valeur |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | (optionnel) | clé service_role — uniquement si tu seeds en prod via build hook |

> ⚠️ **Sécurité** : `SUPABASE_SERVICE_ROLE_KEY` n'est **jamais** exposée au browser. Le bundle client a été audité (`grep -rln "service_role" .next/static/` → 0 hit).

### 6. Deploy
Push sur `main` → Vercel build automatique. Domain `<projet>.vercel.app` actif.

## Workflow projet (FORGE)

Ce template a été développé via la méthodologie [FORGE](.workflow/) :
- `.workflow/PRD.md` — scope produit (v2 post-pivot e-commerce)
- `.workflow/SPEC.md` — modèle de données + 20 RPCs + 16 widgets
- `.workflow/DECISIONS.md` — D001-D007 (stack, lib, pivot, fidélité hifi)
- `.workflow/BACKLOG.md` — roadmap, phases livrées
- `.workflow/UAT.md` — cahier de recette (tests automatisés + manuels)
- `.workflow/phases/` — `PLAN.md` par phase

10 phases livrées (PR #2 à #11), 16 widgets, 60 tests verts.

## Sécurité

- Toutes les tables ont **RLS activée** avec policies SELECT pour `authenticated` uniquement.
- Aucune policy INSERT/UPDATE/DELETE → écritures uniquement via service_role (seed côté serveur).
- Le `SUPABASE_SERVICE_ROLE_KEY` n'est jamais référencé dans un fichier importé côté client (vérifié par grep).
- Le seed refuse de tourner sur un Supabase non-localhost sauf bypass explicite `ALLOW_SEED_NON_LOCAL=1`.
- Les 5 RPCs avec arguments dynamiques (`days int`, `months int`, `sort_col text` whitelist via CASE) sont safe vs SQL injection.
- L'auth utilise le pattern Next.js 16 `proxy.ts` + defense in depth dans `dashboard/layout.tsx` (`getUser()` vérif Auth server). Proxy lui-même utilise `getSession()` (lecture cookie, optimiste).

## Tests

```bash
bun run test
```

60 tests Vitest verts :
- 7 unit (`decideAuthRedirect`, `formatCents`)
- 33 intégration RPCs (R1-R20 schema + RLS + 16 RPCs e-commerce)
- 15 wrappers TS commerce (camelCase + Date)
- 5 autres (smoke + reproductibilité seed)

## Performance

Lighthouse cible : **Performance ≥ 90, Accessibility ≥ 90** sur `/dashboard` avec seed complet (~10k orders).

À mesurer après déploiement : `bunx unlighthouse --site https://<projet>.vercel.app/dashboard`.

## Customisation

Le template est conçu pour être forké :

1. **Fork → renommer** : changer `package.json:name`, mettre à jour `<title>` dans `layout.tsx`.
2. **Schéma** : éditer/ajouter une migration dans `supabase/migrations/`. Re-run `supabase db reset && bun run db:types`.
3. **Couleurs** : modifier les tokens dans `src/app/globals.css` (oklch). Toutes les classes Tailwind via shadcn passent par `--accent`, `--ink`, etc.
4. **Widgets** : chaque widget est un fichier dans `src/components/widgets/`, isolé et remplaçable.
5. **Seed** : adapter `scripts/seed.ts` à ton domaine (volumes, distributions).

## Licence

MIT.

## Setup Stripe Connect Platform (Phase 14.4 — OAuth user-owned)

Pour permettre aux users de connecter LEUR compte Stripe via OAuth :

1. Aller sur [dashboard.stripe.com](https://dashboard.stripe.com) en mode **test** (toggle en haut à droite).
2. **Settings → Connect → Get started → Standard accounts**.
3. **Platform settings → Branding** : nom Tablo + logo (cosmétique, optionnel).
4. **Platform settings → Redirect URIs** : ajouter
   - `http://localhost:3000/oauth/stripe/callback` (dev)
   - `https://<your-domain>/oauth/stripe/callback` (prod)
5. **Récup le `client_id`** qui commence par `ca_test_...` → ajouter dans `.env.local` :
   ```
   STRIPE_CONNECT_CLIENT_ID=ca_test_xxxxx
   ```

Le `STRIPE_SECRET_KEY` (sk_test_...) existant est ré-utilisé pour le token exchange — pas besoin d'une nouvelle clé.

## Setup Airtable OAuth (Phase 14.5 — connecter une base Airtable user-owned)

Pour permettre aux users de connecter LEUR base Airtable via OAuth (PKCE) :

1. Aller sur [airtable.com/create/oauth](https://airtable.com/create/oauth) → **Register integration**.
2. **Integration name** : `Tablo` (ou ce que tu veux).
3. **Redirect URI** :
   - `http://localhost:3000/oauth/airtable/callback` (dev)
   - `https://<your-domain>/oauth/airtable/callback` (prod)
4. **Scopes** : `data.records:read schema.bases:read user.email:read`.
5. **Récup `Client ID` + `Client Secret`** (Secret affiché 1 seule fois — bien le copier) → ajouter dans `.env.local` :
   ```
   AIRTABLE_OAUTH_CLIENT_ID=...
   AIRTABLE_OAUTH_CLIENT_SECRET=...
   AIRTABLE_OAUTH_REDIRECT_URI=http://localhost:3000/oauth/airtable/callback
   ```

Notes :
- Airtable OAuth utilise PKCE (code_challenge + verifier) en plus du client_secret côté Tablo.
- `access_token` expire en 60 min ; le `refresh_token` est **single-use** (rotation à chaque refresh).
- Limite 20 tokens actifs par (user, integration) — Tablo idempotent par `(workspace_id, kind, base_id)` pour éviter d'en accumuler.
