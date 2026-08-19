# PLAN_production_time_budget_visibility_20260819

## Metadata

- Plan ID: `PLAN_production_time_budget_visibility_20260819`
- Status: `under_construction`
- Owner agent: `Claude Opus 5`
- Created at (UTC): `2026-08-19T00:00:00Z`
- Predecessor: `PLAN_production_time_widget_20260818` — `APPROVED` and archived 2026-08-19. This plan
  changes what that widget displays; it does not reopen that phase.
- Backend handoff raised by this plan:
  `docs/handoff/to_backend/HANDOFF_TO_BACKEND_production_time_live_share_state_20260819.md`
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
  - Re-deriving the share verdict client-side. Criterion 5 of the predecessor plan still stands
    until the backend answers §Blocked.
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
received, never re-derive — was correct and was mutation-tested. The gap is in what the backend
can express, and it is the subject of §Blocked.

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

The ratio is real information, but it is a **property of the item**, not of the section: *this
item's budget is 56% of what these stages typically take.* One line, once, at the top.

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

### S2 — move the typical comparison from the row to the headline

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

**Blocked on the backend answer — see §Blocked.** Two candidate behaviours, both cheap:

- **(a) suppress while working.** Hide the verdict pill on a row whose `state` is `working`, since
  it is stale by construction, and let the bar and the live figures speak. Reversible in one line
  if the backend later makes the verdict live.
- **(b) show it live and say so.** Derive an in-progress indicator from the live tick against the
  allowance and label it distinctly from the settled verdict (e.g. "over allowance" in the danger
  tone, distinct wording from "Over share"). This crosses criterion 5's line deliberately and
  therefore needs the criterion amended in the predecessor plan, not silently broken.

Do not implement either until §Blocked resolves.

---

## Blocked — one question, sent to the backend

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

## Owner decisions required

1. **S2's wording.** "Budget is 56% of typical for these stages" is deliberately flat. If you want
   it to read as a warning below some threshold, say which threshold and what it should say —
   otherwise it stays an observation at every ratio.
2. **S3's branch**, once the backend answers. Recorded here so it is not decided by whoever
   implements.

Neither blocks S1.

---

## Acceptance criteria

Each names the mutation that must turn a test red — charter rule 11, and the lesson from the
predecessor's rounds 3–4, where two fixes shipped with no regression guard.

1. Every row renders its allowance when `allowance_seconds > 0`, on `working` and `pending` rows
   alike. *Mutation: render the allowance only on the active row → the pending-row test fails.*
2. A row with `allowance_seconds` null or `<= 0` renders the typical alone and performs no
   division. *Mutation: drop the guard → a NaN/Infinity assertion fails.*
3. The headline ratio is computed from summed allowances over summed typicals across non-excluded
   sections. *Mutation: compute it from the first section instead → a test with one section whose
   ratio differs from the item's fails.*
4. Sections with a null typical are excluded from both sums. *Mutation: treat null as zero → a
   mixed-null fixture's ratio changes and its test fails.*
5. No ratio renders when every typical is null or either sum is zero. *Mutation: remove the guard →
   a division-by-zero assertion fails.*
6. The per-row typical tick is gone from the budget frame. *Mutation: restore it → a test asserting
   its absence fails.*
7. The degraded (`no_budget`) frame is unchanged — same rows, same toggle, same absence of
   allowances. *Mutation: leak an allowance line into it → its test fails.*
8. `npm run typecheck` clean; `npm run test:item-economics` passes; the workers Playwright
   production-time spec passes in both projects.

S3 gains its own criteria once §Blocked resolves.

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

- Current state: `under_construction` — awaiting owner review of the two decisions, and the
  backend's answer for S3.
- Next state: `approved` → implement S1 and S2 → S3 once §Blocked resolves.
- Transition owner: `David`
