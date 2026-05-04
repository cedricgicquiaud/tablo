# Strategie de tests

## Approche

- TDD strict : tests ecrits AVANT le code de production
- Cycle RED > GREEN > REFACTOR pour chaque fonctionnalite

## Tests unitaires

- Framework : {{Vitest / Jest / Pytest / ...}}
- Commande : `{{npm test / bun test / pytest}}`
- Convention de nommage : {{fichier.test.ts / test_fichier.py}}
- Couverture cible : {{80% / ... (si applicable)}}

## Tests E2E / Integration

- Framework : {{Playwright / Cypress / ... (si applicable)}}
- Commande : `{{npm run test:e2e}}`
- Scenarios couverts : {{parcours utilisateur critiques}}

## Ce qu'on teste

- Logique metier (toujours)
- Cas limites et cas d'erreur
- Integrations externes (avec mocks si necessaire)
- {{Regles specifiques au projet}}

## Ce qu'on ne teste PAS

- Getters/setters triviaux
- Code genere (migrations, types auto-generes)
- Styles purement visuels (couverts par UAT)

## Smoke testing manuel obligatoire (issu de LEARN apres 3 occurrences detectees)

Aucune phase frontend ou orchestration multi-services ne peut etre consideree "DONE" sans smoke testing manuel sur l'app dev tournant. Les tests automatises verts d'une PR ne suffisent pas — surveiller systematiquement :

- **Lancer `bun run dev`** + login + executer les parcours UAT du PLAN.
- **Surveiller le terminal serveur** en parallele. Les logs revelent souvent des erreurs silencieusement catchees (FK violations, RPC errors, race conditions).
- **Ouvrir la table d'audit** si pertinent (ex `ai_engine_audit`) pour verifier que les operations cote backend marchent.
- **Tester les cas limites UX** : onglet ferme pendant generation, click multiple, refresh navigation, JWT orphan apres `db:fresh`.

Sur Phase 17 specifiquement, **7 bugs reels** ont ete detectes par smoke testing manuel apres 183 tests verts (retry cap exploration, stream close idempotent, FK workspace_id, RPC commentaires SQL, follow-ups apres propose_widget, ERR_TOO_MANY_REDIRECTS cookies, etc.).

L'ecart entre "tests verts" et "feature qui marche bout-en-bout" est non-trivial et systematique. Le TDD couvre les invariants logiques, le smoke testing couvre l'integration reelle.

Source : 3 occurrences detectees (P14 OAuth, P15 design, P17 moteur AI).

### Cas particulier : flows OAuth third-party (issu de LEARN P14.4 — 6+ occurrences)

Pour les phases qui implementent un flow OAuth third-party (Supabase, Stripe Connect, future Airtable/HubSpot/Salesforce/etc.) : **smoke-tester le 1er round de bout en bout AVANT d'ecrire les unit tests sur les helpers**. La doc third-party ne reflete pas toujours le comportement reel, et beaucoup d'aspects (scopes acceptes, format endpoint URL, contraintes ajoutees recemment, branding, account auto-generation en mode test) ne sont visibles qu'en exercant le flow.

Frictions Stripe Connect Standard documentees en P14.4 (cf `.workflow/phases/14.4-stripe-oauth-modal-sources/REVIEW.md`) : scope `read_only` refuse, URL `/oauth/v2/token` faux (vrai endpoint = `/oauth/token`), Dashboard UI refondue, comptes test generes a chaque OAuth, comptes connectes vides, branding plateforme.

Pratique : ajouter un `[smoke S1] OAuth start → consent → callback OK` en cycle C1/C2 du PLAN, avant d'ecrire les unit tests sur les helpers OAuth. Si le smoke revele un decalage, ajuster les helpers AVANT d'enclencher le TDD.

## Mocking : `vi.hoisted` pour partager mocks entre `vi.mock` et asserts (issu de LEARN P14.4 — 4 occurrences detectees)

`vi.mock(...)` est hoisted top-level par Vitest, donc impossible de referencer une variable locale `const mockFn = vi.fn()` dedans (`Cannot access 'mockFn' before initialization`). Solution canonique : **declarer les mocks dans `vi.hoisted(...)`** pour qu'ils soient eux aussi hoisted.

```ts
// Pattern correct
const { mockFn, otherMock } = vi.hoisted(() => ({
  mockFn: vi.fn(),
  otherMock: vi.fn(),
}));

vi.mock("@/lib/some-module", () => ({
  someFunc: mockFn,
}));

import { thingUnderTest } from "./code";

describe("...", () => {
  it("...", () => {
    mockFn.mockReturnValue("foo");
    expect(thingUnderTest()).toBe("foo");
    expect(mockFn).toHaveBeenCalled();
  });
});
```

Source : 4 occurrences (P14.1 Supabase OAuth tests, P14.4 modale + callback OAuth tests, profile-after-oauth tests).

## Bench scriptable obligatoire pour phases avec RNF chiffres (issu de LEARN apres 3 occurrences detectees)

Toute phase qui pose des RNF mesurables (latence, cout, throughput, taux de succes) doit produire un script `scripts/bench-<phase>.ts` reproductible. Le bench doit :

- Etre lance via `bun run scripts/bench-<phase>.ts` ou un script npm dedie.
- Mesurer chaque RNF de la SPEC explicitement (verdict `✓` / `✗` dans le tableau Markdown produit).
- Retourner du code 0 si tous les RNF sont passes, code 1 sinon (utilisable en CI plus tard).
- Etre idempotent / nettoyer ses artefacts (ex : dashboard de test cree puis supprime, ou identifie comme `[BENCH]`).
- Documenter ses prerequis (env vars, seed DB, etc.) dans un commentaire d'en-tete.

Le bench artefact doit etre commit dans `.workflow/phases/NN-nom/BENCH-*.md` avec :
- Date d'execution
- Tableau des RNF mesures vs cibles
- Analyse comparative (avant / apres si refactor)
- Commande exacte de reproduction

Source : 3 occurrences detectees (P17 cycle C `bench-ai-engine.ts`, P17.1 reuse + extension, P18 `bench-starter.ts`).

---
Ce fichier est mis a jour par le workflow FORGE (phase LEARN) quand des patterns de tests recurrents sont detectes.
