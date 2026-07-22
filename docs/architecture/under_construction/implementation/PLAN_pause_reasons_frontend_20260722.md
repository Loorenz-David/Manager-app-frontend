# PLAN_pause_reasons_frontend_20260722

## Metadata

- Plan ID: `PLAN_pause_reasons_frontend_20260722`
- Status: `under_construction`
- Owner agent: `claude`
- Created at (UTC): `2026-07-22T16:00:00Z`
- Last updated at (UTC): `2026-07-22T16:00:00Z`
- Related issue/ticket: backend plan `PLAN_custom_pause_reasons_20260722`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_pause_reasons_frontend_20260722.md` (not yet created)
- Source handoffs:
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_pause_reasons_crud_20260722.md`
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_pause_reasons_step_transition_contract_20260722.md`
  - `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_pause_reasons_analytics_breakdown_20260722.md`

## Goal and intent

- **Goal:** Replace the hardcoded `StepTransitionReason` pause-reason enum with a workspace-data-driven
  catalog fetched from the backend. Introduce a shared `@beyo/pause-reasons` package (per contract 35)
  that owns the pause-reason data layer (types, queries, CRUD mutations, realtime invalidation, and a
  presentational picker), and rewire the workers-app pause flow to consume it. Migrate the
  step-transition contract from `reason: <slug>` to `pause_reason_id: <client_id>`.
- **Business/user intent:** Workspaces can now create their own pause reasons with their own
  properties (name, image, `pause_type`, `requires_description`). Two reasons remain
  system-managed (`pause_ended_shift`, `pause_other_task_priority`) and are always present. Workers
  must see the live, per-workspace catalog when pausing a task step instead of a fixed enum baked into
  the frontend build.
- **Non-goals:**
  - Building the pause-reason **management UI** (create/edit/delete screens) in any app. This plan
    builds the CRUD **data layer** in the package so a future management surface can consume it, but
    ships no management screen (per Scope decision).
  - Changing the whole-shift pause endpoint (`POST /api/v1/worker-shifts/pause`) — it keeps free-text
    `reason` and is unrelated to this table (per transition handoff §"Not affected").
  - Fixing the known `ended_shift` / `UserShiftStateRecord` mismatch — a pre-existing, knowingly
    deferred limitation (transition handoff §Clarification).

## Scope

- **In scope:**
  1. New shared package `@beyo/pause-reasons` — full data layer + presentational picker component.
  2. Shared-package edits: add `PauseReasonId` branded type to `@beyo/lib`; add
     `pause_reason:created|updated|deleted` to the `@beyo/realtime` event union.
  3. Workers-app pause flow: rewire `PauseReasonSheetPage` to fetch the catalog and drive `paused` /
     `ended_shift` / `requires_description` from data.
  3b. **Boot prefetch:** warm the pause-reasons catalog at app open (authed boot) so the sheet opens
     with data already in cache — no spinner on first pause. Uses the existing
     `usePrefetchOnCondition` idiom at the authed shell.
  4. Step-transition contract migration: `reason` → `pause_reason_id` in `task_steps` types + API
     (single and batch), and removal of the dead `StepTransitionReason` enum.
  5. Analytics timeline migration (`@beyo/stats`): key pause breakdowns by `pause_reason_id`, resolve
     names/images from the response's embedded `pause_reasons` lookup map, and handle the reserved
     `"unspecified"` bucket. **Modular / may be split to a follow-up** — see Phase 5.
- **Out of scope:**
  - Pause-reason management screens (create/edit/delete UI).
  - Managers-app / sellers-app wiring beyond what contract 35's migration cycle requires for the new
    package to type-check where already imported (it is not imported there yet).
- **Assumptions:**
  - `pause_reason_id` in the transition body carries a `pause_reasons.client_id` (`par_…`), is
    optional/nullable, and the backend 400s if a `requires_description` reason is sent without a
    non-blank `description` (transition handoff §Validation). The sheet prevents this by construction.
  - The worker pause sheet displays **all** reasons regardless of `pause_type` (both `personal` and
    `blocker`), ordered by `created_at` ascending as the list endpoint returns them.
  - `slug === "pause_ended_shift"` is the sole client-side signal mapping a selected reason to
    `new_state: "ended_shift"`; every other reason → `"paused"` (transition handoff §Clarification).
  - `BackendImage` (used inside `BoxPicker`) already renders `ImagePlaceholder` as its default
    fallback for a null or failed `image_url`, satisfying the "use ImagePlaceholder for backend url
    images" requirement with no extra work.

## Clarifications required

- [x] Transition body field — resolved by `HANDOFF_..._step_transition_contract_20260722.md`:
      `pause_reason_id` (client_id), optional/nullable, batch takes one pair for the whole batch.
- [x] `paused` vs `ended_shift` decision — resolved: key off `slug === "pause_ended_shift"`.
- [x] Which `pause_type`s to show in the sheet — resolved: all.
- [x] Deliverable scope — resolved: consumption + full data layer (no management UI).
- [ ] **Image upload for user-created reasons** — the CRUD `image_url` is a plain URL string. If a
      future management UI must *upload* images, confirm whether it reuses the existing image-upload
      pipeline (`@beyo/images`). Not a blocker for this plan (no management UI here), noted for the
      follow-up.
- [ ] **Analytics phase inclusion** — confirm whether Phase 5 (stats timeline migration) ships in
      this plan or as an immediate follow-up. It touches a different feature area (`@beyo/stats`) and
      is cleanly separable. Default assumption: include, but implementable independently.

## Acceptance criteria

1. Opening the pause sheet on a working step fetches `GET /api/v1/pause-reasons` and renders every
   returned reason in the `BoxPicker`, each with its `name` and `image_url` (falling back to
   `ImagePlaceholder` when `image_url` is null or fails to load).
2. Selecting a reason with `requires_description: false` and `slug !== "pause_ended_shift"`
   immediately transitions the step to `paused` with `pause_reason_id = reason.client_id`.
3. Selecting a reason with `requires_description: true` (e.g. the system
   `pause_other_task_priority`, or any user reason with the flag) opens the description view and
   requires a non-blank description before transitioning; the transition sends both
   `pause_reason_id` and `description`.
4. Selecting the reason whose `slug === "pause_ended_shift"` transitions the step to `ended_shift`.
5. A `pause_reason:created|updated|deleted` socket event invalidates the pause-reasons cache so an
   open (or next-opened) sheet reflects catalog changes without a manual refetch.
5b. The catalog is prefetched once at authed app boot (via `prefetchPauseReasonsData` on the same
   `list({})` key the sheet uses), so the **first** pause sheet open shows reasons immediately with
   no loading skeleton (skeleton only appears on a genuine cold-cache/offline first paint).
6. No reference to `StepTransitionReason` / `StepEventReasonEnum` remains in the workers app; the
   transition (single + batch) request bodies send `pause_reason_id`, not `reason`.
7. `npm run typecheck` and `npm run build` pass for the workers app; Playwright mobile + desktop
   pause-flow specs pass.
8. (Phase 5, if included) The worker linear-timeline pause breakdown renders reason names/images from
   the response's `pause_reasons` map, renders the reserved `"unspecified"` bucket as "No reason
   specified", and renders a graceful raw-ID fallback for a missing (deleted-reason) map entry.

## Contracts and skills

### Contract selection (per `task_system/frontend_contract_goal_mapping_guide.md`)

**Domain schemas consulted:**
- `apps/workers-app/.../features/task_steps/types.ts`: established real entity/field names —
  `TaskStep`, `LastStateRecord` (no `reason` field parsed today), `TransitionStepStateInput.reason`
  (to be renamed), `BatchStepTransitionRequest.reason`, and the `StepTransitionReason` enum to be
  removed. Confirmed the enum is used in only `types.ts` + `PauseReasonSheetPage.tsx`.
- Backend handoffs define the new `PauseReason` shape: `client_id`, `name`, `image_url`,
  `pause_type` (`personal|blocker`), `description`, `requires_description`, `is_system_managed`,
  `slug`, `created_at`, `created_by_id`, `updated_at`, `updated_by_id`.
- `packages/lib/src/types/common.ts`: branded-ID pattern (`Branded<string, 'X'>`) — will add
  `PauseReasonId`.
- `packages/stats/src/types.ts`: existing timeline / `pause_by_reason` shape (Phase 5 relational read).

**Selected contracts (core — always include):**
- `architecture/01_architecture.md`, `02_types.md`, `04_api_client.md` (+ `04_api_client_local.md`),
  `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`,
  `15_feature_structure.md`.

**Added from guide (New feature CRUD bundle + triggers):**
- `35_shared_packages.md`: **primary** — package creation, `package.json`/`tsconfig` template,
  `@source` wiring, §11 export conventions, §13 surface-openers boundary (confirms the sheet stays
  app-owned), §14 page-loader code-splitting. Trigger: "package page", "shared package".
- `24_dto.md`: DTO schema + `toXxxViewModel` transformer for the picker view model. Trigger: "dto",
  "view model", "client_id".
- `05_server_state.md` / `08_hooks.md`: query hook + action-hook (optimistic) structure for the
  list/get queries and CRUD mutations.
- `21_realtime.md`: socket-event handler shape for `pause_reason:*` invalidation. Trigger: "socket",
  "realtime".
- `28_surfaces.md` (+ `28_surfaces_local.md`): the sheet surface (`sheet`) registration. Trigger:
  "surface", "sheet".
- `30_dynamic_loading.md` (+ `30_dynamic_loading_local.md`): `lazyWithPreload` + loader-function
  split for any package page (only if the sheet moves into the package — it does **not** here; kept
  for reference).
- `32_loading_skeletons.md`: skeleton for the sheet while the catalog query is pending.
- `17_testing.md`, `34_runtime_validation.md` (+ `34_runtime_validation_local.md`): vitest + Playwright.

**Local extensions loaded:**
- `04_api_client_local.md`: backend error shape (flat string, no `field_errors`) — the transition
  400/404 for pause reasons surfaces as a flat message; the existing `onError` rollback + `notify`
  handles it.
- `28_surfaces_local.md`: active surface types are `slide | sheet | modal` (`drawer` excluded) — the
  pause sheet is a `sheet`.
- `30_dynamic_loading_local.md`: `lazyWithPreload` path + preload-hook convention.

**Excluded contracts:**
- `09_forms.md`: no react-hook-form form here (the description view is a single free-text textarea;
  a management form would need it, but that is out of scope).
- `12_auth.md` / `19_permissions.md`: reads are allowed for `WORKER`; no new guard. (Management
  writes are `ADMIN`/`MANAGER` — relevant only to the deferred management UI.)
- `11_routing.md` / `10_pages.md`: no new route; the sheet is a registered surface, already wired.
- `33_vaul_drawer.md`, `36_scroll_visibility.md`, `37_keyboard_aware_inputs.md`: **candidate** — the
  description view has a textarea on a mobile sheet. Re-check `37` when implementing that view so the
  input floats above the keyboard; include if the existing sheet does not already handle it.

### Read order block (document-only protocol)

Read order per selected canonical contract:
- `../architecture/35_shared_packages.md` (baseline; no local companion)
- `../architecture/04_api_client.md` → `../architecture/04_api_client_local.md` (app delta)
- `../architecture/28_surfaces.md` → `../architecture/28_surfaces_local.md` (app delta)
- `../architecture/30_dynamic_loading.md` → `../architecture/30_dynamic_loading_local.md` (app delta)
- `../architecture/34_runtime_validation.md` → `../architecture/34_runtime_validation_local.md` (app delta)

Applied precedence: local extension overrides baseline **only for this app**; canonical unchanged.

### File read intent — pattern vs. relational

- **Permitted (relational — what exists):** `task_steps/types.ts`, `task_steps/api/transition-step-state.ts`,
  `task_steps/api/transition-batch-step-states.ts`, `pages/task_steps/PauseReasonSheetPage.tsx`,
  `app/socket-registry.ts`, `packages/lib/src/types/common.ts`,
  `packages/realtime/src/lib/socket-types.ts`, `packages/stats/src/**` (Phase 5),
  `packages/ui/.../box-picker/*` (option/props shape), package barrels/`config.ts` for export shape.
- **Prohibited (pattern — contract covers it):** reading another package's action/query hook to learn
  cache-snapshot/rollback or TanStack setup (`08_hooks.md`, `05_server_state.md`); reading another
  socket-events file to learn handler shape (`21_realtime.md`); reading another DTO to learn the
  transformer shape (`24_dto.md`). The already-read `@beyo/cases` / `@beyo/task-notes` files were read
  once **relationally** to confirm the package export/`config`/keys conventions — sufficient; do not
  re-open per hook.

### Skill selection

- Primary skill: none required for implementation (standard feature build). Use `simplify` after the
  edit sweep and `/code-review` before completion.
- Trigger terms: n/a.
- Excluded alternatives: `deep-research`, `dataviz` — not applicable.

## Architecture understanding (frontend ⇄ backend alignment)

**What changed on the backend**
- Pause reasons moved from a frontend enum (`StepEventReasonEnum`) to workspace CRUD data at
  `/api/v1/pause-reasons` (list/get/PUT-create/PATCH/DELETE). Each row carries `client_id`, `name`,
  `image_url`, `pause_type`, `description`, `requires_description`, `is_system_managed`, `slug`,
  audit fields. Two rows are `is_system_managed` and undeletable: `pause_ended_shift`,
  `pause_other_task_priority`. Bootstrap seeds seven legacy-equivalent rows.
- The step-transition endpoints (single + batch) renamed `reason` → `pause_reason_id` (a
  `pause_reasons.client_id`); the response's `last_state_record` renamed `reason` →
  `pause_reason_id`. New server validation: 404 for an unknown/cross-workspace ID; 400 when a
  `requires_description` reason arrives without a non-blank description.
- Realtime emits `pause_reason:created|updated|deleted` (cache-invalidation signals) via the existing
  generic pipeline.
- The worker linear-timeline analytics response now keys `pause_by_reason` and segment `reason`
  fields by `pause_reason_id`, and adds a sibling `pause_reasons` lookup map (`name`, `image_url`,
  `pause_type`), plus a reserved `"unspecified"` bucket key with no map entry.

**What the frontend does today (the gap)**
- `PauseReasonSheetPage` hardcodes `PAUSE_REASON_OPTIONS` (the enum), special-cases
  `pause_ended_shift` and `pause_other_task_priority`, and sends `reason: <slug>`.
- `TransitionStepStateInput.reason` and `BatchStepTransitionRequest.reason` are typed to the enum /
  free string; the transition APIs pass them straight to the body.
- `@beyo/stats` resolves pause labels client-side via a hardcoded `pause-reason-labels.ts`.
- `@beyo/realtime`'s event union has no `pause_reason:*` events; `PauseReasonId` does not exist.

**Why the sheet stays app-owned (contract-35 boundary)**
- Per §10 + §13, feature pages and step-transition domain logic stay app-side. The package owns the
  reusable **catalog** (data + a presentational `PauseReasonPicker`); the app's sheet composes the
  package's query hook + picker and keeps the `useTransitionStepState` call. No `surfaceOpeners`
  injection is needed because the sheet is the surface itself, not a trigger field opening a picker
  surface.

## Implementation plan

Build order follows `16_feature_workflow.md`: Types → Keys → API/Queries → Actions → (Realtime)
→ Components → Page wiring → Public API → Tests. Shared-package edits first (they unblock the rest).

### Phase 0 — Shared-package primitives
1. `packages/lib/src/types/common.ts`: add `export type PauseReasonId = Branded<string, 'PauseReasonId'>;`
   and export it from the lib barrel if IDs are re-exported there.
2. `packages/realtime/src/lib/socket-types.ts`: add to `ServerToClientEvents`:
   `"pause_reason:created" | "pause_reason:updated" | "pause_reason:deleted"`, each
   `(payload: { client_id: string }) => void`. This makes `SocketEventHandlers` accept the new keys.

### Phase 1 — `@beyo/pause-reasons` package scaffold (contract 35 §3–§8, §11)
3. Create `packages/pause-reasons/` with `package.json` (`@beyo/pause-reasons`, `"private": true`,
   `exports: { ".": "./src/index.ts" }`, peers: `@beyo/lib`, `@beyo/api-client`, `@beyo/ui`,
   `@beyo/realtime`, `react`, `@tanstack/react-query`, `zod`) and the standard `tsconfig.json`.
   No `build` script; no `dist`.
4. `src/types.ts` — Zod + view models (per `24_dto.md`, `34_runtime_validation.md`):
   - `PauseReasonIdSchema = z.string().transform(v => v as PauseReasonId)`.
   - `PauseTypeSchema = z.enum(["personal", "blocker"])`.
   - `PauseReasonSchema` = the full object shape above (nullable `image_url`, `description`,
     `created_by_id`, `updated_at`, `updated_by_id`; `requires_description`/`is_system_managed`
     booleans; `slug` string).
   - `PauseReasonsListSchema` = `{ pause_reasons: PauseReason[], pause_reasons_pagination: { has_more, limit, offset } }`.
   - `ListPauseReasonsParams = { limit?, offset?, pause_type? }`.
   - CRUD input types: `CreatePauseReasonInput` (name, image_url?, pause_type, description?,
     requires_description) and `UpdatePauseReasonInput` (all optional, `image_url`/`description`
     explicitly nullable). `slug`/`is_system_managed` are **not** accepted (handoff).
   - `PauseReasonPickerOption` view model + `toPauseReasonPickerOption(reason)` transformer in
     `src/lib/pause-reason-view-model.ts` mapping `client_id→value`, `name→label`,
     `image_url→image` (BoxPicker/BackendImage handles the `ImagePlaceholder` fallback), and
     carrying through `slug`, `requires_description`, `pause_type` for the caller's decision logic.
5. `src/api/pause-reason-keys.ts` — key factory: `all`, `lists()`, `list(params)`, `details()`,
   `detail(id)`.
6. `src/api/list-pause-reasons.ts` + `use-pause-reasons-query.ts`; `get-pause-reason.ts` +
   `use-pause-reason-query.ts` (per `05_server_state.md`; envelope via `ApiEnvelopeSchema` +
   `PauseReasonsListSchema` / `{ pause_reason }`). Give the list query a `staleTime` (~5 min) so the
   boot-warmed cache (step 6b) is not treated as stale the instant the sheet mounts — realtime
   `pause_reason:*` invalidation (step 8) is the freshness mechanism, not time-based refetch.
6b. `src/api/prefetch-pause-reasons.ts` — `prefetchPauseReasonsData(queryClient)` mirroring
   `@beyo/cases`'s `prefetchCasesListData`: `queryClient.prefetchQuery({ queryKey:
   pauseReasonKeys.list({}), queryFn: () => listPauseReasons({}), staleTime })`. **The key must be
   `list({})` — byte-identical to what the sheet's `usePauseReasonsQuery({})` subscribes to** — or the
   warm cache misses and the sheet refetches anyway.
7. `src/actions/` — `use-create-pause-reason.ts` (PUT), `use-update-pause-reason.ts` (PATCH),
   `use-delete-pause-reason.ts` (DELETE), each with optimistic update + rollback + list/detail
   invalidation per `08_hooks.md`. (Data layer only — no UI consumes these yet.)
8. `src/socket-events.ts` — `pauseReasonSocketEvents: SocketEventHandlers` invalidating
   `pauseReasonKeys.lists()` on `created`, and `detail(client_id)` + `lists()` on `updated`/`deleted`
   (per `21_realtime.md`, mirroring `caseSocketEvents`).
9. `src/components/PauseReasonPicker.tsx` — presentational wrapper over `BoxPicker`
   (`mode="single"`, `columns={2}`), taking `reasons: PauseReason[]` + `onSelect: (reason) => void`
   + `disabled?`. Maps via `toPauseReasonPickerOption`. **Does not** import `useSurface`/`openSurface`
   (§13). Contains Tailwind classes → app must `@source` it.
10. `src/index.ts` — named exports only: types, `pauseReasonKeys`, list/get queries + fns,
    `prefetchPauseReasonsData`, CRUD actions + input types, `pauseReasonSocketEvents`,
    `PauseReasonPicker`, `toPauseReasonPickerOption`. No page component is exported (the sheet stays
    in the app), so no §14 loader function is needed here.

### Phase 2 — Transition contract migration (workers `task_steps`)
11. `features/task_steps/types.ts`:
    - Remove `StepTransitionReasonSchema` + `StepTransitionReason`.
    - `TransitionStepStateInput`: replace `reason?: StepTransitionReason` with
      `pause_reason_id?: PauseReasonId`.
    - `BatchStepTransitionRequest`: replace `reason?: string | null` with
      `pause_reason_id?: PauseReasonId | null`.
    - (Optional, for later rendering) add `pause_reason_id: z.string().nullable().optional()` to
      `LastStateRecordSchema` — currently it parses no reason field; safe additive.
12. `features/task_steps/api/transition-step-state.ts` + `transition-batch-step-states.ts`: bodies
    already spread `...body`, so the field rename in the input types flows through; verify no literal
    `reason` key is constructed.

### Phase 3 — Workers-app package wiring (contract 35 §6)
13. `apps/workers-app/.../package.json`: add `"@beyo/pause-reasons": "*"`.
14. `apps/workers-app/.../src/index.css`: add `@source "../../../../packages/pause-reasons/src";`
    (the `PauseReasonPicker` carries Tailwind classes — omitting this fails silently/unstyled, §6).
15. `apps/workers-app/.../src/app/socket-registry.ts`: import `pauseReasonSocketEvents` from
    `@beyo/pause-reasons` and spread into `socketRegistry`.
16. Run `npm install` from `frontend/` (workspace symlink). Confirm
    `node_modules/@beyo/pause-reasons` is a symlink.
16b. **Boot prefetch wiring.** Add `src/hooks/use-bootstrap-prefetch.ts` — a render-less hook that
    reads `userId = useAuthStore(selectUser)?.id` and calls
    `usePrefetchOnCondition(userId != null, () => prefetchPauseReasonsData(queryClient))` (exactly the
    idiom in `use-tab-badge-counts.controller.ts`). Invoke it from `AppShellInner`
    (`app/AppShell.tsx`) alongside the existing `preloadPrimaryTabRoutes()` effect — `AppShell` mounts
    only inside the authenticated tab layout, so the user/token is guaranteed present, and it runs
    once at app open. This is the extensible home for warming other workspace catalogs later, so the
    hook name is intentionally generic rather than pause-reason-specific.
    - Rationale for placement: not in a route/page (would only warm on visiting that route) and not in
      the tab-badge controller (semantically unrelated). The authed shell is the earliest render-safe
      point after boot where the QueryClient + auth store are both available.

### Phase 4 — Rewire `PauseReasonSheetPage` (app-owned surface)
17. Rewrite `pages/task_steps/PauseReasonSheetPage.tsx`:
    - Delete the hardcoded `PAUSE_REASON_OPTIONS` and enum import.
    - `const { data, isPending } = usePauseReasonsQuery({})` (no `pause_type` filter → all reasons).
    - Render `PauseReasonPicker` (or `BoxPicker` fed by `toPauseReasonPickerOption`) with a
      loading skeleton (`32_loading_skeletons.md`) while pending and an empty-state message if the
      catalog is empty.
    - `handleSelect(reason)`:
      - `if (reason.requires_description)` → switch to the description view (generalized from the
        old `pause_other_task_priority` special-case).
      - else compute `new_state = reason.slug === "pause_ended_shift" ? "ended_shift" : "paused"`
        and `transitionStepState({ ...ids, new_state, pause_reason_id: reason.client_id })`.
    - Description view submit: same `new_state` derivation; send `pause_reason_id` + trimmed
      `description` (guard non-blank to avoid the server 400).
    - Keep the existing surface header / animation / height-measure logic.
18. Re-check `37_keyboard_aware_inputs.md` for the description textarea on mobile; apply the
    keyboard-inset pattern if the sheet doesn't already float the input above the keyboard.

### Phase 5 — Analytics timeline migration (`@beyo/stats`) — modular, may be a follow-up
19. Relational-read `packages/stats/src/{types.ts, lib/worker-stats-dto.ts,
    lib/time-line-calendar/segment-adapter.ts, lib/time-line-calendar/pause-reason-labels.ts,
    api/fetch-worker-linear-timeline-breakdown.ts}` to establish the current `pause_by_reason` shape.
20. Extend the breakdown response schema with the `pause_reasons` lookup map
    (`Record<string, { name, image_url, pause_type }>`).
21. Replace the hardcoded `pause-reason-labels.ts` mapping with resolution against the response map:
    - `key === "unspecified"` → render "No reason specified" (reserved; never in the map).
    - map hit → `name` (+ `image_url` via `BackendImage`).
    - map miss (deleted reason) → graceful raw-ID fallback, do not fail the timeline.
22. Update `segment-adapter` + tests (`*.test.ts`) accordingly.

### Phase 6 — Public API, tests, validation
23. Vitest: `pause-reasons` package — schema parse of the sample payloads, `toPauseReasonPickerOption`
    mapping (null `image_url`), socket-event invalidation, `requires_description`/`ended_shift`
    decision logic (extract the decision into a pure helper to unit-test).
24. Component test: `PauseReasonSheetPage` renders fetched reasons, routes `requires_description` to
    the description view, and calls `transitionStepState` with the right `new_state` +
    `pause_reason_id` (MSW-mock the list endpoint).
25. Playwright: `tests/playwright/features/task_steps/pause-reason.spec.ts` (import from
    `fixtures/app-fixture`, `auth.signIn()`) — pause a step, pick a plain reason, pick a
    `requires_description` reason (assert description gate), pick the ended-shift reason. Run
    `npm run test:e2e:mobile` then `:desktop`.
26. Run `simplify` over the diff, then `/code-review`.

## Risks and mitigations

- **Risk:** Transition `reason` → `pause_reason_id` rename missed in a caller (e.g. batch flow) →
  silent no-reason pauses.
  **Mitigation:** Enum removal makes every stale `reason` reference a compile error; `npm run
  typecheck` is the gate. Grep confirmed only `types.ts` + `PauseReasonSheetPage.tsx` reference the
  enum today; batch API sends no `reason` currently.
- **Risk:** `requires_description` reason sent without description → backend 400.
  **Mitigation:** The sheet gates on `requires_description` before allowing submit; trim-guard the
  description; existing `onError` rollback + `notify` covers the residual case.
- **Risk:** Missing `@source` line → `PauseReasonPicker` renders unstyled with no error (§6).
  **Mitigation:** Explicit Phase-3 step; visual check in the Playwright run.
- **Risk:** `@beyo/realtime` event-union edit is a shared type touched by both apps → managers app
  type impact.
  **Mitigation:** Additive-only union members; handlers are optional in `SocketEventHandlers`. Run
  managers-app `typecheck` per contract 35 §6 "verify both apps."
- **Risk:** Phase 5 scope creep into the stats feature.
  **Mitigation:** Phase 5 is independently shippable; gate it behind the open clarification and split
  to a follow-up plan if it grows.
- **Risk:** `ended_shift`-via-sheet leaves `UserShiftStateRecord` unsynced.
  **Mitigation:** Pre-existing, explicitly deferred by the backend handoff; documented as a non-goal,
  no action.

## Validation plan

- `npm run typecheck` (workers **and** managers app): zero TypeScript errors — proves the enum
  removal + `pause_reason_id`/realtime-union edits are fully propagated.
- `npm run build` (workers app): succeeds; no `[INEFFECTIVE_DYNAMIC_IMPORT]` regressions.
- `npm run test -- --grep pause-reason`: package + component unit tests pass.
- `npx playwright test --grep "pause reason" --project=mobile`: pause flow (plain / description-gated
  / ended-shift) passes.
- `npx playwright test --grep "pause reason" --project=desktop`: same, desktop.
- Manual/socket check: emit `pause_reason:updated`; confirm an open sheet's catalog refetches.
- Boot-prefetch check: cold-load the app, wait for the shell, then open a step's pause sheet — the
  reason grid must paint with **no** loading skeleton (cache already warm). Confirm the Network tab
  shows the `pause-reasons` request fired at shell mount, not at sheet open.

## Review log

- `2026-07-22` `claude`: Initial plan drafted from three backend handoffs + contract-35 research;
  all four scoping questions resolved (transition = `pause_reason_id`; ended-shift = slug check;
  show all pause types; consumption + full data layer).

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` (pending owner sign-off on the two open clarifications: analytics-phase
  inclusion, future image-upload path)
- Transition owner: `claude`
