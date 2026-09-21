# Stock Report — logic and wiring phase (session 2 of 2)

You are implementing **everything except the visual design** of a new feature: data, state, realtime,
permissions, surfaces, the task-creation seam and the integration into three apps. A previous session
already built the UI as pure, prop-driven components. Plan first (produce a plan for this whole
phase and get it approved), then execute it.

Repo root: `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`
Feature folder: `docs/architecture/under_construction/implementation/stock_report/`
Backend source (read-only reference): `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/backend/app`

## The goal

The authority is **`planning/intention.md` (status RATIFIED)**. Deliver it completely, so that the
seven outcomes in its measurement ledger (§11, M1–M7) are true and proven by tests.

How to read it: §12A and **§12B are later amendments and win** over earlier sections where they
differ. §12B is an audit against this repo's architecture contracts with file:line evidence — it is
your most precise guide to *how*; treat each row B1–B24 as a requirement. §13 lists the mechanisms
most likely to fail silently; give them the most care and the most tests.

## Read first, in this order

1. `planning/intention.md` — all of it.
2. `handoffs/UI_PHASE_HANDOFF.md` — the UI session's inventory: components, prop types, callbacks,
   `data-testid`s, fixtures, and the temporary preview you must remove. **If this file is missing or
   the components it lists do not exist, stop and report — do not build UI yourself.**
3. `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_api_20260921.md` and
   `backend_handoff/HANDOFF_TO_FRONTEND_stock_report_match_preview_v2_20260921.md`. Check the folder
   for any later-dated handoff superseding them. Respect their tiers: build against STABLE / FIXED /
   RATIFIED; build the shape of PROVISIONAL; **never guess NOT PINNED / OPEN** — nullability in
   particular (intention §8.1: every non-identifier field is parsed nullish, with display defaults in
   the mapper).
4. `task_system/frontend_contract_goal_mapping_guide.md`, then the contracts it routes to — core set,
   New feature (CRUD), Auth + permissions, Real-time, UI surfaces, Performance/dynamic loading,
   Runtime validation, and the additions named in §12B B22 — each with its `_local` companion.
   **Pattern-authority rule:** contracts tell you how to write code; open implementation files only to
   learn what exists. Contract examples use an `Invoice` domain — never copy their names.
5. Existing code you extend or integrate with (read for what exists): `packages/api-client`,
   `packages/lib/src/types/api.ts`, `packages/realtime/src/lib/socket-types.ts` and
   `socket-registry-types.ts`, `packages/ui` `SurfaceProvider.tsx` + `BottomSheetSurface.tsx`,
   `packages/tasks` (task detail page, provider, flow, `surface-ids.ts`), `packages/task-creation`
   (both internal forms, their slide pages, `surfaces.ts`, `lib/item-lookup-prefill.ts`,
   `hooks/use-lookup-item-images.ts`), `packages/items` lookup, and each app's `routes.ts`,
   `router.tsx`, `primary-tab-preload.ts`, `BottomTabBar.tsx`, `MoreTabsPopup.tsx`,
   `surface-registry.ts`, `socket-registry.ts`, `index.css`, `package.json`.

## Assumptions the owner has fixed — build on them, do not re-litigate

- Each stock row's `item_category` block includes `image_url` (the owner is arranging it with the
  backend). It is nullish like everything else; absent → placeholder.
- The backend is not finished. Build and test against mocks derived from the two handoffs; do not
  wait for a server.
- Match-preview response field names and whether the standard envelope wraps it are still open on the
  backend: one schema + one mapper for that call, and a parser that accepts both the wrapped and the
  bare body.

## What you build (suggested order — each step leaves the repo green)

1. **Shared-package extensions**
   - `@beyo/api-client` + `@beyo/lib`: `ApiRequestError` gains optional `serverCode` and
     `details: unknown` populated from the error body; `code` keeps its status-derived meaning.
     Amend `architecture/04_api_client_local.md`. Add the missing 403 `{detail}` regression test. (B1, B2)
   - `@beyo/ui`: a general **`dismissible: false` option on the surface open call** (off by default).
     A surface opened with it cannot be closed by swipe, backdrop tap, Escape **or browser/hardware
     Back** — Back is neutralised by re-pushing the surface's history entry in the popstate handler
     when the topmost surface is locked (mind `consumePendingProgrammaticPop`); it closes only
     programmatically. Follow `33_vaul_drawer.md`; cover it in `test:ui`, including that unlocked
     surfaces behave exactly as before (B7).
   - `@beyo/realtime`: add the six stock events to `ServerToClientEvents` with their **flat**
     payloads (B4).
   - `@beyo/tasks` is **not modified** in this phase (B8 — the worker task-detail view is deferred).
