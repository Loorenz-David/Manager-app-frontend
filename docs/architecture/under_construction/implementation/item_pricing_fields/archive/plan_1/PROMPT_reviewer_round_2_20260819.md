---
plan: PLAN_item_pricing_fields_20260818
role: reviewer
round: 2
date: 2026-08-19
---

# Reviewer prompt — Item pricing fields, re-review of fix round 3

Copy everything below the line into the reviewer session.

---

You are re-reviewing the **item pricing fields** in the ManagerBeyo frontend monorepo
(`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`) after a fix
cycle. You did not write this code and must not assume it is correct — or wrong.

## Doctrine

Follow `/Users/davidloorenz/agent-skills/plan-reviewer.md` and, first,
`/Users/davidloorenz/agent-skills/pipeline-charter.md`. This is a **re-review of a fix cycle**:
delta-scoped per the charter's review protocol — verified perimeter first, then full adversarial
depth on the changed seam, bounded regression on dependents, settled areas not re-verified. The
passing-glance clause still applies: report anything you see wrong, in scope or not.

## Re-diff the mirrored authority before anything else

**This is not optional, and it is why the phase is on round 2.** The backend retired the §9.1
refusal by rewriting `HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` **in place** —
same filename, same date in the name — and five frontend artifacts cited the stale mirror in good
faith for four days.

The mirror now carries `mirror_of`, `source_modified` and `source_sha256` frontmatter. Confirm it
still matches its source:

```
shasum -a 256 ../backend/docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md
```

If the digest differs from the frontmatter, **stop and report it** — the contract moved again and
every finding below may rest on stale ground. Also check the other mirrored handoffs under
`docs/handoff/from_backend/` for the same drift; they carry no provenance stamp yet.

## Review history — open by stating it

Round 1 (`handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_1.md`) returned
`CHANGES_REQUESTED`: 2 blocking, 3 should-fix, 7 notes.

**Settled in round 1 — do not re-verify:** the arithmetic and display/payload seam (mutation-tested
there), omission-never-zero, the currency key and value against §3.1 and the backend validator,
pre-order optionality and the Shopify `product.price` path, the signature guard's survivability
after a clear, schema composition and step wiring, the package boundary, and
`PurchasePriceSetValue`'s honesty (mutation-tested — keep it).

**Resolved by owner decision, not by code:**
- **B2 dismissed.** Re-pricing on task creation is intended: the frontend sends prices, the backend
  versions them and skips the write when unchanged. There is deliberately **no** existing-item
  guard and **no** confirmation surface. Do not re-raise this.
- **`purchase_price` is per piece.** The multiplication is correct. Criterion 3 was amended
  accordingly.

**Out of scope, deferred:** S3 (the generic `notify.error` toasting raw server strings —
pre-existing, repo-wide, `architecture/13_errors.md`), N2 (the lookup signature's reach into
`ReturnFormContent` and `WorkerInternalFormContent` — assessed correct on its merits), N4 (two
pre-existing TS2352), N5 (the absent valuation surface).

**Fixed this cycle — your scope:** B1, S1, S2.

## Read first

1. `docs/architecture/under_construction/implementation/item_pricing_fields/plans/PLAN_item_pricing_fields_20260818.md`
   — criteria 3, 4 and 9 amended; 9 is **retired** with its contract. Review log carries the
   reasoning and both owner decisions.
2. `.../handoffs/implementer/handoff_PLAN_item_pricing_fields_20260818_implement_3.md`.
3. `.../prompts/implementer/PROMPT_fix_round_3_20260819.md` — what was asked for.
4. Round 1's review handoff.

## Verified perimeter

The fix cycle is commit **`ce818c8a`** against baseline **`e49967b5`**, on branch
`pipeline/item-economics-phase-1`.

```
git diff --stat e49967b5 ce818c8a
```

Twelve files plus the handoff were declared. Any file changed outside that list is an automatic
finding. Note round 1's N7 still holds for anything older: the original implementation shares one
checkpoint (`02ad6d01`) with two other workstreams, so pre-cycle perimeters remain unverifiable by
construction — do not re-derive that.

The coordinator has re-run and confirms typecheck clean, item-economics 130/130, task-creation
108/108, zero repo-wide hits for every refusal symbol, tree clean. Re-run rather than trust, but a
discrepancy is a signal.

## Probes

### Probe 1 — do the five new tests bite? (run this first)

**No mutation probe was run this cycle** — the fix prompt named none, and the implementer said so
plainly rather than implying coverage. So the four S2 cases and the one wood case have never been
seen to fail. This is exactly the gap that produced the sibling phase's central round-1 finding: 23
tests added, one vacuous, a whole `case` arm deletable with the suite still green.

Mutation-test each, reverting after:

