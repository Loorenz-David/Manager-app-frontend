---
plan: PLAN_production_time_widget_20260818
role: reviewer
round: 2
date: 2026-08-19
---

# Reviewer prompt — Production time widget, re-review of fix round 3

Copy everything below the line into the reviewer session.

---

You are re-reviewing the **Production time widget** in the ManagerBeyo frontend monorepo
(`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`) after a fix
cycle. You did not write this code and must not assume it is correct — or wrong.

## Doctrine

Follow `/Users/davidloorenz/agent-skills/plan-reviewer.md` and, first,
`/Users/davidloorenz/agent-skills/pipeline-charter.md`. This is a **re-review of a fix cycle**, so
it is delta-scoped per the charter's review protocol: verified perimeter first, then full
adversarial depth on the changed seam, bounded regression on dependents, settled areas not
re-verified — but anything you see wrong in passing is still reported. That last clause has caught
real bugs on this plan; it is not decorative.

## Review history — open by stating it

Round 1 (`handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_1.md`) returned
`CHANGES_REQUESTED`: 0 blocking, 4 should-fix, 10 notes.

**Settled in round 1 — do not re-verify.** The response contract (re-derived field-by-field
against the backend serializer), the live-tick anchor, the 404 rule, `composeSocketHandlers` under
composition (mutation-tested), the no-client-verdict guarantee, criteria 1–11 and 13, and the
`02_types` / `04_api_client` / `05_server_state` / `24_dto` / `32_loading_skeletons` /
`35_shared_packages` contract checks.

**Dismissed, not deferred.** F1 — the owner confirmed no task can be created without an item,
verified across all four creation-form schemas. The `detached` copy stays.

**Deferred to a maintenance phase by owner decision** — N1 (clock lint / `useSyncExternalStore`),
N3 (fixtures re-implementing the transform), N6 (platform-pinned native bindings breaking
`npm ci` off darwin-arm64), N9 (`isPending` vs `isLoading`). Out of scope; do not re-raise them as
new findings, though you may note new evidence.

**Fixed this cycle — this is your scope:** F2, N2, F3, N4, F4, N5, N7, N8.

## Read first

1. `docs/architecture/under_construction/implementation/production_time/plans/PLAN_production_time_widget_20260818.md`
   — note criterion 12 (amended to bind **both** frames), new criterion 5a, and §Footer note
   (amended, and carrying an open question — see probe 1).
2. `.../handoffs/implementer/handoff_PLAN_production_time_widget_20260818_implement_2.md` — the fix
   report and its declared write perimeter.
3. `.../prompts/implementer/PROMPT_fix_round_3_20260819.md` — what was asked for.
4. Round 1's review handoff, for what each finding actually was.

## Verified perimeter — do this first

The fix cycle is commit **`0f11125e`**, on branch `pipeline/item-economics-phase-1`, against
baseline **`6eb58482`**.

```
git diff --stat 6eb58482 0f11125e
```

Eleven files plus the handoff were declared. **Any file changed outside the declared perimeter is
an automatic finding**, whatever its merit. Note that `6eb58482` (an unrelated `total_cost_minor`
schema fix) and `87069073` (a prompt edit by the coordinator) sit below this diff and are not part
of the cycle.

The coordinator has already re-run and confirms: typecheck clean, item-economics 131/131,
realtime 5/5, the three registry tests 1/1 each, Playwright 2/2 in both projects, tree clean. Do
not take that on trust — re-run — but it means a discrepancy is a signal, not an expected gap.

## Probes on the changed seam

### Probe 1 — is `failed` an unfinished state? (the one that matters)

`isUnfinishedSectionState` (`production-time-dto.ts`) names `pending`, `paused`, `ended_shift`,
`blocked`, `failed`. Round 1's N4 asked for `blocked` to be named; `failed` came along with it and
nobody has checked whether it should have.

The tension: the backend handoff's `share_state` table defines `excluded` as "every step of this
section ended skipped, cancelled **or failed**", which groups `failed` with the terminal outcomes,
and the plan's Decisions entry says the footer names sections "not yet terminal". If `failed` is
terminal, naming a failed stage as work the remaining time is "left for" is wrong copy.

Walk it, do not reason about it abstractly:

- a section whose only pass failed → is it `excluded`, and therefore already filtered by
  `!row.isExcluded`?
- a section with one failed pass **and** one pending pass → what `state` does the backend send
  (remember: pre-aggregated, the later active step), and what does the footer say?
- if `failed` is unreachable after the `isExcluded` filter, is including it harmless redundancy or
  a claim the next reader will mis-trust?

