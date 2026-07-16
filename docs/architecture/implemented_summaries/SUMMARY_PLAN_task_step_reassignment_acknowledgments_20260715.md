# SUMMARY_task_step_reassignment_acknowledgments_20260715

## Metadata

- Summary ID: `SUMMARY_task_step_reassignment_acknowledgments_20260715`
- Status: `implemented`
- Owner agent: `claude`
- Created at (UTC): `2026-07-15T00:00:00Z`
- Source plan: `docs/architecture/under_construction/implementation/PLAN_task_step_reassignment_acknowledgments_20260715.md`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_task_step_acknowledgments_20260715.md`

## What was implemented

Worker-app shell-level **reassignment acknowledgments panel** (`apps/workers-app`,
`features/task_steps`). When a manager reopens a `ready` task by adding steps, the reassigned worker
sees a single panel above `LastActiveStepCard` listing each obligation: item image, article/sku
identity, truncated reason, and a per-row acknowledge (check) button, plus a header
(`{count} REASSIGNMENTS` + `Acknowledge all`).

- Data layer reuses the existing resume-card `TaskStepSchema` verbatim; the `/pending` item extends
  it with an `acknowledgment` block (`ReassignmentStepSchema`).
- `/seen` fires once per obligation when the panel is genuinely visible (not scroll-hidden / not on a
  hidden route), gated by a de-dupe ref; `/acknowledge` runs per-row `[stepId]` or all ids
  (`Acknowledge all`) with optimistic removal + rollback.
- Panel row-list is capped at three rows and scrolls internally; it shrinks as rows are acknowledged
  and unmounts when empty.
- Reserved constant bottom offset keeps the panel's position whether or not `LastActiveStepCard` is
  present; `LastActiveStepCard` gained a `scrollHideDelayMs` prop (set to 70ms) for the staggered
  scroll fold. Both read the same global `--scroll-hide-progress` var.
- `Acknowledge all` is hidden when `count === 1`.
- Realtime: two dedicated per-worker events refetch the pending query —
  `task:step-acknowledgment-created` and `task:step-acknowledgment-removed` (backend emits `-removed`,
  not `-deleted`).

## Files changed

Created:
- `features/task_steps/api/fetch-pending-acknowledgments.ts`
- `features/task_steps/api/mark-acknowledgments-seen.ts`
- `features/task_steps/api/acknowledge-reassignments.ts`
- `features/task_steps/api/use-pending-acknowledgments.ts`
- `features/task_steps/actions/use-mark-acknowledgments-seen.ts`
- `features/task_steps/actions/use-acknowledge-reassignments.ts`
- `features/task_steps/controllers/use-reassignment-acknowledgments.controller.ts`
- `features/task_steps/providers/ReassignmentAcknowledgmentsProvider.tsx`
- `features/task_steps/components/ReassignmentAcknowledgmentPanel.tsx`
- `tests/playwright/features/task_steps/reassignment-acknowledgments.spec.ts`

Edited:
- `features/task_steps/types.ts`: `Acknowledgment`/`ReassignmentStep` schemas + `toReassignmentAckViewModel`
- `features/task_steps/api/task-step-keys.ts`: `reassignmentAcks()` key
- `features/task_steps/socket-events.ts`: handlers for the two acknowledgment events
- `features/task_steps/index.ts`: public exports (provider, panel, types)
- `features/task_steps/components/LastActiveStepCard.tsx`: `scrollHideDelayMs` prop + transition delay
- `app/AppShell.tsx`: provider wrap + panel render + 70ms stagger
- `packages/realtime/src/lib/socket-types.ts`: two event names on `ServerToClientEvents`

## Contract adherence

- `05_server_state` / `08_hooks`: query hook + optimistic action hooks (cancel/snapshot/rollback/settle)
  mirror `use-transition-step-state.ts`.
- `23_providers`: controller → provider → context shell mirrors `LastActiveStepCardProvider`.
- `24_dto`: DTO schema + `toReassignmentAckViewModel`; reuses `toTaskStepCardViewModel`.
- `36_scroll_visibility`: global `useScrollVisibilityContext()`, inline CSS-var animation, `z-49`
  stacking; verified the var is written on a `display:contents` wrapper around all of AppShell so the
  panel inherits it.
- `21_realtime`: dedicated per-worker events → `invalidateQueries(refetchType: "active")`.

## Validation evidence

- `npm run typecheck`: **PASS** for touched projects — `managerbeyo-app-workers` and
  `packages/realtime` compile clean. (Unrelated pre-existing errors exist in `managerbeyo-app-sellers`
  node_modules: `@dnd-kit` JSX namespace + vitest/vite type conflict — not touched here.)
- Lint (changed files): new files clean. The provider triggers `react-refresh/only-export-components`
  and the controller triggers `react-hooks/refs` — **both are pre-existing repo-wide conventions**
  (the sibling `LastActiveStepCardProvider` and `use-last-active-step-card.controller` trip the exact
  same rules). No new violation categories introduced.
- `npx playwright test --project=mobile`: **spec written and discovered (3 tests), but could not be
  run green in this environment** — sign-in fails at baseline here (the existing
  `cases-unread-badge.spec.ts` fails identically at the shared `toHaveURL("/")` step against the
  running dev server's backend). Environmental (backend/credentials), not a code regression. The spec
  follows the repo's real-backend + defensive-skip convention.
- `npx playwright test --project=desktop`: not run (same environmental blocker).

## Known gaps or deferred items

- **E2E not validated green** in this environment due to the pre-existing sign-in failure. Needs a run
  against a backend where the `.env.test` credentials authenticate, with a worker that has pending
  reassignments (otherwise the spec self-skips).
- Unit/component tests: the workers app has **no vitest harness** (vitest is package-only in this
  repo); Playwright is the app's validation gate, consistent with existing features.

## Lifecycle transition

- Current state: `implemented` (summarized)
- Next state: `archived` — **held** pending a green e2e run; do not archive until the Playwright gate
  passes against a working backend.
