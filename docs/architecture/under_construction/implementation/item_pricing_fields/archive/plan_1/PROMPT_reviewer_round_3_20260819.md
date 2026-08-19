---
plan: PLAN_item_pricing_fields_20260818
role: reviewer
round: 3
date: 2026-08-19
---

# Reviewer prompt — Item pricing fields, re-review of fix round 4

Copy everything below the line into the reviewer session.

---

You are re-reviewing the **item pricing fields** in the ManagerBeyo frontend monorepo
(`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`) after a second fix
cycle. You did not write this code and must not assume it is correct — or wrong.

## Doctrine

Follow `/Users/davidloorenz/agent-skills/plan-reviewer.md` and, first,
`/Users/davidloorenz/agent-skills/pipeline-charter.md`. Delta-scoped re-review: verified perimeter
first, full adversarial depth on the changed seam, bounded regression on dependents, settled areas
not re-verified. The passing-glance clause applies — report anything you see wrong, in scope or not.

**This is likely the closing round.** If it approves, the phase archives. Weight your effort
accordingly: the question is not only "are these three fixes correct" but "is there anything left
that should stop this shipping".

## Re-diff the mirrored authority first

Round 2 confirmed the mirror clean; do it again anyway. This phase is on round 3 because a backend
contract was rewritten in place under an unchanged filename and five artifacts trusted it for four
days.

```
shasum -a 256 ../backend/docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md
```

Compare against `source_sha256` in the mirror's frontmatter
(`docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`). If it
differs, **stop and report** — every finding below may rest on stale ground. The other two
`from_backend` mirrors are still unstamped; round 2 found them byte-identical, so a quick diff is
enough unless something looks off.

## Review history

Round 1: 2 blocking, 3 should-fix, 7 notes. Round 2: 1 blocking, 2 should-fix, 5 notes.

**Settled — do not re-verify:** the arithmetic and display/payload seam, omission-never-zero, the
currency key and value, pre-order optionality and the Shopify `product.price` path, the signature
guard's survivability, schema composition and step wiring, the package boundary,
`PurchasePriceSetValue`'s narrowing, B1's deletion (verified structurally in round 2), S1's
category-known path, S2's both halves.

**Resolved by owner decision, not code:** re-pricing on task creation is intended (no guard, no
confirmation surface); `purchase_price` is per piece; `item.major_category` is **mandatory on the
Pre-order form** — the owner's reframing of round 2's card 1, on the reading that the missing rule
was an omission rather than a deliberate permissiveness. Do not re-litigate any of these.

**Out of scope:** S3 (raw `notify.error` toast — pre-existing, repo-wide), N2, N4 (two TS2352),
N5 (absent valuation surface), N8 (`parseErrorIdentity`, routed to the valuation phase), N12
(lookup writing `undefined` over a chosen category — its own follow-up).

**Fixed this cycle — your scope:** B3, S4, S5, N9, N11.

## Read first

1. `.../plans/PLAN_item_pricing_fields_20260818.md` — criterion 1 amended with the composition
   hazard; §Copy retired; §9 summary rewritten to the current inline-re-pricing rule; Review log
   carries every owner decision.
2. `.../handoffs/implementer/handoff_PLAN_item_pricing_fields_20260818_implement_4.md`.
3. `.../prompts/implementer/PROMPT_fix_round_4_20260819.md`.
4. Round 2's review handoff.

## Verified perimeter — read this carefully, the baseline is not the tip

The fix cycle is commit **`1737adda`**, against baseline **`983b9c9b`**:

```
git diff --stat 983b9c9b 1737adda
```

Eight files plus the handoff were declared.

**Two later commits are NOT part of this cycle and must not be attributed to it:**

- **`b4819135`** — an owner-authored change removing the **production-time footer note** entirely
  (`buildFooterNote`, `ProductionTimeFooterNote`, `pendingLabels`, `isUnfinishedSectionState`, 279
  deletions). Authored directly by the owner outside the pipeline, on top of the already-approved
  production_time phase. **This is why `npm run test:item-economics` now reports 122 and not the
  130 named in the fix prompt.** It is not a regression and not a write by this phase.
- **`40be5982`** — the coordinator recording that removal in the production_time plan.

Diff `983b9c9b..1737adda` to isolate this cycle. Round 1's N7 still holds for anything older than
`e49967b5`: the original implementation shares checkpoint `02ad6d01` with two other workstreams, so
pre-cycle perimeters are unverifiable by construction. Not re-derived.

## Probes

### Probe 1 — B3, and the question the rule does not answer

The fix adds a `major_category` requirement to `PreOrderFormSchema`, mirroring the Internal form's
two branches, with a comment naming it load-bearing for pricing visibility.

Verify the closure is **structural**, not incidental: with the rule in place, is there any path on
either form where a purchase price is ingested, multiplied and submitted while the pricing card
does not render? Trace from `handleLookupResult` to payload, not from the schema alone. In
particular:

- the lookup writes `item.major_category` from a React Query **cache read** and can write
  `undefined` on a cache miss (round 2's N12). With the rule, that now blocks at submit rather than
  passing silently — confirm it blocks, and confirm the user can recover (the picker is rendered at
  `PreOrderFormContent.tsx:596`);
- `ItemPricingFieldGroup` still returns `null` on a falsy category. Is the *step* reachable in a
  state where the card is hidden but a price is already in the form? What does the user see?

### Probe 2 — did the three mutations really bite, and do they still?

The implementer reports all three red, with checksums. Re-run them yourself — this is the round
where that habit was introduced, so verify it took:

1. `purchasePrice >= 0` → `> 0` (S4)
2. restore `purchase_cost_per_piece` to `INTERNAL_STEP_FIELDS_MAP.item` (S5)
3. remove the new Pre-order category rule (B3)

Then push further than the prompt asked: does the S5 test also catch the **Pre-order** map (the
implementer notes the Pre-order row stayed green when only the Internal map was mutated — is that
because the test is per-map and only one was mutated, or because the Pre-order assertion is weak)?

### Probe 3 — the step-map exports

S5 required exporting `INTERNAL_STEP_FIELDS_MAP` and `PRE_ORDER_STEP_FIELDS_MAP` for test, with
"narrow ESLint suppressions" for the non-component exports. Check what was actually suppressed and
whether the suppression is as narrow as claimed — a broad disable on a component file is a cost
that outlives the test it enabled. Confirm no new fast-refresh diagnostic was introduced.

### Probe 4 — the sku-preview fixture repair

Requiring the category invalidated `sku-preview.test.tsx`'s pre-order success fixtures. The
implementer repaired them and reports that "the manual-SKU override no longer replaces those valid
fixture fields with defaults". Verify the repair did not weaken what those tests assert — a fixture
fix that makes a test pass for a new reason is a silent loss of coverage. Diff the file and read
every changed assertion.

### Probe 5 — N11's comment fallback

The prompt offered narrowing the error routing *or* a comment, with a condition: comment if
narrowing spans more than the two `stepErrorMap` expressions. The implementer reports four
expressions (each form also routes whole-form errors in its final `onBeforeAdvance`) and took the
comment. Verify the count — if it is really two, the narrowing was the required branch.

Then judge the comment on its merits: does it actually prevent the trap's return, or does it only
describe it? The dead end is closed today by a single guard in
`applyPurchasePriceLookupResult`, with `ItemPurchasePriceDisplay` still rendering no message.

### Probe 6 — closing sweep

If you are leaning toward `APPROVED`, spend the remaining effort looking for what nobody has asked
about yet, rather than re-confirming what three rounds have settled. Suggested angles, not a
checklist: the Worker and Return forms now share `createLookupResultSignature` behaviour they never
asked for (round 1's N2, assessed correct — but has anything changed since?); the `item_pricing`
defaults and resets on both forms; what a *second* lookup for a different article does to prices
already in the form.

## Bounded regression

Report actual counts:

- `npm run typecheck`
- `npx tsc -p packages/task-creation/tsconfig.json --noEmit` — two pre-existing TS2352 known; the
  root script does not cover this package.
- `npm run test:item-economics` — **122** is the correct current figure (see the perimeter note).
- `npm run test:task-creation` — 114 at cycle end.
- ESLint on changed files with `apps/managers-app/ManagerBeyo-app-managers/eslint.config.js`; there
  is no root flat config. Five inherited diagnostics in the two form components are known.

**Do not start any dev server** — the owner starts them and keeps control. No live request body has
ever been observed for this phase (round 1's N6). If you want a browser check, say so and stop.

## Output

Two layers, per the reviewer doctrine's dual-audience rule.

**Layer 1 — technical review.** Findings by id and severity, each with the violated authority and a
suggested correction. State per round-2 finding id whether it is resolved. Report what you verified
correct. Verdict: `APPROVED` or `CHANGES_REQUESTED`.

**Layer 2 — the human briefing.** Open with a 2–4 sentence state of the build — the owner is
deciding whether this ships and archives. For every blocking and should-fix finding, a 3–6 sentence
story from the owner's perspective in the product's own domain, shaped as cause → what you would
actually observe → why it matters.

If the verdict is `APPROVED`, state explicitly what remains unproven. At minimum: no live request
body has ever been observed for this phase, and the re-pricing path the owner accepted has never
run against a real already-priced item.

## Close

Deposit your report as
`.../handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_3.md` with frontmatter
`plan`, `role: review`, `round: 3`, `verdict`, `date`, `actor`, and a section declaring your **full
write perimeter**. List every mutation probe with proof of revert.

Any owner decision goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision cards:
**Question** (one line), **Story** (2–4 sentences of lived scenario, no artifact citations),
**Branches** (each answer with its lived consequence).
