# PLAN_item_pricing_fields_20260818

## Metadata

- Plan ID: `PLAN_item_pricing_fields_20260818`
- Status: `under_construction`
- Owner agent: `Claude Opus 5` (plan author + visual implementer)
- Logic implementer: `Codex`
- Created at (UTC): `2026-08-18T00:00:00Z`
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` **§9 (inline pricing at task creation)**, §1.2, §6
- Depends on: the money-key migration completed 2026-08-18 — §9 states the new trio is *not* the legacy `item_value_minor` / `item_cost_minor` / `item_currency` keys, which are still rejected

---

## Goal and intent

- **Goal:** collect an item's **purchase price** and **expected sale price** during task creation,
  as two per-piece number fields owned by `@beyo/item-economics` and composed into the Internal
  and Pre-order forms.
- **Why now:** the frontend has no way to price an item since the money-key migration. Until this
  ships, every item in the workspace is `item_unvalued`, and the Production time widget shows
  "This item has no price" on every task.
- **Non-goals:**
  - The standalone valuation surface (`PUT /api/v1/item-economics/items/{id}/valuation`) for
    re-pricing an existing item. That is the *other* half of pricing and is required by §9.1 —
    but it is its own feature.
  - The Return form and the Worker Internal form. Only Internal and Pre-order in this plan —
    returned items nearly always already exist in the system, so inline pricing would mostly hit
    the §9.1 refusal (§Decisions, item 5).
  - Any currency choice. Currency is fixed (see §Currency).

---

## The backend contract — §9, in short

`POST /api/v1/tasks` accepts a **trio** inside its `item` block:

| Field | Type | Rule |
|---|---|---|
| `item.purchase_cost_minor` | integer minor units, `>= 0` | optional |
| `item.expected_sale_price_minor` | integer minor units, `>= 0` | optional |
| `item.currency` | enum | **required as soon as either amount is present** |

Sending an amount without `item.currency` is a `422`:
`"item.currency is required when an inline item price is provided"`.

**The refusal that matters (§9.1).** Task creation resolves the item first — by `client_id`, or by
`article_number` / `sku`. If it matches an **existing** item that already has a current
valuation, sending the trio is refused with
`ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM`, `422`, **and the whole task creation is rolled back** —
no task, no task-item, nothing. The rule in one line: *inline pricing is for an item's birth;
changing an existing item's price is always the valuation endpoint.*

This is reachable from the Internal form today, which looks items up by article number. See §Decisions, item 1.

**What happens after (§9.2).** When the item ends up valued and the workspace is configured, task
creation also commits the evaluation, best effort, silently. The create response looks identical
whether it committed or skipped, so the form must not claim a budget was calculated.

---

## Division of labour

Same two-track split that worked for the Production time widget.

| Track | Owner | Owns |
|---|---|---|
| **A — Visual** | Claude | The two field components, the total-breakdown block, the pure pricing arithmetic + its tests, and the field-schema shape |
| **B — Logic** | Codex | Form schema composition, conditional required rules, step-field maps, step error mapping, payload normalization, the `ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM` error path, mounting in both forms, tests |

---

## Precedent to follow — read this before designing anything

`packages/task-creation/src/components/ProductPriceField.tsx` already solves almost exactly this
problem for the Shopify pre-order price:

- a per-piece `NumberInput` with `allowDecimal`, `inputMode="decimal"`, `unitLabel="kr / pc"`;
- a live breakdown block — `3 pcs × 5 200 kr` on the left, the bold total on the right;
- wrapped in `FloatingKeyboardBar` with `useKeyboardAccessoryPriority`, so the running total
  stays visible above the mobile keyboard while the user types;
- id/testid suffixing (`-floating`) because both copies are in the DOM at once;
- arithmetic isolated in `lib/pre-order-price.ts` and shared by the field and the normalizer, so
  the displayed total and the submitted total can never drift.

**The new fields adopt this shape** — and then `ProductPriceField` itself is deleted, because the
expected sale price replaces it (§Decisions, item 2). The one deliberate difference is the
keyboard tray (§Decisions, item 3).

---

## Field ownership and form shape

The fields belong to `@beyo/item-economics`, consumed by `@beyo/task-creation`.

Dependency direction is `@beyo/task-creation` → `@beyo/item-economics`. **`@beyo/item-economics`
must not import `@beyo/task-creation`** — the same rule that keeps it independent of
`@beyo/tasks`. The small quantity-resolution helper is therefore duplicated rather than imported
from `lib/pre-order-price.ts`; that duplication is intentional and should carry a comment.

Following the existing composition pattern (`item_upholstery: ItemUpholsteryFieldsSchema` from
`@beyo/upholstery`), the package exports:

```ts
// packages/item-economics/src/pricing-fields.ts   [A authors the shape, B wires it]

