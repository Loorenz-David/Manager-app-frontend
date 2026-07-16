# PLAN_worker_stats_page_20260715

## Metadata

- Plan ID: `PLAN_worker_stats_page_20260715`
- Status: `archived`
- Owner agent: `claude`
- Created at (UTC): `2026-07-15T00:00:00Z`
- Last updated at (UTC): `2026-07-15T15:18:31Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_worker_stats_last_interacted_steps_20260715`
- Intention plan: `docs/architecture/under_construction/intention/new_worker_stats_page.md`

## Goal and intent

- Goal: Create a **new shared package `@beyo/stats`** that owns application/worker statistics UI, and deliver its first surface — a **worker-stats slide page** listing every worker in the workspace with their last-interacted task step and today's activity totals. Register the page as a `slide` surface in the managers app.
- Business/user intent: Give managers a single glanceable view of what each worker is (or was last) working on and how much they have worked/paused/completed today — a coordination aid so managers understand who is busy with what.
- Non-goals:
  - No tap/press actions on the card or its sub-parts (explicitly deferred by the requester — "I will add actions … later on").
  - No batch drill-down UI (`batch.+N` representative expansion) in this iteration.
  - No realtime/socket wiring — the page is a read-only snapshot with pull-to-refresh.
  - No `work_date` day-picker UI — always request "today" (omit `work_date`).
  - No mutation endpoints; this feature is read-only.

## Scope

- In scope:
  1. New package `@beyo/stats` (package.json, tsconfig.json, `src/`) following the source-package contract (`35_shared_packages.md`).
  2. New generic primitive `Avatar` in `@beyo/ui` (`packages/ui/src/components/primitives/avatar/`): a simple rounded avatar rendering the user image, with an **initials fallback** derived from the name (design shows `TS` for `#test-seller`) and an `ImagePlaceholder` last-resort fallback.
  3. Data layer in `@beyo/stats`: Zod response schema, query keys, fetch function, TanStack query hook, and a DTO transformer producing a `WorkerStatsCardViewModel`.
  4. `WorkerStatsCard` component matching the attached design (avatar + username + state pill; article/sku + live ticker; three-column working / paused / completed footer).
  5. `WorkerStatsSlidePage` list page (header, pull-to-refresh, pagination via `limit`/`offset`, loading skeleton, empty/error states) exposed via a `loadWorkerStatsSlidePage()` loader (per `35_shared_packages.md §14`).
  6. Managers-app wiring: add the package dependency, `@source` directive, and register the `slide` surface in `app/surface-registry.ts`. A minimal home-page trigger button to open the surface (see Clarification 2).
- Out of scope: everything under Non-goals; workers-app and sellers-app consumption (managers-app only for now).
- Assumptions:
  - Package name is `@beyo/stats`. (Requester said "a new package feature … will hold all the stats related to the applications.")
  - The hosting surface is a `slide` (page-depth navigation from home), per `28_surfaces_local.md` which says "Use `slide` for page-depth navigation." The requester's phrase "applications slide surface sheet" is read as a slide.
  - The nested `last_interacted_step` payload is the full worker-facing step shape (same as `apps/workers-app/.../features/task_steps/types.ts` `TaskStepSchema`, minus `cases_summary`). We parse **only the fields the card renders** into a focused schema; unrecognized fields are stripped by Zod and ignored.
  - `daily_stats` is always present (zeros when idle), per the handoff — no null-guarding beyond defaulting.

## Clarifications required — RESOLVED (no open blockers)

- [x] **Ticker semantics for `paused` / `ended_shift`** → **Live-tick all three.** All of `working`, `paused`, `ended_shift` tick upward (offset = the matching `total_*_seconds`, start = `last_state_record.entered_at`). This is a deliberate divergence from `TaskStepActionButton` (which freezes paused/ended_shift). Any other state or a missing `last_state_record` renders `—`. No static ticker branch is needed.
- [x] **Home trigger scope** → **Include it.** Add a minimal "Worker stats" button to the managers home view that opens the slide, with `usePreloadSurface(preloadWorkerStatsSlideSurface)` for hover/mount preload. `features/home/**` is in scope.
- [x] **Batch representation** → **Deferred** (consistent with "actions later"). Render the single representative `last_interacted_step` only; `batch` is parsed as `z.unknown().nullable()` (not surfaced). No `+N in batch` badge this iteration.

## Acceptance criteria