Report which it is. A recommendation to remove it, keep it, or amend the plan's wording is all
acceptable — an unexamined "looks fine" is not.

### Probe 2 — the index pairing in `pendingLabels`

The new selection pairs `sections[index]` with `rows[index]`. That is correct only while `toRows`
is a 1:1 `dto.sections.map(...)` — an invariant the code now depends on and does not assert.
Criterion 3 forbids reordering, and round 1 verified no `sort`/`reverse` exists.

Judge whether this is acceptable as-is or wants a guard. Consider what a future filter in `toRows`
(an `excluded` row dropped at source, say) would do: silently shift every label by one, naming the
wrong stages, with no test failing. Mutation-test it — make `toRows` drop one row and see whether
anything bites.

### Probe 3 — truncation, now on two frames

Both bodies derive `isTruncatable` from `collapsedRows.length < card.rows.length`. Enumerate the
case table for **each** frame, not one: 0 rows, 1–4, exactly 5 with no active row, exactly 5 with
the active row last, 9 with the active row at index 7, 9 with two active rows. Confirm the toggle
appears only when rows are actually hidden, and that the bar and footer still describe the whole
pipeline.

Criterion 12 now binds both frames explicitly. Live data from the owner's backend: 7 of 25 real
tasks carry more than four sections and all are `item_unvalued` — i.e. all land on the degraded
frame this fix just changed.

### Probe 4 — do the new tests bite?

Round 1's central finding was a test that survived the defect it existed to catch. The fix added
~23 tests. Mutation-test the important ones rather than counting them:

- delete a `case` arm from `stateToTone` other than `paused` — does the new `it.each` fail?
- flip one state out of `isUnfinishedSectionState` — does an N4 test fail?
- break one app's registry composition back to a spread — does that app's new test fail?

A test suite that grew by 23 and still passes vacuously is worse than one that never grew.

### Probe 5 — the contract amendment

`architecture/21_realtime.md` gained a section for `composeSocketHandlers`. Verify: the existing
§App-level assembly is intact, nothing was renumbered, and the new text is accurate about ordered
shared-key execution, singleton identity pass-through, and the inline-entry rule. An amendment
that misdescribes the helper is worse than the gap it closed.

## Bounded regression

Re-run and report actual counts:

- `npm run typecheck`
- `npm run test:item-economics`
- `npm run test:realtime`
- the three apps' unit suites
- ESLint on the changed files. One pre-existing error inside the perimeter is known and out of
  scope: `use-production-time-clock.ts:12` (N1).

**The owner's servers and backend are running** (workers on 5174, backend on
`192.168.1.246:8000`), so run the browser check yourself:

```
cd apps/workers-app/ManagerBeyo-app-workers
PLAYWRIGHT_REUSE_SERVER=true npx playwright test production-time --project=mobile --project=desktop
```

**Do not start any dev server** — the owner starts them and keeps control. If one is down, say so
and stop. Three unrelated Playwright failures elsewhere in the suite are known: the expected
settings tab is absent, the live reassigned list does not render, the presentation viewport does
not close.

## Output

Two layers, per the reviewer doctrine's dual-audience rule.

**Layer 1 — technical review.** Findings by id and severity (`blocking` / `should-fix` / `note`),
each with the violated authority (file + section) and a suggested correction. State plainly, per
round-1 finding id, whether each is now resolved. Report what you verified correct. Verdict:
`APPROVED` or `CHANGES_REQUESTED`.

**Layer 2 — the human briefing.** Open with a 2–4 sentence plain-language state of the build —
the owner is deciding whether this ships and archives. Then, for every blocking and should-fix
finding, a 3–6 sentence story from the owner's perspective in the product's own domain (a manager
opening a task, a worker mid-section), shaped as cause → what you would actually observe → why it
matters. Strictly faithful to the verified scenario; no inflation.

If the verdict is `APPROVED`, say explicitly what remains unproven so the owner knows what they
are accepting — at minimum: no `ok`-status response has ever been observed, because no item in
the workspace carries a price yet.

## Close

Deposit your report as
`docs/architecture/under_construction/implementation/production_time/handoffs/reviewer/handoff_PLAN_production_time_widget_20260818_review_2.md`
with frontmatter `plan`, `role: review`, `round: 2`, `verdict`, `date`, `actor`, and a section
declaring your **full write perimeter** — documents, code, and any tool-recorded state. List every
mutation probe you ran and reverted, with proof of revert.

Any owner decision goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision cards:
**Question** (one line, answerable yes/no or by naming an option), **Story** (2–4 sentences of
lived scenario, no artifact citations), **Branches** (each answer with its lived consequence).