/** Per piece, in kronor as typed. Converted to minor units at submit. */
export const ItemPricingFieldsSchema = z.object({
  purchase_cost_per_piece: z.number().nonnegative().nullable(),
  expected_sale_price_per_piece: z.number().nonnegative().nullable(),
});
```

Composed into both form schemas as `item_pricing`, giving field paths
`item_pricing.purchase_cost_per_piece` and `item_pricing.expected_sale_price_per_piece`.

---

## Currency

Always `"swedish_krona"`. Not a user choice, no picker, no form field.

`item.currency` is required by the backend the moment either amount is present, so the normalizer
emits it whenever it emits either amount, and omits it when it emits neither. A single exported
constant in `@beyo/item-economics` — `INLINE_PRICING_CURRENCY` — so the value has one home when a
currency choice does eventually arrive.

Note the currency trap in the configuration handoff §7: an item priced in a currency the
workspace configuration does not use yields `currency_mismatch` and no budget. With a hard-coded
`swedish_krona` this cannot be hit from the form, but it is why the constant exists rather than a
string literal at the call site.

---

## Visibility rules

Both fields render **only once `item.major_category` is set** — the same watch the Internal and
Pre-order forms already use to gate the quantity card.

| `major_category` | Fields | Quantity field | Breakdown line |
|---|---|---|---|
| unset | hidden | hidden | — |
| `seat` | shown, below the quantity card | shown | **shown** |
| `wood` | shown | not rendered (always 1 piece) | **hidden** |

For `wood`, quantity is not editable and is always one piece, so `3 pcs × 1 200 kr = 3 600 kr`
would be noise — the number typed *is* the number saved. The field still submits through the same
arithmetic, with quantity resolving to 1.

---

## Arithmetic — `[A]`

`packages/item-economics/src/lib/item-pricing.ts`, pure, unit-tested:

```ts
export const INLINE_PRICING_CURRENCY = "swedish_krona";

/** Quantity is only editable for seats; missing or non-positive means one piece. */
export function resolvePricingQuantity(quantity: number | null | undefined): number;

/** Kronor per piece → integer minor units per piece. */
export function toMinorUnits(perPiece: number): number;

/** The value actually submitted: per-piece minor units × quantity. */
export function resolveTotalMinor(
  perPiece: number | null | undefined,
  quantity: number | null | undefined,
): number | null;