1. `@beyo/stats` exists as a private source package with `exports` → `./src/index.ts`, peer-deps only, no build step, and type-checks under its own `tsconfig.json`.
2. Managers app compiles and type-checks with the new package wired in; `@source "../../../../packages/stats/src"` is present in `apps/managers-app/ManagerBeyo-app-managers/src/index.css`.
3. Opening the worker-stats slide surface renders one `WorkerStatsCard` per worker returned by `GET /api/v1/worker-stats/last-interacted-steps`, visually matching the attached design (avatar+username+state pill row; `#ART…`/sku + dotted ticker row; WORKING / PAUSED / COMPLETED three-column footer) on `bg-card shadow-sm`.
4. A worker with `last_interacted_step: null` renders gracefully (no state pill / no article / no ticker; footer still shows `daily_stats`, zeros allowed).
5. Duration formatting: `daily_stats.total_working_seconds` / `total_pause_seconds` render as `Xh Ym` (e.g. `7h 14m`, `1h 24m`); `total_completed_count` renders as an integer; the ticker renders `HH:MM:SS`.
6. `Avatar` primitive renders the image when present, initials (max 2 chars, uppercased) when not, and the placeholder when neither name nor image is available; exported from `@beyo/ui`.
7. The slide page code-splits: `surfaces.ts` uses a `loadWorkerStatsSlidePage()` loader, and the page component is **not** statically re-exported from `index.ts` (`35_shared_packages.md §14`).
8. `npm run typecheck` passes; new Vitest unit/component tests pass; Playwright mobile+desktop runtime validation of the slide passes (`34_runtime_validation_local.md`).

## Contracts and skills

### Domain schemas consulted (relational reads — what exists)

- `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/types.ts`: exact nested step shape reused by the endpoint — `TaskStepSchema` (fields we consume: `client_id`, `state`, `item.article_number`, `item.sku`, `last_state_record.entered_at`, `total_working_seconds`, `total_pause_seconds`, `total_ended_shift_seconds`), `LastStateRecordSchema`, `StepState`, and `toTaskStepCardViewModel`'s article-label rule (`#${article_number}` else `sku` else fallback).
- `packages/tasks/src/lib/step-state-variants.ts` (`@beyo/tasks`): reuse `StepState`, `STEP_STATE_VARIANT` (state → `StatePillVariant`), `humanizeStepState` — do **not** re-declare a step-state enum/label/variant map.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_last_interacted_steps_20260715.md`: endpoint contract, response shape, auth, pagination, `daily_stats` semantics, `cases_summary` omission.
- `packages/ui/src/components/primitives/{ticking-timer,state-pill,user-pill,image-placeholder}`: reuse `TickingTimer` (offset+startedAt live ticker), `StatePill`, `ImagePlaceholder`. `UserPill` is the structural reference for the new `Avatar` (image → `onError` fallback pattern).
- `packages/item-categories/{package.json,src/surfaces.ts,src/surface-ids.ts,tsconfig.json}`: reference package skeleton (peer-deps, loader+`lazyWithPreload`, surface-id module).

### Contracts loaded (pattern authority — how to write)

- `architecture/01_architecture.md`, `02_types.md`, `04_api_client.md`: baseline structure, Zod-typed request/response, `apiClient.get` envelope usage.
- `architecture/05_server_state.md`: query key factory + `useQuery` hook shape.
- `architecture/08_hooks.md`: hook conventions (this feature is read-only; no action/optimistic hooks).
- `architecture/07_components.md`: presentational component conventions (`WorkerStatsCard`, `Avatar`).
- `architecture/10_pages.md` + `32_loading_skeletons.md`: page composition, loading/empty/error states, skeletons.
- `architecture/24_dto.md`: response schema → `WorkerStatsCardViewModel` transformer (`toWorkerStatsCardViewModel`).
- `architecture/13_errors.md`: error surface for the list query (401/403/422 already handled by the shared api client's error shape — `04_api_client_local.md`).
- `architecture/15_feature_structure.md` + `16_feature_workflow.md`: build order (Types → Keys → API → Query → DTO → Components → Page → Dynamic loading → Surface registration → Public API → tests).
- `architecture/35_shared_packages.md`: **primary** — package.json template (§3), peer-deps (§4), tsconfig (§5), consuming-app wiring + `@source` (§6), directory/barrel (§8), naming (§11), and **§14 loader-function code-splitting** for the slide page. §13 (`surfaceOpeners`) is **not** needed yet because the card has no picker/opener callbacks.
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: `slide` surface type + registration.
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload`, `loadXxxPage()` loader, optional `usePreloadSurface` on the home trigger.
- `architecture/14_styling.md §14`: add one `@source` line for the new package (it contains Tailwind class names — silent-fail if omitted).
- `architecture/17_testing.md` + `34_runtime_validation.md` + `34_runtime_validation_local.md`: Vitest units/components + Playwright mobile-first runtime validation; `data-testid` on card-critical elements.

