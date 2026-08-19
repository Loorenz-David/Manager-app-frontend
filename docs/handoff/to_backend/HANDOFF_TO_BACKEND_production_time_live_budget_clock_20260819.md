# HANDOFF_TO_BACKEND_production_time_live_budget_clock_20260819

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_production_time_live_budget_clock_20260819`
- Created at (UTC): `2026-08-19T00:00:00Z`
- Owner agent: `Claude Opus 5` (frontend), on the owner's decision
- Supersedes by reference: `HANDOFF_TO_BACKEND_production_time_live_share_state_20260819.md` — that
  handoff asked *whether* `share_state` was settled-only. You answered option C, settled-only by
  design. **That answer is accepted and not being reopened.** This handoff asks a different
  question, arising from it.
- Related: `HANDOFF_TO_FRONTEND_production_time_and_worker_cards_20260818.md` §Live time (correction
  already owed by you), `simple_production_budget_division` intention §D16.

## Summary

The owner has decided to pursue a **live production-time projection, owned by the backend**. This
handoff carries the problem statement while that is explored on your side. It requests no specific
implementation and sets no date.

Your D16 reasoning is the reason we are not solving this in the frontend. We would rather one
correct clock in your layer than a second rule in ours that drifts as the product grows.

## The problem, in one card

Live payload, task `tsk_01M0CSK8HZ80SD2V84FAVYAZG6`, twenty-five minutes into work on a section
whose whole allowance is 3m 6s:

```
worked_seconds:    0
allowance_seconds: 186
left_seconds:      186
share_state:       "on_track"
```

The manager sees a progress bar pinned to 100% — correct, drawn from elapsed time — beside a pill
reading **"On track"**. One row, two answers.

Nobody can act on this. The window in which someone could intervene on a section running 8× its
budget is exactly the window in which the verdict cannot move.

## What we are asking for

**Make the production-time projection live for a section whose governing step is `working`** — with
every dependent field moving together, so D16 continues to hold.

We are not asking for a mechanism. A clock in the read layer is one option and you have already
named its cost; a materialised projection, a periodic recompute, or something else entirely are all
fine by us. We only care that the numbers agree with each other and with the wall clock.

### The fields that must move together

We traced every field the card reads. Six, at two levels:

**Section level** (`sections[]`):
1. `worked_seconds`
2. `left_seconds`
3. `share_state`

**Item level** (`budget`):
4. `actual_worker_seconds` / `actual_worker_minutes`
5. `remaining_worker_minutes`
6. `percent_consumed`

The item-level four matter as much as the section-level three. Our headline reads
`budget.actual_worker_seconds` and `budget.remaining_worker_minutes` directly
(`production-time-dto.ts:198,203`). If sections go live and the budget block stays settled, the
headline will contradict the rows it sits above — D16's defect moved up one level instead of
sideways.

`final` is a settled record by definition and should stay settled.

## What the frontend will do

Once the payload is live, we **delete our local addition entirely**. No comparison, no derived
verdict, no tick on top of your numbers. The widget already polls on a 45-second interval
(`use-task-production-time-query.ts:15`), so staying in sync costs us nothing new.

Between polls we may smooth the displayed figure by adding *elapsed-since-we-received-the-response*
to `worked_seconds`. Note what that is and is not:

- it anchors to **when the response arrived on the client**, not to `state_entered_at`;
- it uses only differences on the client's own clock, so a device with a wrong clock cannot skew it;
- it never re-decides `share_state` — the verdict is rendered exactly as sent, and stops being
  suppressed the moment it can be trusted mid-work.

### What we explicitly do NOT need

**No "as-of" or server-now timestamp in the payload.** We considered asking for one and concluded it
would be worse than measuring from receipt: a server timestamp reintroduces the client-vs-server
clock comparison we are trying to remove. Please don't add one on our account.

**No new field of any kind**, unless your solution needs one for its own reasons. The response shape
we have is sufficient.

## Interim behaviour on our side

Until this lands, we will **suppress the verdict pill while a section's state is `working`**, and
show the live facts we can state without judging: elapsed, allowance, and the bar.

This is a display gate, not a rule — we are choosing when to show your value, not deciding what it
should say. Our plan's criterion 5 ("`share_state` is rendered as received; no file compares
`worked_seconds` to `allowance_seconds` to decide a verdict") is being amended explicitly to record
the gate, per your request, rather than quietly relaxed. **The gate is deleted the day the payload
goes live** — that is its entire purpose.

## Open questions

- [ ] Is a live projection feasible at all in this layer, and what does it cost you? The
      "no clock in `services/queries/item_economics/`" property is real and we do not know what it
      is load-bearing for. If the answer is "not worth it", say so — the interim gate is not
      painful and we will keep it.
- [ ] If it is feasible, do all six fields move together, or is there a reason to split them? We
      believe D16 requires all six; if you see a sound subset, we would rather hear it than assume.
- [ ] Does anything else consume these fields on a settled basis today — reports, exports,
      payroll-adjacent surfaces — where a live value would be wrong? We can only see our own
      consumers. If yes, a separate live projection alongside the settled one may be safer than
      changing these in place.
- [ ] `worked_seconds` is currently settled-only *structurally*, because there is no clock in the
      layer to make it otherwise. If a clock is introduced, that guarantee becomes a convention.
      Is that acceptable to you, or does it want a test?

## Acceptance criteria

Whatever the mechanism:

1. A section whose governing step has been `working` past its allowance reports
   `share_state: "over_share"`, with `worked_seconds` and `left_seconds` consistent with that
   verdict in the same payload.
2. Two calls a few seconds apart, with no state change, differ only in the time-dependent fields —
   never in `allowance_seconds`, `typical`, ordering, or section membership.
3. The item-level `budget` block agrees with the sum of its sections on the same basis.
4. A section with no open interval is unchanged from today's behaviour, byte for byte.

## Interface expectations

- **Endpoint:** `GET /api/v1/item-economics/tasks/{task_client_id}/production-time` — unchanged.
- **Request shape:** unchanged.
- **Response shape:** unchanged. If your solution requires a new field, please make it
  non-nullable with an explicit default — a `.nullable()` field the backend later stops sending has
  taken this frontend down twice this month, and we now mirror your handoffs with a digest for
  exactly that reason.
- **Error cases:** unchanged.
- **Socket events:** unchanged. `task:step-state-changed` already invalidates our query, so a
  verdict that moves on transitions is refreshed correctly today.

## Frontend contract implications

- `architecture/24_dto.md` — unchanged. The verdict remains a rendered backend value.
- Predecessor plan `PLAN_production_time_widget_20260818` criterion 5 — amended in place to record
  the interim display gate and its removal condition.
- Current plan: `docs/architecture/under_construction/implementation/production_time_budget_visibility/plans/PLAN_production_time_budget_visibility_20260819.md`

## Document convention

Please issue any answer or correction as a **new dated handoff** rather than editing this file or
the 2026-08-18 production-time handoff in place. You have already adopted this and identified three
in-flight obligations that were scheduled to edit the 2026-08-15 file again — thank you; that was
the outcome worth having.
