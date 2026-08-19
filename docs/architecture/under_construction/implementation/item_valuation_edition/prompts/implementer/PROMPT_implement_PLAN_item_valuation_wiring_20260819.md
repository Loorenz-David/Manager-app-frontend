---
plan: PLAN_item_valuation_wiring_20260819
role: implementer
round: 1
date: 2026-08-19
implementer: Claude Opus 5
---

# Implementer prompt — phase 2 (wiring + entry + e2e)

You are the **implementing agent** for phase 2 of `item_valuation_edition`. Invoke
the **implementation-executor** skill now and follow its doctrine. This prompt is
the work order; the artifacts it cites are the authority — a disagreement between
them is a Review-log line, never a silent choice.

## Gate check

Phase 1 (`PLAN_item_valuation_core_20260819`) is **APPROVED** (review round 2,
handoff `handoffs/reviewer/handoff_PLAN_item_valuation_core_20260819_review_2.md`).
Phase 2's projection round 0 ran and its ledger is fully resolved
(`handoffs/reviewer/handoff_PLAN_item_valuation_wiring_20260819_projection_0.md`).
You build **on top of** phase 1's exports; you never edit them.

## Project root

`docs/architecture/under_construction/implementation/item_valuation_edition/`
(paths resolve from the `frontend/` repo root). Work on branch
`pipeline/item-valuation-edition` (exists; latest phase-1 commits are your base).

## Read order

1. `master_plan.md` — §5 (re-emit the contract-resolution block before coding),
   §6 (registry: every file/export name is fixed), §9 (standing rules), §10
   (environment; note the L1 carve-out in §9.1).
2. `plans/PLAN_item_valuation_wiring_20260819.md` — your goal, tasks 1–12
   (including 11a), criteria 1–24 (including 22a–22g), Notes (mock-seeding rule,
   debounce implementation note), Review log.
3. `planning/intention.md` — §3.1 (entry), §3.3 (bootstrap branches), §3.6
   (save + reconcile), §3.7 (realtime), §4A **M1, M8, M9, M10**; §3.2 for the
   states the page must compose.
