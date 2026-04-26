# Dashboard

Template réutilisable de dashboard **Next.js 16 + Supabase**, illustré par une demo **SaaS Analytics** : MRR, churn, signups, répartition par plan, derniers utilisateurs.

Stack : Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind v4, shadcn/ui, Recharts, Supabase (Postgres + Auth + RLS), Vitest. Déploiement cible : Vercel.

> **Statut :** en cours d'initialisation (BOOTSTRAP). Voir `.workflow/PRD.md` pour le périmètre et `.workflow/BACKLOG.md` pour la roadmap.

## Pré-requis

- [Bun](https://bun.sh) ≥ 1.3 (ou Node 22+ + npm/pnpm)
- [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 2.9
- Docker Desktop (pour Supabase local)

## Installation

```bash
bun install
cp .env.local.example .env.local
# remplir SUPABASE_URL, SUPABASE_ANON_KEY (issus de `supabase status` après le démarrage local)
```

## Démarrer en local

```bash
# 1. Lancer Supabase local
supabase start

# 2. Récupérer les valeurs et les coller dans .env.local
supabase status

# 3. Appliquer migrations + seed riche (~1000 users via faker, déterministe)
supabase db reset
bun run db:seed

# 4. Lancer le dashboard
bun run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Commandes utiles

| Commande | Effet |
|---|---|
| `bun run dev` | Serveur Next.js (Turbopack) |
| `bun run build` | Build production |
| `bun run start` | Lance le build |
| `bun run lint` | ESLint |
| `bun run test` | Tests Vitest |
| `bun run test:watch` | Vitest watch |
| `bun run db:reset` | `supabase db reset` (recharge schéma + seed) |
| `bun run db:types` | Génère `src/lib/supabase/database.types.ts` |

> ⚠️ Utiliser `bun run test`, pas `bun test` (qui invoque le test runner natif de Bun, pas Vitest).

## Structure

Voir `CLAUDE.md` (section Structure) pour l'arborescence cible.

## Déploiement Vercel

1. Créer un projet Supabase distant (ou réutiliser un existant).
2. `supabase link --project-ref <ref>` puis `supabase db push` pour propager les migrations.
3. Importer le repo dans Vercel.
4. Configurer les variables d'env dans Vercel (mêmes clés que `.env.local`, sauf `SUPABASE_SERVICE_ROLE` qui reste optionnelle et n'est jamais exposée au browser).
5. Deploy.

## Workflow projet

Ce projet utilise [FORGE](.workflow/) (méthodologie maison de gestion de phases) :
- `.workflow/PRD.md` — Product Requirements Document
- `.workflow/SPEC.md` — spécifications fonctionnelles
- `.workflow/DECISIONS.md` — journal des décisions architecturales
- `.workflow/BACKLOG.md` — roadmap
- `.workflow/phases/` — un dossier par phase avec `PLAN.md`, `REVIEW.md`

## Licence

MIT.
