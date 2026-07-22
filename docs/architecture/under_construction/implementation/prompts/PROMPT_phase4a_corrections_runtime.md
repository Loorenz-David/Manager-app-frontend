# Codex — Phase 4a: `@beyo/presentation-runtime` package (F1 of the Phase 4 corrections plan)

You are implementing **part F1 only** of an approved corrections plan, working in the `frontend/` monorepo root. Start coding early — read only what is listed below, then build.

## Spec

`docs/architecture/under_construction/implementation/PLAN_presentation_phase4_corrections_20260722.md` — **acceptance criteria 1–3 and implementation step 1 only.** Do not touch the editor (criteria 4–12 belong to the next session, 4b).

## Read (only this)

1. The corrections plan's criteria 1–3, step 1, risks, and validation commands for runtime.
2. Master plan `PLAN_presentation_capability_master_20260722.md` — sections "Package boundaries" and "Design → backend mapping" (`REFERENCE_CANVAS_WIDTH = 390`, element ordering, layer conventions).
3. Backend `docs/presentation_capability/backend/09_slide_composition.md` — the slide/element shape, ordering rule, config schemas, and the three recipes (your renderer fixtures).
4. Relational only: `packages/presentation-builder/src/types.ts` (which schemas move), `packages/presentation-builder/package.json` + `tsconfig.json` (scaffold shape), `packages/shopify/vitest.config.ts` (test-config precedent).

## Deliver

1. `packages/presentation-runtime` — package.json (peers: react, zod only), tsconfig, vitest config, `src/index.ts`.
2. Move the composition-domain schemas (element, layout, style, animation, playback enums, `composition_schema_version`) from builder `types.ts` into runtime; builder **imports and re-exports** them so every existing consumer keeps working. Exactly one definition of each schema in the repo.
3. `REFERENCE_CANVAS_WIDTH = 390` constant; deterministic element ordering comparator (`layer_index` ASC, `sequence_order` ASC, `start_ms` ASC, `client_id` ASC — null client_ids last, stable).
4. `SlideCompositionRenderer` — **static**: props `{ elements, timeMs, containerWidth, containerHeight }` (plus what you find necessary); renders visible elements at `timeMs` with normalized layout → absolute positioning, `fit` handling, anchor support (center at minimum), fonts scaled by `containerWidth / REFERENCE_CANVAS_WIDTH`. No animation engine, no clock (Phase 5).
5. Tests: the three `09` recipes at multiple `timeMs` values; scaling consistency at 58×104 / 264×470 / arbitrary; ordering comparator; legacy synthesized elements (`client_id: null`) render.
6. Root `package.json`: add runtime to `typecheck` and a `test:presentation-runtime` script.

## Validation (all must be green)

- `npm run typecheck`
- `npm run test:presentation-runtime`
- `npm run test:presentation-builder` (existing 29 must stay green after the schema move)
- `rg -n "@beyo/api-client|@beyo/auth|presentation-builder|@beyo/presentations|apps/" packages/presentation-runtime/src` → no matches

## Finish

- **No lifecycle processing** — do not archive anything, do not write a summary. Append one dated line to the corrections plan's Review log: "4a (F1) implemented — <validation results>".
- Report: files created/moved, validation outputs, deviations. If you cannot finish, stop at a clean boundary and report exactly what remains — never stop before writing code.
