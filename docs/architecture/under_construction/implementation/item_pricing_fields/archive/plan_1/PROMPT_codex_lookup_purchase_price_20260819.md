---
plan: PLAN_item_pricing_fields_20260818
role: implementer
round: 2
date: 2026-08-19
---

# Codex prompt — purchase price from the item lookup (Track B addendum)

Copy everything below the line into Codex.

---

A follow-up to the item pricing fields, on top of your completed Track B.

**The purchase price is no longer a user input.** It is registered in the external purchase system and arrives through the item lookup. Track A has already replaced the input with a read-only display and is merged — 108 tests green.

**Do not edit anything under `packages/item-economics/src`.**

## What changed on Track A (context, not work for you)

- `ItemPurchasePriceField` (input) is gone; `ItemPurchasePriceDisplay` (read-only) replaces it.
- The display reads `item_pricing.purchase_cost_per_piece` via `useWatch`, so **the form field and the submit path are unchanged** — it just has no input any more.
- When that value is null it renders "Not set — this price comes from the purchase system."
- `ItemPricingFieldGroup` gained an optional `onClearPrices` prop.
- The refusal notice's remedy is now a **button** rather than an instruction (see step 3).

## Your work

1. **Add `purchase_price` to the lookup schema.** In `packages/items/src/types.ts`, `ItemLookupResultSchema` gains:

   ```ts
   purchase_price: z.number().nullable().optional(),
   ```

   Verified against the backend: `backend/app/beyo_manager/services/queries/items/lookup/base.py:18` declares `purchase_price: int | float | None`, and `lookup_item_by_article_number.py:31` always serializes the key. It is a plain number in **kronor, per piece**, with decimals (the backend test uses `1250.5`) — not minor units.

   Use `.nullable().optional()`, not `.nullable()` alone. A `.nullable()` field rejects a *missing* key, and that exact mistake blanked the whole task list on 2026-08-18 when the backend dropped the item money keys. `.optional()` costs nothing and makes an older backend a non-event.

2. **Apply it in the lookup prefill.** Wherever the Internal and Pre-order forms call `form.setValue` from `selectPurchaseApiLookupResult`, add:

   ```ts
   form.setValue("item_pricing.purchase_cost_per_piece", selectedItem.purchase_price ?? null, { shouldDirty: true });
   ```

   Set it to `null` when the lookup carries no price, so a stale value from a previous article number cannot survive into a new one.

3. **Wire `onClearPrices`.** Pass a callback into `ItemPricingFieldGroup` on both forms that sets **both** `item_pricing` values to `null`. This is now the only way a user can empty the purchase price, and the refusal remedy depends on it: the §9.1 message says "Remove the prices from this task", and without this the button does nothing and every resubmit is refused again.

4. **Check the step-field map.** `item_pricing.purchase_cost_per_piece` is still in the validation paths. That is fine — keep it, since a lookup could in principle deliver a negative value — but confirm nothing now blocks the step on a field the user cannot edit.

## Traps

- **Do not convert units in the prefill.** The lookup value is kronor per piece, the same unit the form field holds. `resolveTotalMinor` does the conversion at submit, exactly as before.
- **Do not add a required rule.** Both values remain optional.
- **`purchase_price` only ever arrives from the `purchase_api` source.** Every other lookup handler leaves it `None` via the dataclass default, and `selectPurchaseApiLookupResult` already filters to that source — so no extra guard is needed.

## Definition of done

```bash
npx tsc -p packages/item-economics/tsconfig.json --noEmit
npm run typecheck
npm run test:item-economics      # 108 must stay green
npm run test:task-creation
```

Add a test asserting that a lookup carrying `purchase_price` populates the form value, and that a lookup without one clears it.

## When blocked

Stop and ask. Do not guess and do not widen scope.
