---
plan: PLAN_item_pricing_fields_20260818
role: review
round: 2
verdict: CHANGES_REQUESTED
date: 2026-08-19
actor: Claude Opus 5
---

# Item pricing fields — re-review of fix round 3

Delta-scoped re-review of commit `ce818c8a` against baseline `e49967b5`, branch
`pipeline/item-economics-phase-1`.

**Verdict: `CHANGES_REQUESTED`** — 1 blocking, 2 should-fix, 5 notes.

All three findings the fix cycle was asked to close (B1, S1, S2) are **genuinely closed**, and the
work is good. The blocking finding is new: it is the same defect class as S1 — a purchase cost
multiplied by a lookup-supplied quantity and never shown — on the one path S1's fix does not reach,
because there the pricing surface does not render at all. It is a silent money write on the
Pre-order form and I could not have found it without asking probe 4's second question.

## ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — Should a pre-order be allowed to price an item whose category was never chosen?

**Question.** When a pre-order article carries a purchase price but no category type, should the
purchase price be shown (and sent), or should the form require a category first?

**Story.** A seller scans article `ARTICLE-1` for a customer pre-order. The purchase system knows
it: 4 pieces at 1 250,50 kr each, but it has never been mapped to one of your category types. The
form fills in the article number and quantity, shows no price anywhere on screen — there is no
category, so the price card stays hidden — and the seller finishes the order and submits. The item
is created carrying a purchase cost of 5 002 kr that nobody in the building ever saw or approved,
and it becomes that item's valuation.

**Branches.**
- *Show the purchase price without a category* — the seller sees "4 pcs × 1 250,50 kr = 5 002 kr"
  before submitting; pre-orders stay creatable without a category type, as today.
- *Require a category type on pre-order* — the price always renders, but sellers can no longer
  pre-order an item whose category is not yet decided; that permissiveness was a deliberate choice.
- *Send no purchase price when the card is hidden* — nothing invisible is written, but a real price
  the purchase system supplied is thrown away and the item is left unvalued.

