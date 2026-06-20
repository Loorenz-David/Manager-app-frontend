# PLAN_pin_notifications_20260620

## Metadata

- Plan ID: `PLAN_pin_notifications_20260620`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-06-20T00:00:00Z`
- Last updated at (UTC): `2026-06-20T15:44:44Z`
- Related issue/ticket: `—`
- Intention plan: `docs/architecture/under_construction/intention/pin_intention.txt` (currently empty — intent captured inline below)

## Goal and intent

- Goal: Let a user select which entities (and which state transitions of those entities) they want to be notified about, by creating polymorphic notification **pins** through the new batch pin endpoints. The push/VAPID delivery layer already exists; this plan only builds the **pin authoring UI + client logic**.
- Business/user intent: A worker or manager opens the actions surface for a task step (workers) or task (managers), taps **Pin notifications**, and chooses entities + states (e.g. "notify me when this task step transitions to `paused` or `completed`"). On submit the frontend batch-creates pins; on a later open it hydrates and lets the user edit/remove them.
- Non-goals:
  - Building or changing push delivery, VAPID registration, or the notification feed (already implemented — see `@beyo/notifications`).
  - Backend changes — all endpoints are delivered (`HANDOFF_TO_FRONTEND_pin_notification_batch_20260620.md`).
  - Pinning `case`, `case_list`, `conversation`, `conversation_list` — out of scope for this iteration.
  - Real-time live update of the pin list across devices.

## Scope

- In scope:
  - Shared pin **logic layer** in `@beyo/notifications` (types/Zod, query keys, batch API functions, query hook, action hooks, `npin_` client-id helper).
  - Shared task-steps-by-task read used by the picker (`GET /tasks/{task_id}/steps`).
  - **Workers app** pin form (entities: `item_upholstery`, `task_step`) reached from `TaskStepActionsSheetPage`.
  - **Managers app** pin form (entities: `item_upholstery`, `task_step`, `task`) reached from `TaskActionsSheetPage`.
  - The special **task-step picker**: a self-fetching list of the task's steps (image + section name + current state), each opening a nested bottom sheet to pick that step's states; selecting ≥1 state marks the step `bg-primary`, selecting 0 states deselects it.
  - Hydration of existing pins (`GET /pins?major_client_entity_ids=<task_id>`) and diff-based save (POST upsert + DELETE removed).
- Out of scope:
  - Per-entity `fire_once` UI toggle (default `false`; see clarification).
  - `op: eq` / `op: not_in` conditions — the multi-state form maps to `op: in` only.
- Assumptions:
  - All pins authored in one form share `major_entity_type = "task"` and `major_client_entity_id = <the task's client_id>`, enabling single-query hydration and major-entity delete.
  - The multi-select state UI serializes to a single condition `{"type":"state","op":"in","value":[...selected]}` per pinned entity; empty selection = entity not pinned (so no `op: in` with `[]`).
  - The "different forms" requirement means **per-app form/surface components** sharing one logic layer (mirrors the `@beyo/item-issues` shared-surface precedent rather than one cross-app form).

## Clarifications required

- [x] **`client_id` prefix conflict — RESOLVED (2026-06-20, david).** Add the prefix to the client-id utility: change `NotificationPin: 'npn'` → `NotificationPin: 'npin'` in `packages/lib/src/client-id.ts` so `generateClientId('NotificationPin')` yields a compliant `npin_<ulid>` (31 chars, passes `CLIENT_ID_REGEX`, ≤64). No separate helper. Re-sync `docs/architecture/backend/tables/client_id_prefix_map.md` so the "mirrors backend map exactly" comment stays true; pins are a new frontend feature so no existing `npn_` pin ids exist to migrate.
- [x] **`item_upholstery` instance source — RESOLVED (2026-06-20, david).** The `iup_` id is `ItemUpholsteryEntry.client_id` from the existing `useItemUpholsteryQuery(itemId)` / `fetchItemUpholstery` (`GET /items/{itemId}/upholstery`) in `@beyo/tasks`. Both apps already provide the **item id**: workers via the step's `item` snapshot `client_id` (`features/task_steps/types.ts` `ItemSnapshotSchema.client_id`), managers via the task detail `item.client_id` (`features/tasks/types.ts` `TaskDetailRaw.item.client_id`). **Single-selection model:** although the API can return 1..n upholstery entries, the product will be restricted to one per item, so the container pins exactly one `item_upholstery` — take the single (first) entry from the query and render one state multi-select for it. Do not build a per-entry list; if the query returns `[]`, show an empty state and do not pin.
- [ ] **Hydrate-and-edit vs create-only.** Should opening the form pre-load existing pins for the task (`GET /pins?major_client_entity_ids=<task_id>`) and show current selections for edit/remove (assumed yes), or is this create-only each session?
- [ ] **`item_upholstery` worker states.** Workers options are `ordered`, `available`; managers add `in_use`. Confirm these map to the `item_upholstery` enum values `ordered` / `available` / `in_use` (handoff lists `missing_quantity`, `available`, `needs_ordering`, `ordered`, `in_use`, `completed`, `failed`).
- [ ] **`task` self-pin major fields (managers).** For an `entity_type: task` pin, confirm `major_entity_type: "task"` + `major_client_entity_id` = the same task `client_id` (self), so it hydrates/deletes with the rest.
- [ ] **`fire_once` exposure.** No UI was described — confirm always sending `fire_once: false` is acceptable for v1.

