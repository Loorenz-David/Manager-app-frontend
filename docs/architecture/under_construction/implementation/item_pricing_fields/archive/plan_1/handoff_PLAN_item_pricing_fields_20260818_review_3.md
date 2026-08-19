---
plan: PLAN_item_pricing_fields_20260818
role: review
round: 3
verdict: APPROVED
date: 2026-08-19
actor: Claude Opus 5
---

# Item pricing fields — re-review of fix round 4

Delta-scoped re-review of commit `1737adda` against baseline `983b9c9b`, branch
`pipeline/item-economics-phase-1`.

**Verdict: `APPROVED`** — 0 blocking, 0 should-fix, 4 notes.

All five items in scope (B3, S4, S5, N9, N11) are resolved. Every mutation the fix prompt required
was re-run independently and bit; two of them I extended further than asked and they held. The
closing sweep found nothing that should stop this shipping. The notes below are carry-forward, not
conditions of approval.

## ⚠ OWNER DECISIONS REQUIRED (0)

None. Nothing in this round needs an owner answer.

## Mirror re-diff

**Clean.** Source digest
`8add7bce957f38a0a42e31a5491638f32b2d0a615bad350f1de236daaa818466` matches the mirror's
`source_sha256` exactly; the mirror body (frontmatter stripped) is byte-identical to the backend
source. The two unstamped sibling mirrors (`..._item_economics_configuration_20260815.md`,
`..._production_time_and_worker_cards_20260818.md`) are byte-identical to their sources. No drift.

## Verified perimeter

`git diff --stat 983b9c9b 1737adda` — **eight files plus the handoff**, exactly as declared:

`types.ts`, `InternalFormContent.tsx`, `PreOrderFormContent.tsx`, `pricing-fields.ts`,
`ItemPricingTotalRow.tsx`, `item-lookup-prefill.test.tsx`, `item-pricing-payload.test.ts`,
`sku-preview.test.tsx`. Nothing outside the list.

The two form components appear in the diff with **only** the step-map export and its comment — the
change S5 explicitly authorised ("Export the constants for test if they are not already exported").
The fix prompt's perimeter list named those two files only under the N11-narrowing condition, which
was not taken; the S5 instruction is the authority that covers them, and the diff carries nothing
else. Recorded as a perimeter-list wording gap, not a violation.

`sku-preview.test.tsx` is covered by the prompt's "one new or existing task-creation test file"
allowance and its fixture-repair clause. Working tree clean at review start and end.

**Not attributed to this cycle**, as instructed: `b4819135` (owner-authored production-time footer
note removal, −279 lines) and `40be5982` (its record). These are why `test:item-economics` reports
122 rather than 130. Verified: neither touches any item-pricing file. Round 1's N7 still holds for
anything older than `e49967b5`; not re-derived.

## Probe results

### Probe 1 — B3's closure is effective, recoverable, and *incidental rather than structural*

**It blocks, on both forms.** `PreOrderFormSchema.superRefine` now mirrors the Internal form's two
branches, with a comment naming the rule load-bearing for pricing visibility.

**It blocks early, not just at the end.** `PRE_ORDER_STEP_FIELDS_MAP.task` already contains
`item.major_category` and `item.item_category_id`, so the block fires when leaving the **task**
step — the same step that renders the category picker — not only at the final whole-form
`trigger()`.

**The user can recover, and sees why.** `ItemCategorySelectionField` is rendered on the task step
(`PreOrderFormContent.tsx:598`), directly above the pricing card, and renders **both** issues in a
`FieldErrorPill` at the field:
`categoryFieldState.error?.message ?? majorFieldState.error?.message`
(`ItemCategorySelectionField.tsx:98,114`). This is not a repeat of S2's dead end — there is a
control, and there is a rendered message on it.

**Traced from `handleLookupResult` to payload, not from the schema alone.** On a category-cache
miss (N12) the lookup writes `major_category: undefined` alongside `quantity: 4` and the purchase
price. The card is then hidden while a price sits in the form — the user sees no price — but the
step will not advance, the error renders at the picker, and choosing a category makes the card and
its breakdown appear. Nothing is submitted unseen.

