---
plan: PLAN_item_pricing_fields_20260818
role: implementer
round: 3
date: 2026-08-19
---

# Fix prompt — Item pricing fields, review round 1 findings

Copy everything below the line into the implementer session.

---

You are fixing review findings on the **item pricing fields** in the ManagerBeyo frontend monorepo
(`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`).

## Read this first — the contract moved under a finished implementation

Round 1 returned `CHANGES_REQUESTED`. The two blocking findings are **not implementation defects**.
The backend retired the §9.1 refusal this phase was built around, on the same day the phase was
implemented, and rewrote the authority document **in place** — same filename, same date in the
name — so nothing looked stale.

`ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM` no longer exists anywhere under `backend/app`. §9.1 is now
*"Inline re-pricing"*: an amount in the request replaces the stored one, an omitted one is
inherited, and if the effective amounts and currency are unchanged the backend writes nothing at
all — no version, no supersession, no audit event.

**The frontend mirror has already been refreshed** (`docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`)
and now carries `mirror_of` / `source_modified` / `source_sha256` frontmatter. Read the current
§9.1, not any quotation of it in an older artifact.

**Owner decisions, both 2026-08-19:**

1. **Re-pricing is allowed and intended.** The frontend keeps sending prices; the backend versions
   them and skips the write when values are unchanged. **Do not add a guard on existing items, and
   do not build a confirmation surface.** This means B2 is dismissed — there is nothing to fix
   there — and B1 reduces to deleting machinery that can no longer fire.
2. **`purchase_price` is per piece.** The existing multiplication is correct. S1 is a display
   defect, not an arithmetic one.

Read the plan
(`docs/architecture/under_construction/implementation/item_pricing_fields/plans/PLAN_item_pricing_fields_20260818.md`)
— criteria 3, 4 and 9 have been amended, and the Review log carries the full reasoning. The review
handoff is at `.../handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_1.md`.

## Scope — three items

### B1 — delete the refusal machinery · blocking

It is unreachable by construction: no `422` carrying that identity can be produced any more. Delete
it rather than leaving it dormant — dormant code reads as a live path to the next reader.

Remove:

- `packages/task-creation/src/lib/inline-pricing-refusal.ts` in full — `isInlinePricingRefusal`,
  `useInlinePricingRefusal`, `INLINE_PRICING_REFUSAL_IDENTITY` — and its test file.
- `packages/item-economics/src/components/item-pricing/ItemPricingRefusalNotice.tsx` and its
  exports `ITEM_PRICING_REFUSAL_TITLE` / `_BODY` / `_ACTION`; drop it from the barrel and
  `src/index.ts`.
- The `showPricedItemRefusal` and `onClearPrices` props on `ItemPricingFieldGroup`, and the four
  tests in `ItemPricingFieldGroup.test.tsx` that exercise them.
- `handleClearPrices` and the `handleInlinePricingError` catch branches in both
  `InternalFormContent.tsx` and `PreOrderFormContent.tsx`.

Check whether `parseErrorIdentity` (`@beyo/item-economics`) still has another caller before
removing it — it may be used elsewhere. If it has none, say so and leave it; it is a general
helper, not refusal-specific.

**Do not delete `ItemPurchasePriceDisplay` or its "comes from the purchase system" copy.** The
read-only display stays; only the refusal notice goes.

The §Copy release-order constraint dies with the notice — it gated copy that no longer exists.
Note that in your handoff; do not edit the plan.

### S1 — wood hides its multiplier · should-fix

`handleLookupResult` writes `form.setValue("item.quantity", selectedItem.quantity)` before any
category is known, and the purchase API supplies a real quantity. For `wood` neither form renders
`ItemQuantityField` and `ItemPricingFieldGroup` renders no `ItemPricingTotalRow`
(`ItemPricingFieldGroup.tsx:43`), but `buildItemFields` still multiplies by that quantity.

A wood article looked up with quantity 4 and purchase price 1 250,50 displays
"Purchase price — 1 250,50 kr" and submits `purchase_cost_minor: 500200`.

Since the owner has confirmed the price is **per piece**, the multiplication is right and the
display is what lies. Fix the display: **show the breakdown row on the wood path whenever the
resolved quantity is greater than 1**, and keep it hidden at quantity 1 (the ordinary wood case,
where a breakdown would be noise). Criterion 3 has been amended to say exactly this.

Do **not** force the pricing quantity to 1 for non-seat categories. That would under-count a real
multi-piece lot and lose money in the other direction.

Then fix the test that encodes the old contradiction: `item-pricing-payload.test.ts` builds its
fixture with `major_category: "wood"` and `quantity: 2` and asserts the multiplied figure. Keep an
assertion for the multiplied payload, and add one proving the breakdown row is now rendered for
that same case. Criterion 3 previously had no automated test at all.

