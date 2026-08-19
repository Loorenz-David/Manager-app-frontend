---
plan: PLAN_item_pricing_fields_20260818
role: implement
round: 4
state: implemented
date: 2026-08-19
actor: Codex
---

# Item pricing fields — fix round 4 handoff

All five requested items are implemented. Pre-order now requires a category before submission,
zero purchase cost is pinned as distinct from unknown cost, both real step maps are regression
tested, the total-row documentation matches multi-piece wood, and the read-only purchase-cost
ingestion constraint is documented at its schema boundary.

## ⚠ OWNER DECISIONS REQUIRED (0)

None.

## Findings addressed

### B3 — require category before Pre-order pricing can submit

Completed.

`PreOrderFormSchema.superRefine` now mirrors the Internal form's two category branches:

- missing `major_category` produces `"Select a category type."` at
  `["item", "major_category"]`;
- a present category type with no `item_category_id` produces `"Select a category."` at
  `["item", "item_category_id"]`.

The source comment records why this is load-bearing: the pricing card is category-gated, so an
unrequired category permits a looked-up per-piece cost to be multiplied and submitted without
rendering.

Tests enumerate both category branches with exact paths/messages. The end-to-end regression case
uses `quantity: 4` and `purchase_cost_per_piece: 1250.5`; schema rejection prevents the validated
normalization path from producing any payload, including `purchase_cost_minor: 500200`.

Requiring category exposed the expected `sku-preview.test.tsx` fixtures. Its shared submittable
Pre-order fixture now supplies a valid wood category and category ID, and the manual-SKU override
no longer replaces those valid fixture fields with defaults. This file is the prompt's permitted
one existing task-creation test file for B3/S5 assertions.

### S4 — pin the zero boundary

Completed.

The ingestion table now includes `purchase_price: 0` with exact expected form value `0`. Negative,
`NaN`, and both infinity rows still expect `null`, and every row verifies form validation remains
passable.

### S5 — pin both step-field maps

Completed.

`INTERNAL_STEP_FIELDS_MAP` and `PRE_ORDER_STEP_FIELDS_MAP` are exported for direct regression
testing. The two-row test asserts each map excludes
`item_pricing.purchase_cost_per_piece` and retains
`item_pricing.expected_sale_price_per_piece`. Narrow ESLint suppressions explain the non-component
exports and avoid introducing new fast-refresh diagnostics.

### N9 — correct the total-row documentation

Completed.

The docstring now states that the row renders for seats and for any other category whose resolved
quantity exceeds one; resolved quantity one remains hidden because the row would only restate the
price.

### N11 — document the read-only ingestion boundary

Completed using the prompt's comment fallback.

Narrowing routing requires more than the two `stepErrorMap` expressions: each form also routes
whole-form errors during its final `onBeforeAdvance` validation, for four expressions total. The
schema comment therefore records that `purchase_cost_per_piece` is lookup-owned/read-only, has no
field-error renderer, and every ingestion point must reject negative or non-finite values before
writing it.

## Required mutation probes

All probes were applied to the named production site, observed red, reverted with `apply_patch`,
and checksum-verified. Mutation-touched files are listed separately from the final write perimeter
below.

1. **S4 — `purchasePrice >= 0` → `> 0`.** Focused lookup-prefill suite: **1 failed, 6 passed**.
   The zero row received `null` instead of `0`. Reverted; restored SHA-256
   `d96e97329490b91b316fd93c2a815e9fa173352b18ae71484c0072cd1845492b`.
2. **S5 — restore `purchase_cost_per_piece` to `INTERNAL_STEP_FIELDS_MAP.item`.** Focused
   sku-preview/step-map suite: **1 failed, 14 passed**. The Internal row found the forbidden path;
   the Pre-order row remained green. Reverted and rerun after the final lint comment; restored
   SHA-256 `8d72b677fd916882e71ebdab139b756343a2c26d891205a31a0f9462ad00dc7f`.
3. **B3 — remove the new Pre-order category rule.** Focused item-pricing payload suite:
   **3 failed, 9 passed**. Both exact category branches and the hidden-price normalization gate
   failed. Reverted; restored SHA-256
   `c89403320567216ace9da6f124d42464159d8caec8a1ea16efeef4e21a437b9b`.

The restored focused set passed **34/34**; the final S5 file rerun passed **15/15**.

### Mutation-only touched files

- `packages/task-creation/src/lib/item-lookup-prefill.ts` — S4 mutation, fully reverted; no final
  cycle diff.
- `packages/task-creation/src/components/InternalFormContent.tsx` — S5 mutation, reverted; the
  file's final diff is only the intentional map export/comment.
- `packages/task-creation/src/types.ts` — B3 mutation, reverted; the file's final diff is the
  intended category rule/comment.

## Verification

- `npm run typecheck` — pass.
- `npx tsc -p packages/task-creation/tsconfig.json --noEmit` — only the two known, out-of-scope
  TS2352 diagnostics in `use-shopify-customer-lookup-prefill.test.tsx` at lines 196 and 450.
- `npm run test:task-creation` — 18 files, **114/114 passed**.
- `npm run test:item-economics` — 9 files, **122/122 passed**. The prompt baseline is 130; eight
  production-time tests were removed by concurrent, unrelated workspace work that appeared during
  this cycle. This item-pricing cycle changes only a docstring and schema comment in that package
  and did not remove those tests.
- Focused implementation set — 3 files, **34/34 passed**.
- ESLint over every changed TypeScript/TSX file with the managers-app flat config — exactly the
  five documented inherited diagnostics in the two form components (four errors, one warning),
  with no new diagnostics.
- `git diff --check` — pass.
- No dev server or browser check was started.

## Judgment calls

- Category tests enumerate missing type and missing category ID separately so each branch's own
  predicate is the only reason it fails.
- `sku-preview.test.tsx` was selected as the prompt's one permitted existing task-creation test
  file because its success fixtures were the only out-of-list fixtures invalidated by the new
  rule; placing S5's direct assertions there kept the cycle inside the declared perimeter.
- N11 used the explicit comment fallback because complete narrowing spans four routing expressions,
  not two.

## Concurrent workspace state

The worktree was clean at cycle start. During focused verification, unrelated production-time
changes appeared under `packages/item-economics/src/components/production-time/`, its production-
time DTO/view-model files, and `packages/item-economics/src/index.ts`. They were not authored,
edited, reverted, staged, or committed by this cycle. Their removal of eight tests explains the
item-economics count of 122 rather than the prompt's 130 baseline. The checkpoint stages only the
files declared below.

## Full write perimeter

### Code and tests

- `packages/task-creation/src/types.ts` — edited.
- `packages/task-creation/src/components/InternalFormContent.tsx` — edited.
- `packages/task-creation/src/components/PreOrderFormContent.tsx` — edited.
- `packages/item-economics/src/pricing-fields.ts` — edited.
- `packages/item-economics/src/components/item-pricing/ItemPricingTotalRow.tsx` — edited.
- `packages/task-creation/src/lib/item-lookup-prefill.test.tsx` — edited.
- `packages/task-creation/src/lib/item-pricing-payload.test.ts` — edited.
- `packages/task-creation/src/sku-preview.test.tsx` — edited as the one permitted existing
  task-creation test file.

### Documents

- `docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/implementer/handoff_PLAN_item_pricing_fields_20260818_implement_4.md` — created (this file).

### Tool-recorded state

None. No architecture graph exists in this repository and no generated report or test-result file
was changed by this cycle.
