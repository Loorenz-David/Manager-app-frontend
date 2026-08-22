# PLAN_production_time_budget_visibility_20260819

## Metadata

- Plan ID: `PLAN_production_time_budget_visibility_20260819`
- Status: `under_construction`
- Owner agent: `Claude Opus 5`
- Created at (UTC): `2026-08-19T00:00:00Z`
- Predecessor: `PLAN_production_time_widget_20260818` — `APPROVED` and archived 2026-08-19. This plan
  changes what that widget displays; it does not reopen that phase.
- Backend handoffs raised by this plan:
  `docs/handoff/to_backend/HANDOFF_TO_BACKEND_production_time_live_share_state_20260819.md`
  (answered: option C, `share_state` is settled-only by design) and its successor
  `docs/handoff/to_backend/HANDOFF_TO_BACKEND_production_time_live_budget_clock_20260819.md`
  (answered 2026-08-22: **live, all fields together** —
  `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_live_working_time_clock_20260822.md`)
- Source evidence: a live `status: "ok"` response from `GET /api/v1/item-economics/tasks/
  tsk_01M0CSK8HZ80SD2V84FAVYAZG6/production-time`, captured 2026-08-19, plus four screenshots of
  the rendered card at 2m / 3m / 4m / 25m of elapsed work. **This is the first `ok` response the
  widget has ever rendered** — the predecessor phase shipped against fixtures, as its Lifecycle
  section records.

---

## Goal and intent

- **Goal:** make the production-time card answer the question a manager actually opens it with —
  *is this item's budget realistic, and where is it tight?* — instead of only *how much time is
  left in total*.
- **User intent (owner, 2026-08-19):** "a manager can see clearly the times are tight for some
  working sections that have not started." The budget per section exists in the payload for every
  section, pending ones included, and the card currently shows it nowhere.
- **Non-goals:**
  - Re-deriving the share verdict client-side. Criterion 5 of the predecessor plan stands. The
    owner's decision 2026-08-19 is that a live verdict is **backend work**: a comparison rule in the
    frontend would be a second implementation of how work is judged, and would drift as the product
    grows. The frontend's job shrinks to rendering and refetching.
  - The item-level budget-vs-typical ratio — proposed as S2, withdrawn the same day, see there.
  - Any change to the endpoint, the allocation method, or the twelve-value status vocabulary.
  - The maintenance backlog inherited from the predecessor (N1 clock lint, N3 fixtures, N6 native
    bindings, G2, G4) — separate phase, listed here only so it is not lost.

---

## Evidence — three findings from the first live render

All three come from one real payload and are reproducible from it. Numbers are that payload's.

### E1 — the allowance is never shown as a number

Every section carries `allowance_seconds`, including `pending` ones. The card renders:

- on the **active** row: a progress bar whose full width *is* the allowance, plus `typical 5m`;
- on every **other** row: nothing about the budget at all.

So `cleaning seat` — allowed **26m 2s**, typically **46m 30s** — presents as an ordinary pending
row. The tightness a manager is looking for is in the payload and absent from the screen.

### E2 — the verdict cannot change while a section is being worked

Backend, for the section in progress:

```
worked_seconds:    0        ← twenty-five minutes into the work
allowance_seconds: 186      (3m 6s)
share_state:       "on_track"
```

`share_state` is decided at
`backend/app/beyo_manager/domain/item_economics/budget_division.py:364`:

```python
section_state = "over_share" if worked > allowance else "on_track"
```

and `worked` reads `total_working_seconds` — the **settled** column. The backend handoff's §Live
time is explicit: "A step currently in `working` state has its open interval excluded until it
transitions out." So during work `worked` does not grow, and the verdict is pinned to whatever it
was before the step started. It cannot become `over_share` until the step leaves `working`.

Meanwhile the frontend live-ticks `now − state_entered_at` into the row's worked figure and into
the bar. The result is on screen in the 25m screenshot: **a bar filled to 100% beside a pill
reading "On track."** The two halves of one row disagree, because one is live and the other is
settled-only.

This is not an implementation defect. The predecessor's criterion 5 — render `share_state` as
received, never re-derive — was correct and was mutation-tested. The backend confirmed the design
(D16: the three fields must share one basis, after an earlier implementation shipped
`left_seconds: -100` beside `share_state: "on_track"`) and named the shipped §Live time guidance —
tick locally while the verdict stays settled — as the source of the incoherence. A corrected
§Live time is owed to us as a new dated handoff.

### E3 — the typical marker is mathematically constant, and therefore carries no information

