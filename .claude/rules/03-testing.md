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

---
Ce fichier est mis a jour par le workflow FORGE (phase LEARN) quand des patterns de tests recurrents sont detectes.
