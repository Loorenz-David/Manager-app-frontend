---
plan: PLAN_production_time_widget_20260818
role: implementer
round: 3
date: 2026-08-19
---

# Fix prompt — Production time widget, review round 1 findings

Copy everything below the line into the implementer session.

---

You are fixing review findings on the **Production time widget** in the ManagerBeyo frontend
monorepo (`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`).

## Review history — what is already settled

Round 1 returned `CHANGES_REQUESTED`: 0 blocking, 4 should-fix, 10 notes. The full report is
`docs/architecture/under_construction/implementation/production_time/handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_1.md`.
Read it and the plan
(`docs/architecture/under_construction/implementation/production_time/plans/PLAN_production_time_widget_20260818.md`)
before starting.

**Do not re-open settled ground.** The reviewer independently re-derived and confirmed correct:
the response contract, the live-tick anchor, the 404 rule, `composeSocketHandlers` under
composition (mutation-tested), the no-client-verdict guarantee, criteria 1–11 and 13, and the
`02_types` / `04_api_client` / `05_server_state` / `24_dto` / `32_loading_skeletons` /
`35_shared_packages` contract checks. Leave all of it alone.

**F1 is dismissed, not deferred.** The owner confirmed no task can be created without an item
(verified across all four form schemas), so the `detached` copy stays exactly as written. Do not
touch `ProductionTimeUnavailableCard.tsx`.

**Live verification since the review, on the owner's running backend:** the endpoint is deployed;
25 real tasks were fetched and all 25 parse clean against `TaskProductionTimeSchema`. Both
Playwright projects pass. Nothing in this fix cycle is speculative.

## Scope — eight items, nothing else

### F2 — the degraded frame never truncates · should-fix

`ProductionTimeNoBudgetCard.tsx:58` renders `card.rows.map(...)`: every row, no
`selectVisibleRows`, no toggle. Only `ProductionTimeBudgetBody` truncates.

This is the live-data one. Of 25 real tasks on the dev backend, **7 carry more than four
sections** (up to seven) and **every one is `item_unvalued`** — so every one routes to the
degraded frame. Today those render six or seven rows above the flow timeline.

Fix: give the degraded frame the same truncation as the budget frame — `selectVisibleRows` plus
`ProductionTimeRowsToggle`, with its own `isExpanded` state. Mirror
`ProductionTimeBudgetBody` (`ProductionTimeCard.tsx:24–56`); do not lift shared state between the
two bodies, they are separate branches.

Criterion 12 has been amended to bind both frames explicitly — read it.

### N2 — a toggle that does nothing · fold into F2

`ProductionTimeCard.tsx:32` derives `isTruncatable` from `card.rows.length >
PRODUCTION_TIME_COLLAPSED_ROW_COUNT`, while visibility comes from `selectVisibleRows`, which also
rescues the active row. With exactly five rows whose active row is last, all five are already
visible and the card still offers "Show all 5 stages" — pressing it changes nothing.

Fix: derive the flag from `visibleRows.length < card.rows.length` in **both** bodies. Add a test
for the five-rows-with-last-row-active case; it is the one the current table misses.

### F3 — `stateToTone` is sampled, and a deleted case arm survives the suite · should-fix

`production-time-view-model.test.ts:209` asserts five of nine states. The reviewer deleted
`case "paused":` from the switch (`production-time-view-model.ts:317`) and **all 108 tests stayed
green** — every paused section silently demotes from the warning tone to neutral, changing its
swatch and its state pill, with nothing to catch it.

Fix: one `it.each` row per state, all nine — `pending`, `working`, `paused`, `blocked`,
`completed`, `failed`, `skipped`, `cancelled`, `ended_shift` — each asserting its one exact tone.
Same treatment for `humanizeSectionState`, which asserts one value of nine. New criterion 5a
records this.

Then re-run the reviewer's probe yourself: delete `case "paused":`, confirm the suite now fails,
restore it. A test you have not seen fail proves nothing.

### N4 — the footer names the wrong stages · should-fix in substance

`pendingLabels` (`production-time-dto.ts:148`) selects on `tone === "pending" || tone === "paused"`.
`stateToTone` maps **`skipped` and `cancelled` to `pending`**, so a section with one cancelled
pass and one completed pass — not `excluded`, since not every step ended skipped/cancelled/failed
— gets named as a stage the remaining time is "left for". Meanwhile `blocked` and `failed` map to
`blocked` and are never named, though blocked work is unfinished.

The plan's §Footer note specifies "paused or not yet started".

Fix: select on the section's **state**, not on its display tone. Tone is a presentation concern
and is lossy by design — nine states collapse into six tones. Add a test with a
cancelled-plus-completed section asserting it is *not* named, and one with a blocked section
asserting it *is*.

### F4 — `21_realtime.md` and the three registries disagree · should-fix

`architecture/21_realtime.md` §App-level assembly (lines 149–180) documents the registry as an
object spread of feature maps. All three shipped registries now use `composeSocketHandlers(...)`.
An agent following the contract today re-creates the silent-drop bug this phase existed to fix.

**The owner approved amending the contract now.** Add a lettered section — `§App-level assembly A`
— beside the existing one, inserted **without renumbering anything**, documenting:

