# PLAN_item_valuation_core_20260819 (phase 1)

## Metadata

- Plan ID: `PLAN_item_valuation_core_20260819`
- Status: `NOT_STARTED`
- Tracks: **1A visual** (Claude) ∥ **1B pure logic** (Codex) — disjoint files, one
  shared review round
- Created at (UTC): `2026-08-19T00:00:00Z`
- Master plan: `../master_plan.md` (naming registry §6, standing rules §9, environment §10)
- Semantic authority: `../planning/intention.md` — §3 (workflow), §3.2 (states),
  §3.4–3.5 (editor + draft machine), **§4A (mechanism contracts M2–M7, M11–M13)**

## Goal

Everything pure and everything visual, with zero I/O: the DTO, the BigInt arithmetic,
the draft/screen-state machinery, the formatters (1B) — and the complete set of
presentational components rendering every screen state from fixtures (1A).
**NOT in this phase:** queries, actions, sockets, controller/provider, page assembly,
menu button, app registration, e2e — all phase 2.

## Read first

1. Master plan §5 (contract resolution — re-emit before coding), §6 (registry), §9, §10
2. Intention §1 (hard constraints), §3.2, §3.4, §3.5, §4A M2–M7 + M11–M13
3. `HANDOFF_TO_FRONTEND_price_scenario_20260819.md` §2 (payload), §4 (arithmetic,
   copy the reference implementation from here), §5 (null semantics), §9 (validation
   vectors)
4. Contracts: `02_types`, `24_dto`, `15_feature_structure`, `17_testing`; 1A adds
   `07_components`, `14_styling`, `27_responsive`, `31_animations`,
   `32_loading_skeletons`
