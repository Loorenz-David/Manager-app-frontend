---
plan: PLAN_item_valuation_core_20260819
role: reviewer
round: 1
state: REVIEWED
verdict: CHANGES_REQUESTED
actor: Claude Opus 5 (plan-reviewer doctrine)
date: 2026-08-19
---

# Reviewer handoff — phase 1 (tracks 1A + 1B), round 1

## Summary

**Verdict: CHANGES_REQUESTED** — narrowly, on one file.

Full first review of both tracks against criteria 1–55, the intention §3.2/§3.4/§3.5
and §4A M2–M7 + M11–M13, and `HANDOFF_TO_FRONTEND_price_scenario_20260819.md`
§2/§4/§5/§9. The arithmetic core, the draft machine, the screen-state precedence, the
DTO and the component seam are **correct and independently re-derived** — not merely
re-run. Both mirrors are provenance-clean, the perimeter matches the declarations
exactly, both named mutations and 1B's self-chosen probe reproduce exactly as
recorded, and I re-ran the handoff's `roundHalfEven` comparison protocol myself
against a reference written from the specification (24 006 cases, zero mismatches),
which discharges 1B's declared judgment call 2.

Counts: **0 blocking · 1 should-fix · 7 notes · 0 owner decisions.**

The single should-fix is a wrong number in a shipped fixture: the canonical
`editor-saved-pristine` scene renders `AT PRICE 2h 44m` where the contracted pipeline
yields `2h 45m` at that fixture's own price. It is one string, in one file, but it is
the screen's most common state, it is what the owner's visual sign-off looks at, and
it is what phase-2 mocks will be seeded from — a wrong allowance is precisely the
class of error this phase exists to make impossible. Fix it (plus, ideally, N4 and N5
in the same pass, same file) and the phase approves on a delta review.

## ⚠ OWNER DECISIONS REQUIRED (0)

None from this review. One owner question is already open upstream and is **not**
restated here: 1B handoff item 3 (T8's verbatim pristine test means an untouched
unpriced default does not adopt another manager's commit), which the coordinator has
already routed to an owner card.

## Findings

### Blocking (0)

None.

### Should-fix (1)

**S1 — the `editor-saved-pristine` fixture states an allowance the contracted
arithmetic does not produce.**
`packages/item-economics/src/components/price-editor/price-editor-fixtures.ts`,
`PRICE_EDITOR_FIXTURES["editor-saved-pristine"].table.atPrice = "2h 44m"`.

*Authority:* handoff §4 (the three-operation pipeline) + intention §4A M3
(nearest-minute display) + the plan's Reference payload (the model those fixtures
declare they trace to).

*Reproduction:* the fixture's own price is 975 000 whole-item minor
(`perPiece: "1 625"`, `piecesLine: "× 6 pieces · 9 750 SEK total"`,
`fraction: (975000 - 420000) / 1230000`). With the reference model
(`residual_percent_milli 22000`, `constant_deduction_minor 0`,
`cost_per_worker_minute_ten_thousandths 13000000`):
`budget = 214 500` → `allowed_centimin = 16 500` (exact, no rounding) →
`allowance_seconds = 9 900` → `9 900 / 60 = 165` minutes exactly → **"2h 45m"**.
Run against the production module:
`allowanceSeconds(975000, REFERENCE_MODEL) === 9900` and
`formatAllowanceDuration(9900) === "2h 45m"`. Note this is not even the truncation
error the handoff warns about — 9 900 s is a whole number of minutes, so truncation
also yields 2h 45m; the fixture's value has no derivation at all.

*Correction:* `atPrice: "2h 45m"`. The other two editor fixtures were re-derived and
are **correct** (`editor-dirty` 1 335 000 → 13 555 s → "3h 46m";
`editor-unpriced-pristine` 1 140 000 → 11 575 s → "3h 13m"), as are the typical
("3h 25m" ← 12 300 s), the marker ("suggested 2 025/piece" ← 1 215 000 ÷ 6), the
purchase line (285 000 → "2 850 SEK"), the band ends and both Back labels.

### Notes (7)

**N1 — criterion 55's third clause has no automated home.** The package-wide
"no `@beyo/tasks` / `@beyo/task-creation` under `packages/item-economics/src`" ban is
satisfied by grep only (I re-ran it: **0 hits**), which charter rule 1 does not accept
as a criterion's proof. Declared by 1B and already routed by the coordinator into the
phase-2 plan as task **11a**. Carry-forward, not a fix-cycle item.