**The gap that remains (→ N13).** The schema's predicate is *"`major_category` is truthy"*; the
card's render predicate is *"`major_category === "seat" || === "wood"`"*. These are **not the same
predicate**. Proven by probe 7: with `major_category: "metal"`, `PreOrderFormSchema.safeParse`
returns `success: true` and the payload carries `purchase_cost_minor: 500200`, while
`ItemPricingFieldGroup` would render nothing — B3 exactly.

This is **unreachable today** and does not block: `MAJOR_CATEGORY_OPTIONS`
(`ItemCategorySelectionField.tsx:19`) is a hardcoded two-value picker, and the only other writer is
the lookup, whose value originates in the backend's `ItemMajorCategoryEnum` — a closed
`{wood, seat}` Postgres enum (`backend/app/beyo_manager/domain/items/enums.py:17`). But the
frontend path that actually carries the value is untyped: `ItemDetailsFieldsSchema.major_category`
is `z.string().optional()` and the picker option's is `z.string()`, neither the
`MajorCategorySchema` enum the package already exports.

### Probe 2 — all three mutations bite, and S5's Pre-order row is not weak

Re-run independently, results identical to the implementer's report:

| Mutation | Result |
|---|---|
| S4 — `purchasePrice >= 0` → `> 0` | **RED** — 1 failed, 6 passed (the zero row: "expected null to be +0") |
| S5 — restore purchase cost to `INTERNAL_STEP_FIELDS_MAP.item` | **RED** — 1 failed, 14 passed |
| B3 — remove the new Pre-order category rule | **RED** — 3 failed, 9 passed |

**Pushed further than asked.** The Pre-order row staying green during the Internal mutation is
because only the Internal map was mutated, **not** because the assertion is weak: mutating
`PRE_ORDER_STEP_FIELDS_MAP.task` instead turns the Pre-order row red on its own (1 failed, 14
passed). The `it.each` is symmetric and each row bites on its own map.

**Corroboration of the implementer's reverts.** The three baseline SHA-256 digests I captured before
probing match the implementer's declared restore digests **exactly** —
`d96e9732…` (item-lookup-prefill.ts), `8d72b677…` (InternalFormContent.tsx),
`c8940332…` (types.ts). The habit the fix prompt introduced took, and it is independently checkable.

### Probe 3 — the ESLint suppressions are narrow

Both are single-line, single-rule:
`// eslint-disable-next-line react-refresh/only-export-components`, each with a comment stating why
the export exists. No blanket file-level disable. **No new diagnostic of any kind** was introduced —
ESLint over all eight changed files returns exactly the five known inherited diagnostics.

One honest caveat (→ N16): removing the directive from `InternalFormContent.tsx` and re-linting
produced the *same* two errors and no `react-refresh` diagnostic, so under the prescribed
managers-app config the directive suppresses nothing observable. It is harmless and plausibly
load-bearing when the app lints its own graph; it is simply unverified.

### Probe 4 — the sku-preview repair did not weaken coverage

Diffed the file and read every changed assertion.

- The shared fixture now injects `item_category_id: "cat_1"`, `major_category: "wood"` **before**
  the caller's overrides, so an override no longer needs to restate them.
- **"still demands an article number or SKU without a template"** — the one test asserting failure —
  does not merely assert `success === false` (which the new rule would now also satisfy). It pins
  `issue.path.join(".") === "item.article_number"`. It therefore **cannot pass for a new reason**.
  This is the case that mattered and it is sound.
- **"accepts a manual SKU as an override"**: the override changed from
  `{ ...buildPreOrderFormDefaultValues(true).item, sku: "MANUAL-SKU" }` to `{ sku: "MANUAL-SKU" }`.
  The old spread was already a redundant re-application of the defaults the builder had just
  spread; it became harmful only once the fixture injected a category, which that spread would have
  reset to `undefined`. The claim under test — a manual SKU is accepted when a template exists — is
  unchanged.
- **"accepts an item with no typed identity when a template exists"** asserts success; supplying a
  valid category removes an unrelated blocker without touching the identity claim.
