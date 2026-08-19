---
plan: PLAN_item_pricing_fields_20260818
role: implementer
round: 4
date: 2026-08-19
---

# Fix prompt — Item pricing fields, review round 2 findings

Copy everything below the line into the implementer session.

---

You are fixing review round 2 findings on the **item pricing fields** in the ManagerBeyo frontend
monorepo (`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`).

Round 2 returned `CHANGES_REQUESTED`: 1 blocking, 2 should-fix, 5 notes. Your round-3 work was
confirmed good — B1, S1 and S2 are all genuinely closed, verified structurally and by mutation
probe. Nothing you built is being undone.

Read the review handoff
(`.../handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_2.md`) and the plan
(`.../plans/PLAN_item_pricing_fields_20260818.md` — criterion 1 amended, §Copy retired, §9 summary
rewritten) before starting.

## B3 — blocking — a pre-order submits a multiplied purchase cost that never rendered

On the Pre-order form a looked-up purchase price is ingested, multiplied by the lookup's quantity
and submitted **while no pricing UI renders at all** — because the pricing card is gated on
`item.major_category` and `PreOrderFormSchema` never required one. Proven: `major_category:
undefined`, `quantity: 4`, `1250.5` → schema valid → `purchase_cost_minor: 500200`. That figure
becomes the item's valuation and nobody in the building ever saw it.

**Owner decision 2026-08-19: `item.major_category` is mandatory on the Pre-order form.** This was
an unguarded rule that was missed, not a deliberate permissiveness. The owner's reading is backed
by the code: `PreOrderFormSchema`'s `superRefine` carries two explicit *"deliberately"* comments —
for seat position/zone and for the SKU rule — and **none** for the category; the form already
renders `ItemCategorySelectionField` (`PreOrderFormContent.tsx:596`) and already lists both
`item.item_category_id` and `item.major_category` in its step-field map (`:112–113`). Picker
present, wiring present, rule absent.

**Fix.** Add the category requirement to `PreOrderFormSchema`'s `superRefine`, mirroring
`InternalFormSchema` (`types.ts:331`): missing `major_category` → *"Select a category type."* at
`["item", "major_category"]`; present but missing `item_category_id` → *"Select a category."* at
`["item", "item_category_id"]`. Add a comment saying the rule is load-bearing for pricing
visibility — without it the pricing card never renders and a looked-up price is submitted unseen —
so nobody removes it later as redundant.

Do **not** change `ItemPricingFieldGroup`'s category gate, and do not render the price without a
category. With the rule in place the card always renders before submit is reachable.

**Tests.** Assert `PreOrderFormSchema.safeParse` **fails** with no `major_category`, and that the
issue path is `["item","major_category"]`. Then assert the closing of B3 end to end: pre-order
values with no category cannot produce a payload carrying `purchase_cost_minor`.

## S4 — should-fix — the zero boundary has no test

Mutating `applyPurchasePriceLookupResult`'s guard from `purchasePrice >= 0` to `> 0` leaves the
entire task-creation suite green. The code is correct; nothing pins it. A purchase price of exactly
`0` means "this item was free", which the plan's §Arithmetic calls out explicitly, and it must not
collapse into `null` ("we don't know what it cost").

**Fix.** Add a row to the `it.each` in `item-lookup-prefill.test.tsx` asserting `purchase_price: 0`
writes `0`, not `null`. Then run the `>= 0` → `> 0` mutation yourself and confirm it now fails.

## S5 — should-fix — S2's second half has no regression guard

Restoring `"item_pricing.purchase_cost_per_piece"` to `INTERNAL_STEP_FIELDS_MAP.item` leaves the
entire task-creation suite green. No test asserts either step map's contents, so half of round 3's
S2 fix — the half that prompt stressed was required — is held in place by nothing but the diff.

**Fix.** Assert directly that neither step-field map contains the purchase-cost path, and that both
still contain `item_pricing.expected_sale_price_per_piece`. Export the constants for test if they
are not already exported. Then run the restore mutation and confirm it fails.

## N9 — the total-row docstring now teaches the removed rule

`ItemPricingTotalRow.tsx:20` still reads "Only rendered for seats. A wood item is always one piece
…". After your S1 fix it is also rendered for a multi-piece wood lot. Rewrite it to state the
resolved-quantity rule.