- weaken `applyPurchasePriceLookupResult`'s guard — `purchasePrice >= 0` → `> 0`, then drop
  `Number.isFinite`, then remove the whole sanitisation — and check which of the four enumerated
  cases actually go red;
- flip `showTotal = majorCategory === "seat" || resolvedQuantity > 1` back to seat-only — does the
  wood-quantity-2 test fail?
- restore `item_pricing.purchase_cost_per_piece` to one step-field map — does anything fail? (I
  expect not: no test asserts the step map's contents. Say so if that is the case — a fix with no
  regression guard is a fix that returns.)

### Probe 2 — is the refusal really gone, or just unreferenced?

Round 1's B1 asked for deletion, not dormancy. Verify structurally: no file, export, prop, test or
type mentioning the refusal survives anywhere under `packages/` or `apps/`, and neither barrel
re-exports a deleted symbol. Check `parseErrorIdentity` — the implementer reports it now has no
production caller and left it in place as directed. Confirm that, and judge whether an exported
helper with no caller should stay.

Also confirm what was *not* deleted: `ItemPurchasePriceDisplay` and its "comes from the purchase
system" copy were explicitly out of the deletion.

### Probe 3 — S2's second half, and the path the first half misses

Removing the field from the step maps alone was known to be insufficient: the final step calls
`form.trigger()` over the whole form and navigates straight back. Confirm both halves landed and
that the dead end is genuinely unreachable — trace a negative lookup value from ingestion to
submit, not just to the item step.

Then probe the inverse: with `purchase_cost_per_piece` no longer in either step map, is there any
path where an invalid purchase cost now reaches the payload **silently** instead of blocking? The
schema still declares it `.nonnegative()`. What happens if a value gets there by a route other than
the lookup — a form reset, a default, a future caller of `setValue`?

### Probe 4 — S1's blast radius on the seat path

`showTotal` is now `seat || resolvedQuantity > 1`. Enumerate: wood q1, wood q2, wood q0/null/negative
(resolved to 1), seat q1, seat q4. Confirm the wood-q1 case stays compact and that nothing changed
for seats. Check the labels follow `showTotal`, so no breakdown ever appears under an unqualified
"Purchase price".

Then ask the question the fix does not: `item.quantity` is written from the lookup **before any
category is known**, and wood renders no quantity field. Can a user end up submitting a multiplied
wood cost they never saw, in any path where the breakdown does not render? If the answer is no,
say why.

### Probe 5 — criterion 9's retirement is complete

The criterion is retired and its contract is gone. Confirm nothing else in the plan, the code or
the tests still encodes the refusal behaviour — including the §Copy release-order constraint, which
the implementer reports died with the notice. A retired criterion that still has enforcement
somewhere is worse than one that was never written.

## Bounded regression

Report actual counts:

- `npm run typecheck`
- `npm run test:item-economics` (130 at cycle end)
- `npm run test:task-creation` (108 at cycle end)
- ESLint on the changed files. Five inherited diagnostics in the two form components are known and
  out of scope: two `navigateToRef.current` render writes, two `handleLookupResult` prop uses, one
  missing `isSeller` dependency. There is no root ESLint flat config — use
  `apps/managers-app/ManagerBeyo-app-managers/eslint.config.js`.

**Do not start any dev server** — the owner starts them and keeps control. No live request body has
ever been observed for this phase (round 1's N6); if you want a browser check, say so and stop.

## Output

Two layers, per the reviewer doctrine's dual-audience rule.

**Layer 1 — technical review.** Findings by id and severity, each with the violated authority
(file + section) and a suggested correction. State per round-1 finding id whether it is now
resolved. Report what you verified correct. Verdict: `APPROVED` or `CHANGES_REQUESTED`.

**Layer 2 — the human briefing.** Open with a 2–4 sentence plain-language state of the build — the
owner is deciding whether this ships and archives. Then, for every blocking and should-fix finding,
a 3–6 sentence story from the owner's perspective in the product's own domain — a manager pricing a
seat, a seller creating a pre-order, real article numbers and kronor — shaped as cause → what you
would actually observe → why it matters.

If the verdict is `APPROVED`, state explicitly what remains unproven, so the owner knows what they
are accepting. At minimum: no live request body has ever been observed for this phase, and the
re-pricing path the owner accepted has never been exercised against a real already-priced item.

## Close

Deposit your report as
`docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_2.md`
with frontmatter `plan`, `role: review`, `round: 2`, `verdict`, `date`, `actor`, and a section
declaring your **full write perimeter**. List every mutation probe with proof of revert.

Any owner decision goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision cards:
**Question** (one line), **Story** (2–4 sentences of lived scenario, no artifact citations),
**Branches** (each answer with its lived consequence).