- All three consumers of `buildSubmittableValues` were enumerated; there are exactly three and none
  relies on the category being absent.

### Probe 5 — N11's count is right, and the comment is documentation, not enforcement

**The count is four, not two.** Verified directly: `errors.item_pricing` is routed at
`InternalFormContent.tsx:242` (final `onBeforeAdvance`) and `:327` (`stepErrorMap`), and at
`PreOrderFormContent.tsx:313` and `:419`. The prompt's condition was "more than the two
`stepErrorMap` expressions" → the comment fallback was the required branch, correctly taken and
correctly explained.

**On its merits:** the comment at `pricing-fields.ts` is accurate and well-placed — it sits on the
schema path an ingestion author would be editing, and it names the reason (no field-error renderer)
rather than restating the rule. But it **describes the trap; it does not prevent it**. The dead end
is still closed by exactly one guard in `applyPurchasePriceLookupResult`, and
`ItemPurchasePriceDisplay` still renders no message. That is the accepted state, chosen by the
prompt's own branch condition, and it carries forward unchanged as a risk, not a defect.

### Probe 6 — closing sweep

- **The pricing card has exactly two consumers** repo-wide (`InternalFormContent.tsx:417`,
  `PreOrderFormContent.tsx:607`), both now category-required.
- **`purchase_cost_minor` has exactly one producer** (`normalize-task-form-payload.ts:119`).
- **Return and Worker Internal carry no `item_pricing` at all** — neither schema composes it, and
  `normalizeWorkerInternalFormPayload` passes `undefined` for pricing explicitly. Round 1's N2
  (`createLookupResultSignature` reaching those forms) is unchanged this cycle and remains a
  strictly-stricter signature with no pricing consequence.
- **Defaults and resets hold on both forms.** Internal resets `item_pricing` to nulls
  (`InternalFormContent.tsx:306`); Pre-order resets via
  `form.reset(buildPreOrderFormDefaultValues(hasSkuTemplate))` (`:514`), whose defaults carry both
  pricing keys as `null` — so no price survives a submit on either form.
- **A second lookup for a different article** replaces `item.quantity` and rewrites the purchase
  price (including to `null` when the new article has none — covered by an existing test), but does
  **not** clear a typed expected sale price (→ N15).

## Findings

All four are notes. None blocks approval.

### N13 — note — B3's closure rests on a two-value domain, not on one predicate

The schema requires `major_category` to be *truthy*; the pricing card renders on
*`seat` or `wood`*. Two different predicates guarding the same money path is the precise shape of
B3. It is unreachable today (UI picker is hardcoded to two options; backend enum is a closed
`{wood, seat}`), so this does not block — but the frontend carries the value as an untyped
`z.string()` in both `ItemDetailsFieldsSchema` and the category-picker option schema, while
`@beyo/item-economics` already exports `MajorCategorySchema` for exactly this.

**Suggested correction (cheap, do it before a third major category is ever introduced):** type the
form field as `MajorCategorySchema` so an unknown value fails loudly, **or** derive
`ItemPricingFieldGroup`'s gate from `MAJOR_CATEGORIES` rather than a literal disjunction — either
makes the two predicates one. Worth adding to the load-bearing comment in `types.ts` regardless.

### N14 — note — the B3 end-to-end test's third assertion cannot fail

In "cannot normalize a hidden looked-up purchase cost without a category":

```
expect(payload).toBeNull();
expect(Boolean(payload && "purchase_cost_minor" in (payload.item as …))).toBe(false);
```

`payload` is `null` by construction on this path, so the second expectation is `Boolean(null && …)`
— always `false`, regardless of the code under test. The test's real weight is
`expect(parsed.success).toBe(false)`, which the enumerated schema rows above it already assert.

The test is not wrong and it did go red under the B3 mutation; it simply proves the schema gate,
not the normalization gate. **Suggested correction:** either drop the vacuous line, or make it
meaningful by normalizing the *unvalidated* values and asserting the payload would have carried
`purchase_cost_minor` — documenting what the schema is protecting against.

### N15 — note — a re-scan re-multiplies a typed expected sale price