`allowance_i = distributable × typical_i / Σ typical`
(`budget_division.py:338–344`, weights are the typicals, largest-remainder rounding).

Therefore `allowance_i / typical_i = distributable / Σ typical` — **the same value for every
section of an item, by construction.** The live payload confirms it to three decimals:

| section | allowance | typical | ratio |
|---|---|---|---|
| disassembly | 186 | 332 | 0.560 |
| cleaning seat | 1562 | 2790 | 0.560 |
| structural repair | 4810 | 8591 | 0.560 |
| upholstery removal | 785 | 1402 | 0.560 |
| padding | 631 | 1127 | 0.560 |
| upholstery installation | 2075 | 3706 | 0.560 |
| assembly | 804 | 1436 | 0.560 |
| photography | 206 | 369 | 0.558 |

Budget 184.32 min = 11 059 s against Σ typical = 19 753 s → 0.5599.

`buildRowDetail` plots the typical against the allowance as a tick
(`typicalMarkerPercent = typical / allowance`, clamped to 100). At 178% it is clamped on **every**
row, pinned to the right edge, identical everywhere — visible in all four screenshots. A marker
that is provably the same on every row is noise per row.

The ratio looked like a **property of the item** worth stating once — *this item's budget is 56% of
what these stages typically take.* The backend confirmed the identity but showed it is not safe to
build on; see S2, withdrawn. The tick is still removed. Nothing replaces it.

---

## Scope

### S1 — show the allowance on every row

Every row gains its budget as text, alongside the typical it already shows:

```
disassembly            Working   25m
3m 6s allowed · typical 5m 32s
```

Pending rows get the same line. This is what makes E1's "cleaning seat is allowed 26m but takes
46m" legible before anyone starts.

Rules:
- `allowance_seconds` may be `null` (no budget) or `<= 0` — render the typical alone, never "0m
  allowed", and never divide.
- Keep the existing `typical` wording; this adds to it rather than replacing it.
- The degraded (`no_budget`) frame has no allowances at all and is unchanged.

### S2 — **WITHDRAWN 2026-08-19** — move the typical comparison from the row to the headline

> **Withdrawn.** The per-row tick is still removed — E3 stands, it is provably constant and
> therefore noise. Nothing replaces it. The item-level ratio is **not** shipped: the backend
> confirmed the identity is real but breaks in two undetectable-from-our-payload ways (a section
> whose typical is null gets the median substituted as its weight, `budget_division.py:320–335`;
> and `distributable = budget − charged`, so time logged on skipped/cancelled/failed steps moves
> the ratio with no typical changing). We cannot compute the true figure because
> `distributable_seconds` and `charged_seconds` are not in the payload. S1 already gives a manager
> the same insight per section, honestly and without gating.
>
> The original proposal is kept below for provenance only.

Remove the per-row tick (E3) and state the ratio once, in the card headline area:

> Budget is **56%** of typical for these stages.

Rules:
- Compute from the payload's own totals — `Σ allowance / Σ typical` over non-excluded sections —
  **not** from any single section, so the line stays true if the allocation method ever stops being
  proportional.
- Sections with a null typical are excluded from both sums.
- If every typical is null, or the sums are zero, render nothing rather than a fabricated ratio.
- Wording must not imply a verdict. It is an observation, not a judgement — "56% of typical" is a
  fact; "budget is too tight" is a claim this plan is not entitled to make.

### S3 — stop the bar and the verdict contradicting each other

**Resolved 2026-08-19.** The backend answered option C — `share_state` is settled-only by design
(D16: `worked_seconds`, `left_seconds` and `share_state` must share one basis so they cannot
contradict each other). The owner has decided to pursue a **live projection owned by the backend**
rather than a comparison rule in the frontend, which would drift.

**Ship the interim gate:** suppress the verdict pill while a section's `state` is `working`, and
show only what can be stated without judging — elapsed, allowance, and the bar. This is a display
gate, not a rule: we choose *when* to show the backend's value, never *what* it says. Criterion 5
of the predecessor plan is amended in place to record the gate and its removal condition, per the
backend's explicit request — not quietly relaxed.

**The gate is deleted the day the payload goes live.** Requested in
`docs/handoff/to_backend/HANDOFF_TO_BACKEND_production_time_live_budget_clock_20260819.md`, which
names the six fields that must move together (three per section, three on `budget`) so the headline
cannot contradict the rows it sits above.

The two candidate behaviours below are superseded and kept for provenance:

- **(a) suppress while working.** Hide the verdict pill on a row whose `state` is `working`, since
  it is stale by construction, and let the bar and the live figures speak. Reversible in one line
  if the backend later makes the verdict live.
- **(b) show it live and say so.** Derive an in-progress indicator from the live tick against the
  allowance and label it distinctly from the settled verdict (e.g. "over allowance" in the danger
  tone, distinct wording from "Over share"). This crosses criterion 5's line deliberately and
  therefore needs the criterion amended in the predecessor plan, not silently broken.

Do not implement either until §Blocked resolves.

**Closed 2026-08-22 — the backend went live and the gate was never needed.** The owner held S3
before implementation (Review log, 2026-08-19 scope narrowing), so the interim gate clause died
unexecuted: no suppression ever shipped, and there is nothing to retire — which is exactly what
the go-live handoff §1 asks for. `share_state` now arrives computed on the same live basis as
`worked_seconds` and `left_seconds`, so rendering it as received — which the code has done all
along, mutation-tested since the predecessor — is simply correct. S3 resolves to **zero code
change**; what ships instead is S4, which deletes the local tick that the live payload obsoletes.

### S4 — integrate the live clock: delete the local tick, render as served (added 2026-08-22)

The backend now serves settled work **plus the concurrency-averaged share of the open interval**
on this endpoint (`HANDOFF_TO_FRONTEND_live_working_time_clock_20260822.md` §3). The frontend's
local addition of `now − state_entered_at` — correct under the superseded 2026-08-18 §Live time
guidance — would now **double-count** the open interval, at both levels it is applied:

- per row: `liveTickSeconds` in `production-time-dto.ts` inflates `workedSeconds` and the bar;
- headline: `totalLiveTickSeconds` is added to `budget.actual_worker_seconds` and subtracted from
  the remaining figure.

**Owner decision 2026-08-22 — Option 1, no smoothing.** Between polls the card renders the served
values verbatim; the 45-second poll (`use-task-production-time-query.ts`) is the only motion. The
alternative — receipt-anchored smoothing, which the handoff permits — was declined: the backend
averages concurrent credit (a worker split across two sections accrues each at half rate), so a
client ticking at 1 s/s over-runs the served value between every poll, and §5's three
decrease-mode obligations (snap-down baseline, never clamp to a previous maximum, render
settlement dips as given) all exist only to manage a smoothing baseline. With no baseline, every
one of them is satisfied by construction: everything on screen **is** a served value.

Work:
- Delete `liveTickSeconds`, `totalLiveTickSeconds`, and the `nowMs` parameter from
  `production-time-dto.ts`; the transform becomes a pure function of the DTO.
- Delete `hooks/use-production-time-clock.ts` and its test; the controller stops ticking.
- Remove the typical marker (E3, held since 2026-08-19): `typicalMarkerPercent` leaves the detail
  view model, `buildRowDetail` loses its `typicalSeconds` parameter, the tick span leaves
  `ProductionTimeRowDetail`. The typical remains on screen as text in the budget line S1 shipped.
- Doc-comment the transform with the handoff's two standing warnings: the payload is a **live
  operational projection, never payroll or archival data** (§4.3), and a served decrease is
  authoritative — render it, never clamp to a previous maximum (§5).
- Re-mirror the go-live handoff with provenance frontmatter (`mirror_of` / `source_modified` /
  `source_sha256`). Diffing during this reopening found the source had already drifted from our
  mirror — the backend archived its pipeline and updated the provenance-appendix paths — which is
  the mirror-digest convention doing its job.

Out of scope, unchanged by design: the worker task-step cards' `TickingTimer`
(`entered_at`-anchored stopwatch over `total_working_seconds`). The go-live handoff §4.3 names the
task/step serializer as a **settled** consumer still, so that surface's local tick remains both
correct and required. The two surfaces answer different questions — a personal stopwatch at
wall-clock rate versus a concurrency-averaged cost projection.

---

## Blocked — **RESOLVED 2026-08-19**, kept for provenance

`docs/handoff/to_backend/HANDOFF_TO_BACKEND_production_time_live_share_state_20260819.md` asks
whether `share_state` should account for the open interval of a `working` step, or whether the
frontend should own the in-progress signal.

Depending on the answer:
- **backend makes it live** → S3 needs nothing; the pill becomes correct on its own, and the
  predecessor's criterion 5 stands untouched.
- **backend keeps it settled-only** → S3 takes (a) or (b) by owner decision, and criterion 5 of the
  predecessor plan is amended in place to say the verdict is settled-only and what the frontend may
  show alongside it.

S1 and S2 are **not blocked** and can be built while the question is open.

