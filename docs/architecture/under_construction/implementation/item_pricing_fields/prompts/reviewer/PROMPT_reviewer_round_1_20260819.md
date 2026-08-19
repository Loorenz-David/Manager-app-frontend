---
plan: PLAN_item_pricing_fields_20260818
role: reviewer
round: 1
date: 2026-08-19
---

# Reviewer prompt — Item pricing fields, first review

Copy everything below the line into the reviewer session.

---

You are reviewing the **item pricing fields** in the ManagerBeyo frontend monorepo
(`/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend`).
You did not write this code and must not assume it is correct — or wrong.

## Doctrine

Follow `/Users/davidloorenz/agent-skills/plan-reviewer.md` and, first,
`/Users/davidloorenz/agent-skills/pipeline-charter.md`. This is a **first review of a phase**:
full checklist against every acceptance criterion, the semantic authorities, the contracts, plus
the judgment-call probes below. You produce findings and a verdict. You never fix.

## Read first

1. `docs/architecture/under_construction/implementation/item_pricing_fields/plans/PLAN_item_pricing_fields_20260818.md`
   — the phase row: goal, Track A/B split, Decisions, acceptance criteria, Review log, and the
   `§Copy ordering constraint`.
2. Both implementer handoffs under
   `docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/implementer/`
   — `..._implement_1.md` (Track B) and `..._implement_2.md` (the lookup addendum), with their
   declared write perimeters.
3. Both implementer prompts under `.../prompts/implementer/` — what was actually asked for.
4. `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md`
   — **§9 (inline pricing at task creation)**, §9.1 (the priced-item refusal), §1.2, §6.
5. Contracts (repo root, not under `docs/`): `architecture/` — `02_types.md`, `09_forms.md`,
   `24_dto.md`, `34_runtime_validation.md`, `35_shared_packages.md`.

## The code

- `packages/item-economics/src/lib/item-pricing.ts`, `src/pricing-fields.ts`,
  `src/components/item-pricing/` — Track A (visual + seam types + pure builders).
- `packages/task-creation/src/lib/normalize-task-form-payload.ts`,
  `src/lib/inline-pricing-refusal.ts`, `src/lib/item-lookup-prefill.ts`, `src/types.ts`.
- `packages/task-creation/src/components/InternalFormContent.tsx` and `PreOrderFormContent.tsx`.
- `packages/items/src/types.ts` — `ItemLookupResultSchema.purchase_price`.

## Backend fact, verified — use it, do not re-derive

`backend/app/beyo_manager/services/queries/items/lookup/base.py:18` declares
`purchase_price: int | float | None = None`, always serialized at
`lookup_item_by_article_number.py:31`, in **plain kronor with decimals** (the backend test uses
`1250.5`) — not minor units. Only the `purchase_api` handler populates it.

## Baseline and perimeter

Everything landed in **one commit**: `CHECKPOINT (not approved): item-economics package,
production time widget, item pricing fields` on branch `pipeline/item-economics-phase-1`. There is
no earlier baseline — this work was untracked until 2026-08-19, so no per-round diff exists.

Reconstruct the perimeter by comparing each handoff's **declared write perimeter** against
`git show --stat HEAD`. The commit also contains two other workstreams (the money-key migration
and the production time widget); attribute carefully. Both handoffs claim "no file under
`packages/item-economics/src` was modified" — that claim is checkable and worth checking.

## Judgment-call probes

These come from reconciling the handoffs against the plan. Each is a probe, not a trusted claim.

1. **A negative lookup price makes the form unfixable.** The purchase price is read-only and comes
   from the purchase system. Its schema is `nonnegative()`, and the implementer deliberately kept
   the purchase-cost path in both step-field maps. Trace what a user sees if the purchase app
   sends `-50`: the step blocks on a field with no input and no remedy. Does *Remove prices*
   reach it? Is the error even rendered next to a read-only display? Enumerate the outcome, and
   judge whether validating a value the user cannot edit is right at all.
2. **The §9.1 refusal remedy.** Trace end to end: backend refuses → `isInlinePricingRefusal`
   matches the identity → notice renders → *Remove prices* nulls both values → the `watch`
   subscription hides the notice → the normalizer omits both keys and the currency → resubmit
   succeeds. Then probe the reverse: after clearing, can the lookup effect write the purchase
   price back and re-arm the refusal? The guard is `lastAppliedLookupSignatureRef` — establish
   whether it survives every path that could remount or reset it.
