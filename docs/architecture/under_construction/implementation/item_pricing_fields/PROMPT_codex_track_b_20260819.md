# Codex prompt — Item pricing fields, Track B (logic)

**Precondition:** Track A must be built and merged first. Do not send this until
`packages/item-economics/src/lib/item-pricing.ts`, `src/pricing-fields.ts` and
`src/components/item-pricing/` exist — steps 1 and 4 below import from all three.

Copy everything below the line into Codex.

---

You are implementing **Track B (the logic layer)** of the item pricing fields in the ManagerBeyo frontend monorepo.

**Repo root:** `/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`

## Read first, in this order

1. `docs/architecture/under_construction/implementation/item_pricing_fields/PLAN_item_pricing_fields_20260818.md` — your specification. §Track B lists your eight steps in build order. Follow it literally.
2. `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` **§9, §9.1, §9.2** — the inline-pricing contract. Ignore the rest of that handoff; it covers surfaces that are not in scope here.
3. `task_system/frontend_contract_goal_mapping_guide.md`, then the contracts it routes you to for form and DTO work — `09_forms.md`, `24_dto.md`, `02_types.md`, `13_errors.md`.
4. `packages/item-economics/src/lib/item-pricing.ts` and `src/pricing-fields.ts` — the Track A seam you build against.
5. `packages/task-creation/src/components/ProductPriceField.tsx` and `lib/pre-order-price.ts` — **what you are deleting**. Read them to know what has to be unwound, not as a pattern to copy.

## What already exists — do not rebuild or modify

Track A is built and tested: the pricing arithmetic, the two field components, the total row, the field group and the field schema. Everything marked `[A]` in the plan's §Track A file list is finished.

**Do not edit any `[A]` file.** If the seam looks wrong, stop and report rather than changing it.

## What you are building

The eight steps in the plan's §Track B: compose the field schema into both form schemas → no required rules → step wiring → payload normalization → the `ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM` error path → the `product_unit_price` replacement → mounting → package wiring.

## Traps — each is a real bug, not a style note

1. **Amounts are integer minor units.** Round per-piece to öre **first**, then multiply by quantity: `round(perPiece × 100) × quantity`. Never `round(perPiece × quantity × 100)` — that lands a krona away from the total the field displays on values like `19.99 × 3`. Both the display and the payload must call the same Track A function.
2. **Omit, never zero.** When a price field is empty, the key is absent from the payload. `0` is a real price meaning free, and forging it would create a valuation the user never entered.
3. **`item.currency` only when an amount is present.** Sending an amount without it is a `422`; sending it alone is pointless. Use `INLINE_PRICING_CURRENCY` from `@beyo/item-economics`, never the string literal.
4. **These are NOT the legacy money keys.** `item.item_value_minor` / `item.item_cost_minor` / `item.item_currency` were removed from the frontend on 2026-08-18 and are still rejected by the backend (§1.2). The new trio is `purchase_cost_minor` / `expected_sale_price_minor` / `currency`. Do not reintroduce the old names.
5. **Both fields are optional.** Do **not** add `superRefine` required rules on either form. This is a deliberate owner decision, not an oversight.
6. **Relax the Shopify guard.** `buildShopifyPreorderSection` currently returns `undefined` when the price is null, which would silently stop pre-orders producing products now that the field is optional. Drop `price == null || price <= 0` from the guard, keep the shop-integration and inventory checks, and make `product.price` a **conditional key** — omitted when there is no price, never `"0.00"`.
7. **Reset defaults in two places per form.** The Internal form resets inline inside `onSubmit` as well as declaring `defaultValues`. Miss the inline one and a price leaks onto the next task the user creates.
8. **`product_unit_price` is a 14-site unwind**, not a rename. Two separate error-map references in `PreOrderFormContent` (~309 and ~415), plus three test fixtures — `sku-preview.test.tsx`, `lib/pre-order-price.test.ts`, and `apps/managers-app/.../features/items/location-and-seat-validation.test.ts`. Grep for it and confirm zero remain.
9. **`@beyo/item-economics` must never import `@beyo/task-creation` or `@beyo/tasks`.** The dependency runs the other way.
10. **The refusal message keeps the user on the item step.** Render it beside the pricing fields, not as a transient toast — the user has to clear those fields to proceed. Clear the message when either price changes. No schema flag: the fields are optional, so clearing and resubmitting is already valid.
11. **Copy ordering constraint.** The refusal message's second clause points at an item edit surface that is being built next. If this ships before that surface, drop the clause.

## Definition of done

```bash
npx tsc -p packages/item-economics/tsconfig.json --noEmit
npm run typecheck
npm run test:item-economics
npm run test:task-creation
```

Plus every item in the plan's §Acceptance criteria — in particular 5 (integer minor amounts), 6 (keys absent, never `0`), 7 (display and payload agree on `19.99 × 3`), 11 (`product_unit_price` gone; Shopify price equals `expected_sale_price_minor / 100`) and 12 (a priceless pre-order still emits its `shopify_preorder` section).

## When you are blocked

If the plan is silent, ambiguous, or contradicted by the code, **stop and ask**. Do not guess and do not widen scope. Add a note to the plan's §Review log describing what you found. Two earlier sessions caught real plan defects that way; it is the expected behaviour, not a failure.

Report at the end: what you built, what you verified and how, what you could not verify, and anything in the plan that turned out to be wrong.