---

## Owner decisions — **both resolved 2026-08-19**

1. ~~S2's wording~~ — moot. S2 is withdrawn; no ratio ships.
2. **S3's branch** — resolved. A live verdict is backend work; the frontend ships an interim display
   gate and deletes it when the payload goes live. The owner's reasoning, recorded because it
   generalises: a comparison rule in the frontend is a second implementation of how work is judged,
   and two implementations drift as the product grows.

---

## Acceptance criteria

Each names the mutation that must turn a test red — charter rule 11, and the lesson from the
predecessor's rounds 3–4, where two fixes shipped with no regression guard.

1. Every row renders its allowance when `allowance_seconds > 0`, on `working` and `pending` rows
   alike. *Mutation: render the allowance only on the active row → the pending-row test fails.*
2. A row with `allowance_seconds` null or `<= 0` renders the typical alone and performs no
   division. *Mutation: drop the guard → a NaN/Infinity assertion fails.*
3. The per-row typical tick is gone from the budget frame, and **no ratio replaces it**.
   *Mutation: restore the tick → a test asserting its absence fails.*
4. ~~The verdict pill does not render on a row whose `state` is `working`~~ — **superseded
   2026-08-22, inverted by the go-live.** The verdict renders exactly as served in every state the
   detail appears, `working` included; no state suppresses or relabels it. *Mutation: suppress the
   verdict while `working` → the working-row verdict test fails.*
5. Nothing in `packages/item-economics/src` compares elapsed or worked time to `allowance_seconds`
   to produce a verdict, label or tone. *Mutation: derive a label from the comparison → the
   copies-share_state-through test fails.* (Predecessor criterion 5, still enforced — now with no
   gate qualifier at all.)
6. The degraded (`no_budget`) frame is unchanged — same rows, same toggle, same absence of
   allowances. *Mutation: leak an allowance line into it → its test fails.*
7. `npm run typecheck` clean; `npm run test:item-economics` passes; the workers Playwright
   production-time spec passes in both projects.

8. A `working` section's rendered time equals the **served** `worked_seconds`, and
   `state_entered_at` moves nothing: two payloads differing only in `state_entered_at` produce
   identical view models. *Mutation: re-add `now − state_entered_at` to a working row → both the
   verbatim-figures test and the identical-view-models test fail.*
9. The headline renders the served `budget` figures verbatim — no tick added to worked, none
   subtracted from remaining. *Mutation: add a client-elapsed term to the headline → the
   verbatim-figures test fails.*

**Removal condition — honoured 2026-08-22.** Criteria 4 and 5's interim gate existed only while
the payload was settled-only; the gate was never implemented (owner hold), the payload went live
(`HANDOFF_TO_FRONTEND_live_working_time_clock_20260822.md`), and criterion 4 is inverted above.
Criteria 8 and 9 are the live-integration guards that replace it.

---

## Contracts

- `architecture/02_types.md` — the view model stays a discriminated union; the ratio is a nullable
  field on the budget branch, not an optional escape hatch.
- `architecture/24_dto.md` — the ratio is computed in the transform, beside the DTO, never in a
  component.
- `architecture/35_shared_packages.md` — everything lands in `@beyo/item-economics`; no new
  dependency.
- `task_system/frontend_contract_goal_mapping_guide.md` — the alignment authority named by the
  predecessor.

---

## Files

Expected to change (all under `packages/item-economics/src` unless noted):

- `lib/production-time-view-model.ts` — S1: allowance label on the row VM (shipped); S4:
  `buildRowDetail` loses `typicalMarkerPercent` and its `typicalSeconds` parameter.
- `lib/production-time-dto.ts` — S1: allowance label in the transform (shipped); S4: delete
  `liveTickSeconds`/`totalLiveTickSeconds`/`nowMs`, add the live-basis doc comment.