**N2 — M6's "assert in dev" on the step count is unimplemented, and the two sides of
the slider round it differently.** `price-draft.ts:resolveStepCount` returns
`(max − min) / step` unrounded, while `PriceSlider` uses
`Math.max(1, Math.round(stepCount))`. On a band that violates the handoff's multiples
guarantee they disagree, and `sliderFractionToPrice(1, domain)` can exceed
`max_minor` (e.g. `{min 0, max 100, step 40}` → steps 2.5 → `Math.round` 3 → 120).
Unreachable while the backend honours §5.4, so this is hardening, not a defect — but
M6 names the assert and the module does not carry it.

**N3 — `src/types.ts` now value-imports `lib/item-pricing.ts`** (1B judgment call 8,
to place `INLINE_PRICING_CURRENCY satisfies ValuationCurrency`). No cycle today —
`item-pricing.ts` imports nothing, verified — but any future value import of `../types`
inside `item-pricing.ts` creates a runtime cycle at the package's most-imported module.
Cheaper home for the guard: `lib/valuation-currency.ts`, which already imports both
sides. The guard itself is live (probe 3 below) and worth keeping.

**N4 — two testids ship outside the plan's binding list and were not declared:**
`item-valuation-slider-reason` (`PriceSlider`) and `item-valuation-bootstrap-error`
(`PurchaseBootstrapCard`). Both are legitimately needed (criterion 51 variants 10 and
7 assert through them). Master plan §6 says the phase-1 plan carries the *full* list;
add these two rows so the claim stays true. (1A's declared deviation 2 —
`item-valuation-header` / `item-valuation-menu-button` rendered by the frame — is
accepted; see rulings.)

**N5 — dead prop and an uncovered §3.5 row.** `avatarImageSrc` on
`ItemValuationProvenanceRow` has **no** fixture or test caller in this phase (charter
rule 4), and no fixture exercises either a non-current-user author (the reference
payload's own "Marta Lind") or the `avatarName: ""` unloadable-author case whose copy
§3.5 fixes to "saved version" only. Every provenance fixture is `"You"` or the dash.
One extra fixture row would close both.

**N6 — `SAVE_OK` depends on the follow-up refetch actually carrying the new price.**
T6 clears `lastDraft` and leaves `savedExpected` at the pre-commit value; if the
post-commit refetch returns the pre-commit payload (replica lag, a coalesced
invalidation), `REFETCH` takes the T7 arm and the screen sits in `dirty` — "unsaved
change" with Save re-enabled on a price that is already committed. Faithful to M4 as
written, so not a defect of this phase; flagging it because phase 2 owns the
commit→refetch sequence. Cheapest fix if the owner/coordinator wants it: let `SAVE_OK`
carry the committed price (an amendment to a frozen event shape, master plan §6).

**N7 — passing-glance a11y.** The hidden range input exposes only the step index to
assistive tech (`aria-label` but no `aria-valuetext`), so a screen reader announces
"29 of 82" instead of a price; and the decorative three-dot is a focusable button
labelled "More options" that does nothing. Both are phase-2-cheap.

## Rulings on the declared deviations (all accepted)

**Track 1A.** (1) `price-editor-tone.ts` — accepted; the `production-time-tone.ts`
precedent exists in the sibling directory and importing the type from the barrel would
cycle. The registry's public shape (`PriceEditorTone` from
`components/price-editor/index.ts`) holds. (2) Frame renders `item-valuation-header` /
`-menu-button` — accepted; the header is 1A's component. Phase 2 must add only
`item-valuation-page` (see lesson L3). (3) `headerExtra` slot — accepted; it is what
puts the provenance row above the divider without every caller rebuilding the header.
(4) Deferred checkpoint — accepted; the combined checkpoint `fbd5d67c` is verifiable
and its perimeter is exact.

