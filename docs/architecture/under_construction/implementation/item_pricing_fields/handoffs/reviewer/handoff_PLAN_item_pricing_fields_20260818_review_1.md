---
plan: PLAN_item_pricing_fields_20260818
role: review
round: 1
verdict: CHANGES_REQUESTED
date: 2026-08-19
actor: Claude Opus 5
---

# Item pricing fields — first review

Full checklist against all thirteen acceptance criteria, the semantic authorities, the two
implementer handoffs and the nine judgment-call probes. Verdict: **CHANGES_REQUESTED**.

The build itself is clean and the arithmetic seam is the best-defended part of it. What forces
the verdict is not a defect the implementers introduced: **the backend retired the §9.1 refusal
this phase is built around, on the same day this phase was implemented**, and replaced it with a
silent re-pricing rule that the frontend does not handle. Two blocking findings follow from that
one fact. Three should-fix findings are the implementation's own.

## ⚠ OWNER DECISIONS REQUIRED (2)

### Card 1 — Should creating a task be allowed to change an item's stored price?

**Question.** When a manager creates a task for an article that is already in the system with a
price, should that task creation overwrite the item's price — yes, or should the form stop
sending prices for items it recognises?

**Story.** In June someone priced article 302.445.11 at 1 200 kr purchase, 4 000 kr expected.
Today a colleague creates a second task for the same article. The form quietly fills the purchase
price from the purchase system, they type 3 500 kr as the expected sale price because this one is
scuffed, and they submit. The item's June price is now gone — replaced, no warning, no
confirmation, and the production budget for every open task on that item shifts with it. Nobody
asked for a re-pricing; they asked for a task.

**Branches.**
- *Yes, allow it* — every task creation becomes a price edit; the two June figures are lost the
  first time anyone makes a second task, and the person doing it never sees that it happened.
- *No, stop sending prices for known items* — the form omits both amounts once the item is
  recognised, and prices only ever get set at an item's birth or from the item's own price screen.
- *Yes, but say so* — allow it and show a "this will update the item's price from 4 000 to 3 500 kr"
  line before submit, so it is a decision rather than a side effect.

**Recommendation.** *No, stop sending prices for known items* — it is the behaviour the whole plan
was designed for and the only one that cannot lose a figure by accident; re-pricing then belongs
to the item screen you are building next.

**On silence.** The gate holds at CHANGES_REQUESTED. Nothing is guessed and nothing ships.

**Trace.** §Decisions item 1, §Copy, acceptance criteria 9; findings B1, B2.

### Card 2 — Is the purchase system's price for one piece, or for the whole lot?

**Question.** When the purchase system reports article ART-1 with quantity 2 and purchase price
1 250,50 kr — is that 1 250,50 kr per chair, or 1 250,50 kr for both chairs together?

**Story.** A manager scans a lot of four identical dining chairs. The purchase system says
quantity 4, purchase price 1 250,50. The form reads that as a per-chair price, shows
"4 pcs × 1 250,50 kr = 5 002 kr" and saves 5 002 kr as what the workshop paid. If the purchase
system actually meant 1 250,50 kr for all four, the workshop's recorded cost is four times what it
really was, every margin on that item is wrong from birth, and nothing on screen looks unusual.

**Branches.**
- *Per piece* — today's code is right; nothing changes.
- *Whole lot* — every multi-piece lookup currently inflates the purchase cost by the quantity, and
  the form must stop multiplying that particular figure.

**Recommendation.** Confirm against the purchase system's own documentation before release — the
repository cannot answer it, and the two answers differ by a factor of four on a four-seat lot.

**On silence.** The gate holds; the figure is not guessed.

**Trace.** `backend/.../lookup/purchase_api.py:90-99`; plan §Arithmetic; note N1.

---

## Layer 1 — technical findings

### B1 — blocking — the §9.1 refusal this phase implements no longer exists in the backend

`ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM` appears **nowhere** under `backend/app`. The backend
project `inline_valuation_versioning` retired it, and its phase 1 tracker row reads **APPROVED,
2026-08-19**. `backend/app/beyo_manager/services/commands/tasks/create_task.py:316-368` now
inherits, compares and versions instead of refusing: an amount present in the request replaces
the stored amount, an omitted one keeps its current value, and a request whose effective amounts
and currency equal the stored ones writes nothing at all.