### Local extensions loaded

- `architecture/28_surfaces_local.md`: four surface types; `drawer` excluded; use `slide` for page-depth. Applied → host page is a `slide`.
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` import path (`@beyo/ui`), `usePreloadSurface` from `@beyo/hooks`.
- `architecture/04_api_client_local.md`: flat backend error shape; refresh envelope — reused as-is by the shared `apiClient`.
- `architecture/34_runtime_validation_local.md`: fixture/credential/project conventions for the Playwright pass.

### File read intent — pattern vs. relational

All step-shape, state-variant, primitive, and reference-package reads above are **relational** (understanding what exists / exact field names) and are legitimate. No action-hook / provider / other-DTO file was read for "how to write" — those patterns come from `08_hooks.md`, `23_providers.md`, `24_dto.md`. (No provider is introduced: the page is a leaf list with a single query; a controller-in-page is sufficient — see Risk note.)

### Skill selection

- Primary skill: `run` (launch managers app to verify the slide renders against the live/mocked endpoint) and `verify` (drive the flow end-to-end) during validation.
- Trigger terms: `slide surface`, `package page`, `lazyWithPreload`, `@source`.
- Excluded alternatives: `dataviz` skill — not a chart/graph; the three-column footer is plain stat text, not a visualization.

## Implementation plan

Build bottom-up (logic) then top-down (UI), per `16_feature_workflow.md`.

### A. New primitive — `Avatar` in `@beyo/ui`

1. Create `packages/ui/src/components/primitives/avatar/Avatar.tsx`:
   - Props: `{ name: string; imageSrc?: string | null; imageAlt?: string; className?: string; "data-testid"?: string }`.
   - Render a rounded square (`rounded-full overflow-hidden bg-muted`, sized via `className`, default e.g. `size-11`).
   - Image branch mirrors `UserPill`: `useState(didImageFail)` + `onError` → fallback; `object-cover`, `loading="lazy"`.
   - Fallback 1 — **initials**: derive from `name` (split on whitespace/`#`/`-`, take first letter of first two tokens, uppercased, max 2 chars; e.g. `#test-seller` → `TS`). Render centered `text-muted-foreground font-semibold`.
   - Fallback 2 — if `name` is empty and no image: `ImagePlaceholder`.
   - `data-testid` passthrough.
2. Create `packages/ui/src/components/primitives/avatar/index.ts` → `export * from "./Avatar";`.
3. Add `export * from "./components/primitives/avatar";` to `packages/ui/src/index.ts` (barrel style already used at line 39 for `image-placeholder`).

### B. New package scaffold — `@beyo/stats`

4. `packages/stats/package.json` (per §3/§4):
   ```json
   {
     "name": "@beyo/stats",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "exports": { ".": "./src/index.ts" },
     "peerDependencies": {
       "@beyo/api-client": "*",
       "@beyo/hooks": "*",
       "@beyo/lib": "*",
       "@beyo/tasks": "*",
       "@beyo/ui": "*",
       "@tanstack/react-query": ">=5.0.0",
       "lucide-react": ">=1.0.0",
       "react": ">=19.0.0",
       "zod": ">=4.0.0"
     }
   }
   ```
   (Add `framer-motion` only if the list gets entrance animation — omit for now.)
5. `packages/stats/tsconfig.json` — copy the §5 template verbatim (`moduleResolution: "bundler"`, `types: ["node","vite/client"]`, `include: ["src"]`, no `paths`).

### C. Types + DTO (`packages/stats/src/types.ts`)