export function formatPrice(value: number): string;   // "1 200 kr", sv-SE grouping
export function formatPieces(quantity: number): string; // "3 pcs" / "1 pc"
```

**Rounding rule — round to minor units first, then multiply.**
`Math.round(perPiece * 100) * quantity`, never `Math.round(perPiece * quantity * 100)`.

The first form guarantees the submitted total is an exact multiple of the per-piece price the
user typed and the breakdown displayed. The second can land a krona away from
`quantity × displayed per-piece` on values like `19.99 × 3`, which is precisely the kind of
discrepancy a manager will notice and not trust. The breakdown and the payload derive from the
same function, as in `lib/pre-order-price.ts`.

`resolveTotalMinor` returns `null` for a null/non-finite input, so "not filled in" never becomes
`0` — a zero purchase cost is a meaningful value and must not be forged.

**The Shopify pre-order price derives from the same value**, never from a parallel calculation:

```ts
/** Kronor decimal string for the Shopify product, from the same total. */
export function toMajorUnitString(totalMinor: number): string; // 480000 -> "4800.00"
```

`shopify_preorder.product.price = toMajorUnitString(totalMinor)`. The existing
`resolvePreOrderTotalPrice` rounds differently (`round(unit x qty x 100) / 100`); routing both
consumers through `resolveTotalMinor` is what guarantees the Shopify product and the item's
valuation carry the identical figure.

---

## Track A — visual specification (Claude)

```
packages/item-economics/src/
├── lib/
│   ├── item-pricing.ts                       [A] arithmetic + currency constant
│   └── item-pricing.test.ts                  [A]
├── pricing-fields.ts                         [A] ItemPricingFieldsSchema + types
└── components/item-pricing/
    ├── index.ts                              [A]
    ├── ItemPurchasePriceField.tsx            [A]
    ├── ItemExpectedSalePriceField.tsx        [A]
    ├── ItemPricingTotalRow.tsx               [A] shared breakdown block
    ├── ItemPricingFieldGroup.tsx             [A] both fields + visibility gate
    ├── item-pricing-fixtures.ts              [A]
    └── ItemPricingFieldGroup.test.tsx        [A]