**Track 1B.** (1) `Math.floor((s + 30) / 60)` instead of M3's literal `Math.round` —
**accepted and independently proven**: the `≤ 0` arm returns first, so `s > 0`, where
`floor((s+30)/60) ≡ round(s/60)` including ties; I asserted the boundary quartet
against the production module (29 → "0m", 30 → "1m", 89 → "1m", 90 → "2m"). The
artifact conflict it resolves is real and belongs upstream (lesson L1). (2)
`roundHalfEven` reflowed transcription without re-running the 612-case comparison —
**accepted, and the protocol is now discharged**: I compared the shipped function
against a half-even reference written from the specification (not from the handoff's
algorithm) over six divisors × 4 001 numerators = **24 006 cases including every
negative tie: zero mismatches**, plus ten end-to-end vectors below. No token of the
algorithm differs from handoff §4. (3) `BACK` stamps `lastEditedAt` on both arms —
accepted (intention §4 ownership table; no criterion can be masked by it). (4) T2 with
a null purchase cost → 0 — accepted; unreachable inside S6 and it keeps the reducer
total. (5) The divide-by-zero guards in `clampSnap` / the fraction mappers — accepted
and welcome (charter rule 6 class). (6) `isCovered: false` whenever `showChip` is
false — accepted; claiming coverage with no anchor is the worse default and the
AT-PRICE tone follows the chip. (7) Plain `z.string()` ids — accepted; it matches
`TaskProductionTimeSchema` in the same file and M9 already writes the phase-2 cast.
Consistency inside the file beats contract 24 here; the cost of reversing later is a
`.transform()` on three fields. (8) `satisfies` as an expression statement — accepted,
with N3 on its side effect. (9) Member-schema names / `PriceDraftProvenanceVariant` —
accepted; the barrel exports exactly the registry's twelve `types.ts` names. (10) Math
helpers take the full `PriceScenarioModel` — accepted (charter rule 3).

## What was verified correct (settled ground for the re-review)

**Mirror provenance (master plan §2, obligation 1).** `HANDOFF_TO_FRONTEND_price_scenario_20260819.md`
frontend mirror is **byte-identical** to `backend/docs/handoff/to_frontend/` (sha256
`e8c0c8b9…f20c04f` both sides). The 20260815 mirror differs from its original only by
its 12-line provenance frontmatter, whose recorded `source_sha256`
(`8add7bce…818466`) **matches the live backend original** — no in-place rewrite since
mirroring. (Minor: the 20260819 mirror carries no such frontmatter block; the
convention is not applied uniformly.)

**Perimeter (obligation 2).** `git diff --stat 1d9b7a1f fbd5d67c` = **40 files,
5 908 insertions, 0 deletions**, and resolves to exactly: 1A's 15 files under
`components/price-editor/`, 1B's 12 created + 3 edited (`types.ts` +126,
`index.ts` +54, `item-economics-keys.ts` +9 — all pure appends, nothing removed
anywhere, corroborating both "append-only" claims), the 9 project docs, and the
20260819 handoff mirror. **Nothing outside the declarations.** Both probed files'
pre-review digests match 1B's declared post-revert digests exactly
(`price-scenario-math.ts` `9ceb34e5…1a85632d`, `types.ts` `647f7b40…6ed015bf`).
The working tree at review start carried two uncommitted **documentation** deltas
(the coordinator's tracker row and the phase-2 plan's 11a / controller-seed routing) —
no code, so the perimeter reconstruction is unaffected.

**Arithmetic, re-derived from handoff §4 (obligation 4).** Independent reference
implementation (spec-written half-even, exact integer comparison of both candidate
quotients, tie→even) reproduces the shipped module on every vector tried:

| vector | P | budget | centimin | seconds | display |
|---|---|---|---|---|---|
| §9.2 reference | 855 000 | 188 100 | 14 469 | **8 681** | 2h 25m |
| negative (criterion 6 model) | 100 000 | **−28 000** | −2 154 | −1 292 | 0m |
| suggested anchor | 1 215 000 | 267 300 | 20 562 | 12 337 | 3h 26m |
| break-even anchor | 1 211 335 | 266 494 | 20 500 | **12 300** | 3h 25m |
| band bottom | 420 000 | 92 400 | 7 108 | 4 265 | 1h 11m |
| band top | 1 650 000 | 363 000 | 27 923 | 16 754 | 4h 39m |
| off-grid saved | 858 000 | 188 760 | 14 520 | 8 712 | 2h 25m |
| zero budget | 227 272 (deducting) | 0 | 0 | 0 | 0m |
| P = 1 | 1 | 0 | 0 | 0 | 0m |
| P = 0 (deducting) | 0 | −50 000 | −3 846 | −2 308 | 0m |

Two of these are load-bearing beyond the criteria: the break-even anchor computes to
**exactly** `typical.total_seconds` (12 300 s), which proves the reference payload is
internally consistent and that the chip's flip point is the real one; and the negative
path runs end-to-end through all three operations, not just `budgetMinor`.
`formatAllowedWorkerMinutes(−2154n) === "-21.54"` matches M8's stated form
(`q = c/100n`, `r = |c mod 100n|`, sign on the quotient).

**Master plan §9.1 (forbidden primitives).** `price-scenario-math.ts` contains exactly
one `Number(` — the declared exit boundary at line 86 — and **no** `Math.round` or
`parseFloat` outside prose.

