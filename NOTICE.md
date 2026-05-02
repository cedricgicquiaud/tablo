# NOTICE

This product includes code derived from the [Nao](https://github.com/getnao/nao) open-source project (commit `192b377`), licensed under the Apache License 2.0.

## Files derived from Nao

The following files contain logic adapted from Nao. Each file includes a JSDoc header attributing the source.

### Phase 17 cycle A (architecture inspiration only — no direct copy)

The modular structure of `src/lib/ai-engine/` (separation tool / agent loop / helpers / types) is inspired by Nao's `apps/backend/src/agents/` architecture. No direct code was copied in cycle A.

### Phase 17 cycle B (pending)

- Profiling stats algorithms — derived from Nao's `apps/backend/src/services/profiling.py` (logic inspiration, TS rewrite).

### Phase 17 cycle C

- `src/lib/ai-engine/tools/suggest-follow-ups.ts` — adapted from `apps/backend/src/agents/tools/suggest-follow-ups.ts` (~22 lines). Schema input adapted from `apps/shared/src/tools/suggest-follow-ups.ts`.
- Validation chart_type/series count : adapted directly into Cadran's `extractData()` (`src/lib/ai/extract-preview.ts`) instead of a separate file. R45 funnel 3-7 steps added in cycle C.

## Apache License 2.0

The full text of the Apache License 2.0 is available at: https://www.apache.org/licenses/LICENSE-2.0

```
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Attribution updates

This NOTICE file is updated as new files derived from Nao are added during Phase 17 cycles B and C. See `.workflow/phases/17-ai-engine/PLAN.md` for the planned scope.
