# PLAN_worker_stats_granularity_20260716

## Metadata

- Plan ID: `PLAN_worker_stats_granularity_20260716`
- Status: `under_construction`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-07-16T00:00:00Z`
- Last updated at (UTC): `2026-07-16T01:00:00Z`
- Related issue/ticket: `Worker Stats Granularity (intention brief in request)`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_worker_stats_granularity_20260716.md` (not yet filed; intention captured inline in the request)
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_daily_step_breakdown_20260716.md`

## Goal and intent

- Goal: Add a worker-level **granularity slide page** to `@beyo/stats` that lets a manager drill from the summarized `WorkerStatsCard` totals (Working / Paused / Completed) into the individual task-step records that compose those totals for a worker on the current day.
- Business/user intent: Managers currently see only daily totals per worker. They need to see *which* task steps produced those totals, switch between the three views without leaving the page, and jump to the underlying task or its image.
- Non-goals:
  - No `work_date` picker — the page always drills into the server "today" (default). Historical-day selection is out of scope.
  - No new backend work — the endpoint is delivered.
  - No mutation of stats/step data — read-only drill-down.
  - No changes to the existing `WorkerStatsSlidePage` list behavior beyond making the three `WorkerStatsCard` stat columns tappable entry points.

## Scope

- In scope:
  - New surface `worker-stats-granularity-slide` registered in `packages/stats/src/surfaces.ts` (auto-picked up by the managers app via `...workerStatsSurfaces` — already spread in `apps/managers-app/.../src/app/surface-registry.ts`).
  - New page `WorkerStatsGranularitySlidePage` (orchestrator) owning: worker identity header, current-state pill+timer, a three-tab totals selector, and the granular task-step list, all inside one scroll body, with a scroll-hiding `Close & Back` footer (Pattern A, mirroring `WorkerStatsSlidePage`).
  - New query stack for `GET /api/v1/worker-stats/{user_id}/daily-steps`: types/schemas, query key, fetch fn, query hook.
  - New DTO: raw daily-step → per-intention card view model.
  - New components: `WorkerStatsGranularityCard`, `WorkerTotalsSelector`, and a small worker-header block (identity + current state).
  - Make `WorkerStatsCard`'s three stat columns selectable entry points (new `onOpenSection?: (intention) => void` prop); wire from `WorkerStatsSlidePage` to open the granularity surface with the card's already-computed view-model fields + the tapped intention.
  - Reuse `@beyo/tasks` `TASK_DETAIL_SURFACE_ID` for body-tap navigation and `@beyo/images` `IMAGE_VIEWER_SURFACE_ID` for image-tap.
  - `index.ts` public exports for the new surface id/props, loaders, and preloader.
  - Vitest for the DTO + selector; Playwright flow (mobile then desktop).
- Out of scope: `work_date` (date) selection; ended-shift as a fourth tab; reconciling the `totals`/`daily_stats` gap in UI.
- Assumptions (all five opening clarifications resolved by the user — see Clarifications):
  - `@beyo/stats` takes `@beyo/images` as a new peer dependency and opens `IMAGE_VIEWER_SURFACE_ID` directly (mirrors `@beyo/tasks`).
  - List time is **settled `contribution`** per card, **except** when `active_record` is open **and** its `state` matches the targeted intention — then the card mounts a live `TickingTimer` (offset = the settled contribution for that metric, started at `active_record.entered_at`), so an open working/paused record (sorted to the top) ticks. `completed` cards are always static (`active_record` is always `null` for completed).
  - The list supports **load-more** at the bottom (offset paging via `has_more`).
  - The full serialization is now documented in the handoff (`jsonc` block): concrete `serialize_step` / `serialize_task_light` / `serialize_item_worker_light` / `serialize_image`(+`_light`) fields. The stats package defines its own Zod schema for this shape (does not reuse `TaskListItemRawSchema`).

## Clarifications required

All resolved (user, 2026-07-16):

- [x] **Exact field names** — the handoff now documents the full serialization (`jsonc` block, lines 29–164): `serialize_step`, `serialize_task_light`, `serialize_item_worker_light`, `serialize_image` (first, rich) + `serialize_image_light` (rest). Schema authored directly against it.
- [x] **Live running time** — settled `contribution` per card, **except** an open `active_record` whose `state` matches the targeted intention ticks live (working query / paused query can return an open record sorted to the top; tick it based on the targeted intention).
- [x] **Image-viewer boundary** — yes: add `@beyo/images` as a `@beyo/stats` peer dep and open `IMAGE_VIEWER_SURFACE_ID` directly.
- [x] **Pagination** — yes: load-more at the bottom of the list (offset paging via `has_more`).
- [x] **`completed` time** — local `HH:mm`, 24-hour.

## Acceptance criteria

1. Tapping any of the three `WorkerStatsCard` stat columns (Working / Paused / Completed) opens the granularity slide with the matching initial intention and the worker's header rendered immediately from the passed view-model (no wait on the granular query).
2. Inside the page, the three-column totals selector acts as tabs; the active tab reflects the current intention, and selecting another tab changes the intention, re-queries with the corresponding `sort_by`, and swaps the list while preserving the worker header/identity/current-state block.
3. The granular list requests `GET /api/v1/worker-stats/{user_id}/daily-steps` with the selected worker, the intention mapped to `sort_by` (`working`/`paused`/`completed`), and `limit`/`offset`; the response is Zod-validated.
4. Each granular card: image tap opens the existing full-page image viewer for that item; body tap opens the existing `TaskDetailPage` for the related task; the card shows the intention-relevant state pill + time — `working`→settled working time, `paused`→settled paused time, `completed`→completion `HH:mm` (24h) — and when `active_record` is open with a `state` matching the active intention (working/paused), that card ticks live from `active_record.entered_at` on top of the settled contribution.
5. The page renders its own in-scroll header (surface header hidden), keeps identity/state/selector/list in one scroll body, and shows a `Close & Back` footer that hides on scroll-down (Pattern A) and respects the bottom safe area — matching `WorkerStatsSlidePage`.
6. List supports initial-loading (skeletons), refreshing (pull-to-refresh), error-with-retry, empty-for-intention, loaded, and **load-more** (bottom-of-list offset paging via `has_more`) states; switching intentions preserves the header while replacing only the list/query state.
7. `npm run typecheck` clean; new Vitest specs pass; Playwright mobile + desktop flows pass.

## Contracts and skills

### File read intent — pattern vs. relational

Applied the test from `frontend_contract_goal_mapping_guide.md`. Relational reads already performed (understanding what exists — legitimate):
- `packages/stats/src/**` (types, dto, keys, query, fetch, surfaces, surface-ids, index, WorkerStatsCard, WorkerStatsSlidePage, format-duration) — existing return shapes, exports, surface wiring.
- `packages/tasks/src/components/TaskListCard.tsx`, `.../surface-ids.ts`, `.../controllers/use-tasks-view.controller.ts`, `.../flows/use-tasks-page.flow.ts`, `.../types.ts` — reference card hierarchy, `TASK_DETAIL_SURFACE_ID`, how the image viewer is opened, `TaskListItemRaw` field names.
- `packages/images/src/controllers/use-entity-images.controller.ts`, `.../index.ts` — `ImageViewerSurfaceProps` / `ImageViewModel` shape, `IMAGE_VIEWER_SURFACE_ID` export.
- `apps/managers-app/.../src/app/surface-registry.ts`, `.../features/home/components/HomeView.tsx` — how the slide is registered/opened.
- Backend handoff doc — endpoint contract.

Pattern reads deliberately avoided (contract already defines these): TanStack query-hook shape (`05`), DTO/view-model transformer shape (`24`), scroll-hide wiring (`36`), surface registration/opening (`28`, `35 §14`).

### Contracts loaded

- `architecture/01_architecture.md` — layer boundaries (feature-as-orchestrator; components read context/props only).
- `architecture/02_types.md` — Zod-first types.
- `architecture/04_api_client.md` (+ `_local`) — `apiClient.get` with response schema; envelope shape.
- `architecture/05_server_state.md` — query hook + `placeholderData` keep-previous for tab switches.
- `architecture/08_hooks.md` — query/controller aggregation shape (no pattern read of existing hooks).
- `architecture/13_errors.md` — error/retry rendering.
- `architecture/15_feature_structure.md` (+ `_local` if present) — package internal folder layout.
- `architecture/24_dto.md` — raw → view-model transformer per intention.
- `architecture/28_surfaces.md` (+ `_local`) — slide surface registration/opening; header hide.
- `architecture/36_scroll_visibility.md` — `useScrollHide` Pattern A footer + scroll container registration.
- `architecture/35_shared_packages.md §13, §14` — package surface boundary, static page export + `lazyWithPreload` loaders, surfaceOpeners injection option.

### Local extensions loaded

- `architecture/04_api_client_local.md` — backend error shape / envelope (`ApiEnvelopeSchema` already used by stats).
- `architecture/28_surfaces_local.md` — active surface types (`slide` in use).
- `architecture/30_dynamic_loading_local.md` — `lazyWithPreload` from `@beyo/ui`, loader-function convention (matches existing `surfaces.ts`).

### Skill selection

- Primary skill: none required beyond standard feature build. Use `verify` after implementation to drive the flow.
- Trigger terms: `slide surface`, `scroll visibility`, `dto`, `query`.
- Excluded: `dataviz` (no charts), form skills (no forms).

## Implementation plan

Build bottom-up (logic) then top-down (UI), per `16_feature_workflow.md`.

1. **Types / schemas** — `packages/stats/src/types.ts` (new schemas colocated for cohesion). Authored directly against the handoff `jsonc` block:
   - `WorkerGranularityIntention = "working" | "paused" | "completed"`.
   - `StepContributionSchema` (`working_seconds`, `pause_seconds`, `ended_shift_seconds`, `completed_count` — all int).
   - `ActiveRecordSchema` = `z.object({ state: z.enum(["working","paused","ended_shift"]), entered_at: z.string() }).nullable()`.
   - `DailyStepTaskLightSchema` (nullable): `client_id`, `task_type`, `priority`, `state`, `return_source` (nullable), `item_location` (nullable), `ready_by_at` (nullable), `scheduled_start_at`/`scheduled_end_at` (nullable), `return_method` (nullable). Reuse `TASK_TYPE`/`TASK_RETURN_SOURCE` enums from `@beyo/tasks` where they map cleanly; keep `state`/`priority` as `z.string()` if the light enum set isn't exported (card only needs `task_type`, `return_source`, `ready_by_at`, `state`).
   - `DailyStepItemLightSchema` (nullable): `client_id`, `article_number` (nullable), `sku` (nullable), `state`, `item_category_id` (nullable), `quantity` (int), `item_position` (nullable), `item_zone` (nullable), `upholstery_requirement` (array, default `[]`). NB: the light item has **no** `item_major_category_snapshot` — the "seat quantity pill" branch from `TaskListCard` is dropped for this card unless we key off `item_category_id` (out of scope; show plain `#quantity` or omit).
   - `DailyStepImageSchema` — model the **first** (rich `serialize_image`: `client_id`, `image_url`, `width_px`, `height_px`, `file_size_bytes`, `created_at`, `image_annotation` nullable, plus tolerated extras) and reuse a light shape for the rest; only `client_id` + `image_url` (+ dims) are needed to open the viewer.
   - `WorkerDailyStepSchema` — the `serialize_step` fields actually consumed (`client_id`, `task_id`, `state: StepStateSchema`, `working_section_name_snapshot`) plus `task`, `item`, `item_images`, `contribution`, `active_record`, `last_activity_at` (nullable), `last_completed_at` (nullable). Do **not** enumerate the lifetime `total_*` step fields we don't use — keep the object non-strict so they pass through harmlessly.
   - `WorkerDailyStepsResponseSchema = ApiEnvelopeSchema(z.object({ user: WorkerStatsUserSchema, work_date, totals: StepContributionSchema, daily_stats: DailyStatsSchema-shaped, steps: z.object({ items: z.array(WorkerDailyStepSchema), limit, offset, has_more }) }))`. Reuse existing `WorkerStatsUserSchema`/`DailyStatsSchema`.
   - `ListWorkerDailyStepsParams` (`userId`, `intention`, `limit?`, `offset?`, `workDate?`).
   - `INTENTION_SORT_BY: Record<WorkerGranularityIntention, "working"|"paused"|"completed">` (identity today; single source for query-param derivation). Default `order: "desc"`.
2. **Query key** — extend `worker-stats-keys.ts`: `dailyStepsLists()`, `dailyStepsList(userId, params)` (params exclude `offset` from the stable key so infinite pages share one entry).
3. **Fetch fn** — `api/fetch-worker-daily-steps.ts`: `apiClient.get("/api/v1/worker-stats/${userId}/daily-steps", WorkerDailyStepsResponseSchema, { sort_by: INTENTION_SORT_BY[intention], order: "desc", limit, offset, ...(workDate ? { work_date } : {}) })`; return `{ user, workDate, totals, dailyStats, items, hasMore, limit, offset }`.
4. **Query hook** — `api/use-worker-daily-steps-query.ts`: `useInfiniteQuery` keyed on `dailyStepsList(userId, { intention, workDate })`; `initialPageParam: 0`; `getNextPageParam: (last) => last.hasMore ? last.offset + last.limit : undefined`; `placeholderData: keepPreviousData` (prior intention's list stays visible during the tab-switch refetch); `enabled: Boolean(userId)`. Expose `{ query, loadMore, hasMore, isFetchingMore }` (thin wrapper, matching the tasks `useListTasksQuery` return shape — relational reference only).
5. **DTO** — `lib/worker-daily-step-dto.ts`: `toWorkerDailyStepCardViewModel(step, intention)` →
   - `stepId`, `taskId` (`step.task_id`), `itemId` (`step.item?.client_id ?? null`), `imageUrl` (`item_images[0]?.image_url ?? null`), `images: ImageViewModel[]` (map `item_images`, first rich — reuse the mapping shape from `use-tasks-page.flow.ts` `toImageViewModelFromListItem`; lift a shared `toImageViewModelFromListImage` helper rather than copy-paste).
   - Card body fields from `task` (`task_type`, `return_source`, `ready_by_at`) and `item` (`article_number`/`sku`, `quantity`).
   - Intention-specific `statePill` + time model:
     - `working` → step-state label/variant for working; `timeSeconds = contribution.working_seconds`; `ticking = active_record?.state === "working"`.
     - `paused` → paused label/variant; `timeSeconds = contribution.pause_seconds`; `ticking = active_record?.state === "paused"`.
     - `completed` → completed label/variant; `completionHHmm = formatHHmm(last_completed_at)`; never ticking.
   - Emit a `time` union: `{ kind: "static", text }` (from `secondsToHM` or the `HH:mm`) or `{ kind: "ticking", offsetSeconds, startedAtIso }` (offset = the settled metric seconds, started at `active_record.entered_at`). The card renders `TickingTimer` for the ticking kind — same mechanism as `resolveTicker`/`WorkerStatsCard`.
   - Reuse `humanizeStepState` + `STEP_STATE_VARIANT` from `@beyo/tasks` for pill label/variant.
   - Add `formatHHmm(iso)` to `lib/format-duration.ts` (local 24h `HH:mm`; null-safe → `"—"`).
6. **Surface ids/props** — `surface-ids.ts`: add `WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID = "worker-stats-granularity-slide"`, `WorkerStatsGranularitySurfaceProps` (worker header fields: `userId`, `username`, `profilePicture`, `stepStateLabel`, `stepStateVariant`, `ticker`, `workingDisplay`, `pausedDisplay`, `completedCount` + `initialIntention`), and `preloadWorkerStatsGranularitySlideSurface`.
7. **Components** (add `data-testid` to feature-critical elements):
   - `components/WorkerTotalsSelector.tsx` — three-column tabs mirroring `WorkerStatsCard`'s grid; `active` intention styling; `onSelect(intention)`; testids `worker-granularity-tab-{intention}`.
   - `components/WorkerStatsGranularityCard.tsx` — mirrors `TaskListCard` layout (square image button left, body right). Image button → `onTapImage(step)`; body → `onTapCard(taskId)`. Renders `statePill` and the `time` model: static text, or `TickingTimer` (offsetSeconds/startedAtIso) when `time.kind === "ticking"`. Uses `ImagePlaceholder`/`StatePill`/`TickingTimer` from `@beyo/ui`.
   - `components/GranularityWorkerHeader.tsx` (or inline in page) — `Avatar` + name; current-state pill + `TickingTimer` from the passed `ticker` (reuse `TICKER_CHIP_CLASS` treatment from `WorkerStatsCard` — extract to a shared const in `lib` to avoid duplication).
   - Skeletons for the card list (mirror the page's skeleton idiom).
8. **Page** — `pages/WorkerStatsGranularitySlidePage.tsx` (orchestrator):
   - `useSurfaceProps<WorkerStatsGranularitySurfaceProps>()` for header + `initialIntention`; `useState(initialIntention)` for the active tab.
   - `useSurfaceHeader()` → `setHeaderHidden(true)` on mount.
   - `useScrollHide()` + `PullToRefresh` (same wiring as `WorkerStatsSlidePage`).
   - `useWorkerDailyStepsQuery({ userId, intention })`; flatten `pages[].items` → card VMs via DTO.
   - Body order: (1) worker identity, (2) current state, (3) `WorkerTotalsSelector`, (4) list (skeleton / error+retry / empty / cards + bottom **Load more** trigger that calls `loadMore()` while `hasMore`; button or IntersectionObserver sentinel, with an `isFetchingMore` spinner row).
   - Image tap → `useSurfaceStore.getState().open(IMAGE_VIEWER_SURFACE_ID, { images, initialImageClientId, entityType: "item", entityClientId: itemId, mode: "preview-only", enableOnDemandImageLoad: true })`.
   - Body tap → `useSurfaceStore.getState().open(TASK_DETAIL_SURFACE_ID, { taskId } satisfies TaskDetailSurfaceProps)` (import id + props type from `@beyo/tasks`).
   - Footer `Close & Back` → `header?.requestClose()`, Pattern A `FOOTER_STYLE` (copy from `WorkerStatsSlidePage`; extract shared const if worth it).
9. **Dynamic loading + registration** — `surfaces.ts`: add `loadWorkerStatsGranularitySlidePage`, `lazyWithPreload`, register under the new surface id in `workerStatsSurfaces`, export `preloadWorkerStatsGranularitySurface`.
10. **Wire entry points** — `WorkerStatsCard.tsx`: add `onOpenSection?: (intention: WorkerGranularityIntention) => void`; make the three `WorkerStat` columns buttons calling it. `WorkerStatsSlidePage.tsx`: pass `onOpenSection={(intention) => useSurfaceStore.getState().open(WORKER_STATS_GRANULARITY_SLIDE_SURFACE_ID, { ...workerHeaderFieldsFrom(worker), initialIntention: intention })}` and `usePreloadSurface(preloadWorkerStatsGranularitySlideSurface)`.
11. **Public API** — `index.ts`: export new surface id/props, loaders, preloader, and the intention type. Add `@beyo/images` to `package.json` peer deps (confirmed).
12. **Tests** — Vitest: DTO per-intention mapping — static vs ticking selection (open `active_record` matching / not matching the intention), `formatHHmm` (valid, null → `"—"`, 24h wrap), empty `item_images`, null `task`/`item`; and `WorkerTotalsSelector` active/selection behavior. Playwright: from a worker card tap each section → header renders from props, list loads, switch tabs re-queries, an open working/paused record ticks, image tap opens viewer, body tap opens task detail, load-more appends a page, footer closes; run mobile then desktop.

## Risks and mitigations

- Risk: schema over-specification hard-fails runtime validation on unused/extra fields.
  Mitigation: schema models only the consumed fields and stays non-strict (extras pass through); the `light` item lacks `item_major_category_snapshot` (seat-quantity pill dropped — noted in step 1); validate against a real response in the runtime pass.
- Risk: Duplicated constants/styles (`TICKER_CHIP_CLASS`, `FOOTER_STYLE`, image→ViewModel mapper) drift from `WorkerStatsCard` / `WorkerStatsSlidePage` / tasks flow.
  Mitigation: extract shared helpers into `lib/` within the stats package (and reuse the tasks flow mapper shape) rather than copy-paste.
- Risk: Tab switch flashes empty while refetching.
  Mitigation: `placeholderData: keepPreviousData`; show a subtle refreshing state, keep header mounted.
- Risk: `completed` list won't sum to `totals` (handoff §Sorting) — could confuse.
  Mitigation: totals selector shows the day totals (from passed VM / `totals`), the list is the intention subset; do not attempt to reconcile them in UI.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test -- --grep "worker-daily-step|WorkerTotalsSelector|granularity"`: DTO + selector specs green.
- `npx playwright test --grep "worker stats granularity" --project=mobile`: entry from each section, tab switching, image + task-detail navigation, footer close — pass.
- `npx playwright test --grep "worker stats granularity" --project=desktop`: same — pass.
- Runtime pass: open against a real daily-steps response to confirm schema tolerance and the three intention renderings; mobile first, then desktop.

## Review log

- `2026-07-16` owner: initial draft created from intention brief + backend handoff; 5 clarifications open.
- `2026-07-16` user: all 5 clarifications resolved (full serialization documented in handoff; settled time except open `active_record` matching the active intention ticks; `@beyo/images` peer dep OK; load-more at bottom; `completed` = 24h `HH:mm`). Plan updated accordingly — no open blockers.
- `2026-07-16` owner: **IMPLEMENTED** against the resolved plan + the supplied card design (blue/amber/green `STATE_CHIP_CLASS` pills, quantity pill on image, title, `type · detail` row, state+time pill). Files: `types.ts` (daily-steps schemas + intention/sort map), `api/{worker-stats-keys,fetch-worker-daily-steps,use-worker-daily-steps-query}.ts` (infinite query + load-more), `lib/{format-duration(formatHHmm),state-pill-styles,worker-daily-step-dto}.ts`, `components/{WorkerTotalsSelector,WorkerStatsGranularityCard}.tsx`, `pages/WorkerStatsGranularitySlidePage.tsx`, surface id/props + `surfaces.ts` registration + `index.ts` exports; `WorkerStatsCard` stat columns made tappable (`onOpenSection`), `WorkerStatsSlidePage` opens the granularity slide with the card VM + preloads it; `@beyo/images` added as peer dep. `TICKER_CHIP_CLASS` extracted to shared `state-pill-styles.ts`. Validation: `npm run typecheck` clean (no first-party errors); 27 stats vitest tests pass (9 new: DTO per-intention static/ticking + selector). Playwright deferred — no worker-stats e2e precedent in the repo and the endpoint needs seeded manager data; follows the package's existing vitest-only test approach.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `debugging` (runtime validation against a live daily-steps response) → `approved`
- Transition owner: `claude-opus-4-8`
