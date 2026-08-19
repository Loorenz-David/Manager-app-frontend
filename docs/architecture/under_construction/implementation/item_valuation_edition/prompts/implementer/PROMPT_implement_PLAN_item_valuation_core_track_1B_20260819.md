---
plan: PLAN_item_valuation_core_20260819
role: implementer
track: 1B (pure logic)
round: 1
date: 2026-08-19
implementer: Claude Opus 5
---

# Implementer prompt — phase 1, Track 1B (pure logic core)

You are the **implementing agent** for Track 1B of phase 1 of the
`item_valuation_edition` project. Invoke the **implementation-executor** skill now
and follow its doctrine (gate check, read order, contract-faithful implementation,
closing protocol). This prompt is your work order; the artifacts it cites are the
authority — where this prompt and an artifact disagree, the artifact wins and the
disagreement is worth a Review-log line.

## Gate check

Phase 1 is `PROMPT_READY` (projection round 0 ran, verdict folded on 2026-08-19 —
see the plan's Review log). No prior phase exists. Track 1A runs in parallel on a
**disjoint file set**; you never touch its files.

## Project root

`docs/architecture/under_construction/implementation/item_valuation_edition/`
(paths below resolve from the `frontend/` repo root).

## Read order (complete context — do not substitute other implementation files for pattern authority)

1. `docs/architecture/under_construction/implementation/item_valuation_edition/master_plan.md`
   — §5 (contract resolution: re-emit the required output block before coding),
   §6 (naming registry + **frozen signatures** — binding verbatim), §9 (standing
   rules), §10 (environment).
2. `docs/architecture/under_construction/implementation/item_valuation_edition/plans/PLAN_item_valuation_core_20260819.md`
   — your goal, Track 1B tasks 1–8, acceptance criteria 1–50 + 55, Notes (including
   the **Reference payload**), Review log (the projection entry lists hazards
   already found and fixed — do not reintroduce them).
3. `docs/architecture/under_construction/implementation/item_valuation_edition/planning/intention.md`
   — §3.2 (screen states, round-5 amended), §3.5 (draft machine), **§4A mechanism
   contracts M2–M7, M11–M13** (every criterion cites these).
4. `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md`
   — §2 (payload), **§4 (copy `roundHalfEven` verbatim from here)**, §5 (null
   semantics), §9 (validation vectors).
5. Contracts (per master plan §5): `architecture/02_types.md`, `24_dto.md`,
   `15_feature_structure.md`, `17_testing.md`.
6. Existing code you extend (what exists, not how to write):
   `packages/item-economics/src/types.ts` (append here; `ItemEconomicsStatusSchema`
   at line 38), `api/item-economics-keys.ts`, `lib/item-pricing.ts`
   (`INLINE_PRICING_CURRENCY`), `index.ts`.

## Scope — exactly these files

Create/edit **only**:
- `packages/item-economics/src/types.ts` (append the scenario schema block:
  `PriceScenarioSchema` + member schemas, `ItemBindingSchema`,
  `ValuationCurrencySchema`, `ValuationCurrency`,
  `PRICE_SCENARIO_CALCULATION_VERSION`; make `INLINE_PRICING_CURRENCY` satisfy the
  enum typecheck-visibly)
- `packages/item-economics/src/lib/price-scenario-math.ts` + `.test.ts`
- `packages/item-economics/src/lib/price-draft.ts` + `.test.ts`
- `packages/item-economics/src/lib/price-coverage.ts` + `.test.ts`
- `packages/item-economics/src/lib/item-valuation-screen-state.ts` + `.test.ts`
- `packages/item-economics/src/lib/valuation-currency.ts` + `.test.ts`
- `packages/item-economics/src/api/item-economics-keys.ts` (one `priceScenario`
  entry directly under `all`) + a key-prefix test (place it in a
  `api/item-economics-keys.test.ts`)
- a DTO test file for criteria 45–50 (e.g. `src/types.price-scenario.test.ts` or a
  `lib/`-adjacent test importing from `../types`)
- `packages/item-economics/src/index.ts` (export the new pure modules — **no
  components, no page loader**)

**Never touch:** anything under `components/` (Track 1A's perimeter), any file in
`packages/tasks`, `apps/`, or the socket/actions/controllers/providers/pages areas
(phase 2). If a needed change falls outside this list, stop and record it in the
handoff instead of making it.

## The work (plan tasks 1–8, in order)

Follow Track 1B tasks 1–8 in the plan verbatim. Non-negotiables worth repeating:

- **`roundHalfEven` is a character-faithful transcription** of handoff §4. If you
  change so much as a variable name, re-run the handoff's comparison protocol and
  record it. `Number`, `Math.round`, `parseFloat` are forbidden inside
  `price-scenario-math.ts` except the two declared boundaries (M2): the `BigInt()`
  conversions at entry and the `Number()` on seconds at exit.
- **Frozen signatures** (master plan §6) are copied exactly — `PriceDraftState`
  carries `savedExpected`; `now` is injected via events, never read from a clock;
  `resolveProvenanceVariant` returns `{ variant, backTargetMinor }`;
  `clampSnap(value, domain)`; `currencyDisplayCode` is backed by a
  `Record<ValuationCurrency, string>`.
- **DTO**: `.nullable()` everywhere the handoff says nullable, `.optional()`
  nowhere; `calculation_version: z.literal(1)`.
- **Screen state**: intention §3.2 **as amended round 5** — S4 is
  `saved === null || status === "item_missing_purchase_cost"`; error-with-cached-data
  resolves from the data.
- sv-SE grouping uses **U+00A0**; write assertions accordingly (plan criterion 42
  note).

## Acceptance criteria

Plan criteria **1–50 and 55** (Track 1A's 51–54 are not yours). Every one is a
vitest assertion on the production module. Criterion 7 and criterion 41 name
mutations — run each mutation, watch the named assertion go red, revert
byte-identically, and record both digests in your handoff.

## Validation commands

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit`
- `npm run test:item-economics` — re-measure the baseline **before your first edit**
  (projection measured 131/10 files) and record it; end green with your additions.
- `npm run typecheck` (monorepo — known baseline: two inherited TS2352 in
  task-creation tooling scope).
- Never `npm install` unless unavoidable; if you must, the rolldown + lightningcss
  darwin-arm64 binaries need reinstalling together (master plan §10). Never launch
  dev servers. Never touch `http://192.168.1.246:8000`.

## Closing protocol (per the executor skill)

1. All criteria green; suites and typecheck clean.
2. **Checkpoint commit**: create branch `pipeline/item-valuation-edition` (it does
   not exist yet), commit everything — your source work AND the currently-untracked
   project folder — with subject prefixed `CHECKPOINT (not approved): `.
3. Handoff at
   `docs/architecture/under_construction/implementation/item_valuation_edition/handoffs/implementer/handoff_PLAN_item_valuation_core_20260819_implement_1B_1.md`
   with frontmatter (`plan / role: implementer / track: 1B / round: 1 /
   state: IMPLEMENTED / actor / date`) containing: what was built vs the plan
   (deviations called out honestly, each with its reason), the **full write
   perimeter** (every file created/edited, every mutation probe with apply+revert
   digests), baseline + final test counts, and anything you could not do without
   exceeding scope.
4. Append one dated implementer line to the plan's Review log (summary + handoff
   path). Update the master plan phase-1 tracker row to `IMPLEMENTED — 1B` **only
   if Track 1A has not already written a tracker note this round; otherwise append
   your note to the existing row text rather than replacing it.**
5. Do not review your own work, do not start Track 1A's files, do not begin phase 2.
