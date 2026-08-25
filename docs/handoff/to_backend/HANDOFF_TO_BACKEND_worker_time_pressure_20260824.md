# HANDOFF_TO_BACKEND_worker_time_pressure_20260824

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_worker_time_pressure_20260824`
- Created at (UTC): `2026-08-24T00:00:00Z`
- Owner agent: `Claude Fable 5` (frontend), on the owner's decision
- Related:
  - `HANDOFF_TO_FRONTEND_worker_step_card_budget_allocations_20260822.md` — the endpoint the
    worker cards read. **This handoff asks for additive fields on it, not a replacement.**
  - `HANDOFF_TO_FRONTEND_narrow_typical_work_times_20260824.md` — the v2 release. It makes the
    *initial* target item-aware. It does not address what this handoff asks for, and §1's own
    wording is why: allowances change "wherever item-category narrowing changes the relative
    section **weights**". Better weights, same static split.
  - `HANDOFF_TO_BACKEND_task_budget_overrun_signal_20260823.md` — our sibling request, for the
    **managers** task list. The two do not conflict: that one asks for a new narrow
    `budget-signals` read for a manager surface; this one asks for additive fields on
    `budget-allocations`, which the worker cards will keep calling either way.
  - `HANDOFF_TO_FRONTEND_live_working_time_clock_20260822.md` §5 — the decrease rule every
    figure requested here must obey.

## Summary

A worker opens their working section and sees "36m budget" on a step. They work at that pace,
because that is the only number they are given. What the number does not tell them is that two
earlier sections on the same task already burned 67 minutes more than their slices, and the task
as a whole has **27 minutes** left, not 36.

The result is a production line that discovers its own overruns only after they are unrecoverable.
The business wants the opposite: the worker who is about to start a squeezed step should know they
have to move faster — and, when the remaining time is not achievable at all, should say so and
escalate to a manager. That escalation is the signal the workshop currently has no way to raise.

We cannot build this in the client, and we do not think we should. We are asking for two additive
things on `budget-allocations`: the step's **state**, and a live figure for **the share of the
budget that actually remains** for that step.

We are not asking you to change `allowance_seconds`, the static split, or anything that exists.

## The worked example

Task `tsk_01KXGHT2BP0JXVHW065KSJSRVZ`, a real payload from 2026-08-22:

| section | state | `allowance_seconds` | `worked_seconds` | `left_seconds` |
|---|---|---|---|---|
| cleaning seat | completed | 2958 | 6961 | −4003 |
| structural repair | completed | 9550 | 4977 | +4573 |
| upholstery removal | completed | 1462 | 2981 | −1519 |
| weaving | pending | 2210 | 0 | +2210 |
| photography | pending | 409 | 0 | +409 |

Task level: `allowed 276.48m`, `actual 248.65m`, `remaining 27.83m` (= 1670s). The identities all
hold: the allowances sum to the pot, and the `left_seconds` sum to the remaining pot.

The weaver is shown **36m**. The honest number is their share of the 1670s that remain:

```
squeeze  = 1670 / (2210 + 409) = 0.638
weaving  = 2210 × 0.638 ≈ 1409s ≈ 23m
photo    =  409 × 0.638 ≈  261s ≈  4m
                                  ----
                                  1670s = the remaining pot exactly