6. Zod schemas (parse only what the card renders; extra fields stripped):
   - `WorkerStatsUserSchema`: `{ client_id: string; username: string; profile_picture: string | null; last_online: string | null }`.
   - `WorkerLastStepSchema` (focused): `{ client_id: string; state: StepStateSchema; item: { article_number: string | null; sku: string | null } | null; last_state_record: { entered_at: string } | null; total_working_seconds: number; total_pause_seconds: number; total_ended_shift_seconds: number }`. Use `@beyo/tasks` `StepState` as the enum source (redeclare the `z.enum([...])` locally but `satisfies z.ZodType<StepState>` to stay in lockstep — mirrors the workers-app pattern).
   - `DailyStatsSchema`: `{ work_date: string; total_working_seconds: number; total_pause_seconds: number; total_completed_count: number }`.
   - `WorkerStatsRowSchema`: `{ user, last_interacted_step: WorkerLastStepSchema.nullable(), batch: BatchSchema.nullable() (or z.unknown().nullable() if Clarification 3 defers batch), daily_stats: DailyStatsSchema }`.
   - `WorkerStatsResponseSchema = ApiEnvelopeSchema(z.object({ workers: z.array(WorkerStatsRowSchema), workers_pagination: z.object({ has_more, limit, offset, total }) }))` (reuse `ApiEnvelopeSchema` from `@beyo/lib`).
7. `ListWorkerStatsParams = { limit?: number; offset?: number }`.
8. View model + transformer (per `24_dto.md`) — put in `packages/stats/src/lib/worker-stats-dto.ts`:
   - `WorkerStatsCardViewModel = { userId: string; username: string; profilePicture: string | null; hasStep: boolean; stepState: StepState | null; stepStateLabel: string | null; stepStateVariant: StatePillVariant | null; articleLabel: string | null; ticker: TickerModel | null; workingDisplay: string; pausedDisplay: string; completedCount: number }`.
   - `TickerModel = { offsetSeconds: number; startedAtIso: string } | null` — computed from `state` + `last_state_record.entered_at` + matching `total_*_seconds` (see Ticker rule below). Live-tick only; no static variant.
   - `articleLabel`: `item.article_number ? '#'+article_number : (item.sku ?? null)` (reuse the workers-app rule; note design shows `#ART-40921`).
   - `stepStateLabel = humanizeStepState(state)`, `stepStateVariant = STEP_STATE_VARIANT[state]` (both from `@beyo/tasks`).
   - `workingDisplay = secondsToHM(daily_stats.total_working_seconds)`, `pausedDisplay = secondsToHM(daily_stats.total_pause_seconds)`, `completedCount = daily_stats.total_completed_count`.

### D. Duration helpers (`packages/stats/src/lib/format-duration.ts`)

9. `secondsToHM(totalSeconds: number): string` → `"Xh Ym"` (e.g. 26040 → `7h 14m`; floor to minutes; `0` → `0h 0m` or `0m` — pick `Xh Ym` always for column consistency).
10. Ticker rule (`resolveTicker(step): TickerModel`) — **live-tick all three accumulating states**:
    - `working` → `{ offsetSeconds: total_working_seconds, startedAtIso: last_state_record.entered_at }`.
    - `paused` → `{ offsetSeconds: total_pause_seconds, startedAtIso: entered_at }`.
    - `ended_shift` → `{ offsetSeconds: total_ended_shift_seconds, startedAtIso: entered_at }`.
    - any other state, or missing `last_state_record` → `null` (render em dash).

### E. API layer

11. `packages/stats/src/api/worker-stats-keys.ts`:
    ```ts
    export const workerStatsKeys = {
      all: ["worker-stats"] as const,
      lastInteractedLists: () => [...workerStatsKeys.all, "last-interacted", "list"] as const,
      lastInteractedList: (params: ListWorkerStatsParams = {}) =>
        [...workerStatsKeys.lastInteractedLists(), params] as const,
    };
    ```
12. `packages/stats/src/api/fetch-worker-stats.ts`: `apiClient.get("/api/v1/worker-stats/last-interacted-steps", WorkerStatsResponseSchema, { limit: params.limit ?? 50, offset: params.offset ?? 0 })`; return `{ workers, has_more, total, limit, offset }` from `envelope.data`.
13. `packages/stats/src/api/use-worker-stats-query.ts`: `useQuery({ queryKey: workerStatsKeys.lastInteractedList(params), queryFn: () => fetchWorkerStats(params), placeholderData: (prev) => prev })` (keep previous page during pagination). Read-only; no invalidation logic.

### F. Components

