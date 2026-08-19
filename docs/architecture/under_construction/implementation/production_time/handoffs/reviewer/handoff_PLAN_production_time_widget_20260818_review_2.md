---
plan: PLAN_production_time_widget_20260818
role: review
round: 2
verdict: CHANGES_REQUESTED
date: 2026-08-19
actor: Claude Opus 5 (1M context)
---

# Production time widget — review round 2 (re-review of fix round 3)

Delta-scoped re-review per the charter's review protocol: verified perimeter first, then full
adversarial depth on the changed seam, bounded regression on dependents, settled areas untouched.

## Review history

Round 1 returned `CHANGES_REQUESTED` — 0 blocking, 4 should-fix, 10 notes. Settled there and not
re-verified here: the response contract (re-derived field-by-field against the backend
serializer), the live-tick anchor, the 404 rule, `composeSocketHandlers` under composition,
the no-client-verdict guarantee, criteria 1–11 and 13, and the `02_types` / `04_api_client` /
`05_server_state` / `24_dto` / `32_loading_skeletons` / `35_shared_packages` checks. F1 was
dismissed by the owner on evidence. N1, N3, N6 and N9 are deferred to a maintenance phase and are
not re-raised.

**All eight items in scope this cycle — F2, N2, F3, N4, F4, N5, N7, N8 — are resolved.** I
re-derived each rather than accepting the report, including mutation probes on the three the
prompt named.

**Verdict: `CHANGES_REQUESTED`** — one should-fix, four notes. The single item is the one the plan
itself routed to this review as an open probe: `failed` in `isUnfinishedSectionState`. I have
answered it — it is reachable, it is terminal by the backend's own definition, and naming it
contradicts three separate authorities — but which way it resolves is one owner sentence, and
either way it needs a test, because removing it today changes nothing in a 131-test suite. That is
a one-item fix cycle, not a re-opening of the phase.

## ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — should a failed stage be named as remaining work?

**Question.** When a stage was completed once, re-run, and the re-run failed, should the footer
still say the remaining time is "left for" that stage?

**Story.** Sanding is finished on a chest of drawers. The chest comes back, sanding is assigned a
second time, and that pass is marked failed. Nobody has scheduled a third pass — there is no open
step for anyone to start. A manager opening the task reads "20m left for sanding" under the
budget bar and goes looking for who is meant to be sanding. Cancelled and skipped stages are
already left out of that sentence for exactly this reason; failed is the one terminal outcome
still in it.

**Branches.**
- Drop it: the sentence names only stages someone can actually still work — matches how cancelled
  and skipped are already treated.
- Keep it: a failed stage reads as unfinished business needing a redo, and the plan's rule gets
  reworded from "not yet terminal" to say so explicitly.

**Recommendation.** Drop it — three authorities already treat failed as terminal, and keeping it
means the same sentence names failed work but hides cancelled work, which no reader can predict.

**On silence.** The gate holds; nothing ships either way, because the behaviour is untested in
both directions.

**Trace.** Finding G1; plan §Footer note (amended, carrying the open question) and §Decisions.

## Verified perimeter

```
git diff --stat 87069073 0f11125e   →  12 files, 543 insertions, 27 deletions
```

Eleven declared files plus the implementer handoff. **Every changed file is inside the authorized
perimeter, and every authorized file that changed was declared.** Nothing outside.

- The `PROMPT_fix_round_3_20260819.md` change that appears in `git diff 6eb58482 0f11125e` is
  commit `87069073`, the coordinator's baseline repoint — it sits between the stated baseline and
  the fix commit, not inside it. Diffing `87069073..0f11125e` isolates the cycle cleanly.
- `6eb58482` (`total_cost_minor` dropped from the task-step schemas) touches nine files, none of
  them under `packages/item-economics`, `packages/realtime`, the registries or the mount sites —
  confirmed unrelated, correctly excluded.
- `production-time-fixtures.ts` is imported by the new card tests but is **unchanged** since the
  original checkpoint (`git diff 6eb58482 HEAD` on that path is empty) — `productionTimeFiveStageFixture`
  already existed. No silent widening.
- The plan amendments (criterion 12, criterion 5a, §Footer note) are in `1b015832`, the
  coordinator's foldback, not in the implementer's commit. The fix cycle did not edit the plan, as
  instructed.
- Working tree clean at review start and at review end.

## Verification actually run

Re-measured in this session:

