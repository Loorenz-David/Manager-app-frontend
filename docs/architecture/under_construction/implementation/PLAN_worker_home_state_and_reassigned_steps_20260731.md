# PLAN_worker_home_state_and_reassigned_steps_20260731

## Metadata

- Plan ID: `PLAN_worker_home_state_and_reassigned_steps_20260731`
- Status: `implemented` (Playwright execution pending — see Review log)
- Owner agent: `claude-fable-5` (authored); implementing agent: next Claude session
- Created at (UTC): `2026-07-31T00:00:00Z`
- Last updated at (UTC): `2026-07-31T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/new_worker_app_home_interface.md`
- Backend contract (authoritative, build-ahead): `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_reassigned_steps_endpoints_20260731.md`

## Goal and intent

- Goal: Extend the worker-app shared home page (all role variants) with (1) a **worker state button card** showing the current shift state + running timer, (2) a **"Re-Assigned" button card** with a count badge that opens a new **reassigned-steps slide page** (grouped by working section, searchable, with the full step-card interaction set), and (3) a **"My Sections"** label above the existing working-section list. Also collapse the `ended_shift` **send-side** transition: pausing always sends `new_state: "paused"`.
- Business/user intent: Workers get a permanent inbox for steps reassigned into their sections (today only visible via the acknowledgment modal/panel), and a one-tap way to see and change their own shift state (declare a pause reason) without going to the floor kiosk.
- Non-goals:
  - No acknowledge/seen actions on the reassigned page (the existing `ReassignmentAcknowledgmentPanel` keeps owning acks). No unread badging per row.
  - No change to the task-step pause sheet's reason list — it keeps `usePauseReasonsQuery({})` (all reasons). Only the new worker-state sheet filters to `personal` (resolved clarification, 2026-07-31).
  - No rendering of `acknowledgment.reason` on step cards (follow-up).
  - No new socket events (handoff §8: reuse existing ones).
  - No removal of `ended_shift` from **read-side** Zod enums or aggregate fields (`total_ended_shift_*`) — handoff §6.1 mandates the value stays parse-accepted during the interim window. See Assumptions.
  - No deep-link wiring for the `task_steps_reopened` push notification (handoff §8) — recorded as follow-up.

## Scope

- In scope:
  - `packages/task-working-sections`: reassigned-steps API layer (list + count), the reassigned-steps slide page, the shared step-item schema (promoted out of workers-app), surface id + props, public exports, tests.
  - `apps/workers-app`: home top cards (state card + Re-Assigned card + "My Sections" label) in **both** home variants, the worker-state bottom sheet (pause-reason picker → declare state), the step-row adapter component for the reassigned page, surface registration, realtime invalidation, send-side `ended_shift` collapse.
  - `packages/worker-shifts`: a self-scope variant of the current-shift query (worker token calls `GET /worker-shifts/current` **without** `user_id`).
- Out of scope:
  - Floor app / clock kiosk (its `useCurrentShiftQuery(user_id)` semantics must not change).
  - Managers app, sellers app.
  - Read-side `ended_shift` sweep (filter sheet option, enum members, stats package) — follow-up plan once backend `INTENTION_ended_shift_step_state_collapse_20260731` lands.
  - Backend work of any kind; the two new endpoints are **not live** — build against mocks (handoff top table + §13).
- Assumptions (deviations from the intention text, each backed by the authoritative handoff — surface to the user before implementing if any feels wrong):
  1. **Section name/image come from the response's `working_sections` map, not from `/working-sections/me`.** The intention says to use the `/me` query, but handoff §7 guarantees `data.working_sections[item.working_section_id]` is present for every item on every page, and `/me` is a workers-app-internal feature the package must not import. The `/me` cache stays untouched; `working_section_name_snapshot` is the defensive fallback.
  2. **`ended_shift` stays in the read-side step-state Zod unions.** The intention says "update the task step states schema"; handoff §6.1 explicitly instructs the opposite for now (backend still returns it during the interim window; a strict enum would fail validation on every response). This plan removes the value from everything we **send** and from nothing we **parse**. Read-side branches that alias `ended_shift` to paused behavior (e.g. resume affordances checking `paused || ended_shift`, `STEP_QUICK_TRANSITION.ended_shift`) are **kept** — that is exactly "treat it as paused, don't branch on it".
  3. There is **no separate `ended_shift` boolean flag** in the transition request today. The flag is encoded as `new_state: "ended_shift"`, produced by `resolvePauseReasonTransition` in `apps/workers-app/.../features/task_steps/lib/pause-reason-transition.ts` (slug `pause_ended_shift` → `ended_shift`). "Remove the flag" therefore means: that function always resolves `"paused"`.
  4. The Re-Assigned card badge shows `count.total` (all visible reassigned steps, acknowledged or not — matches what the page lists). `unacknowledged` is available from the same endpoint if the user prefers an "unread"-style badge.
  5. The Re-Assigned card is always rendered; the badge is hidden when the count is 0.
  6. The state card renders **only for worker-role sessions**. The worker app admits manager-role tokens (`app_scope="worker"`), and for those `GET /worker-shifts/current` without `user_id` returns `403` (handoff §12.1 trap) — there is no "self" shift state for a manager. Branch on the role claim via `useRole()` from `@beyo/auth`; never treat that 403 as an auth failure.
  7. When `clocked_in` is `false`, the state card shows "Clocked out" (Moon icon), no timer, and does **not** open the picker (declaring while clocked out is a `409`). (Copy shortened from "Not clocked in" on 2026-08-01 when the two cards moved side by side — see Review log.)
  8. Reassigned page size: 20 (parity with the section steps list), explicit "Show more" button, not infinite scroll.