## N11 — narrow the purchase-cost error routing (cheap, do it if it stays small)

The dead end round 3 closed is currently closed by one guard, not structurally: both forms still
route `errors.item_pricing` wholesale to the step, the final `form.trigger()` validates
`purchase_cost_per_piece` as `.nonnegative()`, and `ItemPurchasePriceDisplay` still renders no
message. Today `applyPurchasePriceLookupResult` is the only writer and it sanitises — so it is
unreachable — but the trap returns the day a second writer appears.

Either narrow the step-error routing to the expected-sale path, or add a comment at
`pricing-fields.ts` stating that `purchase_cost_per_piece` has no rendering owner and must be
sanitised at every ingestion point. **If narrowing the routing turns out to touch more than the two
`stepErrorMap` expressions, do the comment instead and say so.**

## Explicitly out of scope

- **N12** — `handleLookupResult` writing `undefined` over a user-chosen category. Real, but it
  outlives B3's fix and belongs to its own follow-up. With the category now required it is caught
  at submit rather than silent.
- **N8** — `parseErrorIdentity` with no production caller; routed to the valuation-surface phase.
- **N10** — already folded into the plan by the coordinator. Do not edit the plan.
- **S3, N2, N4, N5** — unchanged destinations from round 1.
- The rounding-order test's title (review lesson 4) — leave it; the coordinator will handle naming.

## Allowed write perimeter

Any file changed outside this list is an automatic finding at re-review.

- `packages/task-creation/src/types.ts`
- `packages/task-creation/src/components/InternalFormContent.tsx` *(only if N11 narrowing is taken)*
- `packages/task-creation/src/components/PreOrderFormContent.tsx` *(same)*
- `packages/item-economics/src/pricing-fields.ts` *(only if the N11 comment is taken)*
- `packages/item-economics/src/components/item-pricing/ItemPricingTotalRow.tsx`
- `packages/task-creation/src/lib/item-lookup-prefill.test.tsx`
- `packages/task-creation/src/lib/item-pricing-payload.test.ts`
- One new or existing task-creation test file for the B3 and S5 assertions.

If a fix needs a file outside this list, **stop and say so**. Note that requiring the category may
surface fixture updates in existing pre-order tests — if so, that is expected; report which
fixtures you touched and why, and if any live outside the perimeter, stop first.

## Mutation probes — required this round

Round 3 ran none, and two of its three fixes shipped without a regression guard. That is what
produced S4 and S5. This round, run and report each of these, reverting after:

1. `purchasePrice >= 0` → `> 0` — must now fail (S4).
2. Restore `purchase_cost_per_piece` to `INTERNAL_STEP_FIELDS_MAP.item` — must now fail (S5).
3. Remove the new `major_category` rule from `PreOrderFormSchema` — must now fail (B3).

A test you have not seen fail proves nothing. Declare each with its result.

## Verification

Report actual counts:

- `npm run typecheck`
- `npx tsc -p packages/task-creation/tsconfig.json --noEmit` — two pre-existing TS2352 in
  `use-shopify-customer-lookup-prefill.test.tsx` are known and out of scope; the root `typecheck`
  script does not cover this package.
- `npm run test:item-economics` (130 at the start of this cycle)
- `npm run test:task-creation` (108 at the start of this cycle)
- ESLint on changed files, using `apps/managers-app/ManagerBeyo-app-managers/eslint.config.js` —
  there is no root flat config. Five inherited diagnostics in the two form components are known.

**Do not start any dev server** — the owner starts them and keeps control.

## Commit

Commit when the fixes reach `IMPLEMENTED`, subject prefixed `CHECKPOINT (not approved):`, on
branch `pipeline/item-economics-phase-1`. Standing authorization — do not stop to ask.

## Close

Deposit your report as
`.../handoffs/implementer/handoff_PLAN_item_pricing_fields_20260818_implement_4.md` with
frontmatter `plan`, `role: implement`, `round: 4`, `state: implemented`, `date`, `actor`, and a
section declaring your **full write perimeter**. Declare every mutation probe with its result and
proof of revert.

Address each item by id (B3, S4, S5, N9, N11) and say plainly if you did not do one.

Any owner decision goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision cards:
**Question** (one line), **Story** (2–4 sentences of lived scenario, no artifact citations),
**Branches** (each answer with its lived consequence).