14. `packages/stats/src/components/WorkerStatsCard.tsx` (presentational; `memo`) — layout matching the design:
    - Root: `flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm` with `data-testid={`worker-stats-card-${userId}`}`.
    - Top region (`px-4 pt-4`): row with `Avatar` (name=username, imageSrc=profilePicture) + `username` (`text-lg font-semibold text-foreground truncate`) on the left; `StatePill` (label=stepStateLabel, variant=stepStateVariant) pushed right (`ml-auto`). Omit the pill when `!hasStep`.
    - Middle region: row with `articleLabel` (`text-base font-semibold`, e.g. `#ART-40921`) on the left; on the right a "chip" containing a colored **dot** (bg from a `variant → dot color` map, e.g. active→`bg-[#1f5ea8]`) + the ticker. Ticker: when `ticker` is non-null render `<TickingTimer offsetSeconds={ticker.offsetSeconds} startedAtIso={ticker.startedAtIso} className="font-mono tabular-nums" data-testid={`worker-stats-timer-${userId}`}/>` (live-ticks for working/paused/ended_shift); when `null` render `—`. Omit the whole middle row when `!hasStep`.
    - Footer region: top border (`border-t border-border`), a three-column grid (`grid grid-cols-3 divide-x divide-border`), each cell centered with an uppercase muted label (`WORKING` / `PAUSED` / `COMPLETED`) and a bold value (`workingDisplay` / `pausedDisplay` / `completedCount`). `data-testid`s: `worker-stats-working-${userId}`, `-paused-`, `-completed-`.
    - Add `data-testid` to the card root and each dynamic value for the Playwright pass.
15. (Optional) `WorkerStatsList.tsx` — thin map over view models; or inline the map in the page. Prefer inline to avoid an extra indirection.

### G. Page + surface

16. `packages/stats/src/surface-ids.ts`:
    ```ts
    export const WORKER_STATS_SLIDE_SURFACE_ID = "worker-stats-slide";
    export function preloadWorkerStatsSlideSurface(): Promise<unknown> {
      return import("./pages/WorkerStatsSlidePage");
    }
    ```
17. `packages/stats/src/pages/WorkerStatsSlidePage.tsx`:
    - `useSurfaceHeader()` → `setTitle("Worker stats")`, `setActions(null)` (from `@beyo/hooks`).
    - `useWorkerStatsQuery({ limit, offset })`; accumulate pages OR simple first-page + "load more" (mirror `use-inventory-list` accumulation only if needed; for v1 a single `limit: 50` fetch is acceptable — flag pagination as progressive enhancement).
    - Map `data.workers` → `toWorkerStatsCardViewModel` → render `WorkerStatsCard` list in a scroll container.
    - `PullToRefresh` + `useScrollHide` (from `@beyo/ui`) consistent with existing slide pages; loading skeleton (`32_loading_skeletons.md`) while pending and empty state ("No workers yet") and error state.
    - `data-testid="worker-stats-slide-page"` on the root; `worker-stats-list` on the scroll container.
18. `packages/stats/src/surfaces.ts` (per §14 + `item-categories` reference):
    ```ts
    import { lazy } from "react";
    import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
    import { WORKER_STATS_SLIDE_SURFACE_ID } from "./surface-ids";
    function loadWorkerStatsSlidePage() {
      return import("./pages/WorkerStatsSlidePage").then((m) => ({ default: m.WorkerStatsSlidePage }));
    }
    const workerStatsSlide = lazyWithPreload(loadWorkerStatsSlidePage);
    export const preloadWorkerStatsSurface = workerStatsSlide.preload;
    export const workerStatsSurfaces: SurfaceRegistrations = {
      [WORKER_STATS_SLIDE_SURFACE_ID]: { surface: "slide", component: workerStatsSlide.Component },
    };
    export { loadWorkerStatsSlidePage };
    ```
    Do **not** statically export `WorkerStatsSlidePage` from `index.ts` (§14).

### H. Public API (`packages/stats/src/index.ts`)

19. Export: types (`WorkerStatsCardViewModel`, `ListWorkerStatsParams`, `WorkerStatsResponseSchema`), `workerStatsKeys`, `fetchWorkerStats`, `useWorkerStatsQuery`, `toWorkerStatsCardViewModel`, `secondsToHM`, `WorkerStatsCard`, `workerStatsSurfaces`, `WORKER_STATS_SLIDE_SURFACE_ID`, `preloadWorkerStatsSurface`, `preloadWorkerStatsSlideSurface`, `loadWorkerStatsSlidePage`. (Page component itself only via the loader — §14.)