| Command | Result |
|---|---|
| `npm run typecheck` | **exit 0** |
| `npm run test:item-economics` | **131 passed / 131**, 9 files (was 108) |
| `npm run test:realtime` | **5 passed / 5** |
| managers `npm run test:unit` | **81 passed / 81**, 23 files |
| workers `npm run test:unit` | **30 passed / 30**, 7 files |
| sellers `npm run test:unit` | **3 passed / 3**, 2 files |
| ESLint, all 10 changed `.ts`/`.tsx` files | **clean, zero findings** |
| `PLAYWRIGHT_REUSE_SERVER=true npx playwright test production-time --project=mobile --project=desktop` | **2 passed** (6.2s) |

Every number matches the implementer's and the coordinator's. Preflight before the browser run:
workers on 5174 returned 200 and the backend on `192.168.1.246:8000` returned 200; **no server was
started by me**. The run rewrote the tracked `playwright-report/index.html`, which I restored to
`HEAD` — declared below.

Criterion 14 is now fully re-derived, including the browser half that round 1 could not run.

## Round-1 items — disposition

| Id | Status | How I verified it |
|---|---|---|
| **F2** — degraded frame never truncates | **resolved** | `ProductionTimeNoBudgetCard` now owns its own `isExpanded`, calls `selectVisibleRows`, and renders `ProductionTimeRowsToggle`. Separate state per branch, as instructed — no lifting. Case table re-walked on both frames (below). |
| **N2** — dead toggle | **resolved** | Both bodies derive `isTruncatable` from `collapsedRows.length < card.rows.length`. The five-rows-with-last-active case is asserted for **both** frames by one `it.each`. |
| **F3** — sampled `stateToTone` | **resolved** | All nine states asserted one row per state, for `stateToTone` *and* `humanizeSectionState`, from a shared `STEP_STATE_CASES` table. **Mutation M1:** deleting `case "blocked":` (a different arm from the one the implementer probed) fails exactly one test — "maps blocked to the exact blocked tone". The suite now bites. |
| **N4** — footer names wrong stages | **resolved in substance**, one open member — see G1 | Selection reads `section.state`, not the lossy tone. Cancelled-plus-completed asserted *not* named; blocked asserted named. **Mutation M2:** removing `blocked` from the set fails exactly that test. |
| **F4** — `21_realtime.md` disagreement | **resolved** | See probe 5. |
| **N5** — registry half untested | **resolved** | Three per-app tests. **Mutation M3:** reverting the workers registry to an object spread fails its test (`expected [Function spy] not to be [Function spy]`). **Mutation M3b:** dropping the item-economics map from the argument list also fails it — the identity pass-through makes both regressions visible. |
| **N7** — `infeasible` untested | **resolved** | New row asserts `2h 55m` / `of 0m` / `2h 55m over` / `isOverBudget` / `remainderPercent === 0` / the over-budget footer. |
| **N8** — stale text | **resolved** | The barrel comment now describes what the file exports. The plan's half was fixed in the foldback. |

## Findings

### G1 — `failed` is terminal, reachable, and unpinned · **should-fix**

Probe 1, answered by walking the backend rather than reasoning abstractly.

**Is a failed section already filtered as `excluded`?** Only sometimes.
`EXCLUDED_STEP_STATES = {skipped, cancelled, failed}` and a section is `excluded` **only when every
step is excluded** (`budget_division.py:308–313, 351–360`). So:

- *Only pass failed* → every step excluded → `share_state: "excluded"` → already filtered by
  `!row.isExcluded`. `failed` contributes nothing here.
- *One failed pass + one pending pass* → `failed` is in `TERMINAL_STEP_STATES`
  (`domain/task_steps/constants.py:4`), so the pending step is the only live one and
  `_governing_step` returns it: the section reports `state: "pending"`, not `failed`. Again
  `failed` contributes nothing.
- *One completed pass + a later failed pass* → all steps terminal, so `_governing_step` falls
  through to "latest `entered_at` wins" and returns the **failed** step; the group is still
  allocated because the completed step is not excluded. The section arrives as
  `state: "failed"`, `share_state: "on_track" | "over_share"`, `isExcluded: false`. **This is the
  reachable case, and it is a reassignment — a first-class concept in this widget, which already
  gives it its own "2 passes" caption.**

So `failed` is neither harmless redundancy nor unreachable: it fires exactly on a re-run that
failed after an earlier success, and it makes the footer say "20m left for sanding" about a
section with no open step.

Three authorities say that is wrong: `TERMINAL_STEP_STATES` includes `FAILED`; the plan's
§Decisions entry says the footer names sections "**not yet terminal**"; and this same fix
deliberately stopped naming `cancelled` and `skipped` on precisely that reasoning — `failed` sits
in the same frozenset as both.

