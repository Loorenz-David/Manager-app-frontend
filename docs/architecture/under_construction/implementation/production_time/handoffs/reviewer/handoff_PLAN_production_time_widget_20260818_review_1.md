---
plan: PLAN_production_time_widget_20260818
role: review
round: 1
verdict: CHANGES_REQUESTED
date: 2026-08-19
actor: Claude Opus 5 (1M context)
---

# Production time widget — review round 1

First review of the phase. Full checklist against all fourteen acceptance criteria, the two
backend handoffs, the named architecture contracts, and the eight judgment-call probes carried
by the reviewer prompt. Findings and verdict only — nothing was fixed.

**Verdict: `CHANGES_REQUESTED`** — no blocking finding, four should-fix, ten notes. The machinery
is sound: the response contract, the live-tick anchor, the 404 rule, the socket composition and
the no-client-verdict guarantee were all re-derived independently and hold. What fails is at the
edges — one piece of copy that tells the user something untrue, one acceptance criterion applied
to only half the widget, one test that survives the defect it exists to catch, and one
architecture contract that now describes a pattern no app in the repo uses.

## ⚠ OWNER DECISIONS REQUIRED (3)

### Card 1 — the "detached" sentence

**Question.** Should a task that has no item at all show the production-time card, or nothing?

**Story.** A manager opens a task that was created without an item on it — nothing has gone
wrong, the item just was not attached yet. Under the flow timeline they now read "This task is
no longer linked to an item, so its production time cannot be worked out." Nothing was ever
linked, so the sentence reports a loss that never happened, and the natural next move is to go
hunting for the item someone supposedly removed.

**Branches.**
- Hide it: no card until an item exists — quiet, but a genuinely detached task also goes quiet.
- Reword it: one sentence that covers both ("No item is linked to this task yet…") — always
  truthful, never alarming.
- Split it: ask backend for a fourth binding value so the two cases can read differently.

**Recommendation.** Reword — it is a one-line frontend change and it is honest in both cases,
where hiding trades one wrong story for a blind spot.

**On silence.** The gate holds; the card ships as written and keeps saying "no longer linked".

**Trace.** Finding F1; plan §Track A "No-budget frame"; `ProductionTimeUnavailableCard.tsx`.

### Card 2 — the realtime contract

**Question.** Fold shared-key registry composition into the architecture contract now, or after
this phase is approved?

**Story.** The contract still shows three feature maps merged with `...` spread. Every one of
the three apps now uses a composition helper instead, because that spread was silently throwing
away one of two handlers for the same event. The next agent who reads the contract and writes a
registry the documented way re-opens exactly the trap this phase closed — and it will fail the
same way it did here: silently, with a card that never refreshes.

**Branches.**
- Now: one lettered amendment beside the existing section; the trap closes for the next agent.
- After approval: the contract stays wrong for as long as the gate stays shut.

**Recommendation.** Now — the amendment is additive, renumbers nothing, and the cost of leaving
it is another agent walking into the same hole.

**On silence.** The gate holds; the gap stays recorded in the Review log only.

**Trace.** Finding F4; `architecture/21_realtime.md` §App-level assembly.

### Card 3 — the browser run

**Question.** Do you want to start the workers app on 5174 so the browser check can be re-run,
or is the implementer's recorded run accepted as evidence?

**Story.** Every other number in this review was re-measured from scratch. The one that was not
is the browser pass, because starting a dev server is yours to do. The recorded run says the
production-time spec was green in both viewports; three unrelated specs in the same projects
were already failing before this work and still are.

**Branches.**
- Start it: the last unverified claim gets re-derived, roughly ten minutes.
- Accept the record: the phase closes on the implementer's word for that one criterion.

**Recommendation.** Accept the record for this round and re-run it in the same session that
verifies the fixes, so one browser run covers both.

**On silence.** The gate holds on the other findings regardless; this criterion stays marked
"not re-derived".

**Trace.** Note N10; criterion 14; plan Review log 2026-08-18 (Track B verification).

## Verification actually run

Re-measured in this session, not taken from the handoff:

| Command | Result |
|---|---|
| `npm run typecheck` (root) | **exit 0** — clean across all five apps and all package projects |
| `npm run test:item-economics` | **108 passed / 108**, 9 files |
| `npm run test:realtime` | **5 passed / 5**, 1 file |
| ESLint, phase files, workers-app config | **1 error in this phase's perimeter** (`use-production-time-clock.ts:12`); 3 pre-existing errors in `RealtimeProvider.tsx`, outside the perimeter |

