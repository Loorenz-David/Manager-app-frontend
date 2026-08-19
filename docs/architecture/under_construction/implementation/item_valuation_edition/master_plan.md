# MASTER PLAN — item_valuation_edition

## Metadata

- Project: `item_valuation_edition`
- Status: `planned`
- Created at (UTC): `2026-08-19T00:00:00Z`
- Planner: Claude (implementation-planner doctrine, pipeline charter)
- Intention (single semantic authority): `planning/intention.md`
  (`INTENTION_item_valuation_edition_20260819`, status resolved, mechanism
  contracts in §4A, ledger empty)

## 1. Goal

Ship the "Expected sold price" slide page: a `@beyo/item-economics`-owned surface,
opened from the task-actions menu in the managers app, where an ADMIN/MANAGER prices a
task's primary item with live local impact projection and commits in one call. All
product semantics live in the intention — this file never restates them.

## 2. Sources of truth

| Content | Artifact |
|---|---|
| Product semantics, screen states, mechanism contracts M1–M13 | `planning/intention.md` |
| Backend price-scenario contract (payload, arithmetic, nulls, realtime) | `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md` |
| PUT valuation + commit endpoint + error identities | `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_item_economics_operational_20260815.md` §3.1, §4.1 (as amended by the 20260819 handoff §7) |
| Shared skeleton, naming registry, environment topology, tracker | this file |
| Phase-local goal/tasks/criteria + Review log | `plans/PLAN_item_valuation_core_20260819.md`, `plans/PLAN_item_valuation_wiring_20260819.md` |
| Session prompts (just-in-time, never reused stale) | `prompts/<role>/` |
| Session reports | `handoffs/<role>/` |

**Fold-back rule:** semantic changes amend the intention; skeleton/naming/environment
changes amend this file; phase plans receive only phase-local deltas. Never patch a
phase plan into divergence from upstream.

**Mirror-provenance rule (earned in item_pricing_fields):** at the start of every
review round, re-diff both handoff mirrors against the backend originals. The
2026-08-15 file was once rewritten in place upstream; the 2026-08-19 handoff's own §7
records the convention change that prevents recurrence, but verify, don't trust.

## 3. Roles & session workflow

Charter state machine per phase: `NOT_STARTED → PROJECTED → PROMPT_READY →
IMPLEMENTING → IMPLEMENTED → REVIEWING → CHANGES_REQUESTED (→ IMPLEMENTING) →
APPROVED`. Checkpoint commit (`CHECKPOINT (not approved):`) the moment a session
reaches IMPLEMENTED, on branch `pipeline/item-valuation-edition`. Standing owner
authorization for checkpoints is assumed per charter; the approval-gate commit closes
each phase.

- **Coordinator:** Claude — compiles prompts, folds reviews, keeps this tracker.
- **Implementer, Track A (visual):** Claude — presentational components from fixtures.
- **Implementer, Track B (logic):** Claude Opus 5 (changed from Codex 2026-08-19 —
  owner ran out of Codex credit) — a fresh session driven by a self-contained prompt
  document; being Claude-side, it runs the implementation-executor skill directly.
- **Reviewer:** Claude, fresh session per round; re-reviews are delta-scoped with a
  verified perimeter.
- **Projection gate:** Phase 1 touches M1–M13 silent-failure mechanisms →
  plan-projection round 0 is **mandatory** before its implementer prompts are
  compiled. Phase 2 also touches M1/M8/M9/M10 → mandatory there too.

## 4. Progress tracker

