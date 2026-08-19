---
plan: PLAN_item_pricing_fields_20260818
role: implement
round: 2
state: implemented
date: 2026-08-19
actor: Codex
---

# Item pricing fields — purchase-price lookup addendum handoff

The lookup addendum is implemented. Purchase-system prices now cross the response-schema boundary,
prefill the unchanged purchase-cost form path in both host forms, clear stale prices when absent,
and can be removed together with the expected sale price through the refusal remedy.

## ⚠ OWNER DECISIONS REQUIRED (0)

No owner decision is required.

## What was built

- Added `purchase_price: z.number().nullable().optional()` to `ItemLookupResultSchema`, preserving
  compatibility with an older backend that omits the key.
- Added one shared purchase-price form write used by both Internal and Pre-order. Decimal kronor
  are copied without unit conversion; missing or null lookup values write `null` with
  `shouldDirty: true`.
- Included the canonicalized lookup price in `createLookupResultSignature`, so a same-article
  refresh whose only change is price is applied instead of suppressed as a duplicate.
- Wired every seat and wood `ItemPricingFieldGroup` mount on both forms to a callback that clears
  `item_pricing.purchase_cost_per_piece` and
  `item_pricing.expected_sale_price_per_piece` together.
- Added regression coverage using a real React Hook Form instance and the response Zod schema: a
  decimal `1250.5` lookup populates the purchase-cost path and the next response with a missing key
  clears it. A second test proves price changes affect the lookup signature.
- Confirmed both step-field maps retain the purchase-cost path. The existing nullable,
  nonnegative pricing schema means `null` does not block the step while a negative lookup value
  still fails on the correct path.

## Verification

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit` — pass.
- `npm run typecheck` — pass across all five apps and the package chain.
- `npm run test:item-economics` — 9 files, 108/108 tests pass.
- `npm run test:task-creation` — 19 files, 107/107 tests pass.
- Focused lookup-prefill test — 1 file, 2/2 tests pass.
- `git diff --check` — pass.
- Targeted ESLint reports only the same pre-existing form-component diagnostics recorded by the
  first Track B handoff: render-time `navigateToRef.current` writes, `useEffectEvent` callbacks
  passed as props, and the existing missing `isSeller` dependency warning. The schema, shared
  helper, and new test have no lint findings.
- Static scope check confirms no addendum edit under `packages/item-economics/src`.

The package-local `npx tsc -p packages/task-creation/tsconfig.json --noEmit` still reports the two
pre-existing TS2352 mock-cast diagnostics in
`use-shopify-customer-lookup-prefill.test.tsx`, as recorded in the first Track B handoff. The
prescribed repository `npm run typecheck` is green.

## Judgment calls and observations

- The prompt did not explicitly mention the duplicate-result signature. It had to include
  `purchase_price`: otherwise a repeated lookup for the same article with a newly registered or
  corrected purchase price could be discarded before the form write. Missing and explicit null
  are canonicalized to the same signature because both intentionally clear the form value.
- The identical form write is centralized in `item-lookup-prefill.ts` so Internal and Pre-order
  cannot drift on null-clearing or dirty-state behavior. The host-specific clear callbacks stay in
  each form because they operate on that form's own React Hook Form instance.
- No checkpoint commit was created. The target files already contain overlapping uncommitted Track
  B work and the repository contains concurrent uncommitted changes, so an addendum-only checkpoint
  cannot be represented truthfully without claiming unrelated work.
- No architecture graph exists, and the addendum names no mutation probes.

## Mutation-probe perimeter

No mutation probes were named or run, so no files were touched and reverted for probes.

## Full session write perimeter

Implementation:

- `packages/items/src/types.ts`
- `packages/task-creation/src/lib/item-lookup-prefill.ts`
- `packages/task-creation/src/components/InternalFormContent.tsx`
- `packages/task-creation/src/components/PreOrderFormContent.tsx`

Tests:

- `packages/task-creation/src/lib/item-lookup-prefill.test.tsx`

Coordination artifacts:

- `docs/architecture/under_construction/implementation/item_pricing_fields/PLAN_item_pricing_fields_20260818.md`
- this handoff

No file under `packages/item-economics/src` was modified.