**Draft machine.** T1–T9 each have a row asserting the contracted effect; the
corrected M4 invariant sequence executes and ends `draft 855000 / lastDraft 1005000 /
backTarget 1005000`, blanking to `null` after `SAVE_OK`. Criterion 24's five rows each
assert `{variant, backTargetMinor}` as one object, and the fixture-isolation companion
holds where it matters: deleting the `draft === initialDefault` clause from
`unpriced-pristine` turns row 24e red. Hand-traced beyond the table: refetch-while-dirty
then BACK returns to the *new* saved value; commit → refetch → `saved-pristine` with the
toggle blank (intention §3.6) resolves correctly; a saved row that *vanishes*
(`savedExpected` → null) while pristine falls to T9 and keeps the user's number rather
than crashing on a null assignment.

**Screen states.** Each of criteria 32–37 is built by parsing a mutation of the
reference payload through `PriceScenarioSchema` (charter rule 3 — the production object
type), and each row's fixture makes its own predicate load-bearing: 33 satisfies both
S3 and S4 and asserts S3 wins; 34a carries a present `saved` so only the status clause
can produce `purchase_required`; 34b is the reference payload itself, proving the
round-5 card-1 rule; 35 carries a purchase cost so only `model === null` can block.
`resolveScreenState` never reads `item` (criterion 37 holds on a `detached` payload
with `item: null`).

**Coverage.** `resolveCoverage` drives the flip from the server integer, never from a
local allowance (hard constraint 2); the `is_fundable: false` fixture keeps a populated
`break_even_price_minor`, so a check that read only the member would pass wrongly —
the row bites for its own reason.

**DTO.** Every key the handoff §2 marks nullable is `.nullable()`, never `.optional()`;
the two integer-scaled fields are `z.number().int()`; `status` reuses
`ItemEconomicsStatusSchema.nullable()`; `calculation_version` is a literal.
`item.quantity` accepts 0 (handoff §8.2). The §5.5 `detached` and `mismatched` columns
both parse with `typical` populated.

**Registry conformance (obligation 6).** The frozen signatures of master plan §6 are
implemented verbatim — `PriceDraftState` / `PriceDraftEvent` field-for-field,
`clampSnap`, `resolveProvenanceVariant`'s return object, both fraction mappers,
`resolveScreenState`, and `CURRENCY_DISPLAY_CODE` as a `Record<ValuationCurrency,
string>` (module-private, matching the §6 export table). `src/index.ts` exports exactly
the registry's twelve `types.ts` names plus the five modules' surfaces: **no component,
no page loader** (grep for `price-editor` / `loadItemValuation` in the index: zero
hits). `itemEconomicsKeys.priceScenario` sits directly under `all` and is proven not to
carry the `tasks()` prefix.

**Seam (obligation 8).** `boundaries.test.ts` green; `grep -rn '@beyo/tasks\|@beyo/task-creation'
packages/item-economics/src` → **0 hits**; no `components/price-editor/` file imports
`src/lib/` or `src/types.ts` — and I proved the test *bites*, not just passes (probe 4).

**Track 1A criteria.** All 13 closed variants have exactly one structural assertion set
each, plus 12a; criterion 52 asserts the exact `30/82` emission; 53 asserts ±`1/82` and
clamps at the top end; the off-grid render emits nothing.

**Suites and typecheck, re-measured this session.** `npm run test:item-economics` →
**223 passed / 19 files** (matches the IMPLEMENTED claim). `npx tsc -p
packages/item-economics/tsconfig.json --noEmit` → clean. `npm run typecheck` (monorepo,
`tsc -b --force`) → **exit 0**: §10's "two inherited TS2352" did **not** reproduce for
me either, confirming 1B's correction to §10. ESLint: there is no root `lint` script and
no `eslint.config.*` at the repo root, corroborating both tracks' "not run" note.

## Mutation-probe declaration

Every probe applied and reverted from a pre-image copy; all three touched files are
byte-identical to their pre-probe state. No database, no dev server, no network.