**Mutation M2b:** removing `state === "failed"` from `isUnfinishedSectionState` leaves **all 131
tests green**. Whichever way the owner decides, the member is currently decoration in the sense of
charter rule 2 — no test pins it in either direction.

Authority: `backend/app/beyo_manager/domain/task_steps/constants.py` `TERMINAL_STEP_STATES`;
plan §Decisions ("Footer note = remaining + unfinished stages… naming every section that is not
yet terminal"); charter §Standing quality rules 2.

Correction: drop `state === "failed"` and add a row asserting a completed-then-failed section is
**not** named; or, if the owner keeps it, amend §Footer note to say why terminal-but-failed is
named while terminal-but-cancelled is not, and add the row asserting it **is** named. See owner
card 1.

Context for severity: the footer renders only in the budget frame, which needs `status: "ok"` —
and no `ok` response has ever been observed, because no item in the workspace carries a price yet.
This is a defect on a path live data has not yet reached.

### Notes

- **G2 — the index pairing rests on an invariant nothing asserts (probe 2).** `pendingLabels` now
  pairs `sections[index]` with `rows[index]`. Correct today: `toRows` is a bare
  `dto.sections.map(...)`, criterion 3 forbids reordering, and round 1 confirmed no
  `sort`/`reverse` exists. **Mutation M4:** making `toRows` filter out excluded sections — the
  shape of a plausible future change — fails exactly one test, "maps sections 1:1 in payload
  order". So a *count* change is caught, incidentally, by an assertion about something else; a
  change that preserved the count while breaking correspondence would not be, and no test asserts
  footer labels against a payload where misalignment would show. Acceptable as shipped.
  Recommended: build the labels inside `toRows`, where the section and its row share a closure —
  that removes the invariant instead of documenting it, and costs less than the guard would.
- **G3 — one member of the unfinished set cannot arrive.** `ended_shift` is in
  `isUnfinishedSectionState`, but the backend's `TaskStepStateEnum` has eight values and
  `ended_shift` is not among them. Harmless and defensively consistent with the frontend's own
  `state` enum (round 1 recorded that permissiveness as safe), but worth knowing that the set now
  holds one unreachable member and one disputed one, and only three that do work.
- **G4 — the registry tests assert identity, never behaviour.** Each app asserts the composed
  handler is neither source handler. That catches a revert to spread (M3) and a dropped map (M3b),
  which is what N5 asked for. It would not catch a composition that wrapped both handlers but
  invoked only one. One extra line — invoke the composed handler with a dummy payload and assert
  both mocks were called — closes it. Not required for this cycle.
- **G5 — probe 3's case table, and the two rows without tests.** Walked for **both** frames.
  0 rows → `ProductionTimeCard` returns `null` before either body, for `budget` and `no_budget`
  alike. 1–4 rows → all rows, `collapsedRows.length === rows.length`, no toggle. 5 rows, none
  active → 4 shown, toggle offered. 5 rows, active last → all 5 shown, **no** toggle (N2 fixed;
  asserted for both frames). 9 rows, active at index 7 → rows 0–3 plus 7, toggle offered, expands
  to 9. 9 rows, two active → both rescued, toggle offered — `selectVisibleRows` adds every active
  index. Untested rows: the degraded frame with 5 rows and none active, and either frame with two
  concurrent active rows — the latter being an explicit plan decision ("Concurrent working
  sections. Every `isActive` row expands"). Both are correct by construction and covered by the
  shared builder; neither was introduced by this cycle. The bar and headline still describe the
  whole pipeline: truncation is presentational only, `buildSegments` runs on `card.rows`, and the
  degraded headline is summed in the transform before any truncation.

## What else was verified correct

**Probe 4 — the new tests bite.** Four mutations run and reverted; three of the four turned the
suite red on exactly the intended test, and the fourth (M2b) is finding G1. The suite grew from
108 to 131 and did not grow vacuously — which was round 1's central complaint.

**Probe 5 — the contract amendment is accurate and additive.** `architecture/21_realtime.md` gains
`### App-level assembly A — shared-key composition` after the existing section, +36 lines with
**zero deletions**: the original §App-level assembly is byte-identical and nothing was renumbered,
per the charter's amendment rule. The three semantics I re-checked against
`socket-compose.ts` are all stated correctly: shared keys run every handler in the order the maps
were passed (`:28–34, :41–47`); a key claimed by exactly one map is returned by identity, no
wrapper (`:29, :47`); an inline entry must be a final object-literal argument, and adding it after
the call or spreading it into the result restores last-write-wins — which is true of the returned
plain object. The example mirrors the existing one, including its unimported `notificationKeys`,
so the two read as one document.

**Passing glance over the changed seam.** The degraded card's toggle is the last child of the
frame's divider stack, matching the budget body's structure; `showTypicalComparison` is still
passed to every visible row; `visibleRows = isExpanded ? card.rows : collapsedRows` is equivalent
to the previous `selectVisibleRows(rows, isExpanded)` (which copied on the expanded path) and
nothing mutates either array; `pendingLabels`' `row &&` guard makes a short `rows` array yield no
label rather than throwing; the `no_budget` branch still never calls `pendingLabels` at all; and
the barrel change is comment-only — no export added or removed. All three registry test files run
inside their app's default `vitest run` (verified individually: 1 test each).

## My write perimeter

Documents written:

- `docs/.../handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_2.md` (this file, new)
- `docs/.../plans/PLAN_production_time_widget_20260818.md` — Review log entry and Lifecycle
  transition only

Code written: **none.**

Tool-recorded state: none. No architecture graph exists for this project; the phase state lives in
the plan's Lifecycle section.

### Mutation-probe declaration

Six probes, applied and reverted. Post-revert SHA-256 recorded against the pre-probe value for
every file touched, and `git status --porcelain` is empty:

| # | File | Probe | Suite response |
|---|---|---|---|
| M1 | `production-time-view-model.ts` | delete `case "blocked":` from `stateToTone` | 1 failed / 41 — "maps blocked to the exact blocked tone" |
| M2 | `production-time-dto.ts` | remove `blocked` from `isUnfinishedSectionState` | 1 failed / 24 — "names a blocked section as unfinished" |
| M2b | `production-time-dto.ts` | remove `failed` from `isUnfinishedSectionState` | **131 passed — nothing bit (finding G1)** |
| M4 | `production-time-dto.ts` | `toRows` filters out excluded sections | 1 failed / 131 — "maps sections 1:1 in payload order" |
| M3 | workers `socket-registry.ts` | revert composition to object spread | 1 failed / 1 — identity assertion |
| M3b | workers `socket-registry.ts` | drop `itemEconomicsSocketEvents` from the arguments | 1 failed / 1 |

Post-revert checksums:
`production-time-view-model.ts` `06af4b26…37740b` (identical to the value the implementer declared
for their own probe, which independently confirms theirs was reverted byte-identically);
`production-time-dto.ts` `46da27a1…5352f2`; workers `socket-registry.ts` `cce00101…56ea26`.

Other state I touched and restored: the Playwright run rewrote the tracked
`apps/workers-app/ManagerBeyo-app-workers/playwright-report/index.html`, restored with
`git checkout --`; it also writes the git-ignored `test-results/.last-run.json`. No database, no
external service, no dev server started.

## What remains unproven

Independent of the verdict, so the owner knows what an eventual approval accepts:

- **No `ok`-status response has ever been rendered.** All 25 live tasks return `item_unvalued`,
  because no item in the workspace carries a price yet. Everything the budget frame does — the
  segmented bar, the headline arithmetic, the live tick, the active-row detail, the footer note,
  and G1 itself — has been proven only against fixtures and hand-built payloads. Pricing an item
  is what unblocks it.
- `detached` and `mismatched` have never appeared in live traffic either.
- `final` has never been observed non-null — no task has closed with a computed result.
- The four deferred notes (N1 clock lint, N3 duplicated fixtures, N6 platform-pinned bindings,
  N9 `isPending`) remain open in a maintenance phase, unchanged and un-re-examined this round.

## Lessons for the plans

- **An "under review" marker in a plan is a good pattern, and it worked.** §Footer note carried the
  `failed` question forward in its home artifact with the exact evidence a reviewer needed to
  settle it. That is why this round could answer it in one pass instead of rediscovering it.
- **A set literal needs a row per member, not a row per interesting member.** N4's fix added tests
  for the two members that changed behaviour (`cancelled` out, `blocked` in) and left the three
  carried-over members unpinned — one of which is disputed and one unreachable. When a criterion
  names a set, the criterion should require one case per element, the way criterion 5a now does
  for the nine states.
- **Deriving a display concern from a display value is the bug, not the specific mapping.** N4's
  root cause was reading `tone` — a deliberately lossy projection — to answer a domain question.
  G2 is the same shape one level down: pairing by array index is a structural projection standing
  in for the relationship itself. Prefer carrying the domain value to where the decision is made.
