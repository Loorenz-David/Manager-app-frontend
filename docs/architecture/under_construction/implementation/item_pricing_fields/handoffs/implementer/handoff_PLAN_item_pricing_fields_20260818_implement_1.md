---
plan: PLAN_item_pricing_fields_20260818
role: implement
round: 1
state: implemented
date: 2026-08-19
actor: Codex
---

# Item pricing fields — Track B implementation handoff

Track B is implemented and the prescribed checks are green. The task-creation package now owns
the host-form logic around Track A's pricing seam, including optional form values, payload
normalization, Shopify reuse, inline refusal recovery, mounting and package wiring.

## ⚠ OWNER DECISIONS REQUIRED (0)

No owner decision is required. The already-resolved optionality decision controls over stale
acceptance criterion 4.

## What was built

- Composed `ItemPricingFieldsSchema` into Internal and Pre-order, with null defaults and reset
  coverage in both forms.
- Added both pricing paths to step validation and both nested error groups to item-step status
  mapping.
- Normalized per-piece kronor through `resolveTotalMinor`; absent values omit their keys, explicit
  zero remains zero, and currency appears only with an amount.
- Reused the expected-sale minor total for Shopify's two-decimal `product.price`; removed the
  price guard while retaining shop and inventory guards.
- Added the priced-existing-item error identity path, inline notice state, item-step navigation
  and clear-on-either-price-change behavior.
- Removed the old product-price component/arithmetic/tests and all non-documentation
  `product_unit_price` references.
- Mounted `ItemPricingFieldGroup` below seat quantity and in a dedicated wood card on both forms.
- Added the task-creation peer dependency and lockfile entry.

## Verification

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit` — pass.
- `npm run typecheck` — pass, exit 0 across all five apps and the shared-package chain.
- `npm run test:item-economics` — 9 files, 103 tests pass.
- `npm run test:task-creation` — 18 files, 105 tests pass.
- Managers `location-and-seat-validation.test.ts` — 1 file, 8 tests pass.
- `git diff --check` — pass.
- Static search under `packages/` and `apps/` — zero `product_unit_price`, `ProductPriceField` or
  `pre-order-price` hits (generated Playwright report excluded).
- Static dependency check — zero imports of `@beyo/task-creation` or `@beyo/tasks` beneath
  `packages/item-economics/src`.
- Targeted ESLint for the new refusal helper and its test — pass. The broader touched-file lint
  command remains non-zero only on pre-existing `navigateToRef.current` render writes,
  `useEffectEvent` callbacks passed as props, and one existing missing `isSeller` dependency in
  the two form components; Track B introduced none of those lines.

The package-local `npx tsc -p packages/task-creation/tsconfig.json --noEmit` is not one of the
plan's prescribed commands and still reports two pre-existing TS2352 mock-cast diagnostics in
`use-shopify-customer-lookup-prefill.test.tsx` (the reported lines were not changed by Track B).
The repository's prescribed `npm run typecheck` is green.

## Judgment calls and plan observations

- Acceptance criterion 4 says empty prices block, while Track B step 2, owner decisions 1/2a and
  criterion 10 say they are optional. The later explicit owner resolution was treated as
  authoritative; the contradiction is recorded in the plan Review log.
- `19.99 × 3` proves display/payload agreement but does not distinguish rounding order. Tests
  retain that exact agreement case and separately use Track A's divergent `19.995 × 2` case.
- No item valuation/edit surface was found in the tree. The protected Track A refusal copy was
  not edited; §Copy therefore remains a release gate: co-ship the surface or trim the second
  clause before release.
- The worktree already contained overlapping, uncommitted money-key removal work and the entire
  Track A package was untracked. No checkpoint commit was created because it could not form a
  truthful standalone Track B baseline without claiming concurrent work.
- No architecture graph exists and this plan enumerates no mutation probes.

## Mutation-probe perimeter

No mutation probes were named or run, so no files were touched and reverted for probes.

## Full session write perimeter

Track B source and wiring:

- `packages/task-creation/package.json`
- `package-lock.json`
- `packages/task-creation/src/types.ts`
- `packages/task-creation/src/components/InternalFormContent.tsx`
- `packages/task-creation/src/components/PreOrderFormContent.tsx`
- deleted `packages/task-creation/src/components/ProductPriceField.tsx`
- deleted `packages/task-creation/src/components/ProductPriceField.test.tsx`
- `packages/task-creation/src/lib/normalize-task-form-payload.ts`
- `packages/task-creation/src/lib/pre-order-form-default-values.ts`
- deleted `packages/task-creation/src/lib/pre-order-price.ts`
- deleted `packages/task-creation/src/lib/pre-order-price.test.ts`
- added `packages/task-creation/src/lib/inline-pricing-refusal.ts`

Tests and fixtures:

- added `packages/task-creation/src/lib/inline-pricing-refusal.test.ts`
- added `packages/task-creation/src/lib/item-pricing-payload.test.ts`
- `packages/task-creation/src/lib/normalize-task-form-payload.test.ts`
- `packages/task-creation/src/hooks/use-shopify-customer-lookup-prefill.test.tsx`
- `packages/task-creation/src/sku-preview.test.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/items/location-and-seat-validation.test.ts`

Coordination artifacts:

- `docs/architecture/under_construction/implementation/item_pricing_fields/PLAN_item_pricing_fields_20260818.md`
- this handoff

No file under `packages/item-economics/src` was modified.

## Remaining verification

- The plan's live managers Playwright request-body flow was not run; the same payload invariants
  are covered at the normalizer boundary, and no backend/browser environment was started.
- Review the release ordering of the refusal copy against the future item valuation/edit surface.
