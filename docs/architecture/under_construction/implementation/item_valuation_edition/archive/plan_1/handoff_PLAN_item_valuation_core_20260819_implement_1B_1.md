---
plan: PLAN_item_valuation_core_20260819
role: implementer
track: 1B (pure logic)
round: 1
state: IMPLEMENTED
actor: Claude Opus 5 (implementation-executor doctrine)
date: 2026-08-19
---

# Implementer handoff — phase 1, Track 1B (pure logic core)

## Summary

Track 1B is implemented and green: the price-scenario DTO (appended to
`src/types.ts`), the BigInt allowance pipeline, the draft/provenance machine,
coverage, screen state, the currency/per-piece formatters, the `priceScenario`
key entry and the package index exports — **70 new tests across 7 new files**,
every one of plan criteria 1–50 and 55 an assertion on the production module.
Both named mutations (criteria 7, 41) were applied at the sites the criteria
name, observed red, and reverted byte-identically (digests below).

Suite: **223 passed / 19 files** (baseline re-measured at session start: 131 / 10;
Track 1A contributed 22 / 2; this track 70 / 7).
`npx tsc -p packages/item-economics/tsconfig.json --noEmit` clean;
`npm run typecheck` (monorepo) exit 0.

## ⚠ OWNER DECISIONS REQUIRED (0)

None. Nothing in this track needed a semantic call the artifacts did not already
settle; every open choice was small enough to make and log below.

## Contract resolution (re-emitted per master plan §5)

The master plan §5 list holds unchanged for this track, with the phase-local
delta that 1B touches only the type/DTO and pure-logic layers:

- Binding here: `02_types.md` (strict TS, no `any`, Zod at the boundary, type
  always `z.infer`), `24_dto.md` (Response DTOs live in `feature/types.ts`,
  snake_case mirroring the serializer, money in integer minor units, ISO date
  strings), `15_feature_structure.md` (`lib/` for pure logic, `api/` for the key
  factory, `index.ts` as the public surface), `17_testing.md` (Vitest,
  behaviour-not-implementation, package-level vitest config).
- Not exercised by 1B (no I/O, no components this track): `04`, `05`, `07`, `08`,
  `10`, `13`, `14`, `21`, `23`, `27`–`32`, `34`–`36`. They return in phase 2.
- One recorded divergence against `24_dto.md`, in the "Judgment calls" section
  below: public ids are plain `z.string()`, matching the sibling schema in the
  same file rather than the contract's branding-at-the-boundary rule.

## Write perimeter (full)

### Created (10 files)

| File | Contents |
|---|---|
| `packages/item-economics/src/lib/price-scenario-math.ts` | `roundHalfEven`, `budgetMinor`, `allowedCentimin`, `allowanceSeconds`, `formatAllowedWorkerMinutes`, `formatAllowanceDuration` |
| `packages/item-economics/src/lib/price-scenario-math.test.ts` | criteria 1–6, 8–13 (13 tests) |
| `packages/item-economics/src/lib/price-draft.ts` | `PriceDraftState`, `PriceDraftEvent`, `clampSnap`, `priceDraftReducer`, `resolveProvenanceVariant`, `sliderFractionToPrice`, `priceToSliderFraction` |
| `packages/item-economics/src/lib/price-draft.test.ts` | criteria 14–31 (25 tests) |
| `packages/item-economics/src/lib/price-coverage.ts` | `resolveCoverage` |
| `packages/item-economics/src/lib/price-coverage.test.ts` | criteria 38–40 + 3 null-arm rows (6 tests) |
| `packages/item-economics/src/lib/item-valuation-screen-state.ts` | `ItemValuationScreenState`, `ScenarioQueryStatus`, `resolveScreenState` |
| `packages/item-economics/src/lib/item-valuation-screen-state.test.ts` | criteria 32–37 incl. 32a/34a/34b (9 tests) |
| `packages/item-economics/src/lib/valuation-currency.ts` | `CURRENCY_DISPLAY_CODE` (module-private Record), `currencyDisplayCode`, `formatPerPiece` |
| `packages/item-economics/src/lib/valuation-currency.test.ts` | criteria 41–44 (7 tests) |
| `packages/item-economics/src/types.price-scenario.test.ts` | criteria 45–50 (7 tests) |
| `packages/item-economics/src/api/item-economics-keys.test.ts` | M9 key placement (3 tests) |

