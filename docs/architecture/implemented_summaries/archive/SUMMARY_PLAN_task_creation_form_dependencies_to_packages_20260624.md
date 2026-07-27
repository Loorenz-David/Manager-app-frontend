# SUMMARY_PLAN_task_creation_form_dependencies_to_packages_20260624

## Metadata

- Summary ID: `SUMMARY_PLAN_task_creation_form_dependencies_to_packages_20260624`
- Status: `summarized`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-24T10:18:47Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_task_creation_form_dependencies_to_packages_20260624.md`
- Related debug plan (optional): `—`

## What was implemented

- Extended `@beyo/images` with shared `create-images-from-url` schemas and mutation support, then aligned the package endpoint contract with the manager app by targeting the supported `/api/v1/images/from-url` API.
- Extended `@beyo/item-issues` with task-creation-facing item issue field schemas.
- Extended `@beyo/item-categories` with picker types, query keys, fetch/query hooks, a selection store, picker flow, picker field, picker sheet page, and surface registrations.
- Created new package slices for `@beyo/items`, `@beyo/customers`, `@beyo/working-sections`, and `@beyo/phone-input` so task-creation form dependencies no longer need manager-app feature imports.
- Extended `@beyo/upholstery` with picker DTOs, picker queries, single-option query, task-form upholstery fields, and then completed the package with the full manager-equivalent upholstery picker experience: quick filters, favorite toggling, reorder sheet, picker controller, and parity UI components.
- Extended `@beyo/tasks` with task form field components, `createTask`, `useCreateTask`, and task form schema/constants needed by the future task-creation package.
- Extended `@beyo/lib` exports so shared phone country data and lookup helpers are available to package-owned phone-input code.
- Refined shared field parity after the initial extraction, including aligning `@beyo/items` `ItemIdentityField` behavior and presentation with the manager app implementation.

## Files changed

- `packages/images/`: added shared image-from-url creation support and corrected the package API contract to use the same `/api/v1/images/from-url` endpoint and response shape as the manager app.
- `packages/item-issues/`: added form field schemas for task creation.
- `packages/item-categories/`: added picker API/store/flow/component/surface support.
- `packages/items/`: new package for item identity, lookup, quantity, and position fields, later aligned to manager parity for the integrated scanner/input field presentation.
- `packages/customers/`: new package for customer fields and grouped customer form UI.
- `packages/working-sections/`: new package for working-section picker APIs, store, shortcuts, component, and worker-picker surface.
- `packages/phone-input/`: new package for managed phone input and country picker surface.
- `packages/upholstery/`: added picker APIs and task-form upholstery field components, then expanded to include the manager-equivalent picker page, reorder sheet, controller, favorite/reorder actions, and supporting UI components.
- `packages/tasks/`: added task form fields plus create-task API and action hook.
- `packages/lib/src/index.ts`: exported shared phone country helpers needed by package-owned phone input.

## Contract adherence

- Package-owned code only imports other packages or same-package files; no new app-path imports were introduced.
- Public APIs were exposed through each package `src/index.ts` instead of app-level registries.
- Form field implementations continue to use `useFormContext` and `useController` patterns already established in the repo.
- Surface registrations stay package-owned via `lazyWithPreload` and exported surface id constants.

## Validation evidence

- `npm run typecheck`: pass
- `npm exec -- tsc -p packages/tasks/tsconfig.json --noEmit`: pass
- `npm exec -- tsc -p packages/customers/tsconfig.json --noEmit`: pass
- `npm exec -- tsc -p packages/phone-input/tsconfig.json --noEmit`: pass
- `npm exec -- tsc -p packages/upholstery/tsconfig.json --noEmit`: pass

## Known gaps or deferred items

- The new packages are exported and type-safe, but the manager app still keeps its existing parallel feature implementations as intended by the plan.
- Standalone `tsc` on `packages/images` still surfaces existing external `@dnd-kit` declaration issues when compiled in isolation; this does not affect the required repo-wide `npm run typecheck`, which passes.
- `@beyo/task-creation` wiring remains for the follow-up plan.

## Handoff notes (if needed)

- No backend handoff required.

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/implementation/PLAN_task_creation_form_dependencies_to_packages_20260624.md`