```

### Each field

Modelled on `ProductPriceField`:

- `FieldLabelRow` with the label and a `FieldErrorPill` fed from `fieldState.error`.
- `NumberInput`: `min={0}`, `allowDecimal`, `inputMode="decimal"`, `unitLabel="kr / pc"`,
  `invalid={Boolean(error)}`, `step={100}` (§Decisions, item 4).
- Labels: **"Purchase price (kr)"** and **"Expected sale price (kr)"**, each suffixed
  " per piece" only when the breakdown is shown, so the wood case does not claim a per-piece
  meaning it cannot show.
- Placeholders: `e.g. 1200` and `e.g. 4000`.

### `ItemPricingTotalRow` — seat only

Reuses `ProductPriceField`'s total treatment so the two read as one system:

```
────────────────────────────────────────
TOTAL
4 pcs × 1 200 kr              4 800 kr
```

Left column: an uppercase `TOTAL` eyebrow over the breakdown in muted `text-sm`. Right: the total,
`text-2xl font-bold tabular-nums`. `—` when the field is empty. One row per field, directly under
that field.

### `ItemPricingFieldGroup`

The single component the forms mount. Props:

```tsx
type ItemPricingFieldGroupProps = {
  majorCategory: string | null | undefined;
  quantity: number | null | undefined;
};
```

Returns `null` when `majorCategory` is falsy. Renders both fields, each with its total row when
`majorCategory === "seat"`. Taking `majorCategory` and `quantity` as props rather than watching
them keeps the package free of any assumption about the host form's field names — the same reason
`UpholsteryFieldGroup` takes `quantity`.

### Test ids

`item-purchase-price`, `item-purchase-price-input`, `item-purchase-price-error`,
`item-purchase-price-total`, `item-purchase-price-breakdown`, and the matching
`item-expected-sale-price-*` set, plus `item-pricing-field-group`.

---

## Track B — logic specification (Codex)

1. **Compose the schema.** Add `item_pricing: ItemPricingFieldsSchema` to `InternalFormSchema` and
   `PreOrderFormSchema` in `packages/task-creation/src/types.ts`. Add matching default values
   (`{ purchase_cost_per_piece: null, expected_sale_price_per_piece: null }`) to both forms'
   `defaultValues` **and** to their post-submit `form.reset(...)` calls — the Internal form resets
   inline in `onSubmit`, and a missed key there leaves a stale price on the next task.

2. **No required rules.** Both fields are optional (§Decisions, item 1) — do **not** add
   `superRefine` issues for them. `ItemPricingFieldsSchema` already constrains the values that
   *are* entered (`.nonnegative().nullable()`), which is the only validation they need.

   This applies to both forms; there is no exception (§Decisions, item 2a).

3. **Step wiring.** Add both paths to `INTERNAL_STEP_FIELDS_MAP.item` and the Pre-order
   equivalent so `form.trigger` covers them, and add `errors.item_pricing` to each form's
   `stepErrorMap` item entry (alongside `errors.item ?? errors.item_upholstery`) and to the
   `onValidate` branch that calls `setStatus("item", "error")`.

   With the fields optional this no longer gates advancing on emptiness — it exists so a value
   that *is* entered and invalid (negative) surfaces on the right step rather than failing
   silently at submit.

4. **Normalize the payload** in `buildItemFields` (`lib/normalize-task-form-payload.ts`). Emit,
   inside the `item` block:

   ```ts
   purchase_cost_minor: resolveTotalMinor(pricing.purchase_cost_per_piece, item.quantity),
   expected_sale_price_minor: resolveTotalMinor(pricing.expected_sale_price_per_piece, item.quantity),
   currency: INLINE_PRICING_CURRENCY,   // only when at least one amount is present
   ```

   Omit all three keys when both amounts are null. Never send `0` for an unfilled field. Add
   `item_pricing` to the `hasAnyItemData` check so a task carrying only a price still sends an
   item block.

5. **Handle `ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM`** (§Decisions, item 1). In the create-error
   path, run the error message through `parseErrorIdentity` (already exported by
   `@beyo/item-economics`). On that identity:
   - render the explanatory copy from §Copy near the pricing fields, not as a transient toast —
     the user has to act on it;
   - keep the user on the item step rather than closing the surface, so the fields they must
     clear are in front of them.

   Clear that message once either price field changes. No schema flag is needed: the fields are
   optional, so clearing them and resubmitting is already a valid submission. Any other error
   keeps the existing generic handling.

6. **Replace the Shopify pre-order price** (§Decisions, item 2). `product_unit_price` is deleted
   and its role passes to `item_pricing.expected_sale_price_per_piece`. The full unwind — 14 source
   sites plus tests:
   - delete `components/ProductPriceField.tsx` and `ProductPriceField.test.tsx`;
   - `types.ts` — drop the `product_unit_price` field and its `superRefine` required rule;
   - `lib/pre-order-form-default-values.ts` — drop the default;
   - `PreOrderFormContent.tsx` — drop the import, the step-field-map entry, **both** error-map
     references (lines ~309 and ~415), and the `pre-order-form-price-section` card;
   - `lib/normalize-task-form-payload.ts` — `buildShopifyPreorderSection` derives its price from
     `resolveTotalMinor(...)` via `toMajorUnitString`, **and relaxes its guard** so a missing
     price no longer suppresses the section (§Decisions, item 2a). `product.price` becomes a
     conditional key;
   - `lib/pre-order-price.ts` — `resolvePreOrderTotalPrice` loses its last caller. Delete it and
     its tests; keep `formatPreOrderPieces` / `formatPreOrderPrice` only if something still uses
     them, otherwise let the `@beyo/item-economics` formatters take over.
   - fixtures still setting `product_unit_price` need updating:
     `sku-preview.test.tsx`, `lib/pre-order-price.test.ts`, and
     `apps/managers-app/.../features/items/location-and-seat-validation.test.ts`.

   **The pre-order Shopify product must keep working in every case.** A pre-order creates its
   Shopify product whether or not a price was entered; only a missing shop integration or empty
   inventory suppresses the section, as before.

7. **Mount.** `<ItemPricingFieldGroup majorCategory={majorCategory} quantity={itemQuantity} />`:
   - **Internal** — inside the existing `majorCategory === "seat"` quantity `ContentCard`, below
     `<ItemQuantityField />`, plus a card of its own on the `wood` path, which renders no quantity
     card at all.
   - **Pre-order** — same placement, and it takes over the card the deleted `ProductPriceField`
     occupied.

8. **Package wiring.** `"@beyo/item-economics": "*"` in `packages/task-creation/package.json`
   peer deps. The `@source` lines already exist in all three apps from the Production time work.


---

## Decisions — resolved by the owner, 2026-08-18

- [x] **1. The two fields are optional, and the priced-item refusal is explained.** Backend policy
      stands; the frontend does not try to predict it. On `ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM`
      the form explains what happened and tells the user to clear the two price fields.

      **Because the fields are optional, that remedy just works** — the user clears them and
      resubmits. The `inline_pricing_refused` flag considered earlier is unnecessary and is
      **not** part of this plan: it only existed to escape the loop that mandatory fields created.

      Optionality is an owner decision taken for wider reasons than this refusal — a purchase
      price is often simply not known at the moment a task is created.

- [x] **2. Expected sale price replaces the Shopify pre-order price.** They are the same number.
      `product_unit_price` is **deleted** and the Shopify product price derives from the new
      expected-sale-price field. One input, two representations, both from one computed value:

      | Consumer | Value |
      |---|---|
      | `item.expected_sale_price_minor` | `totalMinor` (integer öre) |
      | `shopify_preorder.product.price` | `(totalMinor / 100).toFixed(2)` (kronor decimal string) |

      Deriving the Shopify price from `totalMinor` rather than recomputing it guarantees the
      Shopify product and the item's valuation carry the same figure — which is the whole point of
      merging the two fields.

- [x] **2a. Optional on both forms — and the frontend's price guard must be relaxed.** The
      backend does not require a price to create the Shopify product, so the expected sale price
      stays optional on Pre-order as well as Internal.

      **This contradicts the current frontend code.** `buildShopifyPreorderSection` today drops the
      *entire* `shopify_preorder` section when the price is missing:

      ```ts
      if (!shopIntegrationId || price == null || price <= 0) {
        return undefined;   // no product, no inventory, nothing
      }
      ```

      That guard is a frontend invention, not a backend rule — it was safe only because
      `product_unit_price` was mandatory. Left as-is with an optional field, a pre-order created
      without a price would silently produce no Shopify product at all.

      Track B must therefore:
      - drop `price == null || price <= 0` from the guard, keeping the `shopIntegrationId` and
        inventory checks;
      - make `product.price` a **conditional key** — present when a price was entered, omitted
        entirely when it was not. Never `"0.00"`, which is a real price meaning "free".

- [x] **3. No keyboard tray for the new fields.** Totals render inline beneath each input.
      Deleting `ProductPriceField` frees the accessory anchor, but two priced fields still cannot
      each claim it. Accepted cost: the pre-order step loses its docked running total and its
      `lockScroll`. If that is missed on device, the way back is a **single group-level tray that
      mirrors the focused field**, not one tray per field.

- [x] **4. Stepper increment `step={100}`** for both fields — `ProductPriceField`'s 500 was sized
      for Shopify product prices and is too coarse for a purchase cost.

- [x] **5. The Return form is deliberately excluded.** Returned items are, in the owner's words,
      "99% related to items already created in the system", so inline pricing would mostly hit the
      §9.1 refusal. Returns get priced through the valuation endpoint instead, once that surface
      exists.

## Copy — the refusal message

The owner is building the item valuation/edit surface immediately after this plan and before
either ships, so the message may point at it:

> **This item already has a price.** Clear the purchase and expected sale price to create the
> task — you can update the item's price afterwards from the item itself.

**Ordering constraint:** this copy must not reach users before that surface exists. If the two
ship separately, drop the second clause until the valuation surface is live.

## Acceptance criteria

1. Neither field renders until `item.major_category` is set.
2. With `seat`, both fields render below the quantity field, each with a live total that updates
   as either the price or the quantity changes.
3. With `wood`, both fields render with **no** breakdown row, and submit as if quantity were 1.
4. Advancing the item step with either field empty never blocks — the fields are optional. An
   *invalid* entered value (negative) does block, marks the step in error, and shows the
   field-level message.
5. The submitted payload carries `purchase_cost_minor` and `expected_sale_price_minor` as
   **integers** equal to `round(perPiece × 100) × quantity`, plus
   `currency: "swedish_krona"`. Asserted against `normalizeInternalFormPayload` output.
6. Both keys and `currency` are **absent** when both amounts are null — never `0`.
7. The displayed total and the submitted amount derive from the same function; a test asserts
   they agree for a decimal per-piece price such as `19.99 × 3`.
8. No file under `packages/item-economics/src` imports `@beyo/task-creation` or `@beyo/tasks`.
9. A `422` carrying `ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM` renders the explanatory copy beside
   the pricing fields and keeps the user on the item step. Clearing both fields and resubmitting
   the same form succeeds.
10. Leaving either field empty never blocks the item step or the submit, on either form.
11. `product_unit_price` no longer exists anywhere in the repository, and a pre-order created with
    an expected sale price still produces a `shopify_preorder.product.price` — equal to
    `expected_sale_price_minor / 100`, formatted to two decimals. A test asserts the two agree.
12. A pre-order with **no** expected sale price still emits a `shopify_preorder` section — with
    `product.price` absent, not `"0.00"`. Only a missing shop integration or empty inventory
    suppresses it.
13. `npm run typecheck` clean; `npm run test:item-economics` and `npm run test:task-creation` pass,
    with the existing task-creation suite green apart from the fixtures this plan updates.

---

## Validation plan

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit`
- `npm run typecheck`
- `npm run test:item-economics` — arithmetic (rounding, quantity fallback, null handling) and the
  field group (visibility, breakdown shown/hidden, error display)