**Recommendation.** Show it without a category — the purchase price is read-only and already known
to the system, so the reason the fields are hidden before a category (don't ask for prices you
can't contextualise) does not apply to a figure the user only reads.

**On silence.** The gate holds; the phase does not archive. No guess is made.

**Trace.** Criterion 1, criterion 3 (amended), criterion 7; finding B3.

---

## Mirror re-diff — the mandatory first check

**The mirror is current. No drift.**

- `shasum -a 256` of `backend/docs/handoff/to_frontend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`
  → `8add7bce957f38a0a42e31a5491638f32b2d0a615bad350f1de236daaa818466`, matching the mirror's
  `source_sha256` exactly. Source mtime `2026-08-19T13:05:16` matches `source_modified`.
- The mirror's **body** (frontmatter stripped) is byte-identical to the source.
- The other mirrors under `docs/handoff/from_backend/` were diffed against their backend sources
  despite carrying no provenance stamp: `..._item_economics_configuration_20260815.md` and
  `..._production_time_and_worker_cards_20260818.md` are both **byte-identical**. `README.md`
  differs by design (it is the folder's own README — "Handoff From Backend" — not a mirrored
  contract). No other drift.

Recommend the provenance frontmatter be extended to the other two mirrors at the next opportunity;
they are clean today but unstamped, so this check is manual for them.

## Verified perimeter

`git diff --stat e49967b5 ce818c8a` — **exactly the twelve declared files plus the handoff**.
Nothing changed outside the fix prompt's allowed list. Working tree clean at review start and at
review end.

Round 1's N7 still holds unchanged for anything older than `e49967b5`: the original implementation
shares checkpoint `02ad6d01` with two other workstreams, so pre-cycle perimeters remain
unverifiable by construction. Not re-derived.

## Findings

### B3 — blocking — a pre-order submits a multiplied purchase cost that never rendered

**What is wrong.** `PreOrderFormSchema` (`packages/task-creation/src/types.ts:258`) has **no
required rule for `item.major_category`** — deliberately, since a pre-ordered item "is not in the
building yet". But the pricing card is gated on the category
(`PreOrderFormContent.tsx:604`: `majorCategory === "seat" || majorCategory === "wood"`), and
`ItemPricingFieldGroup` itself returns `null` when the category is unset (criterion 1). Meanwhile
`buildItemFields` (`normalize-task-form-payload.ts:72`) multiplies the looked-up purchase price by
`item.quantity` regardless.

So on the Pre-order form a purchase price can be ingested, multiplied and submitted while **no
pricing UI ever renders**. This is S1's defect — a hidden multiplier — in its most complete form:
not just the breakdown is hidden, the entire price is.

The Internal form is **not** affected: `InternalFormSchema`'s `superRefine`
(`types.ts:331`) requires `major_category` ("Select a category type."), so the card always renders
before submit is reachable.

**Reachability is ordinary, not exotic.** `handleLookupResult`
(`PreOrderFormContent.tsx:256`) writes `item.major_category` from
`findCachedItemCategoryOption(...)?.major_category` — a React Query **cache read**. It resolves to
`undefined` whenever the looked-up item has a null `item_category_id` (a purchase-API article not
mapped to a category — no exotic conditions at all), and also on a cache miss. The same call then
writes `item.quantity` and the purchase price. Note it writes `undefined` unconditionally, so it
can also **overwrite** a category the user had already chosen.

**Proof (probe 6, temporary test, removed).** Pre-order values with `major_category: undefined`,
`quantity: 4`, `purchase_cost_per_piece: 1250.5`:
- `PreOrderFormSchema.safeParse(...)` → `success: true`
- `normalizeReturnFormPayload(..., "pre_order")` → `item` =
  `{"client_id":"itm_1","article_number":"ARTICLE-1","quantity":4,"purchase_cost_minor":500200,"currency":"swedish_krona"}`

5 002,00 kr submitted; nothing displayed.

**Violated authority.** Plan criterion 3 as amended 2026-08-19 — "Never hide a multiplier; show
it"; criterion 7 — "The displayed total and the submitted amount derive from the same function"
(here there is no displayed total at all); and operational handoff §9, under which this write
becomes the item's valuation.

**Suggested correction.** Owner card 1 decides the direction. If the recommendation is taken:
render `ItemPurchasePriceDisplay` (with its total row) whenever a purchase price is present, even
without a category, keeping the editable expected-sale field gated as today — and amend criterion 1
accordingly, since it currently forbids exactly that. Whichever branch is chosen, add a test on the
Pre-order path with no category asserting the chosen behaviour.

### S4 — should-fix — the ingestion guard's zero boundary has no test

**What is wrong.** Mutating `applyPurchasePriceLookupResult`'s guard from `purchasePrice >= 0` to
`purchasePrice > 0` leaves the **entire task-creation suite green (108/108)**. Nothing asserts that
a purchase price of exactly `0` survives ingestion, so the boundary that separates "this item was
free" from "we don't know what it cost" is unguarded.

The production code is **correct** as written — this is a missing regression guard, not a live
defect. But the plan calls this exact distinction out in §Arithmetic ("a zero purchase cost is a
meaningful value and must not be forged"), and criterion 6 guards the mirror-image case
(omit-never-zero) while this direction (zero-never-omitted) has nothing.

**Violated authority.** Charter standing rule 11 — a criterion guarding a construction names the
mutation that must turn its test red; plan §Arithmetic.

**Suggested correction.** Add a row to the `it.each` in `item-lookup-prefill.test.tsx` asserting
`purchase_price: 0` writes `0`, not `null`.

### S5 — should-fix — S2's second half has no regression guard

**What is wrong.** Restoring `"item_pricing.purchase_cost_per_piece"` to
`INTERNAL_STEP_FIELDS_MAP.item` leaves the **entire task-creation suite green (108/108)**. Exactly
as the re-review prompt predicted: no test asserts the contents of either step-field map.

Half of S2's fix — the half the fix prompt stressed was "not enough" on its own but "required" —
is therefore held in place by nothing but the diff. The four new ingestion tests do not cover it:
they exercise `applyPurchasePriceLookupResult` against a locally-built
`ItemPricingFieldsSchema.pick(...)` form, never the real step maps. A fix with no regression guard
is a fix that returns.

**Violated authority.** Charter standing rule 11; charter review protocol (a named mutation must
turn a test red).

**Suggested correction.** Assert directly that neither step-field map contains the purchase-cost
path (both maps are module-level constants and can be exported for test, or asserted through a
form-level test that a negative purchase cost cannot block the item step).

### N8 — note — `parseErrorIdentity` has no production caller

Confirmed as the implementer reported: the only references are its export
(`packages/item-economics/src/index.ts:37`), its implementation, and its own test file. It is a
general helper for the package's error convention (`ITEM_COST_*: message`), not refusal-specific,
and the item-economics configuration and budget surfaces will plausibly need it.

**Judgment:** leaving it is the right call *for now*, but an exported helper with no caller is debt
with a shelf life. Route it to the valuation-surface phase: if that phase does not consume it,
delete it there.

### N9 — note — `ItemPricingTotalRow`'s docstring contradicts the shipped behaviour

`ItemPricingTotalRow.tsx:20` still reads "Only rendered for seats. A wood item is always one piece,
so '1 pc × 1 200 kr = 1 200 kr' would restate the input rather than explain it." After S1 it is
also rendered for a multi-piece wood lot. The comment now teaches the next reader the rule the fix
removed. Update it to state the resolved-quantity rule.

### N10 — note — the plan still carries the refusal as live specification

Criterion 9 is properly retired, and code and tests are clean (see probe 2). But the plan file
still presents the refusal as current spec in two places:
- **§Copy — the refusal message** (line 416) — the message text and its "**Ordering constraint:**
  this copy must not reach users before that surface exists". The copy it gates no longer exists.
- **§The backend contract — §9, in short** (line 47) — "**The refusal that matters (§9.1).**",
  describing the retired behaviour as the current contract.

The build records at lines 505/522/568 are history and correctly stay. The implementer was
explicitly told not to edit the plan and correctly did not; this is the coordinator's to fold.
Retire §Copy and correct §47 the way criterion 9 was retired — in place, with the reason.

### N11 — note — the purchase-cost dead end is closed by one guard, not structurally

Both forms still route `errors.item_pricing` to the item/task step in `stepErrorMap` and in
`onBeforeAdvance` (`InternalFormContent.tsx:240,325`; `PreOrderFormContent.tsx:311,417`), and the
final step's `form.trigger()` validates the whole schema, where `purchase_cost_per_piece` is still
`.nonnegative()`. `ItemPurchasePriceDisplay` still has no `fieldState` and renders no message.

Today this is **unreachable**: `applyPurchasePriceLookupResult` is the only writer of that path
(verified by exhaustive grep — every other reference writes `null` as a default or in `reset`), and
it sanitises. But the dead end returns intact the day a second writer appears. Worth a comment at
the schema, or narrowing the step-error routing to the expected-sale path.

### N12 — note — the lookup can overwrite a chosen category with `undefined`

`form.setValue("item.major_category", matchedCategory?.major_category, ...)` writes `undefined` on
a category-cache miss, clearing a value the user may have picked by hand. On the Internal form this
is caught at submit (the category is required); on Pre-order it is the mechanism that makes **B3**
reachable. Recorded here because it outlives B3's fix.

## Round 1 findings — disposition

| Id | Status |
|---|---|
| B1 (refusal machinery unreachable) | **Resolved** — deleted, not dormant. Verified structurally, see probe 2. |
| B2 (silent re-pricing) | **Dismissed by owner decision 2026-08-19.** Not re-raised. |
| S1 (wood hides its multiplier) | **Resolved** for the category-known path; mutation-tested. See **B3** for the path it does not reach. |
| S2 (negative lookup price traps the form) | **Resolved** — both halves landed and verified. Regression guard missing on the second half → **S5**. |
| S3 (raw `notify.error` toast) | Out of scope, deferred to its own phase. Unchanged. |
| N1 (`purchase_price` unit) | Resolved by owner decision — per piece. |
| N2 (signature reach into Return/Worker forms) | Out of scope; assessed correct on its merits in round 1. |
| N3 (stale test counts) | **Resolved** — counts in the plan and handoff now match reality (130 / 108, re-run). |
| N4 (two pre-existing TS2352) | Out of scope. Still present, still exactly two. |
| N5 (absent valuation surface) | Deferred — owner's next piece of work. |
| N6 (no live request body observed) | **Still true.** No dev server started; nothing observed. |
| N7 (single-checkpoint perimeter) | Still true by construction for anything before `e49967b5`. Not re-derived. |

## What I verified correct

- **B1 is a deletion, not a dormancy** (probe 2). Repo-wide grep for
  `ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM`, `isInlinePricingRefusal`, `useInlinePricingRefusal`,
  `INLINE_PRICING_REFUSAL_IDENTITY`, `ItemPricingRefusalNotice`, `ITEM_PRICING_REFUSAL*`,
  `showPricedItemRefusal`, `onClearPrices`, `handleClearPrices`, `inline-pricing-refusal`,
  `handleInlinePricingError` → **zero hits** under `packages/` and `apps/`, and zero across the
  whole repo excluding `docs/` and `node_modules/`. Neither barrel
  (`components/item-pricing/index.ts`, `src/index.ts`) re-exports a deleted symbol; both were read
  in full.
- **`ItemPurchasePriceDisplay` and its "comes from the purchase system" copy survive**, as required
  — read in full, unchanged in the diff.
- **S2 landed on both halves.** `applyPurchasePriceLookupResult` sanitises; the purchase-cost path
  is absent from `INTERNAL_STEP_FIELDS_MAP.item` **and** `PRE_ORDER_STEP_FIELDS_MAP.task`, while
  `item_pricing.expected_sale_price_per_piece` is retained in both so the editable field's
  validation still works.
- **Probe 3's inverse question — no new silent path.** An invalid purchase cost cannot now reach
  the payload silently: the final step's `form.trigger()` still validates the whole schema, so a
  bad value would block rather than pass. And it cannot arrive at all — `applyPurchasePriceLookupResult`
  is the sole writer; every other reference to `purchase_cost_per_piece` writes `null` (defaults at
  `InternalFormContent.tsx:140`, `pre-order-form-default-values.ts:28`, reset at
  `InternalFormContent.tsx:305`). `PurchasePriceSetValue`'s narrowing still prevents a non-numeric
  write.
- **Probe 4's case table** — enumerated against `showTotal = seat || resolvedQuantity > 1`:

  | Category | `item.quantity` | Resolved | Breakdown | Label | Verified by |
  |---|---|---|---|---|---|
  | wood | `null` | 1 | hidden | "Purchase price" | test (3 cases) |
  | wood | `0` / negative | 1 | hidden | "Purchase price" | `resolvePricingQuantity` unit tests |
  | wood | `1` | 1 | hidden | "Purchase price" | same resolved path |
  | wood | `2` | 2 | **shown** | "Purchase price per piece" | test (new, bites) |
  | seat | `1` | 1 | shown | "…per piece" | unchanged, criterion 2 |
  | seat | `4` | 4 | shown | "…per piece" | test |

  The labels key off `showTotal` in both components (`ItemPurchasePriceDisplay.tsx:36`,
  `ItemPricingNumberField.tsx:47,57`), so a breakdown can never appear under an unqualified
  "Purchase price", and the plain value is rendered only when `!showTotal`. Nothing changed for
  seats. `showTotal` uses the **resolved** quantity, so the one-piece fallback is preserved.
- **The rounding-order guarantee survives its rename.** `item-pricing-payload.test.ts`'s test was
  retitled to "keeps wood prices per piece and multiplies the looked-up quantity", but its fixture
  is still `19.995` and its assertion still `4000` — `round(1999.5) × 2`, not
  `round(19.995 × 2 × 100) = 3999`. Round 1's settled guarantee is intact, not quietly weakened.
- **The implementer's count correction was right.** The `priced-item refusal` block in
  `ItemPricingFieldGroup.test.tsx` at `e49967b5` held exactly **three** tests, not four; the file
  held 16, not 19. Declining to delete an unrelated test to reach a prompt's stated count was the
  correct call.
- **Criterion 9's retirement is complete in code and tests** (probe 5). Only the plan retains
  refusal specification → N10.

## Bounded regression — actual counts

| Check | Result |
|---|---|
| `npm run typecheck` | **clean** (exit 0) |
| `npx tsc -p packages/task-creation/tsconfig.json --noEmit` | only the **two known TS2352** in `use-shopify-customer-lookup-prefill.test.tsx` (N4). Run explicitly because the root `typecheck` script does not include a `packages/task-creation` project — round 1's note confirmed, and closed for this cycle by running it directly. |
| `npm run test:item-economics` | **130/130 passed**, 9 files |
| `npm run test:task-creation` | **108/108 passed**, 18 files |
| ESLint (changed files, `apps/managers-app/ManagerBeyo-app-managers/eslint.config.js`) | **5 problems (4 errors, 1 warning)** — exactly the five inherited, out-of-scope diagnostics: two `navigateToRef.current` render writes, two `handleLookupResult` prop uses, one missing `isSeller` dependency. **No new diagnostics.** |

The coordinator's re-run figures were re-derived independently and agree in every case.

No dev server was started. No browser check was run.

## Mutation probes — every one reverted, checksum-verified

Baseline SHA-256 captured before each probe and re-verified after revert with `shasum -c`.
`git status --short` was **empty** at review end, confirming byte-identical reverts across the
whole tree.

| # | File | Mutation | Result |
|---|---|---|---|
| 1 | `packages/task-creation/src/lib/item-lookup-prefill.ts` | `purchasePrice >= 0` → `> 0` | **SURVIVED** — 6/6 focused, **108/108** full suite green → **S4** |
| 2 | same | drop `Number.isFinite(purchasePrice) &&` | 1 of 4 bites (positive-infinity row). Correct: `isFinite` is the sole discriminator only there; `NaN` and `-Infinity` are already excluded by `>= 0` |
| 3 | same | delete the `purchasePrice >= 0` clause | bites (negative-price row) |
| 4 | same | remove the sanitisation entirely (`purchasePrice ?? null`) | **all 4 bite** |
| 5 | `packages/item-economics/.../ItemPricingFieldGroup.tsx` | `showTotal` → `majorCategory === "seat"` | bites — the new wood-quantity-2 test fails on the missing breakdown (129/130) |
| 6 | `packages/task-creation/src/components/InternalFormContent.tsx` | restore `"item_pricing.purchase_cost_per_piece"` to the item step map | **SURVIVED** — **108/108** green → **S5** |

**Probe 6 (B3 proof)** — a temporary test file
`packages/task-creation/src/lib/__probe_invisible_price.test.ts` was created, run, and **deleted**.
It touched no production file and no existing test. Verified absent; tree clean.

No database, service, or other tool-recorded state was touched. No dev server was started.

## Carry-forward dispositions

| Item | Destination |
|---|---|
| N8 — `parseErrorIdentity` with no production caller | the valuation-surface phase: consume it or delete it there |
| N11 — purchase-cost dead end closed by a single guard | this phase's fix cycle if cheap, else the valuation-surface phase |
| N12 — lookup overwrites the category with `undefined` | its own follow-up; outlives B3's fix |
| S3, N2, N4, N5 (round 1) | unchanged destinations from round 1 |
| Provenance frontmatter on the other two `from_backend` mirrors | coordinator, next mirror refresh |

## Lessons for the plans

1. **A criterion that gates a surface on a field needs to name what happens when that field is
   never set.** Criterion 1 ("Neither field renders until `item.major_category` is set") was
   written for the Internal form, where the category is mandatory. Composed into Pre-order, where
   it deliberately is not, the same sentence became a hiding place for a money write. When a plan
   composes one package into two hosts, each criterion needs checking against **both** hosts'
   required-field rules.
2. **A fix prompt should name the mutation that must turn red**, per charter rule 11. This cycle's
   prompt named none, and two of the three fixes shipped without a regression guard (S4, S5) — one
   of which the re-review prompt correctly predicted in advance. The prediction was right; make it
   a requirement rather than a forecast.
3. **Retiring a criterion is not retiring a contract.** Criterion 9 was retired cleanly, but §Copy
   and the §9 contract summary kept describing the refusal as live (N10). A retirement should sweep
   every section that states the retired behaviour, not only the numbered criterion.
4. **A test's title is part of its contract.** `item-pricing-payload.test.ts`'s rounding-order test
   was renamed to describe wood multiplication; the assertion still guards rounding order, but a
   future reader trimming "duplicate" wood tests would delete round 1's settled guarantee without
   knowing. Retitle as "…and rounds to minor units before multiplying", or split the two claims.

## Write perimeter

### Documents
- `docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_2.md` — created (this file).
- `docs/architecture/under_construction/implementation/item_pricing_fields/plans/PLAN_item_pricing_fields_20260818.md` — Review log entry appended; Lifecycle transition updated to `CHANGES_REQUESTED`.

### Code and tests
- **None.** Every mutation probe was reverted and checksum-verified; the temporary probe test file
  was deleted. `git status --short` is empty.

### Tool-recorded state
- None. No architecture graph exists in this repository.
