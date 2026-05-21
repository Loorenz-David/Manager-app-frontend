# SUMMARY_box_picker_primitive_and_fields_20260520

## Metadata

- Summary ID: `SUMMARY_box_picker_primitive_and_fields_20260520`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-20T19:32:11Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_box_picker_primitive_and_fields_20260520.md`
- Related debug plan (optional): `—`

## What was implemented

- Added a shared `BoxPicker` primitive system under `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/box-picker/` with single-select and multi-select modes, grid and stack layouts, three visual variants, and a selected-action slot that preserves click isolation.
- Added RHF-aware task fields for `fulfillment_method` and `return_source` using the new primitive and the task schema’s existing enum values.
- Extended the item feature with category and issue field schemas, centralized temporary item test data, three item field components, three lazy-loaded sheet pages, and item surface registrations.
- Registered the new item sheets in the app surface registry and exported the new primitive and item/task feature entry points through their public barrels.

## Files changed

- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/box-picker/*`: added the reusable box picker primitive types, variants, option renderer, component, and barrel.
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/index.ts`: exported the new primitive API.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskFulfillmentMethodField.tsx`: added the fulfillment method field.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/components/fields/TaskReturnSourceField.tsx`: added the return source field.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/index.ts`: exported the new task fields.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/types.ts`: augmented item field composition schemas and added the issue field entry schema.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/item-test-data.ts`: centralized temporary categories, issues, and severities.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/*`: added category selection, issue selection, and fast issue action fields.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/pages/*`: added the category picker, severity picker, and fast issue sheet pages.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/surfaces.ts`: registered the item sheets.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/index.ts`: exported the new item fields, schemas, and surfaces.
- `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts`: added `itemSurfaces` to the app registry.

Post-review fixes (2026-05-21):
- `apps/managers-app/ManagerBeyo-app-managers/src/components/primitives/box-picker/box-picker.variants.ts`: added `compoundVariants` entry — pill + unselected → `border-dashed`, so issue pills show a dashed border before selection.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemIssuesField.tsx`: rewritten to use `BoxPicker mode="multiple"` with `onValueChange` diff-detection and `renderSelectedAction` for the × button. Also added `data-testid="item-issues-error"` on the error paragraph.

## Deviations from plan

Codex made four improvements beyond the plan spec. All are intentional and correct; they are listed here so future readers understand what changed and why.

1. **`surfaces.ts` — preload functions added** (`preloadItemCategoryPickerSurface`, `preloadItemIssueSeverityPickerSurface`, `preloadItemFastIssueSurface` + a `preloadedItemSurfaces` deduplication `Set`). Field components call these in `useEffect` on mount to eager-load lazy chunks before the user taps anything, avoiding a visible bundle-load delay on first open. Not exported from the feature index; correctly scoped to intra-feature use.

2. **`box-picker.variants.ts` — `w-full min-h-12` added to the base class.** Guarantees the 48 px minimum touch target on every variant without repeating it per variant. Directly implements the mobile UX note from the plan without needing per-variant duplication.

3. **`ItemCategorySelectionField` — layout stability placeholder.** A transparent `div[aria-hidden]` with `h-12` occupies the selected-trigger slot when no category is selected yet, preventing layout shift when the trigger appears.

4. **`ItemCategorySelectionField` — trigger `onClick` fallback.** The handler uses `majorField.value ?? selectedCategory.major_category` instead of `majorField.value` alone, guarding against an edge case where `majorField.value` is undefined while a `selectedCategory` still exists (e.g. on mount before the `useEffect` infers the major category).

Post-review contract-drift fixes (2026-05-21):

5. **`ItemIssuesField` — rewritten to use `BoxPicker`.** The original Codex implementation bypassed the primitive with a hand-rolled `div[role="button"]` grid. The rewrite uses `BoxPicker mode="multiple" layout="grid" columns={2} visualVariant="pill"` with the `onValueChange` diff-detection pattern and `renderSelectedAction` for the × button. A `compoundVariants` entry was added to `box-picker.variants.ts` to apply `border-dashed` on pill + unselected (the only pill-specific style that could not come from the existing `selected: false` variant).

6. **`ItemIssuesField` error `<p>` — `data-testid="item-issues-error"` added.** Consistent with the pattern on every other field's error paragraph.

---

## Contract adherence

- `architecture/01_architecture.md`: `BoxPicker` remains app-agnostic under `components/primitives`, while RHF-aware bindings and domain logic live under `features/tasks` and `features/items`.
- `architecture/07_components.md`: all new components use named exports and keep render logic local without nested public component definitions.
- `architecture/09_forms.md`: all form-bound fields use `useController()` and keep the primitive RHF-free.
- `architecture/14_styling.md`: styling stays in Tailwind and `cva`; no CSS files or feature-driven primitive styling leaks were introduced.
- `architecture/15_feature_structure.md`: new feature exports were added through each feature’s `index.ts` boundary, and the app registry imports item surfaces through the feature boundary.
- `architecture/28_surfaces.md` and `architecture/28_surfaces_local.md`: item pickers are ephemeral `sheet` surfaces opened through the surface store and lazy-registered per feature.

## Validation evidence

- `npm run typecheck`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run build`: pass, executed in `apps/managers-app/ManagerBeyo-app-managers`
- `rg -n "useFormContext|useController" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives`: pass; no RHF hooks in primitives
- `rg -n "@/features/|features/" apps/managers-app/ManagerBeyo-app-managers/src/components/primitives`: pass; no feature imports in primitives
- Manual test via `TestingFormsContent`: all fields verified working by David (2026-05-21)
- Playwright specs written and passing (2026-05-21)
- Post-review `npm run typecheck`: pass after `ItemIssuesField` rewrite and `compoundVariants` addition

## Known gaps or deferred items

- `ItemFastIssueSheetPage` remains the planned placeholder and still only renders `Coming soon`.
- The intention note at `docs/architecture/under_construction/intention/building_box_selection.md` is informal rather than a full intention-plan document, so the lifecycle trace was updated there minimally.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_box_picker_primitive_and_fields_20260520_1932.md`