| Phase | State | Date | Actor | Note |
|---|---|---|---|---|
| 1 — core + components (`PLAN_item_valuation_core_20260819`) | IMPLEMENTED | 2026-08-19 | coordinator | both tracks IMPLEMENTED (handoffs `…implement_1A_1.md`, `…implement_1B_1.md`); checkpoint `fbd5d67c` verified (tree clean, 223/19, tsc clean, boundaries hold); 1B items 1–2 routed into phase-2 plan (11a, controller seed), item 3 → owner card (T8 unpriced-adopt); review prompt issued: `prompts/reviewer/PROMPT_review_PLAN_item_valuation_core_round_1_20260819.md` |
| 1 — core + components (`PLAN_item_valuation_core_20260819`) | IMPLEMENTED (fix 1) | 2026-08-19 | coordinator | r1 verdict CHANGES_REQUESTED (0 blocking, 1 should-fix, 7 notes) folded: S1+N3+N4+N5 fixed and committed `64fa42f6`, L1–L4 folded upstream, relocated guard mutation-proven; suite 225/19, tsc clean; N1/N2/N6/N7 carry to phase 2; re-review prompt issued: `prompts/reviewer/PROMPT_review_PLAN_item_valuation_core_round_2_20260819.md` |
| 1 — core + components (`PLAN_item_valuation_core_20260819`) | APPROVED | 2026-08-19 | reviewer (round 2) | delta re-review of `64fa42f6`: 0 blocking, 0 should-fix, 4 new notes (N8–N11, all phase-2 carry-forwards), 0 owner cards. S1/N3/N4/N5 all closed and independently re-derived — 975 000 → 9 900 s → "2h 45m" through the shipped pipeline; relocated guard bites (`TS1360` at `valuation-currency.ts:24`); 12b/12c each turn red under their own mutation. Perimeter exact (10 files, no code outside the list), both mirrors provenance-clean, L1–L4 verified folded. Re-measured 225/19, package tsc + `npm run typecheck` exit 0, `test:tasks` 68/10. Handoff: `handoffs/reviewer/handoff_..._review_2.md` |
| 1 — core + components (`PLAN_item_valuation_core_20260819`) | CLOSED (archived) | 2026-08-19 | coordinator | closeout ritual: 4 spent prompts + 5 consumed handoffs → `archive/plan_1/`; approval-gate commit made with this move; plan file stays in `plans/` as the phase row. Historical `prompts/`/`handoffs/` references resolve under `archive/plan_1/` by convention. L6 adopted: tracker rows are appended, never replaced |
| 2 — wiring + entry + e2e (`PLAN_item_valuation_wiring_20260819`) | PROMPT_READY | 2026-08-19 | coordinator | projection r0 run inline by the coordinator (mandatory gate; 6 ledger rows all resolved in-plan, 0 owner cards — handoff `handoffs/reviewer/handoff_PLAN_item_valuation_wiring_20260819_projection_0.md`); r2 carry-forwards N8–N11 landed as criteria 22e–22g; implementer prompt issued: `prompts/implementer/PROMPT_implement_PLAN_item_valuation_wiring_20260819.md` (Claude Opus 5) |

## 5. Contract resolution (guide: `task_system/frontend_contract_goal_mapping_guide.md`)

Domain schemas consulted:
- `packages/item-economics/src/types.ts` — `ItemEconomicsStatusSchema` (12 statuses),
  `MajorCategory`, keys/socket conventions.
- `packages/items/src/types.ts` — `ItemLookupResultSchema` (`purchase_price`
  per-piece major nullable), `LookupItemsParams`.
- `@beyo/lib` — `TaskId`, `ItemId`, `ApiEnvelopeSchema`.

Selected contracts (core, always):
- `architecture/01_architecture.md`, `02_types.md`, `04_api_client.md` (+`_local`),
  `05_server_state.md`, `06_client_state.md`, `08_hooks.md`, `13_errors.md`,
  `15_feature_structure.md`

Added from guide (trigger → file):
- new feature workflow → `16_feature_workflow.md` (build order; logic bottom-up)
- components/context → `07_components.md`, `23_providers.md`, `24_dto.md`
- pages/skeleton → `10_pages.md`, `32_loading_skeletons.md`
- styling → `14_styling.md`
- surfaces (slide page, sheet menu) → `28_surfaces.md` + `28_surfaces_local.md`
- responsive/animation → `27_responsive.md`, `31_animations.md`
- realtime (socket refetch) → `21_realtime.md`
- package surface boundary + loader splitting → `35_shared_packages.md` §13, §14
- dynamic loading → `30_dynamic_loading.md` + `30_dynamic_loading_local.md`
- testing + runtime validation → `17_testing.md`, `34_runtime_validation.md` +
  `34_runtime_validation_local.md`
- scroll container registration (slide page content scrolls) →
  `36_scroll_visibility.md` (registration section only)

Excluded (with reason):
- `09_forms.md` — no react-hook-form usage; the page has no text inputs (slider +
  buttons only).