2. **`@beyo/stock-report` logic**, in the contract's bottom-up order: `types.ts` (tolerant schemas,
   `as const` enums, DTO → view model mappers, the criteria → tag-text rule of §4.1, the bar mapping
   of §4.3, the documented no-`client_id` create exception) → query keys → API functions (envelope,
   `details` parsing at this boundary) → query hooks (one list query per bucket; Unset **omits** the
   `priority` parameter; never request "all") → actions (set priority, reorder, create assignment,
   remove assignment, match preview as an action hook — B15, B16) → `permissions.ts` +
   `lib/use-stock-report-permissions.ts` (B9) → controllers and providers (board: bucket, opening-bucket
   rule decided once at open, reorganise mode that survives a trip into the detail, frozen snapshot
   while dragging, drag disabled while a reorder is pending; detail: resolve the instance from any
   cached bucket list, close only on `:deleted` or an assignments 404 — B5, B6) → `socket-events.ts`
   (handlers only write or invalidate cache; Zod-parse payloads; move-not-drop on priority change) →
   surface pages wrapping the UI session's sheet/page content, `surface-ids.ts` with prop types and
   `XxxSurfaceOpeners`, loaders in `index.ts` (35 §13–14), preload + prefetch exports (B11) →
   `route-entry` for the tab page.
   Map your view models onto the UI session's prop types. **Do not restyle their components.** If a
   prop is missing for something the intention requires, add the prop minimally and note it; if the
   gap is visual, report it instead of patching around it.
3. **Task-creation seam** (§8.4, §8.5, §12A, B12–B15, B23): a generic, stock-agnostic seam on
   `@beyo/task-creation` — injected gate (`check`, optional `preload`, status slot), async
   `afterCreate` returning `'close' | 'reset-stay'`, and the "Add another / Done" prompt — supported by
   **both** `InternalTaskSlidePage` and `WorkerInternalTaskSlidePage` (the latter reads no surface props
   today). `@beyo/task-creation` must never import `@beyo/stock-report`. Stock-report exports
   `useStockAssignmentGate` composing preview + sheet opener + accepted-override state; the app only
   supplies the opener. Gate enforcement lives in `onBeforeAdvance` / `onSubmit`. *Change item* clears
   exactly the lookup-written fields via a per-field last-injected map; `major_category` is never
   cleared in the worker form; the worker form adopts `use-lookup-item-images`. Preview input:
   `task_id: null`, one identifier at most, purchase-API lookup `properties` unchanged (else `{}`),
   `quantity ?? 1`. The override accepted in the sheet goes on the **first** create call; the 409 and
   422 paths stay complete as fallbacks; a failed assignment after a created task is reported
   truthfully and the task is kept.
4. **App integration — managers, sellers, workers** (B20): remove the UI session's temporary preview;
   the tab edits (workers has a seventh), label "Stock needs", thin page with `Suspense` +
   `PageSkeleton`, `@beyo/stock-report` dependency, `@source`, surface registrations, socket-registry
   composition (+ its test), `surfaceOpeners` assembled in the app (`openTaskDetail`,
   `openImageViewer`, this page's actions sheet, the match sheet), `@dnd-kit/*` added to the sellers
   app. **Workers app: do not register the `@beyo/tasks` task detail and inject no `openTaskDetail`**
   — a worker's tap on a card body does nothing in this build (B8); the image tap and this page's ⋮
   work. The match sheet is opened with `dismissible: false`.
5. **Tests** (B24, `17_testing`, `34_runtime_validation` + `_local`): Vitest with MSW v2 for every
   action, mapper, handler and controller rule above; M6 (realtime convergence) is proven in Vitest,
   not Playwright. Playwright specs per app under `tests/playwright/features/stock_report/`, mobile
   project first, `page.route` mocks, 403 mocked as `{detail}`, `tap()` inside `PullToRefresh`,
   remembering the 60 s `staleTime` when asserting requests. Organise tests so each traces to one of
   M1–M7 and asserts an outcome at a public boundary (a request sent, cache state, rendered result) —
   never internal call counts or private helpers. For every guard ("cannot drag in Unset", "workers
   never see Unset", "a worker's card-body tap opens nothing", "a locked sheet survives Back", "a stale
   preview never decides") prove the
   test can fail: plant the defect once, watch it go red, revert.

## Boundaries

- Packages never call `openSurface` for surfaces they do not own — openers are injected by the app
  (35 §13). Page components are exported only through `loadXxx()` loaders (35 §14).
- Components never read the role, never import from the logic layer; they consume context.
- The frontend never computes a properties signature, never decides a match, never sends
  `priority_order` for a row the user did not move, never parses or switches on the backend's `error`
  text.
- Out of scope (intention §10): working search/filter/sort, deleting a stock need, consistency and
  repair screens, assigning an existing task, history, pagination, the workers' main task page,
  migrating the two existing FABs, tightening schemas before the backend's final handoff.
- Never start a dev server — ask the owner. After any `npm install`, "Cannot find native binding"
  is the known rolldown/lightningcss lockfile issue: report it.
- The managers e2e suite has a known red baseline (~55 failing specs unrelated to this work): compare
  the *set* of failing specs before and after, do not chase the baseline.

## Done means

1. M1–M7 each have passing tests you can name; the guards above have been shown able to fail.
2. From the repo root: `npm run typecheck`, `test:stock-report`, `test:ui`, `test:tasks`
   (unchanged package — regression only), `test:task-creation`, `test:api-client`, `test:realtime` pass, and each app builds. Playwright
   mobile then desktop for the new specs in all three apps. Report real output; if anything fails or
   was skipped, say so plainly.
3. Managers' and sellers' existing task detail, task creation and FAB behave exactly as before.
4. You write `handoffs/LOGIC_PHASE_HANDOFF.md`: what was built, every deviation from the intention
   or a contract with its reason, every assumption still waiting on the backend (nullability,
   `image_url`, match-preview names/envelope) and the single file to change when each lands, and the
   list of files touched outside `packages/stock-report`.
5. No commit unless the owner asks.