## Clarifications required

- [x] **All pause reasons vs. backend rejection — RESOLVED 2026-07-31.** The worker-state sheet passes `usePauseReasonsQuery({ pause_type: "personal" })`; the task-step pause sheet is untouched and keeps `{}` (all reasons). No package change needed — `ListPauseReasonsParams` already supports `pause_type` and `list-pause-reasons.ts` already forwards it; the param-keyed query cache keeps the two lists separate. The declare 422 can no longer occur from the picker; keep a defensive inline error anyway.
- [x] **Un-pause affordance — RESOLVED 2026-07-31: no "Back to work" action.** `working` (and `idle`) are backend-derived from task-step activity (handoff §12.4) — the frontend cannot set them, and the product decision is not to expose a close-declaration shortcut either. The worker returns to work by starting/resuming a task step (which auto-closes the declaration asynchronously, §12.6.1) or the pause ends at clock-out. The state sheet therefore only **declares or switches** a pause reason; `useCloseDeclaredState` is not used in this delivery.
- [x] **"Ended shift" filter option — RESOLVED 2026-07-31: leave untouched.** The filter sheet and `DEFAULT_STATE_FILTERS` keep `ended_shift` in this delivery; the full read-side sweep (filter chip, enum members, resume-affordance aliases, stats) happens in a follow-up plan once backend `INTENTION_ended_shift_step_state_collapse_20260731` lands.

## Acceptance criteria