### I. Managers-app wiring

20. `apps/managers-app/ManagerBeyo-app-managers/package.json` → add `"@beyo/stats": "*"` to dependencies; run `npm install` from `frontend/` root (§12).
21. `apps/managers-app/ManagerBeyo-app-managers/src/index.css` → add `@source "../../../../packages/stats/src";` (§6 step 4 / `14_styling.md §14`). (`@beyo/ui` `@source` already present, so the new `Avatar` primitive is already covered by the existing `packages/ui/src` source line.)
22. `apps/managers-app/ManagerBeyo-app-managers/src/app/surface-registry.ts` → `import { workerStatsSurfaces } from "@beyo/stats";` and spread `...workerStatsSurfaces` into `surfaceRegistry`.
23. **Home trigger (in scope):** in the managers home view (`features/home/**`), add a button that calls `useSurface().open(WORKER_STATS_SLIDE_SURFACE_ID)` and `usePreloadSurface(preloadWorkerStatsSlideSurface)` on hover/mount. Keep label/placement minimal ("Worker stats"). Match the home view's existing button/card styling.

### J. Tests

24. Vitest units: `secondsToHM` (edge cases 0, <1h, exact hours, minutes rounding); `resolveTicker`/`toWorkerStatsCardViewModel` (working/paused/ended_shift/null-step/null-item branches; article vs sku fallback). Add `packages/stats/vitest.config.ts` + root `test:stats` script mirroring `packages/shopify`.
25. Vitest component: `WorkerStatsCard` renders username, state pill, article label, three footer values, live-ticker presence for `working`, and graceful null-step render. `Avatar` renders image / initials / placeholder branches.
26. Playwright (`34_runtime_validation_local.md`): open the slide, assert one card per mocked worker, footer values, and mobile-then-desktop layout.

## Risks and mitigations

- Risk: The nested `last_interacted_step` full shape drifts from the focused schema and Zod strips a field the card later needs.
  Mitigation: Parse only rendered fields now; extend the focused schema when new fields are surfaced. Zod strips unknown keys without throwing, so extra backend fields are non-breaking.
- Risk: Wave 2 `daily_stats` not yet live in all environments → missing object.
  Mitigation: Handoff guarantees the full shape including `daily_stats`; still default counters to `0` and treat `daily_stats` as required-with-zeros. If an environment returns it absent, the schema will throw — add a `.catch`/`.default` on `daily_stats` only if a non-Wave-2 backend must be supported (flag to backend rather than silently defaulting).
- Risk: Introducing a provider/controller layer prematurely.
  Mitigation: Single read-only query with local page state — no `@beyo/stats` provider; keep page-local. Revisit if card actions (deferred) need shared context.
- Risk: §14 code-splitting regression (page pulled into main chunk).
  Mitigation: Loader-function pattern; never static-export the page from `index.ts`; verify no `[INEFFECTIVE_DYNAMIC_IMPORT]` warning at build.
- Risk: Live-ticking all three states diverges from `TaskStepActionButton` and could surprise a reviewer familiar with that component.
  Mitigation: Decision is deliberate and recorded (resolved clarification); logic is isolated in `resolveTicker` so it is a one-function change if reverted.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (adds `tsc -p packages/stats/tsconfig.json --noEmit` to the root `typecheck` script, mirroring the shopify/upholstery entries).
- `npm run test:stats` (new): Vitest units + components pass (`secondsToHM`, DTO/ticker branches, `WorkerStatsCard`, `Avatar`).
- `npm run test:ui`: existing UI suite still green after adding `Avatar`.
- `npx playwright test --grep worker-stats --project=mobile`: slide opens from the home trigger, renders a card per worker, footer/ticker present.
- `npx playwright test --grep worker-stats --project=desktop`: same, desktop layout.
- Manual (`run` skill): launch managers app, open the slide, confirm the card matches the attached design on `bg-card shadow-sm`.

## Review log

- `2026-07-15` `claude`: initial plan drafted from handoff + reference patterns; 3 clarifications raised.
- `2026-07-15` `owner`: clarifications resolved — (1) live-tick all three states, (2) include home trigger, (3) defer batch. No open blockers; plan ready for Codex.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_PLAN_worker_stats_page_20260715.md`
- Archive record: `docs/architecture/archives/ARCHIVE_worker_stats_page_20260715_1518.md`