## Acceptance criteria

1. Workers: from a task step card → three-dot → **Actions** sheet, a **Pin notifications** button (lucide `Pin` icon) opens a `slide` surface form.
2. Managers: from a task → **Actions** sheet, a **Pin notifications** button opens the equivalent `slide` form.
3. The form renders one container (managers `ContentCard` / workers equivalent) per supported entity, each titled, with state options rendered in a `BoxPicker` (mode `multiple`).
4. The `task_step` container fetches the task's steps independently via `GET /tasks/{task_id}/steps`, renders each as a box (section image, section name, current state pill — styled per `StepDependencyWarningSheetPage`); tapping opens a nested `sheet` to pick that step's states; ≥1 state → box shows selected (`bg-primary`); 0 states → deselected.
5. Entity state sets per app match the spec (workers `item_upholstery`: ordered/available, `task_step`: pending/working/paused/completed; managers `item_upholstery`: ordered/available/in_use, `task_step`: pending/working/paused/completed, `task`: assigned/working/ready/resolved).
6. Submit batch-creates pins (`POST /pins`) with client-generated `npin_` ids, `entity_type`, `entity_client_id`, `major_entity_type:"task"`, `major_client_entity_id`, and a single `state`/`in` condition; deselected previously-pinned entities are removed (`DELETE /pins`).
7. Re-opening the form hydrates existing pins from `GET /pins?major_client_entity_ids=<task_id>` and reflects current selections.
8. `npm run typecheck` passes; Playwright mobile + desktop specs for the open→select→submit→reopen flow pass in both apps.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md` (+`_local`): layering, route-entry pattern.
- `architecture/02_types.md`: Zod-first types, branded ids.
- `architecture/04_api_client.md` (+`_local`): `apiClient` + `ApiEnvelopeSchema` usage; flat error shape.
- `architecture/05_server_state.md`: query keys + query hook structure (pin hydration, task-steps list).
- `architecture/06_client_state.md`: in-form selection state.
- `architecture/08_hooks.md`: action hooks (batch create/delete/update) with optimistic update + rollback + invalidation.
- `architecture/13_errors.md`: surfacing batch errors.
- `architecture/15_feature_structure.md` (+`_local`): feature/package folder layout + build order.
- `architecture/07_components.md`: feature components consume context only; `data-testid` placement.
- `architecture/09_forms.md` + `24_dto.md`: form submit/validation; DTO ↔ view model (`client_id`, condition serialization).
- `architecture/14_styling.md`: token-based styling for boxes/containers/`bg-primary`.
- `architecture/23_providers.md`: form controller → provider shell for the slide form.
- `architecture/28_surfaces.md` (+`_local`): `slide` form + nested `sheet` (active surface types `slide`/`sheet`/`modal`).
- `architecture/33_vaul_drawer.md`: nested sheet behavior / scroll lock.
- `architecture/35_shared_packages.md §13`: surface-opener **callback injection** boundary (nested state sheet opened from a package component).
- `architecture/27_responsive.md`: mobile-first surfaces both apps.
- `architecture/30_dynamic_loading.md` (+`_local`): `lazyWithPreload` surface registration + preload on the actions button.
- `architecture/32_loading_skeletons.md`: skeleton for the task-steps fetch inside the form.
- `architecture/17_testing.md` + `34_runtime_validation.md` (+`_local`): Vitest + Playwright, testid convention.

### Local extensions loaded

- `04_api_client_local.md`: backend error is a flat string (no `field_errors`); envelope `body.data`.
- `28_surfaces_local.md`: `drawer` excluded; use `slide` + `sheet`.
- `30_dynamic_loading_local.md`: `lazyWithPreload` from `@/utils/lazy-with-preload`; `usePreloadSurface`.
- `34_runtime_validation_local.md`: bootstrap fixtures, project names, testid naming.

### File read intent — pattern vs. relational

Permitted relational reads only (what exists), e.g. `packages/tasks/src/types.ts` (StepState, `ItemUpholsteryEntry`), `packages/notifications/src/types.ts` (existing pattern), each app's `surface-ids.ts` / `surfaces.ts` (registration shape), `apps/*/task_steps|tasks/types.ts` (view-model field names). All "how to write a query/action/provider/dto/surface" questions resolve to the contracts above — do **not** open sibling action/query/provider files to copy structure.

### Skill selection

- Primary skill: `skills/verify` / `run` for runtime validation passes; otherwise standard implementation. No specialized skill required for authoring.

## Implementation plan

### A. Shared logic layer — `packages/notifications/src/pins/` (`@beyo/notifications`)

1. `pins/pin-types.ts` — Zod + types:
   - `PinEntityType` (`task` | `task_step` | `item_upholstery` only for v1).
   - State enums per entity (from handoff): `TaskState`, `PinTaskStepState`, `ItemUpholsteryState`.
   - `PinConditionSchema` (`{type:"state", op:"eq"|"in"|"not_in", value: string | string[]}`).
   - `NotificationPinDtoSchema` (GET item shape incl. `user`, `pinned_at`, `conditions` nullable), `NotificationPinId` branded type (`npin_`).
   - `CreatePinInputSchema` (POST item), `DeletePinTargetSchema`, `UpdatePinInputSchema`.
   - `toPinViewModel` + helpers `serializeStatesToConditions(states)` / `parseConditionsToStates(conditions)`.
2. Client-id: in `packages/lib/src/client-id.ts` change `NotificationPin: 'npn'` → `NotificationPin: 'npin'`; pins call `generateClientId('NotificationPin')` → `npin_<ulid>`. Re-sync the backend `client_id_prefix_map.md` doc. Add a unit test asserting the generated id starts with `npin_` and is ≤64 chars.
3. `api/pins/pin-keys.ts` — query keys: `all`, `byMajor(majorId)`, `byEntities(ids)`.
4. `api/pins/fetch-pins.ts` — `GET /api/v1/notifications/pins` (exactly one of `entity_client_ids` / `major_client_entity_ids`), envelope-validated.
5. `api/pins/create-pins.ts`, `delete-pins.ts`, `update-pins.ts` — array-body `POST` / `DELETE` / `PATCH`.
6. `api/pins/use-pins-by-major-query.ts` — hydration query hook (enabled when `taskId` present).
7. `actions/use-save-pins.ts` — orchestrating action: takes desired selections + hydrated pins, computes upserts (POST) and removals (DELETE by `client_id`), invalidates `pin-keys.byMajor`. Follows `08_hooks.md` optimistic/rollback pattern.
8. Export all from `packages/notifications/src/index.ts`.

### B. Shared task-steps-by-task read — `packages/tasks/src/`

9. `api/task-step-keys.ts` (extend or add), `api/list-task-steps-by-task.ts` (`GET /tasks/{task_id}/steps`, paginated, guard `items` is array, tolerate null `working_section_name`/`_image`), `api/use-task-steps-by-task-query.ts`. Reuse existing `StepState` + `STEP_STATE_VARIANT` + `humanizeStepState`. Export from `@beyo/tasks`.
9a. `item_upholstery` entities reuse the **existing** `@beyo/tasks` `useItemUpholsteryQuery(itemId)` / `fetchItemUpholstery` (`GET /items/{itemId}/upholstery`) — no new query needed. Each `ItemUpholsteryEntry.client_id` is the pin `entity_client_id`. The item id comes from the app: workers from the originating step's `item.client_id`, managers from the task detail `item.client_id`.

### C. Shared form config — `packages/notifications/src/pins/`

10. `pins/pin-form-config.ts` — a serializable, app-agnostic descriptor: `{ entities: Array<{ type: PinEntityType, label, states: {value,label}[] }> }`. Each app passes its own config (workers vs managers entity/state sets) so the form body itself is reusable while the **forms remain different per app** by config.

### D. Workers app — surfaces + form

11. `features/task_steps/surface-ids.ts`: add `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID` (+props `{ taskId, itemId, originStepId }` — `itemId` from the originating step's `item.client_id` to drive the `item_upholstery` query) and `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID` (+props `{ stepId, label, imageUrl, currentState, selectedStates, onApply }`).
12. `pages/task_steps/PinNotificationsSlidePage.tsx` — the slide form: header "Pin notifications"; renders one container per workers entity. `item_upholstery` container (ordered/available) resolves the item's single upholstery entry via `useItemUpholsteryQuery(itemId)` (take the first entry; empty state if none) and renders one state multi-select bound to that `entity_client_id`. `task_step` container (pending/working/paused/completed) is the self-fetching picker (step 14). Consumes a provider/controller for selection state + hydration + save.
13. `pages/task_steps/PinTaskStepStatesSheetPage.tsx` — nested sheet: `BoxPicker mode="multiple"` of step states; apply writes back via injected `onApply`; empty = deselect.
14. `features/task_steps/components/PinTaskStepPicker.tsx` — self-fetching list (`useTaskStepsByTaskQuery`) rendering step boxes styled per `StepDependencyWarningSheetPage` (image, section name, current `StatePill`); selected → `bg-primary`; tap opens the states sheet via injected `openSurface` (35 §13).
15. `features/task_steps/providers/PinNotificationsProvider.tsx` + `controllers/use-pin-notifications.controller.ts` — aggregate hydration query + `useSavePins`; hold `Map<entityKey, states>`; expose select/toggle/submit/close.
16. `features/task_steps/surfaces.ts`: register both surfaces (`slide` + `sheet`) with `lazyWithPreload`; export preloaders.
17. `pages/task_steps/TaskStepActionsSheetPage.tsx`: replace "Coming Soon" with a **Pin notifications** action row (lucide `Pin`), `onClick` → `openSurface(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID, { taskId, itemId, originStepId })`; preload on press. (Keep room for future actions.)
18. Export new ids/preloaders from `features/task_steps/index.ts`.

### E. Managers app — surfaces + form

19. Mirror D in managers app: `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID` + `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID` in the tasks feature `surfaces.ts`/surface-ids; `PinNotificationsSlidePage` with managers entity set (`item_upholstery`: ordered/available/in_use; `task_step`: pending/working/paused/completed; `task`: assigned/working/ready/resolved using `task` enum); reuse `ContentCard` from `components/primitives/form-field-container`.
20. `pages/tasks/TaskActionsSheetPage.tsx`: replace placeholder with the **Pin notifications** button → opens the managers slide form with `{ taskId, itemId }` (`itemId` from the task detail `item.client_id`).
21. Reuse the same shared logic (`@beyo/notifications`) + shared task-steps query (`@beyo/tasks`) + shared `PinTaskStepPicker` if promoted to a package, otherwise a managers-local picker styled identically.

### F. Tests + validation

22. Vitest: unit-test `serializeStatesToConditions`/`parseConditionsToStates`, `generateNotificationPinId` prefix/length, and `use-save-pins` diff logic (upsert vs delete) with MSW.
23. Component tests: `PinTaskStepPicker` selection/deselection; container box-picker multi-select.
24. Playwright (both apps, mobile then desktop): open actions → Pin notifications → select task-step states + an upholstery state → submit → reopen → selections hydrated; remove all states on a step → submit → pin deleted. Add `data-testid`s per `34_runtime_validation_local.md`.

## Risks and mitigations

- Risk: `npin_` vs `npn` client-id prefix mismatch silently fails all POSTs.
  Mitigation: RESOLVED — `NotificationPin` value set to `npin` in `client-id.ts`; unit test asserts the `npin_` prefix and ≤64 length; backend prefix-map doc re-synced.
- Risk: An item with no upholstery entries / null name/image renders an empty or broken `item_upholstery` container.
  Mitigation: Show an empty-state in the container when `useItemUpholsteryQuery` returns `[]`; fall back to code/placeholder when `name`/`image_url` are null.
- Risk: Diff-based save double-creates on flaky network / partial batch.
  Mitigation: POST upsert semantics are idempotent on `(user, entity_type, entity_client_id)`; rely on that, invalidate + refetch hydration on settle.
- Risk: Nested sheet opened from a package component breaks the layering rule.
  Mitigation: Inject `openSurface` per `35_shared_packages.md §13`; no direct surface-store import inside package components.
- Risk: Empty-state condition `op:"in"` with `[]` would over-fire.
  Mitigation: Treat 0 selected states as "not pinned" → delete, never send an empty `in`.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (all packages + both apps).
- `npm run test -- --grep pins`: pin serialization, client-id, and save-diff unit tests pass.
- `npx playwright test --grep pin-notifications --project=mobile`: workers + managers open→select→submit→reopen flows pass.
- `npx playwright test --grep pin-notifications --project=desktop`: same flows pass.

## Review log

- `2026-06-20` `claude`: Initial authoring; 6 clarifications open (2 blockers: client-id prefix, item_upholstery source).
- `2026-06-20` `david`: Resolved both blockers — add `npin` prefix to `client-id.ts`; use existing `useItemUpholsteryQuery(itemId)` with the item id both apps already expose (workers step `item.client_id`, managers task `item.client_id`).

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex`