1. Both home variants (`StandardWorkerHomeView`, `WoodWorkerHomeView`) render, inside the sections-pane scroll container and above the section cards: the state card (worker-role sessions only), the Re-Assigned card, then a "My Sections" label, then the unchanged section list.
2. The state card shows: state label ("Working" / "Idle" / the pause reason's `name` rendered directly / "Clocked out") and a live timer anchored to `state_entered_at` (server timestamp, not fetch time — ticks every second, correct after refetch). Icon rules: catalog pause reason with `image_url` → that image; pause with `image_url: null` → lucide `CirclePause`; `working` → lucide `Hammer`; `idle` → lucide `Coffee`; not clocked in → lucide `Moon`. `pause_reason.id` is never prefix-matched or looked up in a cached list (handoff §12.3).
3. Tapping the state card (clocked-in worker) opens a bottom-sheet surface with `PauseReasonPicker` fed by `usePauseReasonsQuery({ pause_type: "personal" })` (only declarable reasons; the task-step pause sheet keeps its unfiltered list). Selecting a reason with `requires_description: true` shows a description step (mirror `PauseReasonSheetPage`'s two-view pattern). Confirm calls `useDeclareState`; on success the sheet closes, `workerShiftKeys.current`, section step lists, and `taskStepKeys.userLastActive()` are invalidated, and when `paused_steps > 0` a notification "N task(s) paused" is shown. A `409` re-fetches `GET /current` and re-renders instead of erroring (handoff §12.7 — stale screen, normal flow).
4. The Re-Assigned card shows label "Re-Assigned", lucide `RefreshCcwDot` in a light circular container, and a dark circular count badge overlapping the top-right corner (per the provided screenshot) when `count.total > 0`. Count comes from `GET /task-step-acknowledgments/reassigned-steps/count` (no query params — never pass `q`).
5. Tapping it opens the package-owned reassigned-steps slide page. The page: fetches `GET /task-step-acknowledgments/reassigned-steps` (limit 20, offset paging, "Show more"), groups items by `working_section_id` into containers headed by the section image + name from the response's `working_sections` map, orders groups by `order_list` ASC nulls-last then `name` ASC, keeps server order within a group, and **merges** later pages into existing containers (a section can span pages, handoff §7).
6. The page has a `SearchBar` (`@beyo/ui` primitive) with `showSortButton={false}` and `showFilterButton={false}`, wired to the `q` param: trimmed, debounced 300 ms, capped at 200 chars (a longer value is never sent — `422` guard). Clearing `q` restores the unfiltered list. The badge count never changes with `q`.
7. Each step row renders the existing `TaskStepCard` with the identical interaction set as the section steps list: quick action start/resume (transition to `working`), quick action pause (opens the existing pause-reason sheet), card tap → task step detail slide, image tap → full-page image viewer with annotations.
8. Pausing from the pause-reason sheet always sends `new_state: "paused"` — including for the `pause_ended_shift` reason. No request anywhere in the app carries `new_state: "ended_shift"` after this change. Response parsing still accepts `state: "ended_shift"` and renders it identically to `paused` (handoff §13 validation bullet).
9. The reassigned list and count invalidate on socket events `task:step-acknowledgment-created`, `task:step-acknowledgment-removed`, and `task:step-state-changed`, and refetch on page mount / app foreground (membership changes are cold-start only, handoff §8).
10. Empty state, error state, and skeletons exist for the page and both cards; `401` routes to sign-in; neither endpoint's empty result is treated as an error (no `404` exists, handoff §10).
11. `npm run typecheck` clean; new vitest suites green; Playwright specs (mobile first, then desktop) green against route-stubbed endpoints.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md` + `01_architecture_local.md`: layering + `route-entry.tsx` pattern for the home feature touch.
- `architecture/02_types.md`: Zod schema + type conventions for the new/promoted schemas.
- `architecture/04_api_client.md` + `04_api_client_local.md`: envelope handling (`{data, ok, warnings}`), error shapes (note handoff §10's two envelopes; §12 domain errors use `{error, ok:false}`).
- `architecture/05_server_state.md`: query hook structure, keys, staleTime, `keepPreviousData` for search.
- `architecture/06_client_state.md`: local search state on the package page (deliberately **not** the app-global `task-steps-ui.store` — that store is app-land and section-scoped).
- `architecture/08_hooks.md`: action hook shape for declare-state wiring and transition invalidation.
- `architecture/13_errors.md`: 409-as-normal-flow handling, notify on failure.
- `architecture/15_feature_structure.md` + `16_feature_workflow.md`: build order (types → keys → api/query hooks → actions → controllers → providers → components → pages → dynamic loading → routes → public API → tests).
- `architecture/07_components.md`, `10_pages.md`, `23_providers.md`, `24_dto.md`: component/context discipline, page shells, view-model mapping (`toTaskStepCardViewModel` reuse).
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: `slide` for the reassigned page, `sheet` for the state picker; registration and typed props.
- `architecture/35_shared_packages.md` §13–14: package never calls `openSurface`; adapter/component injection via surface props; page exposed via a `loadXxxPage` loader function, never a static export.
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload`, `usePreloadSurface` for both new surfaces.
- `architecture/21_realtime.md`: socket invalidation wiring.
- `architecture/27_responsive.md`, `31_animations.md`, `32_loading_skeletons.md`, `33_vaul_drawer.md`: card/sheet polish, skeletons, Vaul sheet behavior.
- `architecture/36_scroll_visibility.md`: the page's scroll container registration + PullToRefresh.
- `architecture/14_styling.md` §14: verify `@source` coverage — only needed if `@beyo/worker-shifts` gains styled components (today it is API-only; the state card lives in the app, so likely no change).
- `architecture/17_testing.md`, `34_runtime_validation.md` + `34_runtime_validation_local.md`: vitest + Playwright conventions, fixtures, mobile-first validation.

### Local extensions loaded

- `01_architecture_local.md`: route-entry pattern (home already follows it).
- `04_api_client_local.md`: flat string backend errors, envelope access.
- `28_surfaces_local.md`: active surface types (`slide`, `sheet`); no `drawer`.
- `30_dynamic_loading_local.md`: `lazyWithPreload` path + `usePreloadSurface`.
- `34_runtime_validation_local.md`: fixture paths, credential env vars, spec locations, mobile-project-first rule.

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate

Prohibited (pattern reads — contract already covers these):
- Reading another action hook for cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook for TanStack setup → `05_server_state.md`
- Reading another provider for the context shell → `23_providers.md`
- Reading another DTO file for view-model transformer shape → `24_dto.md`

Permitted relational reads for this plan (these are the integration surface — read them):
- `apps/workers-app/.../features/task_steps/types.ts` — the step schemas being promoted, `TaskStepCardViewModel`, `toTaskStepCardViewModel`, `TransitionStepStateInput`, `ReassignmentStepSchema`/`AcknowledgmentSchema` (lines ~399–452)
- `apps/workers-app/.../features/task_steps/api/task-step-keys.ts`, `api/use-working-section-steps.ts` (the offsets-array pagination the page mirrors), `api/fetch-working-section-steps.ts`
- `apps/workers-app/.../features/task_steps/controllers/use-working-section-steps.controller.ts` — the exact interaction wiring being replicated: detail open (~:432–447), image viewer open (~:449–503), pause sheet open (~:295–299), debounce helper (~:71–85)
- `apps/workers-app/.../features/task_steps/components/TaskStepCard.tsx` (props ~:95–110), `TaskStepActionButton.tsx`, `WorkingSectionStepsView.tsx` (SearchBar usage ~:216–227, list rendering ~:283–334)
- `apps/workers-app/.../features/task_steps/lib/pause-reason-transition.ts` (+ its test) and `pages/task_steps/PauseReasonSheetPage.tsx` (two-view sheet pattern; transition call sites ~:109–137)
- `apps/workers-app/.../features/home/components/{HomeInterfaceRouter,WorkerHomeSectionStack}.tsx`, `home-interface-registry.tsx`, `variants/{StandardWorkerHomeView,WoodWorkerHomeView}.tsx`
- `apps/workers-app/.../features/working_sections/components/WorkingSectionsHomeView.tsx` (where the `topContent` slot goes)
- `apps/workers-app/.../features/task_steps/surfaces.ts`, `surface-ids.ts`, `src/app/surface-registry.ts` (what to extend)
- `packages/worker-shifts/src/{types.ts,api/*,actions/*,mocks/handlers.ts,index.ts}` — current-shift shape, `useDeclareState`, `useCloseDeclaredState`, msw precedent
- `packages/pause-reasons/src/{components/PauseReasonPicker.tsx,api/use-pause-reasons-query.ts,types.ts}`
- `packages/task-working-sections/src/{index.ts,surface-ids.ts,api/*}` — export/id conventions in the target package
- `packages/ui/src/components/primitives/search-bar/{SearchBar.tsx,search-bar.types.ts}` — prop surface
- Wherever `task:step-acknowledgment-created` is currently handled in workers-app (search for it) — the invalidation site to extend
- `apps/workers-app/.../src/app/AppShell.tsx` (~:48–79) and `NotificationDeepLinkMount.tsx` — mount context, only if touched

### Skill selection

- Primary skill: `skills/cross_cutting/plan_lifecycle_orchestrator/SKILL.md` — executing an approved implementation plan through its lifecycle.
- Supporting: `skills/cross_cutting/ask_clarification_first/SKILL.md` — the three open clarifications above must be resolved before the affected steps.
- Trigger terms: `implementation plan`, `lifecycle`, `clarification`
- Excluded alternatives: `skills/cross_cutting/intention_planning/SKILL.md` — intention already exists; `skills/cross_cutting/debugging_nested_plan_loop/SKILL.md` — not a debugging cycle.

## Implementation plan

Build order per `16_feature_workflow.md`: types → keys → api → actions → controllers → providers → components → pages → dynamic loading → registration → public API → tests → Playwright.

**Phase 0 — schema promotion (prerequisite for everything in the package)**

1. Move the step-item schema family from `apps/workers-app/.../features/task_steps/types.ts` into `packages/task-working-sections/src/types.ts`: `StepStateSchema` (keep `ended_shift`; keep the `satisfies z.ZodType<import("@beyo/tasks").StepState>` guard), `STEP_TERMINAL_STATES`, `STEP_QUICK_TRANSITION`, `UserRefSchema`, `DependencyWorkingSectionRefSchema`, `StepDependencyEntrySchema`, `LastStateRecordSchema`, `TaskSnapshotSchema`, `UpholsteryRequirementSchema`, `ItemSnapshotSchema`, `ItemImageLightSchema`/`ItemImageFullSchema`/`ItemImageSchema`, `CasesSummarySchema`, `ReadinessStatusSchema`, `TaskStepSchema` (exported from the package as `WorkingSectionStepItemSchema` / `WorkingSectionStepItem`), `TaskStepsPaginationSchema`. Add workspace deps to `packages/task-working-sections/package.json` as needed (`@beyo/pause-reasons` for `PauseReasonSchema`, `@beyo/upholstery` for `UpholsteryGroupFieldsSchema` — `@beyo/tasks` is already a dependency). Run `npm install` from `frontend/` (beware the known rolldown/lightningcss native-binding lockfile issue — reinstall both together if vite/vitest breaks).
2. In workers-app `features/task_steps/types.ts`, delete the moved definitions and **re-export them from the package under their existing local names** (`export { WorkingSectionStepItemSchema as TaskStepSchema } from "@beyo/task-working-sections"` etc.) so no other app file changes. App-only types (`TaskStepCardViewModel`, `toTaskStepCardViewModel`, `TransitionStepStateInput`, params types, ack types) stay in the app. Typecheck the whole workspace before proceeding.

**Phase 1 — package: reassigned-steps API layer**

3. `packages/task-working-sections/src/types.ts`: add `TaskStepAcknowledgmentSchema` (handoff §5.2: `client_id, step_id, task_id, reason (nullable), worker (nullable user), created_by (nullable user), first_seen_at (nullable), acknowledged_at (nullable), created_at`) and `ReassignedStepItemSchema = WorkingSectionStepItemSchema.extend({ acknowledgment: TaskStepAcknowledgmentSchema })` (handoff §11 — do **not** share a type with the `/pending` modal payload). Add `WorkingSectionCompactSchema` (`client_id, name, image nullable, order_list nullable, allows_batch_working, allows_shopify_product_modifications`) and the response schemas: `{ steps_pagination: { items, limit, offset, has_more }, working_sections: z.record(WorkingSectionCompactSchema) }` and `{ reassigned_steps_count: { total, unacknowledged } }`.
4. `src/api/reassigned-step-keys.ts`: key factory, e.g. `reassignedStepKeys.all = ["reassigned-steps"]`, `.lists()`, `.list({ q, limit, offset })`, `.count()`.
5. `src/api/fetch-reassigned-steps.ts`: `GET /api/v1/task-step-acknowledgments/reassigned-steps` with `limit`, `offset`, optional `q` (trimmed; omit when empty; never send > 200 chars), optional `unacknowledged_only` (not used by the page but typed). `src/api/fetch-reassigned-steps-count.ts`: `GET .../reassigned-steps/count` — **no params ever**.
6. `src/api/use-reassigned-steps-query.ts`: paginated hook mirroring the section-list behavior (offsets-array + `useQueries` + flatten + `loadMore` + reset-on-param-change; contract `05_server_state.md` governs structure), `keepPreviousData` while searching. `src/api/use-reassigned-steps-count-query.ts`: light query, safe to refetch on focus/mount.
7. Grouping util `src/lib/group-reassigned-steps.ts` (pure, unit-tested): group flattened items by `working_section_id`, resolve each section from the merged `working_sections` maps of **all fetched pages**, order groups by `order_list` ASC nulls-last then `name` ASC, keep server item order within a group; fallback to `working_section_name_snapshot` if a section id is ever missing (defensive only — handoff §7 guarantees presence).

**Phase 2 — package: reassigned page**

8. `src/surface-ids.ts`: add `REASSIGNED_STEPS_SLIDE_SURFACE_ID = "reassigned-steps-slide"` and `ReassignedStepsSlideSurfaceProps = { adapter: ReassignedStepsHostAdapter }` where `ReassignedStepsHostAdapter = { StepRow: ComponentType<{ step: ReassignedStepItem }> }`. Injecting a **component type** (not a closure) keeps the app's mutation state reactive inside each row while honoring §13's "packages never call `openSurface`" rule — the app component does all navigation/mutation itself.
9. `src/pages/ReassignedStepsSlidePage.tsx`: reads props via `useSurfaceProps`, sets the surface header title ("Re-Assigned"), owns **local** search state (trim, 300 ms debounce — same constants as the section list), renders `SearchBar` with `showSortButton={false} showFilterButton={false}`, `PullToRefresh` → refetch, skeleton / error / empty states, grouped containers (section image + name header via `BackendImage`, then `adapter.StepRow` per item), and a "Show more" button when `has_more`. Register the scroll container per `36_scroll_visibility.md`. Note the §3.5 caveat for empty-search copy: a step whose task has no primary item is dropped by any non-empty `q`.
10. `src/index.ts`: export the surface id, props/adapter types, `ReassignedStepItem`, query hooks, keys, and `loadReassignedStepsSlidePage` as a **loader function** (§14 — never a static page export).

**Phase 3 — worker-shifts self-scope query**

11. `packages/worker-shifts`: add self-scope support without disturbing kiosk callers — e.g. `fetchCurrentShift(user_id?: string)` omitting the param when absent, plus a new `useMyCurrentShiftQuery()` hook keyed `workerShiftKeys.current({ user_id: "me" })` (distinct cache entry; existing `useCurrentShiftQuery(user_id)` keeps its skipToken behavior untouched). Handle `reason_text`'s three-way variance (absent / string / null) per handoff §12.2. Export from the package index; extend the msw handlers for the no-param case.

**Phase 4 — workers-app: home cards**

12. Add `@beyo/worker-shifts` to `apps/workers-app/.../package.json`; `npm install` from `frontend/`. Check `index.css` `@source` — only needed if the package ships styled components (it is API-only today).
13. `features/home/components/HomeTopCards.tsx` (+ subcomponents `WorkerStateCard`, `ReassignedCard`): visual language per the screenshot — white rounded card, icon in a light circular container on the left, bold label; badge = dark circular pill overlapping the top-right corner. State card per acceptance criteria 2 (role-gated with `useRole()`; timer anchored to `state_entered_at` — see `reference_worker_stats_ticker_anchor`: never anchor to fetch time). Re-Assigned card uses the package count hook (badge shows `total`, hidden at 0). End with a "My Sections" section label. Preload both surfaces with `usePreloadSurface`.
14. Mount in both variants inside the scrollable list: add an optional `topContent?: React.ReactNode` prop to `WorkingSectionsHomeView` rendered inside its scroll container above the cards; pass `<HomeTopCards />` from `StandardWorkerHomeView`. Give `WoodWorkerHomeView`'s inline `WoodWorkerSectionsView` the same slot (it duplicates the list markup — do not unify the variants in this plan).
15. Home controller (or a small `use-home-top-cards.controller.ts`): assembles the reassigned-page adapter and opens the surfaces — the app controller is the only place `openSurface` is called (§13).

**Phase 5 — workers-app: state sheet**

16. New sheet surface `WORKER_STATE_SHEET_SURFACE_ID` (`features/home/surface-ids.ts` or extend `task_steps/surface-ids.ts` — follow where the home feature keeps ids; register in the app surface registry with `lazyWithPreload`). Page `WorkerStateSheetPage`: `PauseReasonPicker` with `usePauseReasonsQuery({ pause_type: "personal" })` (resolved clarification — the hook already supports the param; do not modify the package), two-view description step when `requires_description` (mirror `PauseReasonSheetPage`), confirm → `useDeclareState` (worker token: omit `user_id`). On success: close, invalidate `workerShiftKeys` current + `taskStepKeys.sectionLists()` + `taskStepKeys.userLastActive()`, notify "N task(s) paused" when `paused_steps > 0`. On `409`: refetch current shift, re-render, no error toast (stale screen is normal flow). Declaring over an open declaration is a switch — never call close first. **No "Back to work" / close-declaration action** (resolved clarification): `working`/`idle` are backend-derived from task-step activity (§12.4); the pause ends when the worker starts/resumes a step (asynchronous auto-close, §12.6.1 — render optimistically, don't poll, and treat a briefly stale `in_pause` on the state card as expected) or at clock-out.

**Phase 6 — workers-app: step-row adapter**

17. `features/task_steps/components/ReassignedStepRow.tsx`: maps `ReassignedStepItem` → `toTaskStepCardViewModel` → `TaskStepCard`, wiring the same four interactions as the section list controller: `onTapCard` → `TASK_STEP_DETAIL_SURFACE_ID` (verify `TaskStepDetailSurfaceProps` — pass `workingSectionId: step.working_section_id`; check how `listQueryParams`/`initialStep` behave when opened from a non-section list), `onTapImage` → `IMAGE_VIEWER_SURFACE_ID` in preview-only mode (mirror controller ~:449–503, including the `"image_annotation" in img` narrowing), `onTapActions` → the actions sheet, `onTransition` → `useTransitionStepState` for start/resume and `PAUSE_REASON_SHEET_SURFACE_ID` for pause. Invalidate `reassignedStepKeys.all` on transition settle (a completed step must leave the list — handoff §1). Batch mode does not apply here.

**Phase 7 — realtime + lifecycle invalidation**

18. Locate the existing workers-app handler for `task:step-acknowledgment-created` / `-removed` (it feeds `taskStepKeys.reassignmentAcks()`); extend it to also invalidate `reassignedStepKeys.all`. Add `task:step-state-changed` (workspace broadcast — cheap invalidation is fine per handoff §8). If no handler exists yet, add one per `21_realtime.md`. Refetch-on-focus covers the membership-change cold-start case.

**Phase 8 — ended_shift send-side collapse**

19. `lib/pause-reason-transition.ts`: `resolvePauseReasonTransition` always returns `newState: "paused"` (keep `requiresDescription` passthrough); narrow `PauseReasonTransition.newState` to `"paused"`; update `pause-reason-transition.test.ts` and the Playwright assertion in `tests/playwright/features/task_steps/pause-reason.spec.ts` (~:90–92) to expect `new_state: "paused"` for `pause_ended_shift`. Simplify `PauseReasonSheetPage` call sites if the branch disappears. Leave every read-side occurrence (schemas, `STEP_QUICK_TRANSITION`, resume affordances, filter sheet, `total_ended_shift_*`, stats package) untouched per Assumption 2 and clarification 3.

**Phase 9 — mocks, tests, validation**

20. Both new endpoints are **not live**: add msw handlers (package-level, mirroring `worker-shifts/src/mocks` precedent) and Playwright route stubs producing the §3.6 shape. Unit tests (vitest, co-located, run via `npm run test:task-working-sections` + the workers-app config): grouping util (multi-section, page-boundary merge, `order_list` nulls-last), schema parse of the §3.6 example including `state: "ended_shift"` (must validate and render as paused — handoff §13), `item: null`, single rich-only image, `reason: null`, count/list agreement, search composition with pagination, transition collapse. Component tests: `HomeTopCards` role gating + badge, state sheet flow including 409 and `requires_description`.
21. Playwright specs under `tests/playwright/features/` (import `fixtures/app-fixture`, `auth.signIn()`, testids on all feature-critical elements per `34_runtime_validation_local.md`): home cards render → open reassigned page → grouped containers → search narrows → "Show more" merges into an existing container → step card interactions open detail/viewer/pause sheet; state card → sheet → declare → card updates + "paused" toast. Run mobile project first, then desktop; inside `PullToRefresh` use `tap()` (see `feedback_playwright_mobile_filtertaps_tap` — synthetic clicks are swallowed by use-gesture `filterTaps`).
22. Flip from mocks to live endpoints only when the handoff's top table marks §3/§4 ✅; then re-run the §13 canary (count.total equals fully-paged list length).

## Risks and mitigations

- Risk: The schema promotion (Phase 0) touches the app's most-imported types file; a missed re-export breaks many files.
  Mitigation: re-export moved names verbatim from the same module path; whole-workspace typecheck gate before Phase 1; no app import paths change.
- Risk: Backend isn't live; mock drift against the eventual implementation.
  Mitigation: mocks copy §3.6 verbatim; the handoff is contractually authoritative ("backend implements to match it field-for-field"); §13 canary on flip-to-live.
- Risk: `ended_shift` interim window — steps can still arrive in that state.
  Mitigation: read-side untouched; explicit unit test that `ended_shift` parses and renders as `paused`.
- Risk: Declare returns an unexpected `422`/`404` (e.g. a personal reason deleted between picker load and confirm).
  Mitigation: defensive inline error in the sheet + refetch of the reason list; the picker is already filtered to `personal` so the systematic 422 path is closed.
- Risk: Manager-role session hits the §12.1 403 trap or an empty personal inbox.
  Mitigation: role-gate the state card; reassigned endpoints are personal-scope and return empty sets for managers — cards still render correctly with 0.
- Risk: Task detail slide opened from the reassigned page may assume section-list cache context (`listQueryParams`).
  Mitigation: relational read of `TaskStepDetailSurfaceProps` + its controller before wiring; if it hard-requires section list params, pass the step's `working_section_id` defaults and verify detail interactions in Playwright.
- Risk: `useQueries`-per-offset pagination + group merge could render a section container twice.
  Mitigation: grouping util operates on the flattened, deduped-by-`client_id` item array and is unit-tested on the page-boundary case.
- Risk: `npm install` for the new deps breaks vite/vitest native bindings (known lockfile issue).
  Mitigation: reinstall `rolldown` + `lightningcss` darwin-arm64 together per `reference_rolldown_binding_missing_from_lockfile`.
- Risk: Timer drift / reset-on-refetch on the state card.
  Mitigation: anchor to `state_entered_at` (server truth), derive elapsed at render; never anchor to fetch time (`reference_worker_stats_ticker_anchor`).

## Validation plan

- `npm run typecheck`: zero TypeScript errors (workspace-wide, after Phase 0 and at the end).
- `npm run test:task-working-sections`: all package suites green (grouping, schemas, hooks, page component).
- Workers-app vitest config: `pause-reason-transition` updated suite + `HomeTopCards` + state-sheet suites green.
- `npx playwright test --grep "reassigned|home-top-cards|worker-state" --project=mobile`: green (route-stubbed endpoints; `tap()` inside PullToRefresh).
- Same grep `--project=desktop`: green.
- Manual (user runs dev servers — never launch them): worker-role sign-in shows both cards; manager-role sign-in shows no state card and no 403 noise; declare pause → toast + timer restart; reassigned page search + "Show more" + all four card interactions.

## Review log

- `2026-07-31` `claude-fable-5`: Plan authored. Discrepancies between intention and handoff surfaced as Assumptions 1–3; three clarifications opened.
- `2026-07-31` `David`: Clarification 1 resolved — worker-state sheet loads `pause_type=personal`; task-step pause sheet unchanged (all reasons). Clarifications 2 and 3 still open.
- `2026-07-31` `David`: Clarification 2 resolved — no "Back to work" action; `working` is backend-calculated from task-step activity. Clarification 3 resolved — keep the "Ended shift" filter untouched, sweep in follow-up. All clarifications closed.
- `2026-07-31` `David`: Plan **approved** for implementation.
- `2026-07-31` `claude-opus-5`: **Implemented, phases 0–9.** All acceptance criteria built. Validation run:
  workspace `npm run typecheck` clean (exit 0) at the Phase 0 gate and at the end;
  `test:task-working-sections` 60/60 (30 new), `test:worker-shifts` 41/41,
  `test:workers-pause-reasons` 26/26 (15 new), plus `ui` 162, `stats` 143, `shopify` 103,
  `task-creation` 68, `clock-kiosk` 43, `upholstery` 37, `presentation-*` 231, `auth`/`api-client`/`pause-reasons` 9
  — no regressions anywhere. Playwright: 12 new specs authored across
  `features/home/{home-top-cards,reassigned-steps}.spec.ts` + a shared route-stub helper; all 32 specs
  collect cleanly via `--list --project=mobile`. **Execution deferred** — the Playwright config's
  `webServer` (`reuseExistingServer: false`) spawns `npm run dev`, and the standing instruction is that
  the user starts dev servers. Awaiting the user to run
  `npm run test:e2e:mobile` then `npm run test:e2e:desktop`.
  Deviations and findings, all deliberate:
  1. **`updated_at` widened to nullable** in the promoted `WorkingSectionStepItemSchema`. Handoff §5.1
     marks it nullable and the §3.6 example ships `"updated_at": null`, but the pre-promotion app schema
     declared `z.string()` — the example could not have parsed. No app code reads the field.
  2. **`@source "…/packages/task-working-sections/src"` added** to the workers app `index.css`. It was
     missing entirely (a pre-existing gap — the reassign slide from that package was already registered),
     and the new page ships Tailwind classes from the package, which fail silently without it
     (`14_styling.md` §14).
  3. **`DeclareStateInputSchema.user_id` made optional** in `@beyo/worker-shifts`. A worker token must
     omit it (§12.1/§12.5); the kiosk keeps passing it. `useDeclareState` invalidates the self scope
     (`WORKER_SHIFT_SELF_SCOPE = "me"`) when it is absent, so kiosk cache behaviour is untouched.
  4. **`VITE_API_URL` define added to the workers-app vitest config.** Pre-existing failure, verified by
     re-running the untouched `presentation-glue.test.ts` at the prior config: any suite whose import
     graph reaches `@beyo/api-client` threw at env validation. Every package vitest config already
     carries this define.
  5. Vitest include globs extended to `src/features/home/**` so the new home suites are collected.
  6. `ReassignedStepRow` calls its controller directly rather than through a provider: it is a
     surface-injected root with no provider ancestor, and per-row transition state is exactly why the
     package receives a component type rather than a closure bundle (§13). Logic still lives in
     `use-reassigned-step-row.controller.ts`, not the component body.
  Open follow-ups (unchanged from the plan's non-goals): read-side `ended_shift` sweep;
  `task_steps_reopened` push deep link; flip-to-live + §13 count/list canary once the handoff's status
  table marks §3/§4 ✅.

- `2026-07-31` `David`: Mobile e2e run #1 — 15 passed / 7 failed / 10 skipped.
- `2026-07-31` `claude-opus-5`: **Mobile failures triaged and fixed.**
  1. *"Show more" showed 5 Upholstery cards before paging* — **spec defect, not a product bug.**
     `TaskStepCard` puts a testid on the card root *and* on four children (`-image-`, `-body-`,
     `-actions-`, `-reassigned-`), all sharing the `task-step-card-` prefix, so the bare-prefix regex
     counted one row five times. Replaced with a negative-lookahead `CARD_ROOT` matcher and added an
     explicit total-count assertion. The hook's dedup-by-`client_id` was present and correct
     throughout; a new vitest case now pins it against an overlapping page boundary.
  2. *Stub/hook `limit` misalignment* (real, as flagged) — `usePaginatedReassignedStepsQuery` hardcoded
     `REASSIGNED_STEPS_PAGE_SIZE`, ignoring `ListReassignedStepsParams.limit`; the route stub ignored the
     requested limit and sliced by its own `pageSize`. Now the hook honours `params.limit` (defaulting to
     the page size) and the stub honours the requested limit capped at `pageSize`, echoing back the limit
     it actually applied — which is the value `loadMore` steps `offset` by. Vitest gained a real
     `loadMore` paging case.
  3. *"never sends q" flaked on `page.reload()`* — the 5 s default expired during boot re-auth. The
     assertion now gates on `waitForRequest` for the count endpoint (which is what the test is actually
     about) with generous visibility timeouts; the two state-card tests wait for `home-top-cards` before
     probing so a manager-role skip is a role decision rather than a race.
  4. *`working-sections.spec.ts` :25/:34/:44 mobile-only failures* — `click()` inside `PullToRefresh` is
     swallowed by use-gesture `filterTaps`. Converted every in-PTR activation in that file to the shared
     `press()` helper, which was extracted from the stubs module to `tests/playwright/helpers/press.ts`.
     Also tightened the section-card selector: `working-section-card-<id>` is likewise the prefix of two
     count badges per card, so `sections.nth(i)` in the two guarded tests could land on a badge.
  Left untouched as instructed: `auth.spec` :39 (stale — Settings moved into the "More" overflow menu)
  and `presentation-player` :121 (pre-existing; presentations untouched by this work).
  Re-validated: workspace typecheck exit 0; `test:task-working-sections` 63/63 (was 60, +3 pagination and
  dedup cases); all 32 specs still collect on `--project=mobile`. Awaiting mobile re-run, then desktop.

- `2026-08-01` `David`: Backend **live**. Both endpoints implemented, reviewed and merged; the handoff's
  status table now reads ✅ for §3 and §4. §11's item-shape parity is **verified, not aspirational** —
  the reviewer compared key sets mechanically against
  `GET /working-sections/{id}/steps`, symmetric difference empty in both directions.
- `2026-08-01` `claude-opus-5`: **Flipped to live (plan step 22).** No product code changed: the API
  layer was never mock-bound — `fetchReassignedSteps` / `fetchReassignedStepsCount` have always called
  the real paths, and mocking existed only in vitest (msw) and Playwright route stubs. So the flip is
  purely a coverage change:
  - Added `tests/playwright/features/home/reassigned-steps-live.spec.ts` — **unstubbed**, the only pass
    that can catch real backend drift. It asserts the live payload satisfies
    `ReassignedStepItemSchema` (a Zod mismatch becomes `invalid_response` → the page's error state, so
    its absence *is* the parity assertion), runs the **§13 canary** (pages the list to exhaustion via
    "Show more", then asserts the row count equals the badge's `count.total`), confirms every row lands
    in a section container (§7), and fails on any 4xx/5xx from either endpoint. It is data-tolerant: an
    empty inbox still exercises the envelope, the empty state and the canary at zero, and asserts the
    200-not-404 rule (§10). A second case proves the count endpoint is never called with `q` (§4), now
    gated on the list's actual search round-trip rather than a sleep.
  - Kept the route-stubbed `reassigned-steps.spec.ts`: it asserts *our* grouping, page-merge and search
    wiring, which need a known section spread and a forced page boundary. Added a header comment so the
    two files' division of labour is explicit rather than inferred.
  - Extracted the shared `CARD_ROOT` matcher to `tests/playwright/helpers/selectors.ts`.
  §11 parity note: the confirmation covers **key sets**, not nullability. The one nullability widening
  this delivery made (`updated_at`, per §5.1 and the §3.6 example) is strictly more permissive and now
  applies to both endpoints, since they share `WorkingSectionStepItemSchema`.
  Still ⏳ per the handoff: removal of the `ended_shift` task-step state (§6.1). The read side therefore
  keeps accepting it — unchanged and still correct — while the send side stays collapsed to `paused`,
  which is valid in both the current and post-removal vocabularies.
  Re-validated after the flip: typecheck exit 0; `test:task-working-sections` 63/63,
  `test:workers-pause-reasons` 26/26, `test:worker-shifts` 41/41; all 34 specs collect on
  `--project=mobile`.

- `2026-08-01` `claude-opus-5`: **Playwright green on both projects.** David freed port 5174 and
  supplied credentials, so the suite was run directly.
  Final: **mobile 24 passed / 2 failed / 8 skipped**, **desktop 23 passed / 2 failed / 9 skipped**. The
  only two failures on either project are the pre-agreed out-of-scope ones (`auth.spec` :39, stale
  since Settings moved into the "More" overflow menu; `presentation-player` :121, pre-existing). All 14
  specs owned by this plan pass on mobile and desktop.
  Two further spec defects found and fixed in this round — both mine, neither a product bug:
  1. *Three `home-top-cards` tests failed on `page.reload()`.* The failure DOM was the **sign-in page**:
     the httpOnly refresh cookie does not survive a reload in this environment (cross-origin API over
     plain http), so the session is lost. The reloads existed only to install routes after boot;
     restructured so sign-in is a per-test call and every stub is installed *before* the app boots. No
     reload anywhere in the file now, and a comment records why.
  2. *The live-endpoint canary read `count.total` from the DOM badge*, racing the query — before it
     resolves the badge is absent, which is indistinguishable from a genuine zero, so the spec took the
     empty branch against a non-empty list. It now takes the total from the count **response** via
     `waitForResponse` and separately asserts the badge renders that same number. Stronger as well as
     race-free: the canary now compares API truth against rendered rows.
  Also confirmed by direct API query that the reassigned endpoints behave as contracted against live
  data (badge `2`, list renders grouped, no error state).

## Lifecycle transition

- Current state: `implemented` and **fully validated** (claude-opus-5, 2026-08-01). Typecheck, all
  vitest suites, and Playwright mobile + desktop are green.
- Next state: `archived` — no blockers remain from this plan's scope. Two unrelated red specs
  (`auth.spec` :39, `presentation-player` :121) are pre-existing and tracked elsewhere.
- Next state: `archived` (once `test:e2e:mobile` and `test:e2e:desktop` are green and runtime
  validation on a real worker-role session is confirmed)
- Transition owner: implementing agent / David