### Edited (3 files)

| File | Change |
|---|---|
| `packages/item-economics/src/types.ts` | one import line at the top (`INLINE_PRICING_CURRENCY` from `./lib/item-pricing`) + the appended "Price scenario" block: `ValuationCurrencySchema`/`ValuationCurrency`, the `satisfies` guard, `ItemBindingSchema`/`ItemBinding`, `PRICE_SCENARIO_CALCULATION_VERSION`, the seven member schemas + `PriceScenarioSchema` and their inferred types. Nothing above the block was touched. |
| `packages/item-economics/src/api/item-economics-keys.ts` | one `priceScenario` entry (+ comment) directly under `all`, placed at the end of the task-scoped group |
| `packages/item-economics/src/index.ts` | one appended export block: the registry's types.ts names + the five pure modules. No components, no page loader. |

### Documents

- this handoff; one Review-log line in `plans/PLAN_item_valuation_core_20260819.md`;
  a **1B note appended to** the existing phase-1 tracker row in `master_plan.md`
  (1A had already written that row this round, per the prompt's rule); one factual
  correction to master plan §10 (see "Environment surprises").

### Mutation probes — applied and reverted, listed separately from the work

| # | Criterion | File touched | Site | Pre digest (sha256) | Mutated digest | Post-revert digest | Result |
|---|---|---|---|---|---|---|---|
| 1 | 7 (named) | `src/lib/price-scenario-math.ts` | definition of `allowanceSeconds` — three-step conversion replaced by direct budget → seconds (`budget × 3_000_000 / (rate × 5)`) | `9ceb34e5…1a85632d` | `e683c350…14001881` | `9ceb34e5…1a85632d` (= pre) | **bites**: exactly one assertion red — `price-scenario-math.test.ts` "criterion 5: reproduces the server's 8681 seconds at P = 855 000", `expected 8682 to be 8681`. The other 12 stayed green. |
| 2 | 41 (named) | `src/types.ts` | definition of `ValuationCurrencySchema` — added a fourth member `"norwegian_krone"` | `647f7b40…6ed015bf` | `fba43f86…82b52e303` | `647f7b40…6ed015bf` (= pre) | **bites**: `tsc -p packages/item-economics/tsconfig.json --noEmit` exits 2 with `TS2741: Property 'norwegian_krone' is missing … in type 'Record<…, string>'` at `lib/valuation-currency.ts:14` |
| 3 | self-chosen | `src/types.ts` | same definition — removed the member `INLINE_PRICING_CURRENCY` holds (`"swedish_krona"`) | (same pre) | not digested | restored from the same pre-image; digest re-verified `= 647f7b40…6ed015bf` | **bites**: `TS1360: Type '"swedish_krona"' does not satisfy the expected type` at `types.ts:216` — proves the typecheck-visible `INLINE_PRICING_CURRENCY satisfies ValuationCurrency` guard is live, not decorative |

Both probed files are byte-identical to their pre-probe state (digests above), and
the full suite was re-run green after each revert. **No other file was touched by
a probe.**

### In the checkpoint commit but NOT this track's work

The commit also carries, unchanged by me: `packages/item-economics/src/components/price-editor/**`
(Track 1A's perimeter — its handoff defers the combined checkpoint to whichever
track closes second), the previously-untracked project folder
`docs/architecture/under_construction/implementation/item_valuation_edition/`, and
the previously-untracked backend authority mirror
`docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md` (cited
by every artifact in the project; leaving it untracked would make the checkpoint
unreadable).

## Criteria status (1–50, 55)

| Criteria | Where | State |
|---|---|---|
| 1–4 | `price-scenario-math.test.ts` — `roundHalfEven` §9.1 vectors | green |
| 5 | `allowanceSeconds(855000, §9.2 model) === 8681`, model parsed through `PriceScenarioModelSchema` | green |
| 6 | `budgetMinor(100000, deducting model) === -28000n` (exact bigint) | green |
| 7 | named mutation — probe 1 above | **bites** |
| 8–11 | `formatAllowanceDuration` — 8681→"2h 25m", −1→"0m", 10800→"3h 0m", 2700→"45m" | green |
| 12–13 | `formatAllowedWorkerMinutes` — 16000n→"160.00", −5n→"-0.05" | green |
| 14–22 | `price-draft.test.ts` — one row per T1…T9 | green |
| 23 | the corrected M4 invariant sequence, ending `draft 855000 / lastDraft 1005000 / backTarget 1005000`, then SAVE_OK → `backTarget null` | green |
| 24 | five rows (24a–24e), each asserting `{ variant, backTargetMinor }` as one object; each fixture satisfies only its own predicate | green |
| 25–29 | `clampSnap` — on-grid, over-band, tie-up, tie-down, null-domain identity | green |
| 30/30a/30b | `sliderFractionToPrice` 0 → 420000, 0.5 → 1035000, 1 → 1650000 (three distinct outcomes) | green |
| 31 | off-grid round trip `858000 → 438000/1230000 → 855000`, draft untouched | green |
| 32, 32a | S1↔S2 (no payload) and S2↔S3 (error over cached `mismatched` → `unbound`) | green |
| 33–37 (incl. 34a, 34b) | one row per adjacent precedence pair, each built by parsing a mutation of the plan's reference payload | green |
| 38–40 | `resolveCoverage` — flip at the anchor, one step below, non-fundable | green |
| 41 | four mapping rows (SEK/DKK/EUR/null→SEK) + the named typecheck mutation (probe 2) | green + **bites** |
| 42–44 | `formatPerPiece` — `1 900`, `1 425,17`, quantity 0 → divisor 1 | green |
| 45–50 | `types.price-scenario.test.ts` — reference payload parses; §5.5 `detached` and `mismatched` rows parse; `saved: null` + full model parses; `calculation_version: 2` rejected; a *missing* `currency` key rejected; `residual_percent_milli: "22000"` rejected | green |
| 55 | `tsc -p packages/item-economics/tsconfig.json --noEmit` clean; `npm run test:item-economics` 223/19 green; `grep -rn '@beyo/tasks\|@beyo/task-creation' packages/item-economics/src` → **0 hits** | green (see the note on 55's third clause below) |

Track 1A's criteria 51–54 are not this track's and were not touched.

## Judgment calls and declared deviations

1. **`formatAllowanceDuration` computes the nearest minute as
   `Math.floor((s + 30) / 60)`, not M3's literal `Math.round(seconds / 60)`.**
   M3 permits `Math.round` there; master plan §9.1 bans `Math.round` anywhere in
   `price-scenario-math.ts` and says a review greps for it. The two artifacts
   conflict, and the form used is provably identical over the function's domain
   (the `≤ 0` arm returns `"0m"` before it, so `s > 0` and
   `floor(s + 30 / 60) ≡ round(s / 60)` including ties). Criterion 8 (8681 →
   `"2h 25m"`, which truncation fails) is what proves it. **Nothing else in the
   module contains `Number` / `Math.round` / `parseFloat` except the one declared
   exit boundary at line 86** — grep output is in the closing checks.
2. **`roundHalfEven` is a token-faithful transcription** of handoff §4: identical
   identifiers, identical operator sequence, identical comments. What differs is
   (a) TypeScript parameter/return annotations, which the module cannot omit, and
   (b) statement layout reflowed to this repo's brace-per-line style. No token of
   the algorithm changed, so the handoff's 612-case comparison was **not** re-run;
   the four §9.1 vectors and the §9.2 end-to-end value are asserted in-suite
   instead. If the reviewer reads formatting as "a change", the comparison
   protocol is the remedy — flagging it rather than deciding it silently.
3. **BACK stamps `lastEditedAt := now` on both arms.** M4's T4/T5 effect columns
   list only the draft/lastDraft moves, but the frozen event carries `now` for a
   reason and intention §4's ownership table says `lastEditedAt` is "set on every
   draft change" — a BACK press is one, and T5 lands in `dirty`, whose copy reads
   "unsaved change · <relative time of last edit>". No criterion asserts the field
   on those rows, so this cannot mask a T4/T5 defect.
4. **T2 with a null `purchaseCostMinor` treats it as 0** (→ `clampSnap(0)`, i.e.
   the band's bottom). The reducer must be total; inside S6 the arm is
   unreachable, because a valuation row carries at least one of the two amounts
   (operational handoff §3.1). Commented at the site.
5. **Two divide-by-zero guards the contracts do not mention**: `clampSnap` returns
   the clamped value when `step_minor <= 0`, and `sliderFractionToPrice` /
   `priceToSliderFraction` return `min_minor` / `0` on a zero-width or
   zero-stepped band. Without them a malformed band yields `NaN` and silently
   corrupts the draft — the exact silent-failure class rule 6 exists for.
6. **`resolveCoverage` reports `isCovered: false` whenever `showChip` is false.**
   The plan fixes `showChip` and `markerMinor` for that case but not `isCovered`;
   claiming coverage with no anchor to justify it is the worse default, and the
   AT-PRICE tone follows the chip.
7. **Public ids in the DTO are plain `z.string()`, not branded.** `24_dto.md`
   brands at the schema boundary, but the sibling `TaskProductionTimeSchema` in
   the very same file uses `task_id: z.string()`, and M9 already writes the phase-2
   cast (`client_id as TaskId`). Matching the file beat matching the contract;
   flagged here so the reviewer can rule the other way cheaply (it is a
   `.transform()` on three fields).
8. **`INLINE_PRICING_CURRENCY satisfies ValuationCurrency;` is an expression
   statement** in `types.ts`. The obvious `const _x: ValuationCurrency = …` form
   trips the package's `noUnusedLocals`, and inventing a new exported constant to
   hold it would add a name the registry does not list. Probe 3 proves the guard
   is live. Side effect worth naming: **`types.ts` now imports from
   `lib/item-pricing.ts`** — a types → lib edge inside the package. No cycle:
   `item-pricing.ts` imports nothing.
9. **Names the registry left open**: the seven member schemas are
   `PriceScenario<Block>Schema` (`…ItemSchema`, `…AuthorSchema`, `…SavedSchema`,
   `…ModelSchema`, `…TypicalSchema`, `…AnchorsSchema`, `…DomainSchema`), and the
   provenance union is exported as `PriceDraftProvenanceVariant`. The package
   `index.ts` exports **exactly** the registry's twelve types.ts names plus the
   five modules' functions/types; the member schemas stay package-internal
   (`types.ts` exports them for the tests and phase 2, the barrel does not).
10. **Math helpers take the full `PriceScenarioModel`**, not a `Pick`, so the tests
    hold the same object type production holds (charter rule 3); the criterion-6
    model is the reference model re-parsed with `constant_deduction_minor: 50000`.

## For the coordinator to fold upstream

1. **Criterion 55's import-ban clause has no automated home in Track 1B's
   perimeter.** 1A's `boundaries.test.ts` walks `components/price-editor/` only;
   the package-wide "no `@beyo/tasks` / `@beyo/task-creation` under
   `packages/item-economics/src`" ban is currently a grep (run: 0 hits). Adding a
   package-level boundary test file was outside the scope this prompt fenced, so
   it is reported rather than done — charter rule 1 would prefer it automated.
2. **Phase 2 will need an initial `PriceDraftState` seat for `useReducer`** and the
   registry names no constant for it. This session used a test-local blank (every
   field is overwritten by `INIT`). Either register e.g.
   `EMPTY_PRICE_DRAFT_STATE` in `price-draft.ts` or let the phase-2 controller own
   it — but decide it in the registry, not twice in code.
3. **T8's pristine test is `draft === old savedExpected`, verbatim from M4.** That
   means an *unpriced-pristine* screen (old `savedExpected === null`, draft still
   the ×4 default) does **not** adopt a saved price that appears from another
   manager's commit — it falls to T9 and keeps the local default while the
   provenance row re-derives to `dirty`. Implemented as written, not widened; if
   the owner wants the untouched default to adopt, that is an M4 amendment.
4. **Master plan §10's typecheck baseline is stale** — see below; §10 updated.

## Environment surprises

- `npm run test:item-economics` baseline re-measured at session start:
  **131 passing / 10 files**, matching §10 (as corrected by projection L24).
- `npm run typecheck` (monorepo) exits **0** — the "two inherited TS2352 in
  task-creation tooling scope" §10 records as a known baseline **did not
  reproduce**. §10 has been updated to record the clean measurement and keep the
  historical note; a reviewer measuring the same thing should now expect zero.
- No `npm install` was run; no dev server was started; nothing touched
  `http://192.168.1.246:8000`.
- ESLint was not run: per projection L17 no package-level config reaches
  `packages/`.

## Closing

Nothing in the prompt's scope was left undone. Track 1A's files, the phase-2
files, and `packages/tasks` / `apps/` were not touched.