- `composeSocketHandlers(...maps)` as the app-level assembly mechanism;
- same key in more than one map → every handler runs, in the order the maps were passed;
- a key claimed by exactly one map is returned by identity, with no wrapper;
- an inline handler entry must be passed as a final object-literal argument, or it will not
  compose.

Keep the existing section intact; this is additive.

### N5 — criterion 11's registry half is untested · should-fix in substance

`socket-compose.test.ts` proves composition with shaped stand-ins, and `socket-events.test.ts`
proves the handler invalidates the right key. **Nothing asserts that the three app registries
still compose rather than spread** — the exact regression this phase was created to prevent, and
the one a future refactor is most likely to undo silently.

Fix: one assertion per app that `socketRegistry["task:step-state-changed"]` is neither of the two
source handlers by identity. Put each in its own app's test suite, not in the package.

### N7 — `infeasible` is untested

The ten branch-B statuses are enumerated at `production-time-dto.test.ts:248`; `infeasible` — the
only branch-A status other than `ok` — has no row. The reviewer hand-traced it as correct:
headline "2h 55m of 0m", overrun in the danger tone, footer "…over the production budget". Add
the row so it stays that way.

### N8 — stale text

`packages/item-economics/src/index.ts:39–42` still says the logic track "adds
`ProductionTimeSection` … once they exist", directly above the line that exports it. Delete or
rewrite that clause.

The plan's half of N8 is already fixed — §Track B step 9 now names `socket-compose.ts`. Do not
edit the plan.

## Explicitly out of scope

Deferred to a maintenance phase by owner decision. Do **not** touch them in this cycle; touching
them is an automatic finding at re-review:

- **N1** — `use-production-time-clock.ts` failing `react-hooks/set-state-in-effect`. The correct
  fix is a `useSyncExternalStore` clock that keeps the `enabled` gate and the 30s period, which
  also fixes `packages/stats/src/hooks/use-current-minute.ts`. That belongs to a shared-hooks
  phase.
- **N3** — the fixtures re-implementing `toProductionTimeViewModel`.
- **N6** — `@rolldown/binding-darwin-arm64` and `lightningcss-darwin-arm64` in root
  `dependencies`, which breaks `npm ci` off darwin-arm64. Repo-wide, not this widget.
- **N9** — `isPending` vs `isLoading` on an empty `taskId`; shared with `TaskFlowTimeline`.

## Allowed write perimeter

The re-review runs a **verified perimeter** check: any file changed outside this list is an
automatic finding, whatever its merit.

- `packages/item-economics/src/components/production-time/ProductionTimeCard.tsx`
- `packages/item-economics/src/components/production-time/ProductionTimeNoBudgetCard.tsx`
- `packages/item-economics/src/lib/production-time-dto.ts`
- `packages/item-economics/src/index.ts`
- `architecture/21_realtime.md`
- Tests: `production-time-view-model.test.ts`, `production-time-dto.test.ts`,
  `ProductionTimeCard.test.tsx`, and one test file per app for N5.

If a fix appears to need a file outside this list, **stop and say so** rather than widening it
yourself. Stopping to ask has been the right call three times on this plan already.

## Verification

Run these and report actual counts, not the ones you expect:

- `npm run typecheck`
- `npm run test:item-economics`
- `npm run test:realtime`
- the three apps' unit suites, for N5
- ESLint on every file you touched. One pre-existing error inside this perimeter is known and
  out of scope: `use-production-time-clock.ts:12` (N1).

**The owner's servers and backend are running** (workers on 5174, backend on
`192.168.1.246:8000`), so the browser check is available to you this round. Run it and report the
result:

```
cd apps/workers-app/ManagerBeyo-app-workers
PLAYWRIGHT_REUSE_SERVER=true npx playwright test production-time --project=mobile --project=desktop
```

**Do not start any dev server yourself** — the owner starts them and keeps control. If a server is
down, say so and stop.

Three pre-existing failures elsewhere in the Playwright suite are known and unrelated: the
expected settings tab is absent, the live reassigned list does not render, the presentation
viewport does not close.

## Commit

Commit when the fixes reach `IMPLEMENTED`, subject prefixed `CHECKPOINT (not approved):`, on the
current branch `pipeline/item-economics-phase-1`. This is a standing authorization for the fix
cycle — do not stop to ask.

**The baseline for the perimeter check is `6eb58482`, not the checkpoint `02ad6d01`.** An unrelated
schema fix landed between them (`total_cost_minor` removed from the task-step schemas — the
backend stopped sending it and the workers app's working-section list rendered nothing). It is not
part of this cycle and must not be reverted or extended. Diff against `6eb58482`; your changes must
contain only the perimeter above.

## Close

Deposit your report as
`docs/architecture/under_construction/implementation/production_time/handoffs/implementer/handoff_PLAN_production_time_widget_20260818_implement_2.md`
with frontmatter `plan`, `role: implement`, `round: 3`, `state: implemented`, `date`, `actor`, and
a section declaring your **full write perimeter** — documents, code, and any tool-recorded state.
Declare every mutation probe you ran and reverted; an undeclared fresh mtime is a signal at
re-review, a declared one is not.

Address each of the eight items by id (F2, N2, F3, N4, F4, N5, N7, N8) and say plainly if you did
not do one.

Any owner decision goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision cards:
**Question** (one line, answerable yes/no or by naming an option), **Story** (2–4 sentences of
lived scenario, no artifact citations), **Branches** (each answer with its lived consequence).