`handleLookupResult` overwrites `item.quantity` and the purchase price on every accepted result,
but never touches `expected_sale_price_per_piece`. A seller who types 4 000 kr/pc for a one-piece
article and then scans a different article with quantity 6 carries the 4 000 into a 24 000 kr
expected sale total.

Low severity: because the new quantity is > 1 the breakdown renders, so the figure is **visible**
rather than silent — this is not a B3 recurrence. It is a question of intent (is the sale price a
property of the article or of the task?), and the `onClearPrices` helper that once cleared both
prices together was deleted with the refusal machinery in round 3, correctly, since it served the
notice's button and was never wired to lookups. Route to the valuation-surface phase or its own
follow-up.

### N16 — note — the `react-refresh` suppressions are unverified

See probe 3. Removing one produced no change in diagnostics under the prescribed config. Harmless;
keep them, but they are not demonstrably doing anything here.

## Round 2 findings — disposition

| Id | Status |
|---|---|
| B3 (pre-order submits an unseen multiplied purchase cost) | **Resolved.** Category required on both forms, blocks at the task step, error rendered at the picker, mutation-verified. Residual predicate gap → N13. |
| S4 (zero boundary untested) | **Resolved.** `purchase_price: 0` row added with exact expected value `0`; the `>= 0` → `> 0` mutation now fails. Re-run independently. |
| S5 (step maps unguarded) | **Resolved.** Both maps exported and asserted, each row biting on its own map — verified by mutating each separately. |
| N9 (stale total-row docstring) | **Resolved.** Now states the resolved-quantity rule. |
| N11 (purchase-cost routing) | **Resolved via the prompt's comment branch**, count verified at four expressions. Documentation, not enforcement — carried forward. |
| N8, N10, N12, S3, N2, N4, N5 | Out of scope this round; destinations unchanged. |
| N6 (no live request body observed) | **Still true.** See "what remains unproven". |
| N7 (single-checkpoint perimeter) | Still true by construction for anything before `e49967b5`. |

## What I verified correct

- **The production diff is minimal and exactly what was specified** — the category rule with its
  load-bearing comment, two step-map exports, one docstring, one schema comment. No opportunistic
  edits.