4. Handoffs: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_price_scenario_20260819.md`
   §1, §6 (whole section); `…item_economics_operational_20260815.md` §3.1, §4.1
   (error-identity table).
5. Contracts (master plan §5 list): especially `04_api_client` (+local),
   `05_server_state`, `08_hooks`, `23_providers`, `21_realtime`, `28_surfaces`
   (+local), `30_dynamic_loading` (+local), `35_shared_packages` §13–14,
   `10_pages`, `36_scroll_visibility` (registration), `34_runtime_validation`
   (+local — fixture paths, credential env vars, spec conventions).
6. What exists (read to know, not to learn style):
   - Phase-1 exports: `packages/item-economics/src/index.ts` (pure modules),
     `components/price-editor/index.ts` (components + `PriceEditorTone`),
     `lib/price-draft.ts` (reducer + `resolveProvenanceVariant`),
     `lib/item-valuation-screen-state.ts`, `lib/price-coverage.ts`,
     `lib/valuation-currency.ts`, `lib/price-scenario-math.ts`, `types.ts`
     (scenario schemas), `api/item-economics-keys.ts` (`priceScenario`).
   - `packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx` (`openAndDismiss`,
     Force-ready role gate — your menu row copies both patterns).
   - `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`
     (registration idiom).
   - `packages/items/src/api/fetch-item-lookup.ts` + `packages/items/src/types.ts`
     (lookup), `packages/task-creation/src/lib/item-lookup-prefill.ts`
     (`selectPurchaseApiLookupResult` — the selection rule M1 names).
   - `packages/item-economics/src/socket-events.ts`, `lib/error-identity.ts`,
     `lib/item-pricing.ts` (`resolveTotalMinor`, `INLINE_PRICING_CURRENCY`).
   - `notify` usage: `packages/tasks/src/controllers/use-force-task-ready.controller.ts`.
   - An existing Playwright spec for conventions:
     `apps/managers-app/…/tests/playwright/features/tasks/force-task-ready.spec.ts`.

## Scope — exactly these files

Per master plan §6 and the plan's file list:
- New under `packages/item-economics/src/`: `api/fetch-task-price-scenario.ts`,
  `api/use-task-price-scenario-query.ts`, `api/put-item-valuation.ts`,
  `api/commit-task-evaluation.ts`, `actions/use-bootstrap-purchase-price.ts`,
  `actions/use-commit-item-valuation.ts`,
  `controllers/use-item-valuation.controller.ts`,
  `providers/ItemValuationProvider.tsx`, `pages/ItemValuationSlidePage.tsx`,
  `boundaries.test.ts` (package root — task 11a), tests beside each new module.
- Edited: `surface-ids.ts` (surface id + props type + preload), `socket-events.ts`
  (M9), `index.ts` (loader function only — **no static page export**),
  `packages/item-economics/package.json` (+`@beyo/items` peer).
- Outside the package: `packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx`
  (one row), `apps/managers-app/…/src/features/tasks/surfaces.ts` (registration),
  `apps/managers-app/…/tests/playwright/features/tasks/item-valuation.spec.ts`.

**Never touch:** `components/price-editor/**`, the phase-1 `lib/` files, the
phase-1 scenario-schema block in `types.ts`. If assembly reveals a needed change
there, STOP that thread and record it in the handoff as a fold-back request for
the coordinator — phase-1 files are closed under an approval gate.

## The work

Execute the plan's tasks 1–12 in order (logic bottom-up). Binding specifics, all
already frozen — do not re-derive:

- **API paths + minimal schemas**: plan task 1 (as amended by projection P1).
- **M1 bootstrap**: the PUT body rule verbatim — `resolveTotalMinor` conversion,
  echoed expected price **iff present** (absent key, not null), currency = scenario
  currency else `INLINE_PRICING_CURRENCY`.
- **M8 commit + reconcile**: exact equality on `production_budget_minor` vs
  `Number(budgetMinor(draft, model))`; exact string equality on
  `allowed_worker_minutes` vs `formatAllowedWorkerMinutes(allowedCentimin(draft,
  model))`; mismatch → one refetch + one `notify` (neutral copy), never re-commit.
- **M9 sockets**: 12 s trailing module-scope timer (restart per event, latest
  `queryClient` captured per projection P4) invalidating the `priceScenario` branch
  root, active only; `item:updated` + extended `evaluation-committed` immediate.
- **M10 staleness-guarded save**: 60 s `dataUpdatedAt` gate; one press → ≤ 1
  refetch + ≤ 1 commit; abort with the payload's reason if fresh `can_commit` is
  false; pre-commit refetch failure aborts the save.
- **Controller**: composes query + `useReducer(priceDraftReducer)` (module-local
  blank seed, `INIT` on scenario arrival) + `resolveScreenState` + `resolveCoverage`
  + both actions + all formatting through the phase-1 libs; owns the "You"
  substitution via `useAuth()`; dispatches `REFETCH` on every scenario update; adds
  the dev-time step-count assert (r1 N2). Components receive **only** formatted
  strings / tones / fractions / booleans / callbacks.
- **Page**: reads `useSurfaceProps<ItemValuationSlideSurfaceProps>`, renders
  `ItemValuationFrame` (title "Expected sold price", subtitle composed per intention
  §3.4 — omit absent fragments) with the provenance row as `headerExtra`, body per
  screen state (skeleton in S1, editor composition per the phase-1 test scene,
  bootstrap card in S4, empty states in S3/S5), registers its scroll container,
  adds testid `item-valuation-page` only (criterion 22d), and the a11y items of
  22g (`aria-valuetext` prop is NOT on `PriceSlider` — pass the formatted price via
  the page/controller into the slider's existing input? **No** — `PriceSlider` is
  phase-1-closed: satisfy 22g by wrapping, or record a fold-back request naming the
  one-prop addition; do not edit the component yourself).
- **Menu row**: master plan §6 spec verbatim (label "Change retail price",
  `CircleDollarSign`, testid `task-actions-change-retail-price`, Admin/Manager
  gate, `openAndDismiss`, after "Change article number").
- **Registration**: `lazyWithPreload(loadItemValuationSlidePage)`, `surface:
  "slide"` in the managers-app tasks surfaces file.
- **Playwright** (task 12): mobile first then desktop; mocks seeded from the plan's
  Reference payload JSON (Notes rule); use the tap()/press() helper inside
  PullToRefresh contexts (master plan §10).

## Acceptance criteria

The plan's **1–24 including 22a–22g**. Named mutations: criterion 9 names the
reconciliation-equality removal in `use-commit-item-valuation.ts` (call site) —
run it, watch it bite, revert byte-identically, record digests. Criteria 16
(debounce) and 12–15 (staleness) run on fake timers with module resets.

## Validation commands

- `npx tsc -p packages/item-economics/tsconfig.json --noEmit`; `npm run typecheck`
  (expect exit 0 — the old TS2352 baseline note is retired).
- `npm run test:item-economics` (baseline at your session start: **225 / 19** —
  re-measure and record) and `npm run test:tasks` (baseline 68 / 10).
- From `apps/managers-app/ManagerBeyo-app-managers/`: `npm run test:e2e:mobile`,
  then `npm run test:e2e:desktop`.
- Never `npm install` unless unavoidable (rolldown/lightningcss caveat, master plan
  §10); never launch dev servers — ask the owner; never touch
  `http://192.168.1.246:8000`.

## Closing protocol

1. All criteria green; suites, typecheck, both e2e projects pass.
2. **Checkpoint commit** on `pipeline/item-valuation-edition`, subject prefixed
   `CHECKPOINT (not approved): `.
3. Handoff at
   `handoffs/implementer/handoff_PLAN_item_valuation_wiring_20260819_implement_1.md`
   (frontmatter `plan / role: implementer / round: 1 / state: IMPLEMENTED / actor /
   date`): built-vs-plan with honest deviations, **full write perimeter** (files +
   probes with apply/revert digests), baseline + final counts, any fold-back
   requests (phase-1 edits you needed but did not make), and `⚠ OWNER DECISIONS
   REQUIRED (n)` (or the zero line).
4. Append one dated implementer line to the phase-2 plan's Review log; **append** a
   new phase-2 tracker row in `master_plan.md` (never replace an existing row —
   process lesson r2 L6).
5. Do not review your own work; do not archive anything.