The authority document was rewritten **in place**, same filename, same date. The backend copy
(`backend/docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`,
modified 2026-08-19 13:05) now titles §9.1 *"Inline re-pricing — an existing item that already has
a price"*. The frontend's mirror (`docs/handoff/from_backend/…`, 2026-08-16) still carries the
refusal text. Every artifact in this phase cites the stale mirror.

Consequences:

- **Acceptance criterion 9 is unmeetable.** No `422` carrying that identity can be produced.
- Dead code, unreachable by construction: `packages/task-creation/src/lib/inline-pricing-refusal.ts`
  in full (`isInlinePricingRefusal`, `useInlinePricingRefusal`, `INLINE_PRICING_REFUSAL_IDENTITY`);
  `packages/item-economics/src/components/item-pricing/ItemPricingRefusalNotice.tsx` with
  `ITEM_PRICING_REFUSAL_TITLE` / `_BODY` / `_ACTION`; the `showPricedItemRefusal` and
  `onClearPrices` props on `ItemPricingFieldGroup`; `handleClearPrices` and the
  `handleInlinePricingError` catch branches in both `InternalFormContent.tsx` and
  `PreOrderFormContent.tsx`; and 4 of the 19 tests in `ItemPricingFieldGroup.test.tsx` plus all 3
  in `inline-pricing-refusal.test.ts`.
- The §Copy ordering constraint and its release gate become moot along with the notice.

**Violated authority.** `backend/docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`
§9.1 (current text); `pipeline-charter.md` §Artifact map — external-source behaviour lives in the
source evidence doc, and this one drifted.

**Suggested correction.** Re-mirror the operational handoff into `docs/handoff/from_backend/`
first — it is the input every other artifact reads. Then take card 1. Under the recommended
branch, delete the refusal machinery listed above rather than leaving it dormant; under the
"allow it" branch, delete it too and replace it with the confirmation surface. Rewrite criterion 9
in the plan to match whichever behaviour is chosen. This is **not** an implementer defect — the
contract moved under a finished implementation.

### B2 — blocking — an auto-prefilled purchase price silently re-prices any existing item

This is B1's operational half and needs its own fix even after the dead code goes.

Both forms now write the purchase price into the form automatically:
`applyPurchasePriceLookupResult` (`item-lookup-prefill.ts:38-47`) is called unconditionally from
`handleLookupResult` in `InternalFormContent.tsx:203` and `PreOrderFormContent.tsx:266`. The
normalizer then emits it unconditionally: `buildItemFields`
(`normalize-task-form-payload.ts:72-123`) sends `purchase_cost_minor` whenever the value is
non-null. Nothing anywhere asks whether the item already exists.