The handoff's "77/77" was correct when written; the count is now 108 because the item-pricing
workstream landed 31 more tests in the same package (16 `ItemPricingFieldGroup` + 15
`item-pricing`). Production-time attributable: 77 (24 view-model, 21 DTO, 19 card, 6 section,
2 clock, 2 socket-events, 3 pre-existing error-identity).

Playwright was **not** run — no dev server, per standing instruction. See owner card 3.

## Findings

### F1 — `detached` copy asserts a loss that may never have happened · **should-fix**

`ProductionTimeUnavailableCard.tsx:6` renders "This task is **no longer** linked to an item".
The backend derives the binding as
`binding = "detached" if item is None else …` (`get_task_budget_status.py:111`), and `item is
None` covers a task that simply has **no primary `TaskItem` at all**, not only one that lost it.
So the never-had-an-item case — an ordinary state, not a fault — is reported to the user as a
broken link. The frame is also rendered before the empty-sections check
(`ProductionTimeCard.tsx:74` precedes `:82`), so it appears even on a task with no stages, where
the plan's decision was "render nothing".

Authority: backend handoff `HANDOFF_TO_FRONTEND_production_time_and_worker_cards_20260818.md`
§Error cases ("the task **lost or swapped** its primary item"); plan §Decisions ("Empty
`sections` array — render nothing").

Correction: reword both strings so they describe the state rather than a transition, or return
`null` for `detached` when `sections` is empty. See owner card 1.

### F2 — the degraded frame never truncates · **should-fix**

Criterion 12 is unqualified: "A pipeline of more than four sections collapses to four rows plus a
*Show all* toggle." `ProductionTimeNoBudgetCard.tsx:58` renders `card.rows.map(...)` — every row,
no `selectVisibleRows`, no toggle. Only `ProductionTimeBudgetBody` truncates
(`ProductionTimeCard.tsx:31`). An unevaluated twelve-stage task therefore renders twelve rows
above the flow timeline, which is the exact page-length problem §Row truncation exists to solve;
and `not_evaluated` — the pre-commit state — is precisely when long pipelines are most likely,
because nobody has committed a budget yet.

Authority: plan §Acceptance criteria 12; plan §Track A "Row truncation".

Correction: route the degraded rows through `selectVisibleRows` and render
`ProductionTimeRowsToggle` under the same `rows.length > PRODUCTION_TIME_COLLAPSED_ROW_COUNT`
condition; or amend criterion 12 to say the degraded frame is exempt and say why.

### F3 — `stateToTone` is sampled, and a deleted case arm survives the suite · **should-fix**

`production-time-view-model.test.ts:209` asserts five of the nine states (`completed`, `working`,
`ended_shift`, `failed`, `skipped`). `paused`, `pending`, `blocked` and `cancelled` are never
asserted. **Probe run:** deleting `case "paused":` from the switch
(`production-time-view-model.ts:317`) — which silently demotes every paused section from the
warning tone to the neutral one, and changes its swatch and state-pill colour — left the entire
108-test suite green. The test names the vocabulary it maps; it does not cover it.

Authority: charter §Standing quality rules 2 ("Enumerate, never sample… sampled tables look
exhaustive and miss cases").

Correction: one `it.each` row per state, all nine, each asserting its one exact tone. Same for
`humanizeSectionState`, which asserts one value of nine.

### F4 — `21_realtime.md` and the three registries now disagree · **should-fix**

`architecture/21_realtime.md` §App-level assembly (lines 149–180) documents the registry as an
object spread of feature maps plus an inline handler entry. All three shipped registries are now
`composeSocketHandlers(...)` argument lists, and under that helper an inline entry must be passed
as a final object-literal argument or it will not compose. The contract is authoritative for how
to write code; an agent following it today re-creates the silent-drop bug this phase existed to
fix. The implementer correctly recorded the gap rather than editing an approved contract under
owner direction — this finding routes the amendment, it does not fault the implementer.

Authority: `architecture/21_realtime.md` §App-level assembly; charter §Artifact map ("a needed
change is made in its home artifact").

Correction: a lettered amendment (`§App-level assembly A`) documenting `composeSocketHandlers`,
the run-in-map-order rule, the pass-through of single-claim keys, and the inline-entry rule —
inserted without renumbering. See owner card 2.

### Notes

- **N1 — the clock's lint error.** `use-production-time-clock.ts:12` fails
  `react-hooks/set-state-in-effect`. It is inherited by design: the plan told the implementer to
  model it on `packages/stats/src/hooks/use-current-minute.ts:13`, which fails identically (I ran
  ESLint on it). No shipped npm script lints `packages/`, so neither surfaces in any normal run.
  Judgment: real but low — one extra render on mount and on each `enabled` flip, no correctness
  impact. The `useSyncExternalStore` form in `@beyo/lib`'s `useTickingElapsed` is the right
  shape, but **not** adoptable as-is: it is a module-global 1-second ticker with no `enabled`
  gate, and using it would violate criterion 9's "disabled when no section is working" and
  tick 30× more often than specified. The correction is a `useSyncExternalStore` clock that keeps
  the gate and the 30s period — which fixes `use-current-minute.ts` too, and belongs in a shared
  hooks phase rather than this one.
- **N2 — a toggle that does nothing.** `isTruncatable` is `rows.length > 4`
  (`ProductionTimeCard.tsx:32`) while visibility is `selectVisibleRows`. With exactly five rows
  whose active row is the last, all five are already visible and the card still offers "Show all
  5 stages", which changes nothing when pressed. Case table walked: 0 rows → card returns null;
  1–4 → all rows, no toggle; 5 with none active → 4 rows + working toggle; 5 with the active row
  at index 4 → 5 rows + dead toggle; 9 with active at 7 → rows 0–3 + 7, toggle correct; 9 with
  two active rows → both visible, toggle correct. Fix: derive the flag from
  `visibleRows.length < card.rows.length`.
- **N3 — the fixtures re-implement the transform.** `production-time-fixtures.ts:38–112`
  rebuilds rows, headline, segments, footer and `pendingLabels` by hand — a second
  implementation of `toProductionTimeViewModel`, which did not exist when Track A was written.
  The 19 card tests therefore assert rendering of a parallel derivation; only the 6 MSW tests
  touch the production path. The two `pendingLabels` are byte-identical today and can drift
  silently tomorrow. Fix: build the fixtures by calling `toProductionTimeViewModel` on DTO
  fixtures.
- **N4 — the footer names the wrong stages.** `pendingLabels` (`production-time-dto.ts:148`)
  selects on `tone === "pending" || tone === "paused"`. `stateToTone` maps `skipped` **and**
  `cancelled` to `pending`, so a section with one cancelled and one completed pass — not
  `excluded`, since not every step ended skipped/cancelled/failed — is named as a stage the
  remaining time is "left for". Conversely `blocked` and `failed` map to `blocked` and are never
  named, though a blocked stage is unfinished work. Plan §Footer note specifies "paused or not
  yet started". Fix: select on the section's state directly, not on its display tone.
- **N5 — criterion 11's registry half is untested.** `socket-compose.test.ts:79` proves
  composition with *shaped stand-in* maps (the package cannot import `@beyo/item-economics`), and
  `socket-events.test.ts` proves the handler invalidates the right key. Nothing asserts that
  `apps/*/src/app/socket-registry.ts` still composes rather than spreads — the exact regression
  this phase was created to prevent. Fix: one assertion per app that
  `socketRegistry["task:step-state-changed"]` is neither of the two source handlers by identity.
- **N6 — platform-pinned native bindings in root `dependencies`.** The checkpoint adds
  `@rolldown/binding-darwin-arm64` and `lightningcss-darwin-arm64` to root `package.json`
  dependencies (the recurring lockfile workaround). Any `npm ci` on a non-darwin-arm64 host —
  CI, Linux, an Intel Mac — fails `EBADPLATFORM`. Fix: `optionalDependencies`, which npm skips on
  platform mismatch instead of failing.
- **N7 — `infeasible` is untested.** The ten branch-B statuses are enumerated
  (`production-time-dto.test.ts:248`); `infeasible`, the only branch-A status other than `ok`,
  has no row. Hand-traced: `hasBudget` is true, `budgetSeconds ≤ 0`, `buildSegments` normalises
  against total worked, `remainderPercent` is 0, the headline reads "2h 55m of 0m" with the
  overrun in the danger tone and the footer says "…over the production budget" — correct, and
  matching §Decisions "Over budget", but unasserted.
- **N8 — stale text.** `packages/item-economics/src/index.ts:39–42` still says the logic track
  "adds `ProductionTimeSection` … once they exist", directly above the line that exports it.
  Plan §Track B step 9 and §File map still name `compose-socket-handlers.ts`. Probe 4 confirmed
  the **plan** is the stale side: the shipped `socket-compose.ts` matches its siblings
  `socket-batch.ts`, `socket-debounce.ts`, `socket-registry-types.ts`, `socket-types.ts`, and the
  §File map never listed the new file at all.
- **N9 — empty `taskId` shows a permanent skeleton.** `useProductionTimeQuery` is
  `enabled: Boolean(taskId)`, and a disabled TanStack v5 query reports `isPending: true`
  forever, so `ProductionTimeSection` renders its skeleton indefinitely. Reachable in the workers
  app, where `useSurfaceProps` is `Partial` and the controller resolves
  `taskId ?? ("" as TaskId)`. **Not introduced here** — the sibling `TaskFlowTimeline` on the same
  page has the identical idiom and shows "Loading timeline…" forever in the same state; the
  packaged `TaskDetailSlidePage` guards with `if (!taskId)`. Reported under the passing-glance
  clause; `isLoading` in place of `isPending` fixes both.
- **N10 — criterion 14's browser half not re-derived.** See owner card 3.

## What was verified correct

Settled ground, so the next round can skip it.

**Probe 1 — the response contract (no divergence found).** The Zod schema was compared
field-by-field against the backend's actual serializer, not against the handoff prose:
`app/beyo_manager/domain/item_economics/division_serializers.py` and
`services/queries/item_economics/get_task_production_time.py`.

- The serializer emits **every** key unconditionally, including `budget.*` nulls, `final: null`
  and each nullable section field — so no `.nullable()` field in the schema can be met by an
  absent key. This is the failure class that took the task list down on 2026-08-18; it is not
  present here.
- `state_entered_at` and `final.computed_at` are `datetime.isoformat()` over
  `DateTime(timezone=True)` columns (`step_state_record.py:76`, `item_cost_result.py:31`), so
  they always carry an offset and satisfy `z.string().datetime({ offset: true })` — which is also
  the repo-wide convention (`cases`, `images`, `item-issues`, `notifications`).
- `final.actual_worker_minutes` / `variance_worker_minutes` / `task_state_snapshot` /
  `computed_at` are all `nullable=False` columns, matching the schema's non-nullable fields.
- `EconomicsStatusEnum` is exactly the twelve values in `ItemEconomicsStatusSchema`.
- `item_binding` is exactly `bound | detached | mismatched` (`get_task_budget_status.py:111`).
- `share_state` is exactly `on_track | over_share | excluded | no_budget`
  (`budget_division.py:286,296,357,364`).
- The frontend is safely *more* permissive in two places: `typical` is `.nullable()` though the
  serializer always emits the object (with a null `typical_worker_seconds`), and the `state`
  enum carries `ended_shift`, which `TaskStepStateEnum` cannot emit. Neither can fail a parse.
- Envelope `{data, ok: true, warnings: []}` (`routers/http/response.py:6`) matches
  `ApiEnvelopeSchema`.
- Decimals are `str(...)` of `Decimal` and stay strings in the schema; seconds are ints.
- Unknown task → `NotFound` → 404 (`get_task_budget_status.py:60`).

This is a source-read of the deployed-to-be backend, not a live call. Two repos can still drift
between now and deployment, so the handoff's "render a real response once" item stands.

**Probe 2 — `composeSocketHandlers` under composition.** Read structurally, then mutated. A
same-key handler cannot be dropped: the collector accumulates into a `Map`, promoting a single
handler to an array on the second claim and pushing on every claim after, so three maps claiming
one event all run (`socket-compose.ts:28–34`). Non-function values are skipped before collection
(`:23`), so `undefined` cannot displace a real handler regardless of map order. A key claimed by
exactly one map is returned by identity, no wrapper. Handlers receive the same `payload` and
`ctx`. **Mutation run:** replacing the collect branch with last-write-wins turned 3 of the 5
tests red — the test bites. Registry consumption is unchanged: `RealtimeProvider.tsx:136` does
`Object.entries(registry).forEach(...)`, and each `socketRegistry` is a module constant so
identity stays stable across renders. I also re-ran the implementer's collision audit
independently by enumerating the event keys of all 20 handler maps: `task:step-state-changed`
between `itemEconomicsSocketEvents` and each app's task/step map is the **only** shared key in
any of the three registries, so the switch to composition is behaviour-identical everywhere else.

**Probe 5 — `ApiRequestError`.** The class exists with a `status` field
(`packages/api-client/src/api-client.ts:12`); `ApiErrorSchema` is the unrelated response-body
schema in `@beyo/lib`. The controller's `isNotFound` and the query's retry predicate both key off
`error instanceof ApiRequestError && error.status === 404`. A 404 hides the component and issues
exactly one request; a 500 renders the framed error affordance after exactly one retry, matching
the app's global `retry: 1` — both asserted by request-count in the MSW tests
(`ProductionTimeSection.test.tsx:167,185`).

**Probe 7 — truncation.** Case table walked in full; see N2 for the one case that misbehaves.
Criterion 12's substance holds: the working row is visible while collapsed even at index 7 of 9,
and the bar and footer are built from `card.rows`, never from the visible subset.

**Probe 8 — statuses.** All twelve walked. `ok` → budget card. `infeasible` → budget card,
degenerate bar (N7: correct but untested). The ten branch-B values → the degraded frame, each
with its exact reason title, enumerated one row per status in the DTO test. In that branch the
worked total is summed from the rows, so a null `actual_worker_seconds` cannot reach the
headline, and no `NaN` is produced anywhere: `decimalMinutesToSeconds` returns null on a
non-finite parse and every consumer coalesces.

**Criteria.** 1 ✓ (props are `{taskId, className?}`; only a QueryClient is required, which every
app already provides). 2 ✓ (mounted immediately above `TaskFlowTimeline` in both pages, identical
widget markup; the workers page's extra wrapper `div` belongs to the timeline). 3 ✓ (no `.sort(`
or `.reverse(` anywhere under `packages/item-economics/src`; the transform maps 1:1;
`selectVisibleRows` filters by index and preserves order). 4 ✓ (one row, `stepCount: 2`, "2
passes" caption; asserted in unit, component and MSW layers). 5 ✓ (no worked-vs-allowance
comparison decides a verdict anywhere in `src`; **mutation run** — deriving the verdict from the
arithmetic turns 2 tests red). 6 ✓ (**mutation run** — narrowing the guard to `=== null` turns 3
tests red). 7 ✓ (see probe 8). 8 ✓ (tick anchored to `state_entered_at`, clamped at ≥ 0,
unparseable → 0 not `NaN`; it advances the row label, the headline worked and remaining figures
and the segment widths, all from one `nowMs` parameter — no `Date.now()` anywhere in `lib/` or
`components/`). 9 ✓ (one interval, 30 s, not scheduled when `enabled` is false; asserted by
spying on `setInterval`). 10 ✓. 11 ✓ at the handler and helper level (N5 covers the registry
level). 12 partial — F2. 13 ✓. 14 — typecheck and vitest re-derived above, Playwright not
re-derived (N10).

**Contracts.** `02_types.md`: no `any` anywhere in either package's new source, the union is
discriminated rather than optional-field, the helper's narrowing uses `unknown` casts confined to
its body. `04_api_client(_local)`: one `apiClient.get` with the envelope schema, parsed at the
boundary and nowhere else. `05_server_state.md`: key factory extended in place, one hook per
query, both deviations (`refetchInterval`, `retry`) carry their documented reason in comments.
`24_dto.md`: the transform is pure, lives beside the DTO and is called from the controller, never
from a component. `32_loading_skeletons.md`: the skeleton reflects the real card and uses the
global `skeleton-shimmer` utility. `35_shared_packages.md`: static exports, no loader function,
all three apps carry both the dependency and the `@source` line, and `@beyo/item-economics`
imports `@beyo/tasks` nowhere — the cycle risk is closed. Charter rule 4: the fixtures file has a
test caller.

## Perimeter check

Baseline is the single checkpoint `02ad6d01`, which carries three workstreams. Attribution
against the handoff's declared write perimeter:

- Every declared file is present in the commit. No file declared but unchanged.
- Files in the commit attributable to this phase but **not** declared: none. The undeclared
  changes are the money-key migration (`packages/items/src/types.ts`,
  `packages/tasks/src/types.ts`, `use-create-task.ts`, the managers-app item features) and the
  item-pricing fields (`packages/task-creation/*`, `packages/item-economics/src/lib/item-pricing*`,
  `src/pricing-fields.ts`, `src/components/item-pricing/*`), both correctly excluded.
- `docs/handoff/from_backend/*` (three files) and the three architecture-contract-adjacent doc
  additions entered the tree in the same commit; they are inbound contract copies, not writes by
  this phase.
- Shared surface worth naming for the next round: `packages/item-economics/src/index.ts` and
  `package.json` are jointly owned by this phase and the item-pricing phase. A perimeter check on
  either plan must expect the other's exports in that file.
- One substantive change inside the declared perimeter deserves the coordinator's attention
  because it is infrastructure, not widget: `playwright.config.ts` now reads
  `reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true"` (default false, as
  before) — a strict improvement, correctly declared. And root `package.json` gained the two
  native bindings (N6).

## My write perimeter

Documents written:

- `docs/architecture/under_construction/implementation/production_time/handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_1.md` (this file, new)
- `docs/architecture/under_construction/implementation/production_time/plans/PLAN_production_time_widget_20260818.md` — Review log entry and Lifecycle transition only

Code written: **none.**

Tool-recorded state: none. No architecture graph exists for this project; no tracker row exists
(the folder has no master plan), so the phase state is recorded in the plan's Lifecycle section.

### Mutation-probe declaration

Five probes, applied and reverted, every file verified byte-identical by md5 and by a clean
`git status`:

| File | Probe | Suite bit? |
|---|---|---|
| `packages/realtime/src/lib/socket-compose.ts` | collect branch → last-write-wins | yes, 3 of 5 |
| `packages/item-economics/src/lib/production-time-view-model.ts` | drop the active-row rescue in `selectVisibleRows` | yes, 2 |
| `packages/item-economics/src/lib/production-time-view-model.ts` | guard narrowed to `allowanceSeconds === null` | yes, 3 |
| `packages/item-economics/src/lib/production-time-view-model.ts` | delete `case "paused":` from `stateToTone` | **no — F3** |
| `packages/item-economics/src/lib/production-time-dto.ts` | derive the verdict from worked vs allowance | yes, 2 |

Post-revert md5s match the pre-probe values; `npm run test:item-economics` (108/108) and
`npm run test:realtime` (5/5) were re-run green after reverting. Working tree is clean —
`git status --porcelain` returns nothing. No database or external state was touched. Scratch
copies live outside the repo, under the session scratchpad.

## Lessons for the plans

- **Criterion 12 was written for one branch and applied to one branch.** A criterion that names
  a behaviour ("collapses to four rows") should name the surfaces it binds — budget frame,
  degraded frame, or both. F2 exists because the sentence was silent and the code picked one.
- **A mapping table in a criterion needs a row per value.** §Tone palette lists six tones and the
  state vocabulary lists nine states, but the plan asked for "unit tests for … `stateToTone`"
  without an enumeration, and the implementer wrote five assertions. Charter rule 2 already says
  this; the plan should have carried the table into the criterion.
- **Copy that describes a transition needs the state that produces it.** The plan wrote the
  detached and mismatched sentences from the handoff's wording ("lost or swapped") without
  checking which backend condition sets `detached`. One line of the backend query would have
  caught F1 at plan time — this is the same lesson as the `ApiError`/`ApiRequestError` trap:
  verify the claim against the source before writing copy or code against it.
- **Two similarly-named artifacts trap agents twice.** The plan disambiguated
  `ApiRequestError`/`ApiErrorSchema` after the first trip. `socket-compose.ts` vs
  `compose-socket-handlers.ts` is the same shape of trap and is still unresolved in §Track B
  step 9 and §File map.
- **Fixtures written before the transform should be retired once it exists.** Track A had to
  hand-build view models; nothing in the plan says to replace them afterwards, so a second
  implementation shipped (N3).

## Carry-forward dispositions

Not applicable this round — the verdict is `CHANGES_REQUESTED`, so every note returns with the
fix cycle rather than being routed to a later phase. If the owner approves F1/F2/F3 fixes and
defers the rest, N1 (the shared clock hook) and N6 (native bindings) belong to a maintenance
phase, not to this widget.
