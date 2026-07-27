# SUMMARY_upholstery_grouping_lists_20260718

## Metadata

- Summary ID: `SUMMARY_upholstery_grouping_lists_20260718`
- Status: `summarized`
- Owner agent: `claude`
- Created at (UTC): `2026-07-18T21:05:00Z`
- Source plan: `docs/architecture/archives/implementation/PLAN_upholstery_grouping_lists_20260718.md`
- Related debug plan (optional): n/a

## What was implemented

Opt-in "group by upholstery" for the two paginated list surfaces named in `HANDOFF_TO_FRONTEND_upholstery_grouping_20260718.md`. When enabled, the frontend sends `group_by_upholstery=true` and renders a section-header card before each contiguous group of same-upholstery rows; rows with no upholstery fall into a trailing "Upholstery not selected" section.

- **Shared primitives (`@beyo/upholstery`)** — one home for both consumers (both already depend on it; no cycle):
  - `UpholsteryGroupFieldsSchema` / `UpholsteryGroupInventorySchema` — the four additive response fields, all `optional().nullable().default(null)`, safe to `.extend()` onto any row schema. Inventory meters normalized decimals-as-strings, reusing `UPHOLSTERY_INVENTORY_CONDITION`.
  - `buildUpholsteryGroupedRows()` — pure single-pass transform (flat ordered list → `{kind:"header"|"row"}` discriminated union), emitting a header whenever `upholstery_group_key` changes vs. the previous row; handles the pagination carry-over by grouping over the flattened list.
  - `UpholsteryGroupHeaderCard` — `Avatar` (fabric image) left + name right, no background; `null` key → "Upholstery not selected".
- **Task list (`@beyo/tasks`)** — `group_by_upholstery` param + serialization, raw schema extended, `upholsteryGroup` on `TaskCardViewModel`, `renderRows` in the flow, on/off `BoxPicker` toggle in `TaskFilterSheetPage`, preference persisted in `localStorage` (`beyo.tasksList.groupByUpholstery`, default OFF) via the store.
- **Working-section steps (workers-app)** — same param/schema/VM/renderRows wiring in the controller, on/off toggle in `StepStateFilterSheetPage`, preference persisted (`beyo.workingSectionSteps.groupByUpholstery`), headers rendered in both the normal and batch list branches.

Grouping is treated as a view mode: it is deliberately excluded from the `activeFilterCount` badge, and the inventory fields are parsed/threaded but not yet rendered (deferred per request).

## Files changed

- `packages/upholstery/src/upholstery-grouping.ts`: new — schema, builder, header view model, `NO_UPHOLSTERY_LABEL`.
- `packages/upholstery/src/components/UpholsteryGroupHeaderCard.tsx`: new — Avatar-based section header.
- `packages/upholstery/src/upholstery-grouping.test.ts`: new — 6 unit tests (schema defaults/normalization, builder grouping/null-bucket/keys/empty).
- `packages/upholstery/src/index.ts`: exported the new schema, types, builder, and component.
- `packages/tasks/src/types.ts`: `TaskListItemRawSchema.extend(...)`, `group_by_upholstery` on `ListTasksFullParams`, `upholsteryGroup` on `TaskCardViewModel`.
- `packages/tasks/src/api/list-tasks.ts`: serialize `group_by_upholstery`.
- `packages/tasks/src/lib/grouping-preference-storage.ts`: new — localStorage read/write helper.
- `packages/tasks/src/store/tasks-page.store.ts`: hydrated `groupByUpholstery` + persisting setter; excluded from `reset()`.
- `packages/tasks/src/flows/use-tasks-page.flow.ts`: param, populate `upholsteryGroup`, expose `renderRows`.
- `packages/tasks/src/controllers/use-tasks-view.controller.ts`: expose toggle + wire filter sheet.
- `packages/tasks/src/surface-ids.ts`: extend `TaskFilterSheetSurfaceProps`.
- `packages/tasks/src/pages/TaskFilterSheetPage.tsx`: on/off `BoxPicker`.
- `packages/tasks/src/components/TasksView.tsx`: render `renderRows` (header vs card).
- `packages/tasks/src/actions/use-create-task.ts`: optimistic list item carries the four new (null) fields.
- `apps/workers-app/.../task_steps/types.ts`: `TaskStepSchema.extend(...)`, `group_by_upholstery` on params, `upholsteryGroup` on VM + populated in `toTaskStepCardViewModel`.
- `apps/workers-app/.../task_steps/lib/grouping-preference-storage.ts`: new — localStorage helper.
- `apps/workers-app/.../task_steps/surface-ids.ts`: extend `StepStateFilterSheetSurfaceProps`.
- `apps/workers-app/.../task_steps/controllers/use-working-section-steps.controller.ts`: state (persisted), param, `renderRows`, filter wiring.
- `apps/workers-app/.../pages/task_steps/StepStateFilterSheetPage.tsx`: on/off `BoxPicker`.
- `apps/workers-app/.../task_steps/components/WorkingSectionStepsView.tsx`: render `renderRows` in both branches.

## Contract adherence

- `24_dto.md`: grouping is a pure view-model transform over raw rows; no side effects, testable in isolation.
- `07_components.md`: `UpholsteryGroupHeaderCard` is context-free and prop-driven.
- `26_persistence.md`: localStorage helpers are SSR-guarded, zod-validated reads with a safe default.
- `35_shared_packages.md`: shared code lives in `@beyo/upholstery` (verified dependency direction — no import cycle); consumed by `@beyo/tasks` and workers-app via the public `index.ts`.
- `04_api_client_local.md`: no new error cases; the additive param rides the existing envelope.

## Validation evidence

- `npm run typecheck`: **pass** (exit 0, all three apps + all packages).
- `npm run test:upholstery`: **pass** — 35/35 (9 files), including the 6 new grouping tests.
- `npx playwright test --project=mobile` / `--project=desktop`: **not run** — requires a live backend serving the new `group_by_upholstery` shape; deferred to runtime validation (see gaps).

## Known gaps or deferred items

- Runtime/Playwright validation against the live grouped endpoints is pending (per the handoff's suggested manual checks: group continues across a `Load more` boundary without a duplicate header, null bucket last, toggle-off restores ordering).
- Inventory fields (`upholstery_group_inventory`, condition, meters) are parsed and threaded but not rendered — intentional first-iteration scope.
- The tasks package has no configured vitest suite in this repo; its component tests only run under a jsdom-configured runner, so the new tasks-side logic is covered by typecheck + the shared `@beyo/upholstery` builder tests.

## Handoff notes (if needed)

- From backend dependency: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_grouping_20260718.md`

## Lifecycle transition

- Current state: `summarized`
- Next state: `archived`
- Archive target record: `docs/architecture/archives/ARCHIVE_upholstery_grouping_lists_20260718_2105.md`
