---
plan: PLAN_item_pricing_fields_20260818
role: implement
round: 3
state: implemented
date: 2026-08-19
actor: Codex
---

# Item pricing fields — fix round 3 handoff

All three requested findings are implemented. The dead priced-item refusal path is removed, a
multi-piece wood lookup now shows the same multiplication used by payload normalization, and an
invalid lookup purchase price is discarded before it can enter form validation.

## ⚠ OWNER DECISIONS REQUIRED (0)

None.

## Findings addressed

### B1 — delete the refusal machinery

Completed.

- Deleted `inline-pricing-refusal.ts` and its test file.
- Deleted `ItemPricingRefusalNotice.tsx` and removed all of its public exports.
- Removed `showPricedItemRefusal` and `onClearPrices` from `ItemPricingFieldGroup` and both host
  forms.
- Removed `handleClearPrices`, the refusal hook, and both forms' refusal-specific create-error
  branches. Internal task creation now follows its ordinary mutation failure path; Pre-order keeps
  its existing generic overlay cleanup.
- Removed every refusal-specific test present in `ItemPricingFieldGroup.test.tsx`. The prompt says
  four tests were present there; the baseline file contained three, and all three were removed.
- Confirmed zero remaining hits for the retired identity or its refusal symbols under `packages/`
  and `apps/`.

`parseErrorIdentity` has no remaining production caller under `packages/` or `apps/`; its only
remaining references are its public export, implementation, and general-helper tests. It was left
in place as directed.

The §Copy release-order constraint dies with `ItemPricingRefusalNotice`; no copy remains to gate.
The plan was not edited, per the fix prompt.

### S1 — expose the wood multiplier

Completed.

`ItemPricingFieldGroup` now renders totals when the category is `seat` or when the resolved
quantity is greater than one. Ordinary wood quantity one remains compact. A wood quantity-two
component test asserts both the visible `2 pcs × 1 250,5 kr` breakdown and its `2 501 kr` total,
while the existing task-creation payload case continues to assert multiplication at quantity two.

### S2 — reject unusable lookup prices at ingestion

Completed.

`applyPurchasePriceLookupResult` writes `null` for negative values, `NaN`, and either infinity;
finite values greater than or equal to zero remain accepted. The read-only purchase-cost path was
removed from both form step-field maps. The editable expected-sale-price path remains so its
field-level validation continues to work.

The lookup-prefill test enumerates negative, `NaN`, positive-infinity, and negative-infinity
inputs. Each case asserts that the form receives `null` and that schema-backed validation passes,
so the sanitized upstream value cannot block the step or final validation.

## Verification

- `npm run typecheck` — pass.
- `npm run test:item-economics` — 9 files, **130/130 passed**. The cycle starts from 132, removes
  three obsolete refusal tests, and adds one wood multiplier test.
- `npm run test:task-creation` — 18 files, **108/108 passed**. The cycle starts from 107, removes
  three obsolete refusal tests, and adds four enumerated invalid-ingestion cases.
- Focused item-pricing component suite — **14/14 passed**.
- Focused lookup-prefill and payload suites — 2 files, **15/15 passed**.
- ESLint with the managers-app flat config over every surviving touched TypeScript/TSX file — the
  only diagnostics are the five explicitly inherited diagnostics in the prompt: four errors for
  the two `navigateToRef.current` render writes and the two `handleLookupResult` prop uses, plus
  one warning for Pre-order's missing `isSeller` dependency. Every other touched file is clean.
- `git diff --check` — pass.
- Refusal-symbol grep under `packages/` and `apps/` — zero hits.
- No dev server or browser check was started.

The initial root-level `npx eslint <files>` command could not find a root flat config. It made no
changes. The lint check was rerun successfully with
`apps/managers-app/ManagerBeyo-app-managers/eslint.config.js`, which is the owning app's existing
configuration.

## Judgment calls

- The wood display predicate uses the already-resolved quantity, not the raw value, so null,
  missing, zero, and negative quantities retain the established one-piece fallback and do not
  render a noisy breakdown.
- The prompt's “four tests” count for the field-group refusal surface disagreed with the baseline
  source, which contained three. No unrelated field-group test was removed to manufacture the
  stated count.
- Internal form's refusal-only `try/catch` was removed rather than replaced with a catch-and-rethrow;
  generic mutation failures still reject exactly as they did through that former rethrow branch.

## Mutation probes

No mutation probe was named by the fix prompt, and none was run. No production or test file was
temporarily changed outside the implementation diff.

## Full write perimeter

### Code and tests

- `packages/task-creation/src/lib/inline-pricing-refusal.ts` — deleted.
- `packages/task-creation/src/lib/inline-pricing-refusal.test.ts` — deleted.
- `packages/item-economics/src/components/item-pricing/ItemPricingRefusalNotice.tsx` — deleted.
- `packages/item-economics/src/components/item-pricing/index.ts` — edited.
- `packages/item-economics/src/index.ts` — edited.
- `packages/item-economics/src/components/item-pricing/ItemPricingFieldGroup.tsx` — edited.
- `packages/item-economics/src/components/item-pricing/ItemPricingFieldGroup.test.tsx` — edited.
- `packages/task-creation/src/components/InternalFormContent.tsx` — edited.
- `packages/task-creation/src/components/PreOrderFormContent.tsx` — edited.
- `packages/task-creation/src/lib/item-lookup-prefill.ts` — edited.
- `packages/task-creation/src/lib/item-lookup-prefill.test.tsx` — edited.
- `packages/task-creation/src/lib/item-pricing-payload.test.ts` — edited.

### Documents

- `docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/implementer/handoff_PLAN_item_pricing_fields_20260818_implement_3.md` — created (this file).

### Tool-recorded state

None. No architecture graph exists in this repository, and no generated report or test-result file
was changed.
