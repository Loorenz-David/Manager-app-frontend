# HANDOFF_TO_BACKEND_production_time_live_share_state_20260819

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_production_time_live_share_state_20260819`
- Created at (UTC): `2026-08-19T00:00:00Z`
- Owner agent: `Claude Opus 5` (frontend)
- Source frontend plan:
  `docs/architecture/under_construction/implementation/production_time_budget_visibility/plans/PLAN_production_time_budget_visibility_20260819.md`
- Related backend handoff:
  `HANDOFF_TO_FRONTEND_production_time_and_worker_cards_20260818.md` (§share_state, §Live time)

## Request to backend

- **Required backend behavior:** a decision, not necessarily a change — should
  `sections[].share_state` account for the open interval of a step that is currently `working`, or
  is it settled-only by design?
- **User-facing impact:** today a section can be twenty-five minutes into a three-minute allowance
  and the card still reads **"On track"**, beside a progress bar that is visibly full. Whoever is
  looking has one row telling them two different things.
- **Desired timeline:** an answer unblocks one frontend change; nothing is waiting on backend code
  unless you choose option A.

## What we observed

First live `ok` response the production-time widget has ever rendered, 2026-08-19, task
`tsk_01M0CSK8HZ80SD2V84FAVYAZG6`. The section in progress, twenty-five minutes into work:

```json
{
  "section_name": "disassembly",
  "state": "working",
  "state_entered_at": "2026-08-19T14:12:19.233451+00:00",
  "worked_seconds": 0,
  "allowance_seconds": 186,
  "share_state": "on_track",
  "typical": { "typical_worker_seconds": 332, "sample_count": 86 }
}
```

Traced to source rather than inferred:

- `budget_division.py:364` — `section_state = "over_share" if worked > allowance else "on_track"`
- `worked` reads `total_working_seconds`, the settled column
- your §Live time says an open interval is excluded until the step transitions out

So while a step is `working`, `worked` does not grow and `share_state` is pinned to whatever it was
before the step started. It cannot become `over_share` until the step leaves `working` — which is
exactly the window in which someone might act on it.

The frontend adds `now − state_entered_at` locally for the displayed figures and the bar (per your
§Live time guidance), so the row's number and bar are live while its verdict is not.

## The question

**Is `share_state` intended to be a settled-only verdict?**

- **If yes** — that is a coherent design and we will stop implying otherwise on screen. We would
  suppress or relabel the verdict while a section is `working`, and record in our plan that the
  verdict describes completed work only. **No backend change needed.**
- **If no** — we would rather you own it than have us re-derive it, because a client-side verdict
  would be a second source of truth for a number that decides how work is judged. Option A below.

We are not asking for a preference to be honoured; we are asking which one is true, so the UI stops
claiming something the data does not support.

## Options, if you want it to be live

**Option A — compute `share_state` against the open interval.** For a section whose governing step
is `working`, compare `worked + (now − state_entered_at)` against `allowance_seconds`. Costs a
clock read per section on a read endpoint, and makes the field time-dependent (two calls a minute
apart can differ with no state change).

**Option B — leave `share_state` settled-only, add a separate live-safe field.** Something like
`share_state_basis: "settled" | "live"`, or an explicit `open_interval_started_at`, so the frontend
can tell the difference rather than guessing from `state == "working"`. This keeps the existing
field stable for any other consumer.

**Option C — no change.** Answer "settled-only, by design" and we adapt the UI.

We have no stake in which. Option C costs you nothing and is a perfectly good answer.

## Clarifications required

- [ ] Is `share_state` settled-only by design, or should it include the open interval? — blocks
      whether the frontend suppresses the verdict during work, relabels it, or leaves it alone.
- [ ] If settled-only: is `worked_seconds` also settled-only for **every** consumer of this
      endpoint, or does any caller receive a live figure? — we assume settled-only everywhere and
      would like that confirmed rather than assumed.
- [ ] Unrelated but adjacent, and cheap to answer while you are here: `allowance_i / typical_i` is
      identical for every section of an item under `static_proportional_section_v1` — we verified
      it algebraically (`budget_division.py:338–344`, weights are the typicals) and to three
      decimals in live data (0.560 across all eight sections). Is that an intended property we can
      rely on, or an artefact of the current allocation method that may change? We are about to
      surface the item-level ratio in the UI and would rather not build on an accident.

## Expected backend deliverables

Only if option A or B is chosen:

1. `GET /api/v1/item-economics/tasks/{task_client_id}/production-time` — `share_state` reflects the
   open interval (A), or a new field distinguishes settled from live (B).
2. Acceptance: a section whose governing step has been `working` past its allowance reports
   `over_share` (A), or reports enough for a client to derive it without inventing a verdict (B).

Under option C there are no deliverables — the answer is the deliverable.

## Interface expectations

- **Endpoint:** unchanged.
- **Response shape:** unchanged under A and C. Under B, one added field; we would prefer it
  non-nullable with an explicit default so an older payload cannot fail our schema — a `.nullable()`
  field the backend stops sending has taken this frontend down twice this month.
- **Error cases:** unchanged.
- **Socket events:** unchanged. `task:step-state-changed` already invalidates our query, so a
  verdict that only moves on state transitions refreshes correctly today.

## Frontend contract implications

- `architecture/24_dto.md` — no change; the verdict stays a rendered backend value, not a derived
  one, unless you tell us otherwise.
- The frontend plan's criterion 5 ("`share_state` is rendered as received; no file compares
  `worked_seconds` to `allowance_seconds` to decide a verdict") is currently enforced by a
  mutation-tested rule. If the answer is "settled-only and the frontend may show a live indicator
  alongside", we will amend that criterion explicitly rather than quietly relax it.

## One note on the document itself

Please **do not rewrite this file in place** if the answer changes later — issue a new dated
handoff. The 2026-08-15 operational handoff was rewritten under its original filename and date on
2026-08-19; five frontend artifacts cited the stale copy in good faith for four days, and a shipped
feature was built around a refusal that no longer existed. Our mirrors now carry the source's
digest so we can detect it, but a new filename is cheaper for both of us.