5. Visual brief (owner card 2, projection r0): **no mockup files exist or will be
   committed** — the intention §3.4 prose layout is the binding written brief, Track
   1A is implemented by Claude (who authored the intention from the owner's mockups),
   and visual fidelity is validated by the owner at phase review. Precedent
   components (what exists, not how to write): `components/production-time/*` for
   card-frame idiom, `@beyo/ui` `Avatar` and `SliderFieldRow` (native range-input
   precedent), `ConfirmActionButton` styling vocabulary

## Dependencies

None (first phase). Round 0 plan-projection is **mandatory** before implementer
prompts (master plan §3).

## Files expected to change

Track 1B (Codex): `src/types.ts` (**append** the scenario schemas — projection L15),
`lib/price-scenario-math.ts`, `lib/price-draft.ts`, `lib/price-coverage.ts`
(projection L2), `lib/item-valuation-screen-state.ts`, `lib/valuation-currency.ts`,
each lib with a sibling `.test.ts` (+ a `types` test file for the DTO criteria);
registry line in `api/item-economics-keys.ts` + its prefix test; `src/index.ts`
(pure-module exports only — projection L16).

Track 1A (Claude): `components/price-editor/` — `index.ts`,
`ItemValuationFrame.tsx` (header: title, subtitle, decorative three-dot),
`ItemValuationProvenanceRow.tsx`, `PriceHeadline.tsx`, `PriceCoverageChip.tsx`,
`PriceSlider.tsx`, `WorkImpactTable.tsx`, `ItemValuationFooter.tsx` (Save +
Use-suggested), `PurchaseBootstrapCard.tsx`, `ItemValuationEmptyState.tsx`,
`ItemValuationSkeleton.tsx`, `price-editor-fixtures.ts`, `boundaries.test.ts`
(projection L17), component tests. **1A exports nothing from the package
`src/index.ts` in phase 1** — phase 2 composes the components from inside the
package (projection L16).

No other file. Neither track touches the other's list (review perimeter check).

## Tasks — Track 1B (ordered)

1. **DTO** (append to `src/types.ts` — projection L15) per M13: mirror handoff §2;
   `.nullable()` never `.optional()`; `status: ItemEconomicsStatusSchema.nullable()`
   (already at `types.ts:38`); integer-scaled fields `z.number().int()`;
   `currency: ValuationCurrencySchema.nullable()` (new enum — projection L13;
   `INLINE_PRICING_CURRENCY` must satisfy it); `calculation_version: z.literal(1)`
   via `PRICE_SCENARIO_CALCULATION_VERSION`.
2. **Math** (`price-scenario-math.ts`) per M2/M3: `roundHalfEven` copied verbatim
   from handoff §4; `budgetMinor`, `allowedCentimin`, `allowanceSeconds` as three
   calls in the handoff's order/scaling; `formatAllowedWorkerMinutes(c: bigint):
   string` (M8's 2-dp string, explicit negative-sign branch); `formatAllowanceDuration`
   (M3: nearest-minute, `"{h}h {r}m"` / `"{r}m"`, ≤ 0 → `"0m"`).
3. **Draft machine** (`price-draft.ts`) per M4/M5/M6, **using the frozen state/event
   shapes and signatures in master plan §6 verbatim** (projection L3/L4): `clampSnap`;
   a pure `priceDraftReducer(state, event)` implementing exactly the T1–T9 table
   (`now` injected via events, never read); `resolveProvenanceVariant` returning
   `{ variant, backTargetMinor }` (projection L19); `sliderFractionToPrice` /
   `priceToSliderFraction` (domain passed in).
4. **Coverage** (`price-coverage.ts`) per M7 (projection L2): `resolveCoverage(
   draftMinor, anchors)` → `{ showChip, isCovered, markerMinor }`; `showChip` false
   when `anchors` null, `is_fundable` false, or `break_even_price_minor` null;
   `isCovered = draftMinor >= break_even_price_minor`; `markerMinor =
   suggested_price_minor` (null hides the marker).
5. **Screen state** (`item-valuation-screen-state.ts`): `resolveScreenState(scenario,
   status)` per the frozen signature, implementing intention §3.2 S1–S6 first-match
   order **as amended round 5** (S4 = `saved === null || status ===
   "item_missing_purchase_cost"`; error-with-cached-data resolves from the data).
6. **Currency/format** (`valuation-currency.ts`) per M11/M12: `CURRENCY_DISPLAY_CODE:
   Record<ValuationCurrency, string>` (Record, not switch — exhaustiveness by
   construction, projection L12); `currencyDisplayCode(currency | null)` (null → the
   `INLINE_PRICING_CURRENCY` code); `formatPerPiece` (sv-SE grouping, 0–2 decimals,
   divisor `max(1, quantity)`; note the sv-SE group separator is **U+00A0** —
   assertions spell it `"1 900"`, projection L7).
7. **Key registry**: add `priceScenario` to `item-economics-keys.ts` directly under
   `all` (M9 placement only — no socket work this phase).
8. Export the new pure modules from `src/index.ts` (types + functions; no components
   — 1A owns nothing in the package index this phase; no page loader this phase).

## Tasks — Track 1A (ordered)

1. Fix the component prop shapes first, in `components/price-editor/index.ts` types:
   props are **formatted strings, tones, fractions ∈ [0,1], booleans and callbacks**
   — never DTO blocks, and no import from `src/lib/` or `src/types.ts`, fixtures
   included (master plan §9.4 as strengthened by projection L18). Export the named
   union `PriceEditorTone = "positive" | "negative" | "neutral"` (projection L22).
   Provenance-row props are pre-resolved upstream (projection L20/L23):
   `authorName: string` (already `"You"`-substituted by the phase-2 controller) and
   `avatarName: string` (`""` means unknown author — copy fixed to "saved version").
2. Build the components against `price-editor-fixtures.ts`. **Closed fixture list
   (projection L10) — exactly these 13 variants, one structural assertion set each
   (criterion 51):**
   1. `editor-saved-pristine` (mockup 3 shape: saved author row, Save disabled)
   2. `editor-dirty` (mockup 2: "You unsaved change", Back to saved, Save enabled)
   3. `editor-unpriced-pristine` (mockup 4: "No price set · suggested from purchase
      price × 4", no Back button, Save enabled)
   4. `purchase-required` (mockup 1: shimmer, explanation, Fetch CTA)
   5. `purchase-required-no-article` (CTA disabled + article-number message)
   6. `bootstrap-pending` (CTA in-flight state)
   7. `bootstrap-error` (one of the §3.3 failure messages rendered)
   8. `blocked` (S5: frame kept, status-derived message, no numbers, Save disabled)
   9. `unbound` (S3: empty state naming the missing item)
   10. `editor-no-band` (domain null: slider disabled + reason, numbers intact)
   11. `editor-non-fundable` (no chip, no marker, no Use-suggested row)
   12. `editor-empty-typical` (TYPICAL column reason text, never "0m"; "estimated"
       label variant included here)
   13. `editor-cannot-commit` (Save disabled + `-save-reason` visible)
3. `PriceSlider`: built over a **visually-hidden native `input[type=range]`**
   (`min=0`, `max=stepCount`, `step=1`), emitting `index / stepCount` fractions —
   keyboard, a11y and jsdom testability come free (projection L9; precedent:
   `@beyo/ui` `SliderFieldRow`). Renders fill tone, marker position (fraction) +
   label, end labels, disabled state. Snapping to price is the consumer's job (M6)
   — the slider never sees minor units.
4. Skeleton (S1) matching the frame; empty states reuse the frame so the card never
   collapses (intention §1.3).
5. Component tests: one row per fixture variant (criterion 51), slider fraction
   emission, disabled/no-marker branches, chip tones — plus `boundaries.test.ts`
   walking the directory with `node:fs` and asserting no import specifier matching
   `src/lib/`, `../../lib`, `../../types` or `price-scenario` appears in any
   `components/price-editor/` source (projection L17/L18 enforcement).
6. Test ids — **phase-1 component ids** (binding): `item-valuation-provenance`,
   `-provenance-avatar`, `-back-to-saved` (the §3.5 toggle — renamed from
   `-back-button`, projection L21), `-per-piece`, `-total-line`, `-purchase-line`,
   `-chip`, `-slider`, `-slider-handle`, `-slider-input`, `-suggested-marker`,
   `-work-table`, `-typical`, `-at-price`, `-save-button`, `-save-reason`,
   `-use-suggested`, `-fetch-purchase`, `-bootstrap-message`, `-bootstrap-error`,
   `-slider-reason`, `-empty-state`, `-skeleton` (all prefixed `item-valuation`;
   `-bootstrap-error` and `-slider-reason` added by review r1 N4 — shipped and
   asserted through, previously unlisted). **Phase-2 page ids**: `item-valuation-page`
   only — `-header` and `-menu-button` are rendered by `ItemValuationFrame` and are
   phase-1 ids (review r1 ruling on 1A deviation 2).

## Acceptance criteria

Mechanism criteria cite intention §4A. Every criterion is an automated vitest
assertion on the production module (charter rules 1, 3).

**Arithmetic (M2) — enumerated, not sampled:**
1. `roundHalfEven(-3n, 2n) === -2n`; 2. `roundHalfEven(-5n, 2n) === -2n`;
3. `roundHalfEven(3n, 2n) === 2n`; 4. `roundHalfEven(5n, 2n) === 2n` (handoff §9.1 —
a truncating implementation fails 1–2 only).
5. With the §9.2 model constants, `allowanceSeconds(855000, model) === 8681`.
6. Negative path (projection L14 — named constants, since the §9.2 model's zero
   deduction can never go negative): with `{residual_percent_milli: 22000,
   constant_deduction_minor: 50000, cost_per_worker_minute_ten_thousandths:
   13000000}` at `P = 100000`, `budgetMinor === -28000n` (exact, not just "negative").
7. Named mutation (rule 11): replacing the three-step seconds conversion with direct
   budget→seconds in `price-scenario-math.ts` (definition site) must turn criterion 5
   red — record which assertion bites.

**Display (M3):**
8. `formatAllowanceDuration(8681) === "2h 25m"` (truncation yields `"2h 24m"` and
   fails); 9. `formatAllowanceDuration(-1) === "0m"`;
10. `formatAllowanceDuration(3 * 3600) === "3h 0m"`; 11. `(45 * 60) → "45m"`.
12. `formatAllowedWorkerMinutes(16000n) === "160.00"`;
13. `formatAllowedWorkerMinutes(-5n) === "-0.05"` (sign branch).

**Draft machine (M4) — one criterion per transition row T1–T9:**
14. T1: init with saved 855000 → draft 855000, lastDraft null.
15. T2: init unpriced, purchase 285000, band {420000, 1650000, 15000} → draft =
    clampSnap(1140000) = 1140000 = initialDefault.
16. T3: DRAG leaves lastDraft untouched.
17. T4: BACK from dirty stores lastDraft, restores saved.
18. T5: BACK from pristine with lastDraft restores it and nulls lastDraft.
19. T6: SAVE_OK nulls lastDraft.
20. T7: refetch with unchanged savedExpected preserves draft + lastDraft.
21. T8: refetch with changed savedExpected while pristine adopts the new value.
22. T9: refetch with changed savedExpected while dirty preserves the draft.
23. The M4 invariant sequence **as corrected round 5** (projection L1): T1 init with
    `savedExpected = 855000`, band `{420000, 1650000, 15000}`; drag 1 335 000 → BACK
    → BACK → drag 1 005 000 → BACK ends `draft === 855000`,
    `lastDraft === 1005000`, `backTargetMinor === 1005000`; a SAVE_OK then yields
    `backTargetMinor === null`.
24. `resolveProvenanceVariant` — one row per variant × guard from the §3.5 table
    (unpriced-pristine, saved-pristine ± lastDraft, dirty ± savedExpected), each row
    asserting **both** `variant` and `backTargetMinor` (projection L19), each
    fixture satisfying **only** its own predicate (charter rule 2 companion).

**clampSnap (M5):** 25. `clampSnap(1140000) === 1140000`; 26. `clampSnap(2000000) ===
1650000`; 27. `clampSnap(427500) === 435000` (tie up); 28. `clampSnap(427499) ===
420000`; 29. `domain null → identity`.

**Slider mapping (M6) — exact vectors on the standard band {420000, 1650000, 15000},
steps = 82 (projection L25):**
30. `sliderFractionToPrice(0) === 420000`; 30a. `(0.5) === 1035000`;
    30b. `(1) === 1650000` (three distinct outcomes — an implementation returning
    `min` constantly fails 30a/30b).
31. Off-grid round trip: `priceToSliderFraction(858000) === 438000/1230000` and
    `sliderFractionToPrice(438000/1230000) === 855000`, while the draft holding
    858000 is untouched by the render round trip.

**Screen states — one row per adjacent precedence pair (charter rule 2; S4 as
amended round 5):**
32. S1↔S2: status `"pending"`, scenario null → `loading`; status `"error"`, scenario
    null → `error` (projection L11).
32a. S2↔S3: status `"error"` **with** a cached `mismatched` scenario → `unbound`
    (error-with-data resolves from the data — intention §3.2 S2).
33. S3 beats S4: `item_binding: "mismatched"`, `saved: null`, `status: "ok"` → `unbound`.
34. S4 beats S5: `saved: null`, `model: null` → `purchase_required`.
34a. S4 on server refusal: `saved` present, `status: "item_missing_purchase_cost"`,
    `model: null` → `purchase_required` (beats S5).
34b. **Card-1 rule:** `saved` present with `purchase_cost_minor: null`,
    `status: "ok"`, full model → `editor`, NOT `purchase_required` (this is the
    reference payload's own shape).
35. S5 beats S6: purchase present, `model: null`, status `null` (config failure) →
    `blocked`.
36. S6: the reference payload (Notes §Reference payload) → `editor`.
37. Detached: `item_binding: "detached"` (item null) → `unbound` (S3 guard does not
    read `item`).

**Coverage (M7, on `resolveCoverage` — projection L2):**
38. `resolveCoverage(break_even, anchors).isCovered === true`;
39. `resolveCoverage(break_even − step, anchors).isCovered === false`;
40. `is_fundable: false` → `showChip === false` and `markerMinor === null`; 1A keeps
    only the render assertion (fixture 11: no `-chip`, no `-suggested-marker` in the
    DOM).

**Currency/format (M11/M12):** 41. **four** mapping rows —
`currencyDisplayCode("swedish_krona") === "SEK"`, `("danish_krona") === "DKK"`,
`("euro") === "EUR"`, `(null) === "SEK"` (projection L12); exhaustiveness is the
`Record<ValuationCurrency, string>` construction, and the named mutation is: add a
member to `ValuationCurrencySchema` in `src/types.ts` (definition site) →
`npx tsc -p packages/item-economics/tsconfig.json --noEmit` must fail on the Record.
42. `formatPerPiece(1140000, 6) === "1 900"` (sv-SE group separator is U+00A0 —
projection L7; assertions use the escape or normalise once, stated in the test file).
43. `formatPerPiece(855102, 6) === "1 425,17"` (projection L6 — the earlier
`855001` vector was arithmetically false). 44. quantity 0 → divisor 1.

**DTO (M13):** 45. the **reference payload** (Notes §Reference payload — projection
L26) parses; 46. the §5.5 `detached` and `mismatched` column rows each parse (two
fixtures); 47. `saved: null` + full model parses; 48. `calculation_version: 2` fails
parse; 49. a fixture omitting a nullable key (e.g. no `currency` property) **fails**
parse (nullable-not-optional proof); 50. `residual_percent_milli: "22000"` (string)
fails parse.

**Track 1A:** 51. one test row per closed fixture variant 1–13 (task 2), each with
its one structural assertion set (projection L10) — e.g. variant 10 asserts slider
disabled AND reason present; variant 11 asserts `-chip` and `-suggested-marker`
absent; variant 12 asserts reason text present and `-typical` never renders `"0m"`.
52. the hidden range input drives fraction emission: setting it to index `k` emits
exactly `k / stepCount`, never a price; 53. keyboard arrow on the focused input
moves one index → emits ±`1/stepCount`; 54. `boundaries.test.ts` (node:fs walk —
projection L17) proves no `components/price-editor/` source imports from `src/lib/`
or `src/types.ts` (projection L18 widening).

**Both tracks:** 55. `npx tsc -p packages/item-economics/tsconfig.json --noEmit`
clean; `npm run test:item-economics` green (baseline **131**, projection-measured —
re-measure at session start); no imports of `@beyo/tasks`/`@beyo/task-creation`
under the package.

## Notes

- The reducer is deliberately a pure function so phase 2's controller wraps it in
  `useReducer` without re-deriving semantics.
- `formatWorkSeconds` exists in `production-time-view-model.ts` and **is confirmed
  divergent** (it floors — projection reality check): never reuse it here; the named
  divergence (handoff §8.1) means the two widgets legitimately differ.
- Deliberately thin on visual pixel specs — Track 1A refines at prompt time against
  the intention §3.4 prose brief (owner card 2: no mockup files; fidelity validated
  by the owner at review).
- `packages/item-economics/vitest.config.ts` has no `setupFiles` — component tests
  import `@testing-library/jest-dom/vitest` per file.

### Reference payload (projection L26 — the one concrete fixture every criterion cites)

Derived from handoff §2 with concrete ids; `saved.purchase_cost_minor` is null and
`status` is `"ok"`, so under the round-5 S4 rule it resolves to `editor` (criteria
34b, 36, 45).

```json
{
  "task_id": "tsk_ref0001",
  "status": "ok",
  "item_binding": "bound",
  "can_commit": true,
  "currency": "swedish_krona",
  "calculation_version": 1,
  "config_fingerprint": "cmv_7a1:pcbv_3f9:v1",
  "item": { "client_id": "itm_ref0001", "article_number": "0000608",
            "label": "Dining chairs", "quantity": 6 },
  "saved": { "valuation_id": "ival_ref0001", "expected_sale_price_minor": 855000,
             "purchase_cost_minor": null,
             "created_at": "2026-08-14T10:24:00+00:00",
             "created_by": { "client_id": "usr_ref0001", "username": "Marta Lind",
                             "profile_picture": null } },
  "model": { "cost_model_version_id": "cmv_7a1", "basis_version_id": "pcbv_3f9",
             "residual_percent_milli": 22000, "constant_deduction_minor": 0,
             "cost_per_worker_minute_ten_thousandths": 13000000,
             "is_purely_proportional": true },
  "typical": { "total_seconds": 12300, "is_estimated": false,
               "sections_without_sample": 0, "sections_total": 4,
               "method": "median_completed_section_totals",
               "window_days": 90, "min_sample_size": 5 },
  "anchors": { "is_fundable": true, "break_even_price_minor": 1211335,
               "suggested_price_minor": 1215000,
               "infeasible_at_or_below_minor": 29 },
  "domain": { "rule": "break_even_band_v1", "min_minor": 420000,
              "max_minor": 1650000, "step_minor": 15000 }
}
```

## Review log

*(append-only; implementer and reviewer share it)*

- **2026-08-19 · projection round 0 (Claude, `projection r0`).** Plan-projection gate
  run before any implementer prompt. Verdict **AMENDMENTS_REQUIRED**: 26 ledger rows
  (5 high, 13 medium, 8 low) and 2 owner decision cards. Handoff:
  `../handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_projection_0.md`.
  Headline findings: the M4 invariant sequence cited by criterion 23 cannot execute
  (starts at T2 where both BACK guards are unsatisfiable); no module owns M7, so
  criteria 38–39 have no phase-1 home; criterion 36's §2 example payload resolves to
  `purchase_required`, not `editor`; criterion 43 is arithmetically false
  (`855001 ÷ 600` renders no decimals); the four mockups exist only in a chat message.
  Measured baselines: `test:item-economics` **131 passing** (master plan §10 says 125),
  `tsc -p packages/item-economics/tsconfig.json --noEmit` clean. Criterion 7's named
  mutation was verified to bite (direct budget→seconds yields 8682 vs 8681).

- **2026-08-19 · coordinator (Claude), projection round 0 folded.** All 26 ledger
  rows routed; both owner cards resolved by David the same day. Card 1 → the
  recommended branch: S4 gates on the server's own refusal (`saved === null ||
  status === "item_missing_purchase_cost"`) — intention amended (changelog round 5),
  criteria 32–37 rewritten (new rows 32/32a/34a/34b). Card 2 → no mockup files;
  Track 1A is Claude with the intention §3.4 prose as the binding brief. Upstream
  fixes: M4 invariant sequence (L1), S2 error-with-data semantics (L11), §2 slider
  grounding row (L9). Master plan: frozen signatures (L3/L4/L12/L19), schemas moved
  to `src/types.ts` (L15), `ValuationCurrencySchema` (L13), `lib/price-coverage.ts`
  owns M7 (L2), seam strengthened to no-`lib/`-imports with `boundaries.test.ts`
  enforcement (L17/L18), `PriceEditorTone` registered (L22), baseline 131 + branch
  note (L24). This plan: file lists corrected (L16), closed 13-variant fixture list
  (L10), slider over hidden native range input (L9), testids split/renamed (L21),
  provenance props pre-resolved (L20/L23), criteria 6/23/24/30/31/36/38–41/43/45/
  51–55 rewritten with exact vectors (L14/L1/L19/L25/L5/L2/L12/L6/L26), reference
  payload published (L26). Phase state → **PROMPT_READY**; implementer prompts may
  now be compiled.

- **2026-08-19 · Track 1A implemented (Claude).** 15 new files under
  `components/price-editor/` — 10 components, tone module, barrel, fixtures, 22
  tests. All 13 closed variants covered (criterion 51), slider emissions proven
  (52–53), the import seam enforced by a real `node:fs` boundary test (54).
  Typecheck clean; suite 213/17 green (includes 1B's in-flight tests). Four declared
  deviations, all recorded in the handoff — notably `price-editor-tone.ts` (a
  barrel-cycle-avoiding file the plan's list does not name, following the
  `production-time-tone.ts` precedent) and the checkpoint commit deferred to the
  coordinator because Track 1B was live in the same working tree. Handoff:
  `../handoffs/implementer/handoff_PLAN_item_valuation_core_20260819_implement_1A_1.md`.

- **2026-08-19 · Track 1B implemented (Claude Opus 5, implementation-executor).**
  12 new files (5 pure libs + 7 test files) plus three appended edits
  (`src/types.ts` DTO block, `api/item-economics-keys.ts` `priceScenario` entry,
  `src/index.ts` export block). 70 new tests; criteria 1–50 and 55 all green as
  assertions on the production modules. Criterion 7's named mutation (direct
  budget → seconds at the `allowanceSeconds` definition site) turns exactly
  criterion 5 red (`expected 8682 to be 8681`); criterion 41's (a fourth member on
  `ValuationCurrencySchema`) fails the package typecheck on the `Record` in
  `valuation-currency.ts`; a third self-chosen probe (dropping the member
  `INLINE_PRICING_CURRENCY` holds) proves the `satisfies` guard in `types.ts` is
  live. All probes reverted byte-identically (sha256 digests in the handoff).
  Suite 223/19; `tsc -p packages/item-economics` and `npm run typecheck` clean.
  Ten judgment calls recorded, the load-bearing ones being: `formatAllowanceDuration`
  uses `Math.floor((s + 30) / 60)` rather than M3's literal `Math.round`, because
  master plan §9.1 bans `Math.round` in that module and the two forms are provably
  identical over its domain; BACK stamps `lastEditedAt` on both arms (intention §4
  ownership table); DTO ids stay unbranded to match the sibling schema in the same
  file rather than contract 24. Three items for the coordinator: criterion 55's
  package-wide import ban has no automated home (verified by grep, 0 hits), phase 2
  needs a registered initial `PriceDraftState`, and T8's verbatim pristine test
  means an untouched unpriced default does not adopt another manager's commit.
  Master plan §10 corrected: the monorepo typecheck baseline is clean, not two
  TS2352. Handoff:
  `../handoffs/implementer/handoff_PLAN_item_valuation_core_20260819_implement_1B_1.md`.

- **2026-08-19 · review round 1 (Claude Opus 5, plan-reviewer).** First full review of
  both tracks. Verdict **CHANGES_REQUESTED**: 0 blocking, **1 should-fix**, 7 notes, 0
  owner cards. S1 — the `editor-saved-pristine` fixture renders `AT PRICE "2h 44m"` at
  its own price of 975 000 minor, where the contracted pipeline gives
  `budget 214 500 → centimin 16 500 → 9 900 s → "2h 45m"` (exact, no rounding involved);
  the other two editor fixtures re-derive correctly. Notes: criterion 55's package-wide
  import ban is grep-only (routed to phase-2 task 11a, re-verified 0 hits); M6's
  step-count assert unimplemented and `PriceSlider` rounds the count while
  `resolveStepCount` does not; `types.ts` now value-imports `lib/item-pricing.ts`
  (latent cycle, guard could live in `valuation-currency.ts`); two unregistered testids
  (`-slider-reason`, `-bootstrap-error`); `avatarImageSrc` has no caller and no fixture
  covers a non-current-user or unloadable author (§3.5); `SAVE_OK` assumes the
  post-commit refetch carries the new price (T7 arm on replica lag); a11y
  (`aria-valuetext`, focusable decorative three-dot). All fourteen declared deviations
  ruled **accepted** — including 1B's `floor((s+30)/60)` (proven identical on the
  29/30/89/90 boundary quartet) and the reflowed `roundHalfEven`: the handoff's
  comparison protocol was **re-run by the reviewer** against a specification-written
  reference over 24 006 cases (six divisors × −2000…+2000, every negative tie) with
  **zero mismatches**, plus ten independent end-to-end vectors — the break-even anchor
  computes to exactly `typical.total_seconds`, and the negative path runs end-to-end.
  Both mirrors provenance-clean; perimeter exact (40 files, 5 908 insertions, 0
  deletions, nothing outside the declarations); all three recorded mutation probes
  reproduced independently plus a fourth proving `boundaries.test.ts` bites; every probe
  reverted byte-identically. Re-measured: 223/19, package tsc clean, monorepo
  `npm run typecheck` exit 0 (the §10 TS2352 pair did not reproduce). Lessons for the
  plans: M3 vs master-plan §9.1 contradict on `Math.round` (L1); criterion 51's
  "no numbers" rows cannot bite in phase 1 and phase 2 must carry the composition
  assertions (L2); 1A's header/menu testid deviation is not yet in the phase-2 plan
  (L3); the mirror-frontmatter convention is applied unevenly (L4). Handoff:
  `../handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_1.md`.

- **2026-08-19 · coordinator + 1A implementer (Claude), fix cycle 1 folded.**
  Review r1's items applied and committed as `CHECKPOINT` `64fa42f6`
  (parent `fbd5d67c`): **S1** — `editor-saved-pristine` fixture `atPrice` corrected
  to "2h 45m" (975 000 → 9 900 s → exactly 165 min; the mockup's "2h 44m" predates
  the reference model, same class as the band end); **N4** — `-bootstrap-error` and
  `-slider-reason` added to the binding testid list, phase-2 page ids narrowed to
  `-page` only; **N5** — `SAVED_BY_OTHER_PROVENANCE` (Marta Lind + profile image,
  giving `avatarImageSrc` its caller) and `UNKNOWN_AUTHOR_PROVENANCE` (§3.5
  unloadable-author row) fixtures + tests 12b/12c; **N3** — the `satisfies` guard
  moved from `types.ts` to `lib/valuation-currency.ts`, removing the types → lib
  value-import edge; the relocated guard was mutation-proven to still bite
  (member removed → `TS1360` at `valuation-currency.ts:24`; `types.ts` restored
  byte-identically, digest `d24634c3…b184a4e6` pre = post). Lessons folded: L1 →
  master plan §9.1 carve-out; L2 → phase-2 criteria 22a–22c; L3 → phase-2 22d;
  L4 → provenance frontmatter stamped onto the 20260819 mirror (body unchanged,
  `source_sha256 e8c0c8b9…f20c04f` verified against the backend original).
  Suite **225/19**, package tsc clean. N1/N2/N6/N7 remain phase-2 carry-forwards
  per the reviewer's disposition table. State → IMPLEMENTED (fix 1); round-2
  delta re-review prompt issued.

- **2026-08-19 · review round 2 (Claude Opus 5, plan-reviewer).** Delta re-review of
  fix commit `64fa42f6` (parent `fbd5d67c`). Verdict **APPROVED**: 0 blocking, 0
  should-fix, 4 new notes, 0 owner cards. Perimeter exact — 10 files, the four code
  files of the prompt's list and six documentation entries, nothing else. **S1 closed**:
  975 000 re-derived through the shipped pipeline (`budgetMinor 214 500n` →
  `allowedCentimin 16 500n` → `allowanceSeconds 9 900` → `"2h 45m"`), fixture matches;
  spot-checks confirm no other fixture number regressed (1 335 000 → 13 555 s →
  "3h 46m"; 1 140 000 → 11 575 s → "3h 13m"; break-even anchor still lands exactly on
  `typical.total_seconds`). **N3 closed**: `types.ts` imports only `zod`, and the
  relocated guard bites — member removed → `TS1360` at `valuation-currency.ts(24,25)`,
  `types.ts` reverted byte-identically (`d24634c3…b184a4e6` pre = post). **N5 closed**:
  12b/12c exist and both bite — dropping the `avatarImageSrc` → `Avatar` wiring turns
  only 12b red (charter rule 4 discharged), hard-coding a separator turns only 12c red.
  **N4 closed**: `-bootstrap-error` / `-slider-reason` in the binding list, phase-2
  narrowed to `-page`. Mirrors provenance-clean (20260819 now stamped; recorded
  `source_sha256 e8c0c8b9…f20c04f` equals both the live original and the mirror body
  from line 12). Lessons L1–L4 verified folded (§9.1 carve-out, phase-2 22a–22d, 11a,
  controller seed). Re-measured: `test:item-economics` **225/19**, package tsc exit 0,
  `npm run typecheck` exit 0, dependent spot-run `test:tasks` **68/10** green;
  forbidden-primitive and `@beyo/tasks` greps still clean. New notes, all carry-forward
  to phase 2: N8 — 12c does not assert §3.5's *avatar* clause (deleting the
  initials-less fallback leaves 23/23 green); N9 — fixture display strings are
  unverifiable by construction under the component seam, so S1's class recurs silently
  until a phase-2 test renders from the parsed payload through the libs; N10 —
  `SAVED_BY_OTHER_PROVENANCE` uses an absolute timestamp where §3.5 contracts a
  relative one; N11 — the provenance *composition* (`created_by === null` → "saved
  version", the "You" substitution) is assigned to phase-2 task 6 in prose and asserted
  by no criterion. Lessons: L5 — the phase-2 plan should carry an explicit
  numbers-meet-arithmetic criterion; L6 (process) — the fix cycle overwrote the r1
  reviewer tracker row rather than appending. Handoff:
  `../handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_2.md`.
