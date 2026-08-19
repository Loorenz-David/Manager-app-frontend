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
  (open: make the projection live, all six fields together)
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
4. The verdict pill does not render on a row whose `state` is `working`, and does render on every
   other state that carries one. *Mutation: remove the gate → a working-row test fails; mutation:
   gate on `isActive` for a non-working row → a completed-row test fails.*
5. Nothing in `packages/item-economics/src` compares elapsed or worked time to `allowance_seconds`
   to produce a verdict, label or tone. The gate keys off `state`, nothing else. *Mutation:
   derive a label from the comparison → a grep-level test fails.* (This is predecessor criterion 5,
   still enforced; the gate is a display decision, not a rule.)
6. The degraded (`no_budget`) frame is unchanged — same rows, same toggle, same absence of
   allowances. *Mutation: leak an allowance line into it → its test fails.*
7. `npm run typecheck` clean; `npm run test:item-economics` passes; the workers Playwright
   production-time spec passes in both projects.

**Removal condition, to be honoured rather than forgotten:** criteria 4 and 5's gate exists only
while the payload is settled-only. When the backend ships the live projection
(`HANDOFF_TO_BACKEND_production_time_live_budget_clock_20260819.md`), the gate is deleted and the
pill renders in every state. Whoever consumes that backend handoff owns removing it.

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

Expected to change (all under `packages/item-economics/src`):

- `lib/production-time-view-model.ts` — allowance label on the row VM, item ratio on the card VM,
  `buildRowDetail` loses `typicalMarkerPercent`.
- `lib/production-time-dto.ts` — compute the ratio in the transform.
- `components/production-time/ProductionTimeRow.tsx` — render the allowance line.
- `components/production-time/ProductionTimeRowDetail.tsx` — drop the tick.
- `components/production-time/ProductionTimeHeadline.tsx` — render the ratio.
- their tests and `production-time-fixtures.ts`.

---

## Review log

- `2026-08-19` `Claude Opus 5`: plan authored from the first live `ok` response and four
  screenshots. E1 and E2 were the owner's observations; E3 was found while verifying them and is
  the reason the per-row tick is being removed rather than fixed. All three verified against the
  backend source (`budget_division.py:338–344` for the allocation, `:364` for the verdict), not
  inferred from the payload alone. Two owner decisions and one backend question raised before any
  implementation.

---

## Lifecycle transition

- Current state: `under_construction` — scope settled 2026-08-19 after the backend's answer and two
  owner decisions. S2 withdrawn; S3 resolved to an interim display gate. Awaiting owner approval to
  implement.
- Next state: `approved` → implement S1 (allowance per row), the tick removal, and S3's gate →
  review. The gate's removal is a separate, later change, triggered by the backend's live
  projection, not by this phase.
- Transition owner: `David`