- `components/production-time/ProductionTimeRow.tsx` — S1: render the allowance line (shipped).
- `components/production-time/ProductionTimeRowDetail.tsx` — S4: drop the typical marker.
- `hooks/use-production-time-clock.ts` (+ test) — S4: deleted.
- `controllers/use-production-time.controller.ts` — S4: stops ticking.
- their tests and `production-time-fixtures.ts`.
- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_live_working_time_clock_20260822.md` — S4:
  re-mirrored from source with provenance frontmatter.
- ~~`ProductionTimeHeadline.tsx` — render the ratio~~ — gone with S2's withdrawal.

---

## Review log

- `2026-08-19` `Claude Opus 5`: plan authored from the first live `ok` response and four
  screenshots. E1 and E2 were the owner's observations; E3 was found while verifying them and is
  the reason the per-row tick is being removed rather than fixed. All three verified against the
  backend source (`budget_division.py:338–344` for the allocation, `:364` for the verdict), not
  inferred from the payload alone. Two owner decisions and one backend question raised before any
  implementation.
- `2026-08-19` `David` (scope narrowed): a backend solution for the live clock has been found and
  will land separately. **Until it does, nothing touching the live clock is implemented — not S3's
  verdict gate, and not the removal of the constant typical marker.** The backend change will
  revisit that whole area, and churning it twice costs more than leaving it. S1 alone ships.
- `2026-08-19` `Claude Opus 5` (S1 implemented): `allowanceLabel` added to the row view model and
  built in the transform. Every row that has an allowance now renders `3m allowed · typical 5m` —
  the active row inside its detail block, beside the bar that draws that number; every other row as
  its own line, which is the point of the change. A non-positive or null allowance renders nothing
  rather than "0m allowed", since that would read as a budget of zero rather than the absence of
  one. Durations use `formatWorkSeconds`, the card's existing formatter — no second duration
  format. The degraded frame is untouched by construction: its rows carry no allowance, so no line
  appears, and a test pins that.
  **Mutation-verified:** rendering the line only on the active row — the exact defect S1 exists to
  fix — fails 2 tests; dropping the non-positive guard fails 1. Both reverted, suite back to green.
  131/131 item-economics, typecheck clean, lint clean, Playwright 2/2 mobile and desktop.
- `2026-08-22` `Claude Fable 5` (plan reopened on its own trigger): the backend shipped the live
  clock and delivered the promised go-live signal
  (`HANDOFF_TO_FRONTEND_live_working_time_clock_20260822.md`). Consumed adversarially: every §4
  answer checked against what this frontend actually does. Findings — (1) §1's "retire the
  suppression gate" retires nothing here, the gate was held before it shipped; (2) the §3
  supersession makes our `now − state_entered_at` tick a **double count**, the one mandatory
  change; (3) §4.3 keeps the task/step serializer settled, so the worker cards' stopwatch is
  explicitly out of scope — the owner asked and the boundary is now recorded in S4; (4) the
  mirror had already drifted from source (backend archived its pipeline and updated appendix
  paths) — semantically identical, caught by diff, re-mirrored with digest frontmatter.
  **Owner decisions:** Option 1, no smoothing between polls; scope confirmed as S4 + S3 closure +
  marker removal.
- `2026-08-22` `Claude Fable 5` (S4 implemented): the transform is now a pure function of the DTO —
  `liveTickSeconds`, `totalLiveTickSeconds` and the `nowMs` parameter deleted from
  `production-time-dto.ts`, `use-production-time-clock.ts` and its test deleted, the controller no
  longer ticks. `buildRowDetail` lost `typicalSeconds` and `typicalMarkerPercent`; the marker span
  left `ProductionTimeRowDetail`, whose bar container flattened (the taller overhang box existed
  only for the marker). Live-basis doc comment on the transform carries §4.3 (never payroll) and
  §5 (a served decrease is authoritative). Go-live handoff re-mirrored with digest frontmatter.
  **Mutations, all red then reverted:** M1 re-add `now − state_entered_at` → 3 tests fail
  (criteria 8/9); M2 suppress the verdict on a working row → 2 fail (criterion 4 inverted); M3
  restore the marker testid → 2 fail (criterion 3). Suite 300/300, typecheck clean, S4's files
  lint clean (5 pre-existing errors in the valuation surface, untouched here, noted for that
  plan). One process note: M1's revert used `git checkout` against uncommitted work and destroyed
  the S4 dto edits, which were re-applied — mutations on uncommitted work must revert by exact
  string swap, and M2/M3 did.
  **Criterion 7 partially pending:** the workers Playwright spec reached sign-in and stopped —
  the backend at 192.168.1.246:8000 was down (probe: no route). Environmental, not a regression;
  to be re-run when the owner starts the backend.

---

## Lifecycle transition

- Current state: **reopened 2026-08-22** — the parking condition resolved exactly as written: the
  backend shipped the live projection and this plan reopened for S3 (closed, zero code) and the
  marker (folded into S4, which the go-live made necessary). S1 shipped 2026-08-19; S2 withdrawn.
- Current position: **S4 IMPLEMENTED 2026-08-22** — checkpoint committed, not approved. Playwright
  re-run owed once the backend is up; then review per charter.
- Transition owner: `David`