- **The category rule mirrors the Internal form's two branches** with the same messages and paths,
  and is enumerated by two separate test rows so each branch's own predicate is the only reason it
  fails (charter rule 2's companion).
- **The S4 row asserts an exact value per case** (`0 → 0`; negative/`NaN`/±`Infinity` → `null`)
  rather than a disjunction, and every row still asserts validation stays passable.
- **Regression figures re-derived independently** and matching the implementer's report in every
  case (table below).
- **The `122` item-economics figure is correctly explained** by the owner's out-of-cycle footer-note
  removal, not by this phase; no item-pricing test was lost.
- **Recovery from the new block is real** — control present, message rendered, card and breakdown
  appear on selection.

## Bounded regression — actual counts

| Check | Result |
|---|---|
| `npm run typecheck` | **clean** (exit 0) |
| `npx tsc -p packages/task-creation/tsconfig.json --noEmit` | **exactly 2 errors, both TS2352** in `use-shopify-customer-lookup-prefill.test.tsx` (known, out of scope) |
| `npm run test:item-economics` | **122/122 passed**, 9 files |
| `npm run test:task-creation` | **114/114 passed**, 18 files |
| ESLint (8 changed files, managers-app flat config) | **5 problems (4 errors, 1 warning)** — exactly the five inherited diagnostics. **No new diagnostics.** |

No dev server was started. No browser check was run.

## Mutation probes — every one reverted, checksum-verified

Baselines captured with `shasum -a 256` before probing and re-verified with `shasum -c` after each
revert. `git status --short` was **empty** at review end.

| # | File | Mutation | Result |
|---|---|---|---|
| 1 | `item-lookup-prefill.ts` | `purchasePrice >= 0` → `> 0` | **RED** — 1 failed / 6 passed (S4 zero row) |
| 2 | `InternalFormContent.tsx` | restore purchase cost to `INTERNAL_STEP_FIELDS_MAP.item` | **RED** — 1 failed / 14 passed |
| 3 | `PreOrderFormContent.tsx` | restore purchase cost to `PRE_ORDER_STEP_FIELDS_MAP.task` *(beyond what was asked)* | **RED** — 1 failed / 14 passed |
| 4 | `types.ts` | remove the new Pre-order category rule | **RED** — 3 failed / 9 passed |
| 5 | `InternalFormContent.tsx` | delete the `react-refresh` disable directive | no diagnostic change → N16 |

**Probe 6** (B3 recovery trace) and **probe 7** (gate-predicate mismatch, N13) used one temporary
test file `packages/task-creation/src/lib/__probe_gate_predicate.test.ts`, created, run and
**deleted**. It touched no production file and no existing test.

All four production files restored to their exact pre-probe digests:
`d96e9732…`, `8d72b677…`, `52ed8c52…`, `c8940332…`. No database, service, or tool-recorded state was
touched.

## Carry-forward dispositions

| Item | Destination |
|---|---|
| N13 — unify the schema/render predicates on `major_category` | before any third major category is introduced; cheap enough to fold into the valuation-surface phase |
| N14 — vacuous assertion in the B3 end-to-end test | next touch of `item-pricing-payload.test.ts` |
| N15 — expected sale price survives a re-scan | valuation-surface phase or its own follow-up |
| N16 — unverified `react-refresh` suppressions | no action required; revisit if lint config coverage changes |
| N11 — purchase-cost routing closed by one guard | standing risk, accepted; revisit if a second writer of `purchase_cost_per_piece` is ever added |
| N8 (`parseErrorIdentity`), N12 (category overwrite), S3, N2, N4, N5 | unchanged destinations from rounds 1–2 |

## Lessons for the plans

1. **A criterion that gates a surface on a field should name the *values*, not just the field's
   presence.** Criterion 1 says the fields render "once `item.major_category` is set"; the code
   renders them for two specific values. Round 2's B3 came from a gap between a schema rule and a
   render gate, and N13 is the same gap one level down, surviving the fix. When a criterion gates
   on a field, the plan should state the predicate exactly once and both the schema and the
   component should be traceable to it.
2. **The required-mutation discipline worked.** Round 3 ran no probes and shipped two unguarded
   fixes; round 4's prompt named three mutations, the implementer ran them, and all three
   reproduced independently — including the restore digests. Keep naming mutations in fix prompts;
   this round is the evidence it pays.
3. **A perimeter list should be derived from the fixes, not only from the branches.** The two form
   components were reachable only through S5's "export the constants" instruction while the
   perimeter list named them under a different, untaken condition. Harmless here, but a
   perimeter check that has to be argued from prose is one that can be argued the wrong way.

## What remains unproven

Stated explicitly because this approval archives the phase:

- **No live request body has ever been observed for this phase** (round 1's N6, still open across
  all three rounds). Every payload claim rests on `normalizeInternalFormPayload` /
  `normalizeReturnFormPayload` unit output, never on a request the backend actually received. The
  plan's own validation plan names a Playwright request-body assertion that has not been run.
- **The re-pricing path the owner accepted has never been exercised against a real already-priced
  item.** The backend's inline re-pricing (§9.1 as rewritten) — replace on amount present, inherit
  on omission, write nothing when unchanged — has not been observed once from this frontend.
- **B3's closure is verified in the schema and by trace, not in a running browser.** The rendered
  error pill and the appearing pricing card were confirmed by reading the components and their
  wiring, not by seeing them.
- **N13's gap is latent by domain, not closed by construction** — a third major category would
  reopen B3 silently.

## Write perimeter

### Documents
- `docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_3.md` — created (this file).
- `docs/architecture/under_construction/implementation/item_pricing_fields/plans/PLAN_item_pricing_fields_20260818.md` — Review log entry appended; Lifecycle transition updated to `APPROVED`.

### Code and tests
- **None.** Every mutation probe reverted and checksum-verified; the temporary probe test file
  deleted. `git status --short` empty over `packages/` and `apps/`.

### Tool-recorded state
- None. No architecture graph exists in this repository.
