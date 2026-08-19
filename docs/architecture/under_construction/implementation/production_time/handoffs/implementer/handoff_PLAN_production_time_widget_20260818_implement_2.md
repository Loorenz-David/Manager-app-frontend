---
plan: PLAN_production_time_widget_20260818
role: implement
round: 3
state: implemented
date: 2026-08-19
actor: Codex
---

# Production time widget — fix round 3 implementation handoff

## Outcome

All eight requested review items are implemented within the authorized perimeter. Budget and
degraded cards now share the same presentation-only truncation behavior, footer stage names come
from unfinished domain states rather than lossy display tones, all nine step states have exact
behavior coverage, and each shipped app has a regression test for collision-safe registry
composition.

## Review items

- **F2 — done.** `ProductionTimeNoBudgetCard` now owns independent expansion state, uses
  `selectVisibleRows`, renders the shared rows toggle only when rows are hidden, and expands back
  to the complete degraded pipeline.
- **N2 — done.** Both budget and no-budget branches derive truncatability by comparing the
  collapsed selection with the complete row list. A five-row pipeline whose last row is active
  shows all five rows and no dead toggle in either branch.
- **F3 — done.** `stateToTone` and `humanizeSectionState` are asserted for all nine states:
  pending, working, paused, blocked, completed, failed, skipped, cancelled, and ended_shift.
  Unknown/null fallback coverage remains.
- **N4 — done.** Footer labels now select explicit unfinished states (`pending`, `paused`,
  `ended_shift`, `blocked`, and `failed`) from DTO sections. Cancelled terminal work is not named;
  blocked work is named.
- **F4 — done.** `architecture/21_realtime.md` retains the existing assembly section and adds a
  collision-safe `composeSocketHandlers(...maps)` section covering ordered shared-key execution,
  singleton identity, and final inline-map composition.
- **N5 — done.** Managers, workers, and sellers each assert that their composed
  `task:step-state-changed` registry handler is neither source handler by identity. The tests use
  the real composition helper with isolated feature maps, avoiding app runtime-environment
  initialization during unit-test collection.
- **N7 — done.** An explicit `infeasible` DTO test locks the zero-budget result: `2h 55m of 0m`,
  `2h 55m over`, danger state, zero remainder, and the over-budget footer.
- **N8 — done.** The stale package-barrel comment no longer describes already-existing exports as
  future work.

## Verification

- `npm run typecheck` — pass.
- `npm run test:item-economics` — 9 files, 131/131 tests pass.
- `npm run test:realtime` — 1 file, 5/5 tests pass.
- Managers unit suite — 23 files, 81/81 tests pass.
- Workers unit suite — 7 files, 30/30 tests pass.
- Sellers unit suite — 2 files, 3/3 tests pass.
- ESLint on every changed TypeScript/TSX file — pass with no findings.
- `git diff --check` — pass.
- Workers server preflight at `http://localhost:5174` — HTTP 200; no server was started.
- `PLAYWRIGHT_REUSE_SERVER=true npx playwright test production-time --project=mobile
  --project=desktop` — 2/2 pass. The sandboxed first attempt could not launch WebKit or Chromium;
  the identical command passed after browser-launch permission was granted.

## Mutation probe

The required probe temporarily removed only `case "paused":` from
`packages/item-economics/src/lib/production-time-view-model.ts`. The focused view-model suite then
failed exactly one test: paused received the pending tone instead of paused (40 passed, 1 failed).
The case was restored, the focused suite returned to 41/41 passing, and the file's SHA-256 before
and after the probe was identical:
`06af4b266b1523f744050878ba7ffa6ae88335171e5a7c857d0460201237740b`.
The probe file has no final diff.

## Full write perimeter

Production and architecture files:

- `packages/item-economics/src/components/production-time/ProductionTimeCard.tsx`
- `packages/item-economics/src/components/production-time/ProductionTimeNoBudgetCard.tsx`
- `packages/item-economics/src/lib/production-time-dto.ts`
- `packages/item-economics/src/index.ts`
- `architecture/21_realtime.md`

Test files:

- `packages/item-economics/src/components/production-time/ProductionTimeCard.test.tsx`
- `packages/item-economics/src/lib/production-time-dto.test.ts`
- `packages/item-economics/src/lib/production-time-view-model.test.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/app/socket-registry.test.ts`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/socket-registry.test.ts`
- `apps/selleres-app/ManagerBeyo-app-sellers/src/app/socket-registry.test.ts`

Closing artifact:

- `docs/architecture/under_construction/implementation/production_time/handoffs/implementer/handoff_PLAN_production_time_widget_20260818_implement_2.md`

Tool-recorded and reverted state:

- The mutation probe touched `production-time-view-model.ts` temporarily and was fully reverted,
  as verified by checksum and an empty file diff.
- Playwright updated the ignored workers `test-results/.last-run.json` and rewrote the tracked
  `playwright-report/index.html`; the tracked report was restored to `HEAD` after verification and
  has no final diff.

The round-3 prompt already differed from perimeter baseline `6eb58482` at session start and was
treated as immutable input provenance. This cycle did not edit the prompt, the plan, the known N1
clock issue, or any other out-of-scope file.

## ⚠ OWNER DECISIONS REQUIRED (0)

None.