### S2 — a negative looked-up price traps the form · should-fix

The purchase price is read-only, but `item_pricing.purchase_cost_per_piece` is still
`.nonnegative()` and still listed in both step-field maps. Traced end to end there is no exit: the
step blocks, `stepErrorMap.item` turns it red, and `ItemPurchasePriceDisplay` uses `useWatch` only
— no `useController`, no `fieldState`, no `FieldErrorPill` — so **the message is never rendered
anywhere**. There is no input to correct. The value even survives clearing the article number,
because the lookup only writes on a result.

Fix at ingestion, not at the step:

- `applyPurchasePriceLookupResult` writes `null` when the lookup value is negative or non-finite.
- Drop `item_pricing.purchase_cost_per_piece` from **both** step-field maps.

Removing it from the step map alone is not enough — the final step calls `form.trigger()` over
everything and navigates straight back, reproducing the dead end one screen later. Both halves are
required.

Add a test proving a negative lookup value lands as `null` and does not block the step.

## Explicitly out of scope

- **B2** — dismissed by owner decision 1. Do not add an existing-item guard.
- **S3** — the generic `notify.error` in `useCreateTask` toasting raw server strings. With the
  refusal notice gone there is no duplicate-copy problem left; the raw-string toast is a
  pre-existing repo-wide concern (`architecture/13_errors.md`) and belongs to its own phase.
- **N2** — the lookup signature's reach into `ReturnFormContent` and `WorkerInternalFormContent`.
  The reviewer assessed the addition as correct on its merits; recorded as a documented
  consequence, not a defect.
- **N4** — the two pre-existing TS2352 in `use-shopify-customer-lookup-prefill.test.tsx`.
- **N5** — the absent valuation surface. It is the owner's next piece of work, not this cycle's.

## Allowed write perimeter

The re-review runs a verified perimeter check; any file changed outside this list is an automatic
finding, whatever its merit.

- `packages/task-creation/src/lib/inline-pricing-refusal.ts` (delete) and its test (delete)
- `packages/item-economics/src/components/item-pricing/ItemPricingRefusalNotice.tsx` (delete)
- `packages/item-economics/src/components/item-pricing/index.ts`
- `packages/item-economics/src/index.ts`
- `packages/item-economics/src/components/item-pricing/ItemPricingFieldGroup.tsx`
- `packages/item-economics/src/components/item-pricing/ItemPricingFieldGroup.test.tsx`
- `packages/task-creation/src/components/InternalFormContent.tsx`
- `packages/task-creation/src/components/PreOrderFormContent.tsx`
- `packages/task-creation/src/lib/item-lookup-prefill.ts`
- `packages/task-creation/src/lib/item-lookup-prefill.test.tsx`
- `packages/task-creation/src/lib/item-pricing-payload.test.ts`

If a fix appears to need a file outside this list — including `ItemPurchasePriceDisplay.tsx` —
**stop and say so** rather than widening it yourself. Stopping to ask has been the right call four
times on these two plans.

## Verification

Report actual counts, not expected ones:

- `npm run typecheck`
- `npm run test:item-economics` — **132 at the start of this cycle**, not the 103/108 recorded in
  the older handoffs; the production-time phase landed tests in the same package in between.
- `npm run test:task-creation` — 107 at the start of this cycle.
- ESLint on every file you touched. Five inherited diagnostics in the two form components are
  known and out of scope: `navigateToRef.current` render writes, `handleLookupResult` passed as a
  prop, a missing `isSeller` dependency.

**Do not start any dev server** — the owner starts them and keeps control. If you want a browser
check, say so and stop.

## Commit

Commit when the fixes reach `IMPLEMENTED`, subject prefixed `CHECKPOINT (not approved):`, on the
current branch `pipeline/item-economics-phase-1`. Standing authorization for this cycle — do not
stop to ask. Your perimeter baseline is the commit that carries the re-mirrored handoff and the
plan amendments; `git log --oneline -3` will show it as the tip when you start.

## Close

Deposit your report as
`docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/implementer/handoff_PLAN_item_pricing_fields_20260818_implement_3.md`
with frontmatter `plan`, `role: implement`, `round: 3`, `state: implemented`, `date`, `actor`, and
a section declaring your **full write perimeter** — documents, code, and any tool-recorded state.
Declare every mutation probe you ran and reverted.

Address each item by id (B1, S1, S2) and say plainly if you did not do one.

Any owner decision goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision cards:
**Question** (one line), **Story** (2–4 sentences of lived scenario, no artifact citations),
**Branches** (each answer with its lived consequence).