3. **The lookup signature.** The implementer added `purchase_price` to
   `createLookupResultSignature` on its own initiative — the prompt never mentioned it — reasoning
   that a corrected price on the same article would otherwise be discarded as a duplicate. Assess
   the addition on its merits, including the canonicalization of missing and explicit `null` to
   one signature.
4. **Optionality's blast radius on Pre-order.** The expected sale price replaced Shopify's
   `product_unit_price` entirely, and the guard that dropped the whole `shopify_preorder` section
   on a null price was relaxed to check shop and inventory only, with `product.price` made
   conditional. Verify that a pre-order with **no** prices still produces a Shopify product, and
   that one *with* a price sends the same figure the breakdown displayed.
5. **Rounding order.** `resolveTotalMinor` rounds per piece then multiplies. Confirm the payload
   and the on-screen total can never disagree, and that the Shopify `product.price` string derives
   from the same minor total. The divergent cases are `19.995 × 2` and `12.345 × 4`; `19.99 × 3`
   proves nothing.
6. **Stale acceptance criterion 4** ("empty fields block") contradicted the later owner decision
   that both fields are optional. The implementer followed the owner and the criterion has been
   rewritten. Confirm the plan text is now internally consistent and that nothing in the code
   still enforces the mandatory reading.
7. **The refusal copy is a release gate.** Its closing clause — *"you can update the item's price
   afterwards from the item itself"* — points at the valuation surface
   (`PUT /api/v1/item-economics/items/{id}/valuation`), which does not exist in the tree. Confirm
   it is still absent and restate the gate: co-ship it or trim the clause before release.
8. **`PurchasePriceSetValue` narrows `setValue` to one literal field name** in
   `item-lookup-prefill.ts`. Judge whether that structural narrowing is honest about
   react-hook-form's API or whether it hides a mismatch at the call sites.
9. **Currency.** `INLINE_PRICING_CURRENCY = "swedish_krona"` is emitted only when an amount is
   present. Verify against §9 that this is the key and value the backend expects, and that the
   legacy `item_currency` is truly gone from every write path.

## Verification you must run yourself

Do not trust the handoffs' numbers. Re-run and report actual counts:

- `npm run typecheck`
- `npm run test:item-economics`
- `npm run test:task-creation`
- ESLint on the phase's files. Pre-existing diagnostics in the two form components
  (`navigateToRef.current` render writes, `useEffectEvent` callbacks passed as props, a missing
  `isSeller` dependency) are recorded as inherited — confirm that, rather than accepting it.

A live request-body check needs a running app; **do not start dev servers** — the owner starts
them and keeps control. If you need a browser run, say so and stop.

## Output

Two layers, per the reviewer doctrine's dual-audience rule.

**Layer 1 — technical review.** Findings by id, each with severity
(`blocking` / `should-fix` / `note`), what is wrong, the violated authority (file + section), and
a suggested correction. Also report, specifically, what you verified **correct** — settled ground
is what makes the next round cheap. Verdict: `APPROVED` or `CHANGES_REQUESTED`.

**Layer 2 — the human briefing.** Open with a 2–4 sentence plain-language state of the build. Then
for every blocking and should-fix finding, a 3–6 sentence story from the owner's perspective in
the product's own domain — a seller creating a pre-order, a manager pricing a seat, real article
numbers and kronor — shaped as cause → what you would actually observe → why it matters. Strictly
faithful to the verified scenario; no inflation.

## Close

Deposit your report as
`docs/architecture/under_construction/implementation/item_pricing_fields/handoffs/reviewer/handoff_PLAN_item_pricing_fields_20260818_review_1.md`
with frontmatter `plan`, `role: review`, `round: 1`, `verdict`, `date`, `actor`, and a section
declaring your **full write perimeter** — documents, code, and any tool-recorded state. If you ran
mutation probes, list every file you touched and reverted.

Any owner decision you need goes in a section titled `⚠ OWNER DECISIONS REQUIRED (n)` as decision
cards: **Question** (one line, answerable yes/no or by naming an option), **Story** (2–4 sentences
of lived scenario, no artifact citations), **Branches** (each answer with its lived consequence).