- `npm run test:task-creation` — schema required-rules, payload normalization, reset-after-submit
- Playwright, managers app: create an Internal seat task with quantity 4 and both prices, assert
  the request body carries the expected integer minor amounts and the currency

---

## Track A — build record (2026-08-19)

Built and merged into `packages/item-economics`:

- `tsc -p packages/item-economics/tsconfig.json --noEmit` — clean.
- `npm run test:item-economics` — **103 tests pass** (15 new pricing-arithmetic, 11 new field-group,
  77 pre-existing).
- ESLint clean across every Track A file.
- `react-hook-form` added to the package's peer dependencies.
- Track A's surface is exported from `src/index.ts`.

Two additions beyond the plan's file list, both because the copy and markup belong on this side of
the seam:

1. `ItemPricingNumberField.tsx` — the shared body of both inputs. The two exported fields differ
   only in name, copy and test ids; duplicating the markup would make a drift between the purchase
   price and the sale price possible.
2. `ItemPricingRefusalNotice.tsx` — the §9.1 message, with `ITEM_PRICING_REFUSAL_TITLE` /
   `_BODY` exported. Track B flips `showPricedItemRefusal` on the group; it does not author copy.

One plan correction: the plan's rounding illustration used `19.99 × 3`, which does **not** diverge
between the two orderings. Verified divergent cases are `19.995 × 2` (4000 vs 3999) and
`12.345 × 4` (4940 vs 4938); the tests use those.