- `11_routing.md` — surface, not a route.
- `12_auth.md`/`19_permissions.md` — the only auth touch is the existing
  `useRole`/`AuthRole` predicate copied from the Force-ready row.
- `33_vaul_drawer.md`, `37_keyboard_aware_inputs.md`, `22` (uploads), `26`
  (persistence), `18`/`29` — not touched.

Implementing sessions re-emit this list (with any phase-local deltas) before coding.

## 6. Shared skeleton & naming registry (binding; divergence is a review finding)

### Package `@beyo/item-economics` — new files

| Path (under `packages/item-economics/src/`) | Owner | Exports |
|---|---|---|
| `types.ts` (**append** — projection L15: response schemas live in `types.ts` per contract 24 and package precedent, never in a `*-dto.ts`) | 1B | `PriceScenarioSchema`, `PriceScenario`, `PriceScenarioModel`, `PriceScenarioAnchors`, `PriceScenarioDomain`, `PriceScenarioSaved`, `PriceScenarioTypical`, `PriceScenarioItem`, `ItemBindingSchema`, `ValuationCurrencySchema` (`z.enum(["swedish_krona","danish_krona","euro"])`), `ValuationCurrency`, `PRICE_SCENARIO_CALCULATION_VERSION` — `INLINE_PRICING_CURRENCY` must satisfy `ValuationCurrencySchema` (typecheck-visible) |
| `lib/price-scenario-math.ts` | 1B | `roundHalfEven`, `budgetMinor`, `allowedCentimin`, `allowanceSeconds`, `formatAllowedWorkerMinutes` (M8 string form), `formatAllowanceDuration` (M3) |
| `lib/price-draft.ts` | 1B | `clampSnap`, `priceDraftReducer`, `PriceDraftState`, `PriceDraftEvent`, `resolveProvenanceVariant`, `sliderFractionToPrice`, `priceToSliderFraction` |
| `lib/price-coverage.ts` (projection L2 — M7's single owner) | 1B | `resolveCoverage(draftMinor: number, anchors: PriceScenarioAnchors \| null): { showChip: boolean; isCovered: boolean; markerMinor: number \| null }` |
| `lib/item-valuation-screen-state.ts` | 1B | `resolveScreenState`, `ItemValuationScreenState` (`"loading" \| "error" \| "unbound" \| "purchase_required" \| "blocked" \| "editor"`), `ScenarioQueryStatus` (`"pending" \| "error" \| "success"` — package-local, no react-query import) |
| `lib/valuation-currency.ts` | 1B | `currencyDisplayCode` (M11), `formatPerPiece` (M12) |

**Frozen signatures (projection L3/L4/L12/L19 — binding):**

```ts
// price-draft.ts — `now` is always injected; the reducer never reads a clock.
type PriceDraftState = {
  draft: number; lastDraft: number | null; initialDefault: number | null;
  savedExpected: number | null;          // carried: T8/T9 branch on the OLD value
  lastEditedAt: number | null;
};
type PriceDraftEvent =
  | { type: "INIT"; savedExpected: number | null; purchaseCostMinor: number | null;
      domain: PriceScenarioDomain | null }
  | { type: "DRAG" | "USE_SUGGESTED"; priceMinor: number; now: number }
  | { type: "BACK"; now: number }
  | { type: "SAVE_OK" }
  | { type: "REFETCH"; savedExpected: number | null };
function clampSnap(value: number, domain: PriceScenarioDomain | null): number;
function resolveProvenanceVariant(state: PriceDraftState):
  { variant: "unpriced-pristine" | "saved-pristine" | "dirty";
    backTargetMinor: number | null };   // null = Back button hidden (M4 guard)
function sliderFractionToPrice(fraction: number, domain: PriceScenarioDomain): number;
function priceToSliderFraction(priceMinor: number, domain: PriceScenarioDomain): number;

// item-valuation-screen-state.ts
function resolveScreenState(
  scenario: PriceScenario | null, status: ScenarioQueryStatus,
): ItemValuationScreenState;            // error+cached data → resolve from the data (intention §3.2 S2)

// valuation-currency.ts — Record, not switch: exhaustiveness enforced by construction.
const CURRENCY_DISPLAY_CODE: Record<ValuationCurrency, string>;
function currencyDisplayCode(currency: ValuationCurrency | null): string; // null → code of INLINE_PRICING_CURRENCY
function formatPerPiece(minor: number, quantity: number): string;
```
| `components/price-editor/*` (see phase 1 plan) | 1A | components + `price-editor-fixtures.ts` |
| `api/fetch-task-price-scenario.ts` | 2 | `fetchTaskPriceScenario` |
| `api/use-task-price-scenario-query.ts` | 2 | `useTaskPriceScenarioQuery` |
| `api/put-item-valuation.ts` | 2 | `putItemValuation` |
| `api/commit-task-evaluation.ts` | 2 | `commitTaskEvaluation` |
| `actions/use-bootstrap-purchase-price.ts` | 2 | `useBootstrapPurchasePrice` (M1) |
| `actions/use-commit-item-valuation.ts` | 2 | `useCommitItemValuation` (M8) |
| `controllers/use-item-valuation.controller.ts` | 2 | `useItemValuationController` (M10 staleness guard lives here) |
| `providers/ItemValuationProvider.tsx` | 2 | provider + `useItemValuationContext` |
| `pages/ItemValuationSlidePage.tsx` | 2 | route entry (reads `useSurfaceProps`) |

### Registry additions to existing files

- `api/item-economics-keys.ts`: `priceScenario: (taskId: TaskId) =>
  [...itemEconomicsKeys.all, "price-scenario", taskId] as const` — **directly under
  `all`, never under `tasks()`** (intention §4A M9).
- `surface-ids.ts`: `ITEM_VALUATION_SLIDE_SURFACE_ID = "item-valuation-slide"`,
  `type ItemValuationSlideSurfaceProps = { taskId: TaskId }`,
  `preloadItemValuationSlideSurface()`.
- `socket-events.ts`: debounced `task:step-state-changed` scenario invalidation, new
  `item:updated` handler, extended `item_economics:evaluation-committed` (M9).
- `index.ts`: `loadItemValuationSlidePage()` loader (contract 35 §14 — **no static
  page export**), plus the new public constants/types. Pure libs export normally.

### Outside the package

- `packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx`: "Change retail price" row,
  `CircleDollarSign`, testid `task-actions-change-retail-price`, gated by the same
  `hasRole(AuthRole.Admin) || hasRole(AuthRole.Manager)` predicate as Force ready,
  positioned after "Change article number"; opens via the existing `openAndDismiss`.
- `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`:
  register `ITEM_VALUATION_SLIDE_SURFACE_ID` as `surface: "slide"` via
  `lazyWithPreload(loadItemValuationSlidePage)` (this file already registers
  cross-package surfaces the task menu opens; no new surfaces file).
- Playwright: `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/item-valuation.spec.ts`.

### Dependency decision (recorded)

`@beyo/item-economics` gains a peer dependency on **`@beyo/items`** for
`fetchItemLookup` + `ItemLookupResult`. Forward-only: `@beyo/items` must never import
`@beyo/item-economics` (boundary criterion in phase 2). The item_pricing_fields
duplication precedent avoided a *reverse* edge (`item-economics → task-creation`);
this edge is forward and clean, so no duplication.

### Naming rules

Booleans prefixed `is`/`has`/`can`; testids kebab-case under the `item-valuation-`
prefix (full list in phase 1 plan); files kebab-case except components PascalCase —
repo convention throughout.

## 7. Sequencing & gates

```
Phase 1 (core + components)
  ├─ round 0: plan-projection (mandatory — M2–M7, M11–M13)
  ├─ 1A (Claude) ∥ 1B (Codex) — parallel sessions, disjoint files
  └─ review → APPROVED  ──gate──▶
Phase 2 (wiring + entry + e2e)
  ├─ round 0: plan-projection (mandatory — M1, M8, M9, M10)
  ├─ single Codex session (Claude assists only via review/fix prompts)
  └─ review (incl. Playwright runs) → APPROVED → closeout ritual
```

Tracks 1A/1B touch disjoint file sets (registry above); the phase-1 review reviews
both handoffs in one round.

## 8. Tool protocols

No archgraph in this repo — skip silently. Checkpoint-commit protocol per §3.
Every handoff declares its full write perimeter (files + probes) per charter.

## 9. Standing rules

Charter rules 1–11½ imported wholesale. Project-specific additions:

1. **`Number`/`Math.round`/`parseFloat` are forbidden inside
   `price-scenario-math.ts`** except at the two declared boundaries (M2). A review
   greps for them. Carve-out (review r1 L1, resolving this rule's conflict with
   §4A M3): the post-money display formatter computes the nearest minute as
   `Math.floor((s + 30) / 60)` — provably identical to `Math.round(s / 60)` over
   its domain — so the grep stays clean without weakening the rule.
2. **`roundHalfEven` is a verbatim transcription** — any deviation requires re-running
   the handoff's comparison protocol and recording it in the Review log.
3. Every mechanism criterion cites its intention §4A contract by ID (M1…M13); the
   named mutation for each safety-shaped test states file + definition-vs-call-site.
4. Components (Track A) receive **formatted strings, tones, fractions and callbacks**
   — never raw payload blocks. The controller/view-model side (Track B/phase 2) owns
   all formatting through the phase-1 pure libs. This is the SRP seam; stronger form
   after projection L18: **files under `components/price-editor/` (fixtures included)
   import nothing from `src/lib/` or `src/types.ts`** — every value arrives
   pre-formatted through props. The tone union is package-owned by 1A:
   `PriceEditorTone = "positive" | "negative" | "neutral"`, exported from
   `components/price-editor/index.ts` (L22). Enforcement is a real test, not a grep:
   `components/price-editor/boundaries.test.ts` walks the directory with `node:fs`
   and asserts no matching import specifier (L17).
5. No file under `packages/item-economics/src` imports `@beyo/tasks` or
   `@beyo/task-creation` (standing boundary, re-asserted).

## 10. Environment topology (verified 2026-08-19; update here if reality disagrees)

- Monorepo root: `frontend/`. Test commands (root `package.json`):
  - `npm run typecheck` — all five apps + package chain (includes item-economics).
    Baseline **clean — exit 0** (re-measured 2026-08-19 by the 1B implementer). The
    two TS2352 in task-creation tooling scope recorded in item_pricing_fields round 2
    no longer reproduce; expect zero errors, and treat any as new.
  - `npm run test:item-economics` — baseline **131 passing, 10 files** (measured by
    projection r0, 2026-08-19; re-measure at session start and record).
  - `packages/item-economics/vitest.config.ts` has **no `setupFiles`** — component
    tests import `@testing-library/jest-dom/vitest` per file (existing convention).
  - Branch `pipeline/item-valuation-edition` does not exist yet — **create it at the
    first checkpoint commit** (the project folder is currently untracked on `main`).
  - `npm run test:tasks` — baseline 68 passing.
- Playwright runs **from the managers app dir**
  (`apps/managers-app/ManagerBeyo-app-managers/`): `npm run test:e2e:mobile` then
  `npm run test:e2e:desktop`. Fixture/auth conventions per
  `34_runtime_validation_local.md` (`fixtures/app-fixture`, `auth.signIn()`).
- **Mobile tap caveat (earned):** clicks inside `PullToRefresh` are swallowed on the
  mobile project — use the `tap()`/`press()` helper, not `click()`.
- **npm install caveat (earned):** after ANY `npm install`, vite/vitest may fail with
  "Cannot find native binding" — reinstall the rolldown + lightningcss darwin-arm64
  binaries together.
- **Never launch dev servers** — the owner starts them and keeps control. Ask.
- ESLint baseline: five inherited diagnostics (item_pricing_fields records them).
- Backend dev origin used by the running apps: `http://192.168.1.246:8000` — tests
  never touch it (charter rule 9); Playwright mocks network per the local convention.

## 11. Carried items from the predecessor phase (item_pricing_fields)

- **N8 closes here:** `parseErrorIdentity` gains its first production callers
  (bootstrap + commit error paths). Phase 2 criterion.
- The retired-refusal sweep demanded by the 20260819 handoff §7.3 was **already
  executed** in item_pricing_fields fix round 3 (repo-wide grep zero hits, recorded
  in its Review log). Phase 2 re-verifies with one grep criterion, not a rebuild.
- N15/N12 (lookup re-scan behaviors in task creation) are out of scope here.
