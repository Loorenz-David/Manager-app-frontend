# SUMMARY_item_upholstery_field_20260521

## Metadata

- Summary ID: `SUMMARY_item_upholstery_field_20260521`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-21T16:27:28Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_item_upholstery_field_20260521.md`
- Related debug plan (optional): `—`

## What was implemented

- Added the reusable upholstery picker data and surface slice under `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/`, including the picker record type, static mocked data, a searchable slide picker page, and presentation/search components.
- Added `ItemUpholsteryField` as a controlled item field trigger that opens the `upholstery-picker` slide surface and renders empty, resolved, and fallback-ID states from the mocked upholstery dataset.
- Registered the new slide surface in the upholstery feature and app surface registry, and added `ItemUpholsteryFieldsSchema` so parent forms can compose the field contract without introducing RHF wiring in the field itself.
- Added Vitest coverage for `UpholsteryCard`, `UpholsterySearch`, and `ItemUpholsteryField`.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/*`: added picker types, test data, components, picker slide page, surface registration, tests, and public exports.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemUpholsteryField.tsx`: added the controlled trigger field and colocated tests.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`: added `ItemUpholsteryFieldsSchema` and `ItemUpholsteryFields`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/index.ts`: exported the new field and field schema.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: merged `upholsterySurfaces` into the registry.

## Deviations from plan

1. `UpholsterySearch` returns alphabetically sorted results even for the initial empty-query state. This still satisfies the acceptance criteria because all items are returned, and it keeps the sort toggle deterministic from first render.
2. The validation command used `npm run test:unit -- upholstery` because this app exposes `test:unit` rather than `test`, while still targeting the upholstery scope the plan requested.
3. Playwright mobile validation was not executed in this implementation pass. The lifecycle skill lists it as a quality gate, but the plan acceptance criteria only required typecheck and Vitest for this scope, so runtime validation remains deferred.

## Contract adherence

- `architecture/07_components.md`: the new shared picker presentations are named exports with prop-driven rendering and no business-layer imports.
- `architecture/09_forms.md`: the item field remains a controlled component and the schema composition lives in `features/items/types.ts`, matching the schema-first contract and the plan’s RHF boundary.
- `architecture/14_styling.md`: styling stays in Tailwind utilities with `cn()` and `cva`; no CSS files or inline styles were introduced.
- `architecture/15_feature_structure.md`: upholstery feature additions stay inside the feature slice and are exported through the feature `index.ts` boundary.
- `architecture/28_surfaces.md` and `architecture/28_surfaces_local.md`: the picker is registered as a `slide` surface with no path and consumes `useSurfaceProps()` plus `useSurfaceHeader()` inside the slide page.
- `architecture/31_animations.md`: the card selection transition uses CSS `transition-colors duration-150` rather than Framer Motion.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test:unit -- upholstery`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`

## Known gaps or deferred items

- The new field is exported but not inserted into an existing RHF field group, matching the plan’s explicit controlled-component scope.
- API fetching, TanStack Query integration, pagination, and Playwright runtime validation remain out of scope exactly as documented in the plan.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_item_upholstery_field_20260521_1627.md`