Under the new backend rule that combination means: **creating a task for an already-priced item
writes a new valuation version, credited to the task's creator, without anyone requesting it.**
The user cannot see it happen — the create response is identical either way (§9.2), and the form
closes on success. Owner decision 1 explicitly assumed the opposite ("Backend policy stands; the
frontend does not try to predict it"), and the *whole* justification for the read-only purchase
display — "a second, hand-typed figure could disagree with the system of record"
(`ItemPurchasePriceDisplay.tsx:12-20`) — is inverted by a path that overwrites the system of
record automatically.

**Violated authority.** Operational handoff §9.1 (current text) read against plan §Decisions
item 1.

**Suggested correction.** Per card 1. The mechanical fix under the recommended branch is a single
guard: stop emitting the pricing trio when the lookup resolved an existing item. The form already
knows — `selectInternalLookupResult` distinguishes internal items from `purchase_api` results and
is already exported from the same module.

### S1 — should-fix — `wood` multiplies by a hidden quantity, so the figure shown is not the figure saved

Plan §Visibility states that for `wood` "quantity is not editable and is always one piece … the
number typed *is* the number saved", and criterion 3 requires wood to "submit as if quantity were
1". Neither holds.

`handleLookupResult` writes `form.setValue("item.quantity", selectedItem.quantity)` before any
category is known (`InternalFormContent.tsx:184-186`, `PreOrderFormContent.tsx:247-249`), and the
purchase API supplies a real quantity (`purchase_api.py:94`, `int(data.get("quantity") or 1)`).
For `wood` neither form renders `ItemQuantityField`, and `ItemPricingFieldGroup` renders no
`ItemPricingTotalRow` (`ItemPricingFieldGroup.tsx:43`), so nothing on screen ever shows a
multiplier. But `buildItemFields` still calls `resolveTotalMinor(perPiece, item.quantity)`.

A wood article looked up with quantity 4 and a purchase price of 1 250,50 therefore displays
"Purchase price — 1 250,50 kr" and submits `purchase_cost_minor: 500200`. Criterion 7 ("the
displayed total and the submitted amount derive from the same function") is satisfied in code and
violated in effect: on the wood path there is no displayed total at all, and the displayed *value*
is the unmultiplied one.

The test suite encodes the contradiction rather than catching it: `item-pricing-payload.test.ts`
builds its fixture with `major_category: "wood"` and `quantity: 2` (lines 24-49) and asserts the
multiplied `4000` / `2470`. Criterion 3 has no automated test at all — charter standing rule 1.

**Violated authority.** Plan §Visibility rules and acceptance criteria 3 and 7; charter standing
rule 1 (criteria met by automated tests).

**Suggested correction.** Decide one reading and make the code and the criterion agree. Either
(a) resolve the pricing quantity to 1 whenever `majorCategory !== "seat"` — which is what
§Visibility promises, and what `resolvePricingQuantity`'s own doc comment claims it already does —
or (b) render the breakdown row for wood too when quantity > 1, so the multiplier is visible.
Then add a test on the wood path with quantity > 1: today's fixture must change its category to
`seat` or its assertion.

### S2 — should-fix — a negative lookup price traps the form with no error, no input and no way out

The purchase price is read-only, but `item_pricing.purchase_cost_per_piece` is still validated
(`pricing-fields.ts:17-20`, `.nonnegative()`) and still listed in both step-field maps
(`InternalFormContent.tsx:86`, `PreOrderFormContent.tsx:118`). The implementer kept it
deliberately (round-2 handoff, "a negative lookup value still fails on the correct path"). Traced
end to end, that path has no exit:

1. `applyPurchasePriceLookupResult` writes `-50` into the form unchecked.
2. `form.trigger(INTERNAL_STEP_FIELDS_MAP.item)` fails, so `onBeforeAdvance` returns `false` and
   the item step will not advance.
3. `stepErrorMap.item` is `Boolean(errors.item_pricing)` → the step turns red.
4. `ItemPurchasePriceDisplay` uses `useWatch` only — no `useController`, no `fieldState`, no
   `FieldErrorPill`. **The message "Enter a price of zero or more." is never rendered anywhere.**
5. There is no input to correct, and the *Remove prices* button lives inside
   `ItemPricingRefusalNotice`, which only mounts after a `422` the user can no longer reach —
   submit is unreachable because step 2 blocks it. (Jumping ahead does not help: the final step
   calls `form.trigger()` over everything and navigates straight back.)

Escape requires abandoning the form. Note the value also survives clearing the article number —
the lookup only ever writes on a *result*, never on an empty field.

Criterion 4 as rewritten ("An *invalid* entered value (negative) does block, marks the step in
error, and shows the field-level message") is therefore half-met: it blocks and marks, and shows
nothing.

**Violated authority.** Acceptance criterion 4; `architecture/09_forms.md` (a field-level error
must be rendered at its field).

**Suggested correction.** Validate at ingestion instead of at the step: have
`applyPurchasePriceLookupResult` write `null` for a negative or non-finite lookup value, and drop
`item_pricing.purchase_cost_per_piece` from both step-field maps. That keeps a bad upstream figure
out of the payload without blocking a user on a control they do not have. Removing it from the
step map alone is not enough — the last step's `form.trigger()` would reproduce the same dead end
one screen later.

### S3 — should-fix — the raw backend identity is toasted next to the friendly notice

Plan §Track B step 5 requires the refusal copy "near the pricing fields, **not as a transient
toast**". Both are shown. `useCreateTask`'s `onError`
(`packages/tasks/src/actions/use-create-task.ts:182-186`) fires
`notify.error("Could not create task", error.message)` unconditionally, and `error.message` is the
backend's `error` string verbatim (`api-client.ts:77-82`). The refusal therefore surfaces as a
toast reading *"ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM: item itm_01H… already has a current
valuation; use the valuation endpoint PUT /api/v1/item-economics/items/itm_01H…/valuation."* at
the same moment the styled notice appears.

The mechanism pre-dates this phase; what is new is a path that deliberately renders its own copy
and does not suppress the generic one.

**Violated authority.** Plan §Track B step 5; `architecture/13_errors.md` §Error message mapping
(users see mapped copy, never raw server strings).

**Suggested correction.** Fold into B1's rewrite. Whatever inline copy survives, the mutation's
generic toast needs an opt-out for identities the caller handles itself.

### Notes

- **N1 — `purchase_price`'s unit is unverified.** `base.py:18` types it `int | float | None` and
  `purchase_api.py:99` passes the partner API's value straight through, alongside a `quantity` from
  the same payload. Nothing in either repository says whether it is per piece or the lot total, and
  the backend's own fixture (`test_lookup_item_by_article_number.py:11-16`, quantity 2, price
  1250.5) does not disambiguate. The frontend multiplies it by that same quantity. See card 2.
- **N2 — the signature addition reaches two forms the prompt never mentioned.**
  `createLookupResultSignature` is shared by four form components; adding `purchase_price`
  (`item-lookup-prefill.ts:92`) means a price-only refresh now re-applies the *whole* prefill —
  category, article number, quantity, images — on `ReturnFormContent` and `WorkerInternalFormContent`
  too, silently overwriting any manual edit to those fields. Verified non-destructive for images:
  `useLookupItemImages` deletes what it previously owned before re-creating, so the cost is a
  delete/create round-trip, not a duplicate. Assessed on its merits: the addition is **correct** and
  the canonicalisation of missing and explicit `null` to one signature is right (both mean "clear
  the value", so they must not read as different results). Route the two-form blast radius as a
  documented consequence, not a defect.
- **N3 — recorded test counts are stale.** Both handoffs and the plan's build records record
  item-economics at 103 / 108. It is **132** at this commit; the production-time fix rounds landed
  in between. task-creation's 107 is accurate.
- **N4 — the prescribed typecheck does not cover this phase's own package.** `npm run typecheck`
  enumerates fourteen packages and `packages/task-creation` is not among them; it is only reached
  transitively through the app builds. `npx tsc -p packages/task-creation/tsconfig.json --noEmit`
  reports two TS2352 in `use-shopify-customer-lookup-prefill.test.tsx` (lines 196, 450). Confirmed
  pre-existing: the phase's diff to that file is fixture-only.
- **N5 — the valuation surface is still absent.** No `PUT /items/{id}/valuation` caller, page or
  mutation exists anywhere under `packages/` or `apps/`; only key builders in
  `item-economics-keys.ts:49`. The §Copy release gate stood as written — and is superseded by B1,
  which removes the copy that made it a gate.
- **N6 — the validation plan's Playwright step was not run**, by either implementer or this review
  (no dev server started, per the prompt's standing rule). The payload invariants are covered at
  the normalizer boundary; no live request body has ever been observed.
- **N7 — the perimeter is unverifiable by construction, as the coordinator recorded.** All three
  workstreams share one checkpoint (`02ad6d01`), so neither handoff's "no file under
  `packages/item-economics/src` was modified" claim can be checked against a per-round diff. What
  *is* checkable holds: every `packages/item-economics/src` path in `git show --stat 02ad6d01` is an
  addition, both handoffs' declared write perimeters are subsets of that commit, and no file appears
  in the commit that neither handoff nor the other two workstreams claim. Not a finding against
  either implementer; recorded so the next round does not re-derive it.

---

## What was verified correct

Settled ground — do not re-verify next round unless it changes.

**Verification re-run independently (not taken from the handoffs):**

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run test:item-economics` | 9 files, **132** passed |
| `npm run test:task-creation` | 19 files, **107** passed |
| ESLint, all phase files | 5 diagnostics, **all inherited** — verified by reading the same lines at `0bfc29c8`: `navigateToRef.current` render writes (Internal 342, Pre-order 427), `handleLookupResult` passed as a prop (417, 596), missing `isSeller` dep (473). Every Track A file and every new Track B file is clean. |
| `packages/items` package-local tsc | clean |

**Arithmetic and the display/payload seam.** `resolveTotalMinor` rounds per piece then multiplies
(`item-pricing.ts:48-57`) and is the single source for the breakdown row
(`ItemPricingTotalRow.tsx:28`), the `item` block (`normalize-task-form-payload.ts:72-79`) and the
Shopify product price (`:283-310`). `toMajorUnitString` derives from the minor total rather than
recomputing. Criterion 5 holds; criterion 7 holds on the seat path. The plan's original `19.99 × 3`
illustration is indeed non-divergent and the tests correctly use `19.995 × 2` (4000 vs 3999) and
`12.345 × 4` (4940 vs 4938) — Track A's correction was right.

*Mutation-tested.* Rewriting line 56 to `Math.round(perPiece * resolvePricingQuantity(quantity) * 100)`
turns **2 item-economics tests and 1 task-creation test** red. The rounding-order guarantee is
genuinely defended, not decorated.

**Omission, never zero.** `purchase_cost_minor`, `expected_sale_price_minor` and `currency` are each
conditional keys; `resolveTotalMinor` returns `null` for absent input and `0` for an explicit zero.
Criterion 6 holds. *Mutation-tested:* making `currency` unconditional turns
"omits both amounts and currency when neither was entered" red.

**Currency (probe 9).** `INLINE_PRICING_CURRENCY = "swedish_krona"` matches the enum in the
operational handoff §3.1 (`swedish_krona | danish_krona | euro`) and the key `item.currency` matches
`ItemInput.currency` at `backend/.../tasks/requests/__init__.py:42`. The backend's
`require_currency_for_amounts` validator (`:55-62`) fires exactly when either amount is present,
which is exactly when the normalizer emits it. The legacy trio is gone from every write path — the
only surviving `item_value_minor` / `item_cost_minor` / `item_currency` hits are mock *response*
payloads in Playwright specs and one managers DTO test, none of them request bodies.

**Pre-order optionality (probe 4).** `buildShopifyPreorderSection` keeps only the
`shopIntegrationId` and inventory guards (`:288-301`); `product.price` is a conditional key, never
`"0.00"`. Criteria 11 and 12 hold, both tested. `product_unit_price`, `ProductPriceField` and
`resolvePreOrderTotalPrice` are absent from every tracked file (`git grep`, zero hits).

**Signature guard survivability (probe 2, reverse).** After *Remove prices*, the lookup cannot
re-arm the price on its own: the effect in `ItemIdentityField.tsx:170-180` fires on
`lookupQuery.data` identity, react-query's structural sharing keeps that reference stable across a
refetch with unchanged content, and an unchanged result produces an identical signature and is
suppressed. `lastAppliedLookupSignatureRef` is reset only on the Internal form's successful submit
(`:328`), which also resets the form — correctly paired. The Pre-order form does not reset it, but
its reset paths either close the surface or remount the whole provider by key
(`PreOrderTaskSlidePage.tsx:19,38`), which discards the ref. No stale-ref hole found.

**Schema composition and step wiring.** `item_pricing: ItemPricingFieldsSchema` on both form
schemas; no `superRefine` required rules on either (criterion 10); defaults present in
`InternalFormContent` `defaultValues` **and** its inline `form.reset` (`:141`, `:318`) and in
`buildPreOrderFormDefaultValues:27-30`; `errors.item_pricing` present in both the `onValidate`
branch and the `stepErrorMap` on both forms. The `"item_pricing" in values` guard keeps the Return
and Worker forms priceless, as decision 5 requires.

**Package boundary (criterion 8).** Zero imports of `@beyo/task-creation` or `@beyo/tasks` beneath
`packages/item-economics/src`; the quantity helper is duplicated with the intended comment;
`"@beyo/item-economics": "*"` is declared in `packages/task-creation/package.json:16`.

**`PurchasePriceSetValue` (probe 8) — honest, and load-bearing.** *Mutation-tested:* changing the
literal to `"item_pricing.bogus_path"` produces **three** TS2345 errors — one at each call site,
naming the host form's real field-path union, plus one inside the helper. The narrowing does not
hide a mismatch; it enforces at compile time that any host passing a form actually carries that
exact path with that exact value type. Keep it.

**Criterion 1 / 2.** `ItemPricingFieldGroup` returns `null` on a falsy `majorCategory`; both forms
gate the card on `seat | wood`; the group sits below the quantity card on both. `quantity` arrives
as a watched prop, so a quantity edit re-renders the totals.

**Criterion 4's optionality half (probe 6).** The plan is now internally consistent — criterion 4's
rewritten text agrees with Track B step 2, decisions 1/2a and criterion 10, and nothing in the code
enforces the mandatory reading. Codex's call to follow the owner over the stale criterion was
correct. The remaining gap is S2, which is about *rendering* the error, not about optionality.

---

## Lessons for the plans

1. **A mirrored backend handoff is a cache, and this one went stale inside four days.** The
   authority was rewritten in place under an unchanged filename and an unchanged date, so nothing
   about `HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` looked different. Every
   artifact in this phase — plan, two prompts, two handoffs — cited the stale copy in good faith. A
   phase whose behaviour hangs on a mirrored external contract should re-diff the mirror against
   its source at the start of each round, and mirrored files should carry the source's modification
   time in their frontmatter.
2. **"Verified against the backend" needs a date and a commit, not just a file and a line.** The
   reviewer prompt's own "Backend fact, verified — use it, do not re-derive" block was accurate for
   `purchase_price` and would have been accurate for §9.1 three days earlier. Freezing a fact
   without stamping when it was frozen is what let a retired contract stay authoritative.
3. **Criterion 3 named a behaviour no test could fail on.** "With `wood` … submit as if quantity
   were 1" was never asserted, and the fixture that *does* exercise wood asserts the opposite.
   Charter standing rule 1 again: a criterion with no test is a sentence.
4. **A read-only field that stays in a validation path needs a rendering owner.** Track A removed
   the input and its error pill together; Track B kept the field in the step map for a reason that
   was individually sound. Neither half is wrong; the seam between them is. When a plan converts an
   input into a display, it should say explicitly which component now owns that field's error
   state — or state that the field leaves validation entirely.
5. **Two-track splits need a joint owner for cross-track invariants.** S1 and S2 both live exactly
   on the A/B boundary: A owns what is shown, B owns what is sent, and both defects are a
   disagreement between the two that neither track could see alone.

## Human-authorization backlog

- Cards 1 and 2 above. No architecture graph exists in this repository (`.archgraph/` absent), so
  there are no graph adjudications to route.

## Mutation-probe declaration

Four probes, all applied and reverted, each verified byte-identical by MD5 against the
pre-probe checksum:

| File | Probe | Restored MD5 |
|---|---|---|
| `packages/item-economics/src/lib/item-pricing.ts` | rounding order flipped to `round(perPiece × qty × 100)` | `9eb536d0680703d1f307fef832d3036f` ✓ |
| `packages/task-creation/src/lib/item-lookup-prefill.ts` | `purchase_price` removed from the signature | `c1eec93de34ff199aed1039b088b758d` ✓ |
| `packages/task-creation/src/lib/item-lookup-prefill.ts` | `PurchasePriceSetValue` literal → `"item_pricing.bogus_path"` | `c1eec93de34ff199aed1039b088b758d` ✓ |
| `packages/task-creation/src/lib/normalize-task-form-payload.ts` | `currency` made unconditional | `7aaa729f04741e3d6c13bcca902d7651` ✓ |

`git status --porcelain` is empty at close. No database, cache or tool-recorded state was touched;
no dev server was started.

## Full write perimeter

**Documents (created):**
- `docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_1.md` (this file)

**Documents (edited):**
- `docs/architecture/under_construction/implementation/item_pricing_fields/plans/PLAN_item_pricing_fields_20260818.md` — Review log entry and tracker row only

**Code:** none, beyond the four reverted probes declared above.

**Tool-recorded state:** none. No architecture graph in this repository.