```

23m against a 36m typical is a 36% squeeze. That is a worker who needs to know.

## Why we cannot compute this client-side

**`steps[]` does not carry the step's state.** `serialize_budget_step` emits `step_id`,
`working_section_id`, `section_name_snapshot`, `typical_worker_seconds`, `allowance_seconds`,
`worked_seconds`, `left_seconds`, `share_state` — and, as of the v2 release, `typical_basis` and
`sample_count`. No state. `_step_result` in `budget_division.py` builds that row and drops the
state on the way to the wire, even though the division has it in scope right there
(`_step_state_is_terminal`, `_step_state_is_excluded`, `_step_state_is_open`).

Without it we cannot identify the denominator — which steps are still to come. The obvious
substitute is catastrophic rather than merely imprecise. Summing the positive `left_seconds`
gives 4573 + 2210 + 409 = 7192, because **structural repair finished 76 minutes under its slice
and still reports `left_seconds: 4573`**. The squeeze comes out 1670/7192 = **0.23** instead of
0.638, and the weaver is told to do a 36-minute job in **8 minutes** — because a completed
section's unused time was counted as future work. A worker sent to their manager over that number
learns to distrust the number.

**And even with state, we should not.** Redistributing the pot means re-implementing
`divide_production_budget` in TypeScript: the typical weights, the fallback for sections with no
samples (weaving above has `sample_count: 0` and got its slice from exactly that path), and the
largest-remainder residual. You have just re-weighted all of it for v2. A client copy would drift
from the day it shipped, and it would put a different number on the worker's card than
production-time shows the manager for the same step — the cross-surface disagreement
`narrow_typical_work_times` §7 was written to close.

Whether an upstream overrun is passed down to later stages is also not a display choice. It is a
policy about how this workshop allocates pressure, and it belongs beside
`static_proportional_section_v2`.

## What we are asking for

### 1. `state` on `steps[]`

The task-step state, in the same vocabulary production-time already publishes for
`sections[].state`. One line in `_step_result`. It unblocks the manager-side version of this
feature too, and it lets us stop inferring "finished" from a positive `left_seconds`, which we
have just demonstrated is unsound.

### 2. A live remaining-share figure

Preferred shape — **per step**, because it cannot be misapplied:

```jsonc
"steps": [
  {
    "...": "existing keys, unchanged",
    "state": "pending",
    "remaining_share_seconds": 1409   // int | null — this step's share of the pot that is left
  }
]
```

Optionally also **per task**, as the explanation behind it (and useful on its own for a manager
headline — "this task is running at 64% of plan"):

```jsonc
"remaining_pressure_ratio": "0.638"   // decimal string | null
```

Names are yours. If you would rather ship only one, ship the per-step value: a ratio requires the
client to know which steps it may legally be applied to, which is the problem we started with.

### 3. The property that matters most: the figure must not retreat under a working worker

If `remaining_share_seconds` is recomputed from the live pot with no further rule, then as a
worker works, the pot shrinks, so their own target shrinks while they stand there — the progress
bar visibly retreats and the target is never reachable by construction. That is worse than showing
nothing.

The requirement, stated as a property rather than an implementation: **a step's own consumption
must not move its own figure. Another section's overrun may.** Whether you achieve that by
snapshotting the target when the step starts, or by a formula with that property, is yours to
choose.

## What we explicitly do NOT need

- **Do not change `allowance_seconds`.** The static slice must survive untouched beside the new
  figure. It is how the workshop later tells "this worker was slow" from "this worker inherited a
  mess", and it is the input to the typicals. If the target silently shrinks, a rushed job becomes
  tomorrow's typical and the benchmark quietly corrupts itself.
- **Do not ship a rush/escalate threshold.** Where 0.64 becomes "hurry" and 0.25 becomes "go talk
  to your manager" is a presentation judgement we will tune against how the floor reacts. This is
  the same division of labour as the budget-allocations handoff §4, where you declined to ship the
  amber/teal thresholds and left them to us. If managers and workers later need to agree on the
  wording formally, promote it then.
- **No new endpoint.** The worker cards already make one batched `budget-allocations` call per feed
  page, capped at 50 task ids. Additive fields on that payload are the whole ask.
- **No socket event.** We poll on the existing 45-second interval and invalidate on
  `task:step-state-changed`.

## Open questions

- [ ] **Is a ratio above 1 served honestly, or clamped?** When earlier sections finish *under*,
      later ones legitimately have more room. We would serve it honestly and only *act* on it below
      1 — telling a worker they have 47m for a 36m job invites slack, and that slack becomes
      tomorrow's typical. We would like your view before we hard-code that asymmetry.
- [ ] **What is the figure when the remaining pot is zero or negative?** `0` and `null` mean
      different things to us: `0` is "there is no time left for you", `null` is "we cannot say". We
      would prefer `0` plus something that distinguishes it, because "no time left" is precisely the
      escalate-to-manager state.
- [ ] **What do `excluded` and terminal steps carry?** We expect `null`, matching how
      `allowance_seconds` already behaves for `excluded` / `no_budget`.
- [ ] **Do the redistribution weights follow v2's item-aware typicals?** We assume yes — the same
      weights that produced the static slices — but the answer changes what we tell workers about
      *why* their number moved.
- [ ] **Is `state` on the row acceptable, or would you rather publish a narrower
      `is_settled: bool`?** Either unblocks us. `state` is more useful and matches production-time.

## Acceptance criteria

1. Every non-deleted step row carries `state`, in the same vocabulary as production-time's
   `sections[].state`.
2. For the worked example above, weaving's `remaining_share_seconds` is `1409` (±1s of rounding)
   and photography's is `261`, while both `allowance_seconds` remain `2210` and `409`.
3. The remaining-share figures of all unfinished steps of a task sum to the task's remaining pot,
   to within the rounding residual — the same identity `allowance_seconds` already satisfies
   against `allowed_worker_minutes`.
4. A step already past its own slice contributes `0` to the denominator, never a negative.
5. Two calls seconds apart, with no state change and no work recorded, differ only in the
   time-dependent fields.
6. Work recorded **on a step** does not decrease **that step's own** remaining-share figure; work
   recorded on another section may.
7. Completed steps that finished under budget contribute nothing to the denominator — the failure
   mode named above is covered by a test with a real under-budget completed section.
8. The figures obey the live-clock handoff §5 decrease rule: a decrease is authoritative and
   renderable, never smoothed server-side.
9. `no_budget` and `excluded` states answer `null`, consistently with `allowance_seconds`.

## Interface expectations

- **Endpoint:** existing — `GET /api/v1/item-economics/tasks/budget-allocations`. Additive keys
  only.
- **Roles:** unchanged; WORKER already reads this route directly, which is the point.
- **Request shape:** unchanged. Repeatable `task_ids`, capped at 50.
- **Response shape:** as above. Always-present keys with explicit nullability, in the standing
  contract style of the v2 release.
- **Error cases:** unchanged.
- **Socket events:** none required.
- **Versioning:** if this changes the derivation enough to warrant it, we read `allocation_method`
  as data and pin it nowhere — a `_v3` flip costs us nothing.

## Frontend contract implications

On delivery we will:

- render the served remaining-share beside the static target on the worker step card — "23m left
  of 36m budgeted" — instead of the static target alone;
- add the escalation state, gated on evidence strength using the `typical_basis` and
  `sample_count` the v2 release just gave us: a "you must rush" claim measured against an
  `insufficient_sample` target is noise, and we would rather stay quiet than train the floor to
  ignore alarms;
- keep `buildOutlook` (`packages/item-economics/src/lib/production-time-view-model.ts`) — our
  client-side projected-overrun line on the manager's production-time card — until the sibling
  budget-signals handoff is answered, then delete it in favour of your figure.

No architecture contract changes: the verdict stays a rendered backend value, which this request
strengthens rather than relaxes.

## Document convention

Please issue any answer or correction as a **new dated handoff** rather than editing this file or
either 2026-08-22 handoff in place.