| # | Probe | File | Site | Pre digest | Result | Post-revert digest |
|---|---|---|---|---|---|---|
| 1 | criterion 7 (named) — three-step conversion replaced by direct budget → seconds | `src/lib/price-scenario-math.ts` | `allowanceSeconds` **definition** | `9ceb34e5…1a85632d` | **bites** — exactly one assertion red: criterion 5, `expected 8682 to be 8681`; the other 12 green | `9ceb34e5…1a85632d` ✓ |
| 2 | criterion 41 (named) — fourth member `"norwegian_krone"` on the enum | `src/types.ts` | `ValuationCurrencySchema` **definition** | `647f7b40…6ed015bf` | **bites** — `TS2741: Property 'norwegian_krone' is missing … Record<…>` at `lib/valuation-currency.ts:14` | `647f7b40…6ed015bf` ✓ |
| 3 | 1B's self-chosen — remove the member `INLINE_PRICING_CURRENCY` holds | `src/types.ts` | same definition | `647f7b40…6ed015bf` | **bites** — `TS1360` at `types.ts:216` (plus two collateral errors), proving the `satisfies` guard is live | `647f7b40…6ed015bf` ✓ |
| 4 | reviewer-chosen — forbidden imports (`../../lib/valuation-currency`, `../../types`) added to a component | `src/components/price-editor/PriceHeadline.tsx` | import block | `7d1722bc…79a25c40` | **bites** — `boundaries.test.ts` red listing both violations by file → specifier | `7d1722bc…79a25c40` ✓ |

One temporary cross-check file (`packages/item-economics/src/__reviewer_cross.test.ts`,
11 independent arithmetic vectors, all green) was created and **deleted**; `git status`
shows no code-tree delta from this session.

## Lessons for the plans (fold upstream)

**L1 — M3 and master plan §9.1 contradict each other.** M3 explicitly permits
`Math.round(seconds / 60)` inside the display formatter; §9.1 bans `Math.round`
anywhere in `price-scenario-math.ts` and says a review greps for it. 1B resolved it
correctly and declared it, but the next reader will re-litigate. Amend §9.1 to carve
out the post-money display formatter, or amend M3 to name `floor((s + 30) / 60)`.

**L2 — criterion 51's "no numbers" rows cannot bite in phase 1.** Variants 4, 8 and 9
assert `item-valuation-per-piece` is absent, but the absence is a property of the
*fixture* (which omits the headline), not of any production code — no component defect
can turn those assertions red. Phase 1 has no composition module, so this is a plan
limitation, not an implementer defect: the phase-2 plan must carry the
state → rendered-blocks assertions in the controller/page tests, or the "never render
zeros for a null block" hard constraint (intention §1.3) is nowhere enforced by a test
that can fail.

**L3 — 1A's deviation 2 is not yet in the phase-2 plan.** The wiring plan mentions
none of `item-valuation-page` / `-header` / `-menu-button`; it should record that the
frame already renders the latter two and phase 2 adds only `item-valuation-page`.

**L4 — the mirror-frontmatter convention is applied unevenly.** The 20260815 mirror
carries the provenance block that makes §2's re-diff a one-command check; the 20260819
mirror does not (it is byte-identical to its source, so the check still works, but by
luck rather than by construction).

## Carry-forward dispositions

| Item | Destination | Why it cannot evaporate |
|---|---|---|
| N1 (criterion 55's import ban unautomated) | phase 2, task **11a** — already written into `PLAN_item_valuation_wiring_20260819.md` | criterion 55 stays open until 11a's test exists |
| N2 (M6 step-count assert) | phase 2, controller task 6 (it owns the domain → slider props) | one dev-time assert beside `resolveStepCount` |
| N3 (`types.ts` → `lib/item-pricing` edge) | phase 2, or the S1 fix cycle if cheap | guard moves to `valuation-currency.ts`; no behaviour change |
| N4 (two unregistered testids) | this plan's testid list (task 6) — fix cycle | the list is described as binding and full |
| N5 (`avatarImageSrc` / author-copy fixtures) | this plan (fix cycle) or phase 2's provenance wiring | §3.5's unloadable-author row is otherwise never rendered |
| N6 (`SAVE_OK` vs refetch lag) | phase 2 plan + master plan §6 if the event shape changes | M4/T6's assumption is stated but untested |
| N7 (a11y: `aria-valuetext`, decorative button) | phase 2 (page assembly) | — |
| L1–L4 | coordinator, upstream artifacts | — |

## Write perimeter (full)

Documents only — **no production file was modified by this session**:

1. this handoff (`handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_1.md`);
2. one appended reviewer line in `plans/PLAN_item_valuation_core_20260819.md` Review log;
3. one tracker-row update in `master_plan.md` §4 (phase-1 row → `REVIEWING` →
   `CHANGES_REQUESTED`, reviewer's row only).

Probes: the four rows above, all reverted byte-identically, digests verified.
Scratch: one temporary vitest file, created and deleted (declared above); analysis
scripts live in the session scratchpad, outside the repo. No `npm install`, no dev
server, nothing touched `http://192.168.1.246:8000`.
