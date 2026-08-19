---
plan: PLAN_production_time_widget_20260818
role: implement
round: 1
state: implemented
date: 2026-08-18
actor: Codex
---

# Production time widget — Track B implementation handoff

Date: 2026-08-18  
Implementer: Codex  
Plan: `PLAN_production_time_widget_20260818.md`, Track B

## Outcome

Track B's twelve build steps are implemented. The production-time endpoint is parsed at the API
boundary, transformed into the approved Track A view-model seam, mounted in both task-detail
pages, exported from `@beyo/item-economics`, styled and registered in managers/workers/sellers,
and invalidated by both production-time socket events.

The socket collision discovered during app wiring is resolved through the owner-approved
`composeSocketHandlers` helper. Shared event handlers execute in map order; singleton handlers
retain their original function reference; undefined values are skipped.

## Verification

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit` — pass.
- `npx tsc -p packages/realtime/tsconfig.json --noEmit` — pass.
- `npm run typecheck` — pass across all apps and packages.
- `npm run test:item-economics` — 77/77 pass, including all 46 tests that existed before Track B.
- `npm run test:realtime` — 5/5 pass.
- Workers `npm run test:unit` — 29/29 pass.
- `production-time.spec.ts` — pass in both mobile and desktop Playwright projects.
- Full mobile project — non-zero: 24 passed, 8 skipped, 3 unrelated failures.
- Full desktop project — non-zero: 24 passed, 8 skipped, 3 unrelated failures.
- `git diff --check` — pass.
- The recorded Track A seam hashes remained unchanged.

The three unchanged full-project failures in both viewports are:

1. `auth.spec.ts`: `tab-settings` is absent from the bottom tab bar.
2. `reassigned-steps-live.spec.ts`: `reassigned-steps-list` is not visible.
3. `presentation-player.spec.ts`: `presentation-player-viewport` remains mounted after the final
   action.

Forced-trace reruns captured a `trace.zip` for each failure and viewport in the workers app's
ignored `test-results` directory. No failing test was modified.

## What the browser test proves

`production-time.spec.ts` stubs the production-time endpoint with `page.route`. Its green result
proves frontend wiring, card rendering, payload order, reassignment display, snapshot-label
fallback, and mount position above the flow timeline. The endpoint is not deployed, so no live
production-time response or backend schema compatibility has been rendered or verified.

## Contract and plan notes

- `ApiRequestError` is the real thrown API-client class; the original plan's `ApiError` name was
  corrected before implementation.
- The plan's step 9 filename still says `compose-socket-handlers.ts`; the owner's explicit
  follow-up required `socket-compose.ts`, matching the package's `socket-*` siblings.
- `architecture/21_realtime.md` does not define collision-safe registry composition. Per owner
  instruction it was not edited; the gap is recorded in the plan's Review log for later foldback.
- Realtime's package typecheck needed `skipLibCheck`, matching item-economics, because importing
  Vitest tests under `src` exposes incompatible declarations from the installed nested Vite
  versions. Project source and test code remain strictly checked.
- No architecture graph or phase tracker exists for this implementation folder. No mutation
  probes were enumerated by the plan.

## Write perimeter

Production-time package:

- `packages/item-economics/package.json`
- `packages/item-economics/src/types.ts`
- `packages/item-economics/src/api/item-economics-keys.ts`
- `packages/item-economics/src/api/fetch-task-production-time.ts`
- `packages/item-economics/src/api/use-task-production-time-query.ts`
- `packages/item-economics/src/hooks/use-production-time-clock.ts`
- `packages/item-economics/src/hooks/use-production-time-clock.test.tsx`
- `packages/item-economics/src/lib/production-time-dto.ts`
- `packages/item-economics/src/lib/production-time-dto.test.ts`
- `packages/item-economics/src/controllers/use-production-time.controller.ts`
- `packages/item-economics/src/components/production-time/ProductionTimeSection.tsx`
- `packages/item-economics/src/components/production-time/ProductionTimeSection.test.tsx`
- `packages/item-economics/src/socket-events.ts`
- `packages/item-economics/src/socket-events.test.ts`
- `packages/item-economics/src/index.ts`

Realtime composition:

- `packages/realtime/src/lib/socket-types.ts`
- `packages/realtime/src/lib/socket-compose.ts`
- `packages/realtime/src/lib/socket-compose.test.ts`
- `packages/realtime/src/index.ts`
- `packages/realtime/tsconfig.json`
- `packages/realtime/vitest.config.ts`

Mounting and app wiring:

- `packages/tasks/package.json`
- `packages/tasks/src/pages/TaskDetailSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/task_steps/TaskDetailSlidePage.tsx`
- `apps/workers-app/ManagerBeyo-app-workers/tests/playwright/features/task_steps/production-time.spec.ts`
- `apps/workers-app/ManagerBeyo-app-workers/playwright.config.ts`
- each managers/workers/sellers `package.json`, `src/index.css`, and `src/app/socket-registry.ts`
- root `package.json` and `package-lock.json`
- the Track B plan Review log and this handoff

The Playwright verifier also rewrote the tracked generated
`apps/workers-app/ManagerBeyo-app-workers/playwright-report/index.html`; it is a test artifact, not
production source. Other concurrent item-pricing worktree changes were not touched.

## Remaining verification

- Render and parse a real response once
  `GET /api/v1/item-economics/tasks/{task_client_id}/production-time` is deployed.
- Manually compare this widget and the future worker task-step card for identical server-provided
  `share_state` on the same section.
- Resolve or formally baseline the three unrelated workers Playwright failures before claiming
  both complete projects green.