## Track B — build record (2026-08-19)

Implemented the logic track in `@beyo/task-creation`:

- Both form schemas, default paths, reset paths, step-field maps and step-error maps now carry
  `item_pricing`; both prices remain optional.
- Internal and Pre-order normalize entered prices through Track A's `resolveTotalMinor`, emit only
  present integer-minor keys, and conditionally emit `INLINE_PRICING_CURRENCY`.
- Shopify's optional `product.price` derives from the same expected-sale minor total; a priceless
  pre-order still emits its section when shop and inventory are present.
- The priced-item refusal is identified through `parseErrorIdentity`, keeps the form on its item
  step, renders Track A's inline notice and clears that notice when either price changes.
- The legacy `product_unit_price`, `ProductPriceField` and `pre-order-price` implementation were
  removed from application code and tests. The two new fields are mounted for seat and wood in
  both host forms.
- `@beyo/task-creation` now declares its `@beyo/item-economics` peer dependency.

Verification:

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit` — pass.
- `npm run typecheck` — pass.
- `npm run test:item-economics` — 103/103 pass.
- `npm run test:task-creation` — 105/105 pass.
- Managers location/seat validation fixture — 8/8 pass.
- `git diff --check` — pass; no `product_unit_price`, `ProductPriceField` or `pre-order-price`
  references remain under `packages/` or `apps/`; item-economics has no forbidden task-package
  import.

Plan correction: acceptance criterion 4 is stale and directly contradicts Track B step 2, owner
decision 1/2a and criterion 10. The resolved behavior is optionality: an empty price never blocks
advance or submit. Track A also recorded that `19.99 × 3` is an agreement example but not a
rounding-order divergence; the implementation tests both that exact agreement and the divergent
`19.995 × 2` case.

Release-order observation: the item valuation/edit surface named by the refusal notice was not
found in the current tree. Track B did not alter the protected Track A copy. Per §Copy, this
implementation must either co-ship with that surface or have the second clause trimmed before
release.

## Track B — build record (2026-08-19)

Implemented by Codex; handoff at
`handoffs/implementer/handoff_PLAN_item_pricing_fields_20260818_implement_1.md`.

Independently verified 2026-08-19:

- `npm run typecheck` — clean across all five apps and the package chain.
- `npm run test:item-economics` 103, `npm run test:task-creation` 105, `npm run test:tasks` 68 —
  all pass.
- Zero residual `product_unit_price`, `ProductPriceField` or `pre-order-price` references in
  `packages/` or `apps/`.
- No `@beyo/task-creation` or `@beyo/tasks` import beneath `packages/item-economics/src`.
- Track A files unmodified.
- Shopify guard relaxed to `!shopIntegrationId` plus the inventory check; `product.price`
  conditional on a non-null total; item-block pricing keys and `currency` all conditional.
- Mounted on both forms, in both the seat and wood branches.
- The refusal path returns early before `form.reset()` and `surface.close()`, so a refused
  submission keeps the user's data on the item step.

## Amendment — purchase price comes from the item lookup (2026-08-19)

The purchase price is registered in an external purchase system and reaches the frontend through
`GET /api/v1/items/lookup`, which now returns `purchase_price` (a plain number in kronor, per
piece, nullable — verified in `backend/.../lookup/base.py:18`). The manual input is removed.

- **Track A, done:** `ItemPurchasePriceField` → `ItemPurchasePriceDisplay`, read-only, reading the
  same form value via `useWatch`. Null renders "Not set — this price comes from the purchase
  system", worded to hold both before a lookup and after a fruitless one. Shown on **both** forms.
- **Track B, done:** `purchase_price` is accepted by `ItemLookupResultSchema` as
  `.nullable().optional()`. Both forms prefill the same purchase-cost form path and explicitly
  write `null` when the lookup omits the price. Both seat and wood mounts pass an
  `onClearPrices` callback that clears purchase and expected-sale values together. The lookup
  signature also includes the price, so a refreshed result for the same article is not discarded
  when only its purchase price changed. Verification: item-economics TypeScript clean,
  monorepo typecheck clean, item-economics 108/108 and task-creation 107/107 tests pass.

**A consequence worth recording.** Making the field read-only broke the §9.1 remedy: the message
told the user to clear both prices, but the purchase price no longer has an input, so they could
clear only one and every resubmit would be refused again — the same loop that mandatory fields
created, reintroduced from the other direction. The notice now carries a **Remove prices** button
instead of an instruction, and the copy changed to match.

## Review log

- `2026-08-18` `Claude Opus 5`: plan authored from operational handoff §9 and the existing
  `ProductPriceField` precedent. Five open decisions raised.
- `2026-08-18` `David`: all five resolved. Let the §9.1 refusal fail with explanatory copy;
  expected sale price **replaces** the Shopify `product_unit_price` entirely; no keyboard tray;
  `step={100}`; Return form excluded because its items nearly always already exist.
- `2026-08-18` `Claude Opus 5`: flagged that mandatory fields make "clear them and retry"
  impossible, and that replacing `product_unit_price` is a 14-site unwind including two error-map
  references in `PreOrderFormContent` and three test fixtures (enumerated in Track B step 6).
- `2026-08-18` `David`: **both fields are optional**, for wider reasons than the refusal loop. The
  `inline_pricing_refused` flag is therefore dropped — clearing and retrying is already valid.
  The edit/valuation surface is being built immediately after this one, so the refusal copy may
  point at it.
- `2026-08-19` `David`: purchase price becomes lookup-driven and read-only; shown on both forms;
  absence explained rather than hidden.
- `2026-08-19` `Claude Opus 5`: Track A amended (108 tests green). Caught that the read-only change
  had silently broken the §9.1 remedy and replaced the instruction with a Remove prices button.
- `2026-08-19` `Codex`: Track B implemented. Flagged that acceptance criterion 4 (empty fields
  block) contradicted Track B step 2, decisions 1/2a and criterion 10, and followed the later
  owner decision. Correct call — criterion 4 was left over from the mandatory-fields draft and
  has now been rewritten.
- `2026-08-19` `Claude Opus 5`: Track A built — 103 tests green, typecheck and lint clean. Review
  page published for the seven states. Ready for Track B.
- `2026-08-18` `Claude Opus 5` + `David`: optionality's consequence for Pre-order resolved. The
  backend does not require a price to create the Shopify product, so the field stays optional
  there too — but the existing frontend guard drops the whole `shopify_preorder` section when the
  price is null, which was only safe while the field was mandatory. Guard relaxed and
  `product.price` made conditional (§Decisions item 2a). Without this, optionality would have
  silently stopped pre-orders producing products.
- `2026-08-19` `David`: purchase price becomes lookup-driven and read-only; shown on both forms;
  absence explained rather than hidden.
- `2026-08-19` `Claude Opus 5`: Track A amended (108 tests green). Caught that the read-only change
  had silently broken the §9.1 remedy and replaced the instruction with a Remove prices button.
- `2026-08-19` `Codex`: Track B implemented. Chose the explicit optionality resolution over stale
  acceptance criterion 4; added schema/default/reset/step wiring, shared payload and Shopify
  normalization, priced-item refusal handling, form mounts, package wiring and focused tests.
  Required checks pass (item-economics 103, task-creation 105, monorepo typecheck). No Track A
  source file was edited. The item valuation/edit surface is not yet present, so the §Copy
  release-order constraint remains active.
- `2026-08-19` `Codex`: purchase-price lookup addendum implemented. Kept the read-only purchase
  path in both step maps because the nullable schema permits absence while still rejecting a
  negative lookup value. Centralized the identical lookup write for Internal and Pre-order,
  canonicalized missing/null prices in the lookup signature, and wired both refusal buttons to
  clear both prices. Required checks pass (item-economics 108, task-creation 107, monorepo
  typecheck); no file under `packages/item-economics/src` was edited.
- `2026-08-19` `Claude Opus 5` (coordinator): checkpointed and normalized. All three intertwined
  workstreams were still untracked — no commit had ever been made — so the charter's two
  perimeter claims ("probes reverted", "nothing changed outside the perimeter") were structurally
  unverifiable. Committed as one `CHECKPOINT (not approved):` baseline on branch
  `pipeline/item-economics-phase-1`; the streams edit the same lines in the same files
  (`packages/items/src/types.ts`, `normalize-task-form-payload.ts`) and do not separate into
  truthful standalone commits. Folder normalized to the charter layout: the plan moved to
  `plans/`, the spent Codex prompts to `prompts/implementer/` (they were orphan rows at the
  project root), row-schema frontmatter added to every prompt and handoff. Archiving was
  requested and declined: it is step 2 of the closeout ritual at `APPROVED`, and no review round
  has been run.

## Lifecycle transition

- Current state: `IMPLEMENTED` — Track B round 2 complete (2026-08-19, Codex), checkpointed,
  awaiting first review
- Next state: `REVIEWING` (prompt at `prompts/reviewer/PROMPT_reviewer_round_1_20260819.md`)
  → `APPROVED` or `CHANGES_REQUESTED`
- Transition owner: `David`
- Archive: not yet. Per the coordinator's closeout ritual, this plan's spent prompts and
  consumed handoffs move to `archive/plan_1/` only at `APPROVED`, together with the gate commit.
