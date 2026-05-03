# Architecture

## Modules

| Module | Responsabilite | Dependances |
|--------|---------------|-------------|
| {{module}} | {{role}} | {{deps}} |

## Regles de dependances

- {{Les composants UI ne doivent pas acceder directement a la DB}}
- {{La logique metier est isolee dans lib/ ou services/}}
- {{Les routes/controllers sont fins — ils delegent aux services}}

## Patterns architecturaux

- {{MVC / Clean Architecture / Feature-based / ...}}
- {{State management : ...}}
- {{Data fetching : ...}}

## Limites et contraintes

- {{Pas de dependance circulaire entre modules}}
- {{Les services externes sont wrapes dans des adapters}}

## Pure logic + dependency injection pour modules avec I/O (issu de LEARN apres 3 occurrences detectees)

Pour les modules qui orchestrent des dependances I/O (Supabase admin, Anthropic API, fetch externe, fs), preferer la separation en 2 fichiers :

1. **`<module>.ts`** : pure logic avec un type `Deps` injectable. Pas d'import direct de Supabase / Anthropic — tout passe par les deps.
2. **`<module>-action.ts`** ou wrapper Server Action : cree les vraies deps (Supabase admin client, getAnthropicClient, etc.) et appelle la fonction pure.

Avantages :
- Tests TDD avec deps mockes legers (`{listTables: vi.fn()...}`) au lieu de `vi.mock("@/lib/supabase/admin", ...)` complexe.
- La pure logic est testable sans setup environnement.
- Le wrapper Server Action reste tres mince (juste assemblage des deps).

Exemple concret :
- `src/lib/tablo/starter-pipeline.ts` : `runStarterPipeline(deps: StarterDeps)` — 10 tests TDD avec mocks legers.
- `src/lib/tablo/starter-dashboard.ts` : Server Action wrapper qui cree les deps Supabase + runAgent + AbortController.

Source : 3 occurrences detectees (P17 utils atomiques, P17.1 schema-prompt + integration runAgent, P18 starter-pipeline + wrapper).

---
Ce fichier est mis a jour par le workflow FORGE (phases ORIENT et LEARN).
