---
plan: PLAN_item_valuation_wiring_20260819
role: implementer
round: 1
state: IMPLEMENTED
actor: Claude Opus 5 (implementation-executor doctrine, pipeline charter)
date: 2026-08-20
---

# Implementer handoff — phase 2 (wiring + entry + e2e), round 1

**Summary.** Tasks 1–12 are built and every criterion 1–24 (including 22a–22g) is
carried by an automated test. 21 files: 13 new, 8 edited. `test:item-economics`
**225/19 → 295/27**; `test:tasks` **68/10 → 75/10**; `npm run typecheck` exit 0;
`npx tsc -p packages/item-economics/tsconfig.json --noEmit` clean; the new Playwright
spec is green on **both** projects. Criterion 9's named mutation was run at the call
site the criterion names and bit; two self-chosen probes were run and bit. No phase-1
file was edited.

Two things need the coordinator: **1 fold-back request** (22g's durable form) and
**1 owner decision** (criterion 11's "five" configuration identities vs the handoff
table's four).

## ⚠ OWNER DECISIONS REQUIRED (1)

### Card 1 — Should a task with no primary item send the manager to the settings screen?

**Question.** When a commit is refused with `ITEM_COST_NO_PRIMARY_ITEM`, should the
message point at the item-economics settings, or say the task has no item to price?

**Story.** A manager opens a task that lost its primary item, drags a price and
presses Save. The server refuses. If the copy reads "no cost group is configured —
fix it in the item economics settings", they go to settings, find the configuration
perfectly healthy, and come back none the wiser; the item is what is missing, and it
is fixed on the task, not in settings. Over a month of these the settings screen
becomes the place managers go when something is wrong and nothing there ever is.

**Branches.**
- *Say what is missing (implemented):* the message reads "This task has no primary
  item to price." The manager fixes the task.
- *Point at settings:* matches the backend handoff's prose count of "five", and sends
  the manager somewhere that cannot help.

**Recommendation.** Keep the implemented copy — the backend's own per-identity table
marks only four rows "→ settings", and `NO_PRIMARY_ITEM` is not one of them.

**On silence.** The gate holds on criterion 11's wording; the implemented behaviour
ships as described and the test enumerates all twelve identities either way.

**Trace.** Phase-2 plan criterion 11; operational handoff §4.1 table vs its following
sentence; `actions/use-commit-item-valuation.ts` `IDENTITY_COPY`.

## Fold-back request (1) — phase-1 files I needed but did not touch

**22g wants two attributes on phase-1 components.** `PriceSlider`'s hidden range
input needs `aria-valuetext` (it currently announces a step index), and
`ItemValuationFrame`'s decorative three-dot button needs to leave the tab order until
it gains an action. Both files are closed under the phase-1 approval gate, so the page
sets both attributes from one effect after mount
(`pages/ItemValuationSlidePage.tsx`, `useItemValuationA11yPatches`) — React never
writes either attribute on those elements, so nothing fights over them, and criterion
22g is green now.

The durable form is two props, and I am not making them:
- `PriceSlider`: `ariaValueText?: string` → spread onto the existing `<input>`.
- `ItemValuationFrame`: `isMenuFocusable?: boolean` (default `false` this iteration)
  → `tabIndex={isMenuFocusable ? undefined : -1}` on the three-dot button.

Route as a phase-1 amendment when convenient; the wrapper is correct but is an
imperative poke where a prop belongs.

## Built vs plan

| Task | Built | Deviation |
|---|---|---|
| 1 — API functions | `fetch-task-price-scenario.ts`, `put-item-valuation.ts`, `commit-task-evaluation.ts`, all under `ITEM_ECONOMICS_BASE_PATH`, minimal schemas exactly as frozen | none |
| 2 — query hook | `use-task-price-scenario-query.ts`; `staleTime: 0` + `refetchOnMount: "always"` + `refetchOnWindowFocus` | `staleTime: 0` is explicit because the app default is 60 s — without it neither half of M10's freshness holds |
| 3 — bootstrap (M1) | `use-bootstrap-purchase-price.ts`, four branches, body per M1 verbatim | selection rule re-stated locally (importing `selectPurchaseApiLookupResult` would need `@beyo/task-creation`, forbidden by §9.5) |
| 4 — commit (M8) | `use-commit-item-valuation.ts`, exact-equality reconcile, one refetch always, identity copy | see owner card 1 |
| 5 — sockets (M9) | 12 s module-scope trailing timer, latest-client capture, `item:updated`, extended `evaluation-committed` | branch-root prefix is module-local, not a key-factory member (plan freezes the factory) |
| 6 — controller | `use-item-valuation.controller.ts`: query + reducer + screen state + coverage + both actions + M10 save + full view model; `useAuth().user.id` for "You"; dev step-count assert; post-commit replica-lag check | staleness read from the query cache; skeleton held one frame past the payload (both below) |
| 7 — provider + page | `ItemValuationProvider.tsx`, `ItemValuationSlidePage.tsx`, `PullToRefresh` without an external ref (36_scroll_visibility mechanism A), `useHeaderlessSlidePage` | none |
| 8 — exports | `loadItemValuationSlidePage` in `index.ts` (no static page export), `preloadItemValuationSlideSurface` + props type in `surface-ids.ts` | none |
| 9 — menu row | "Change retail price", `CircleDollarSign`, testid `task-actions-change-retail-price`, Admin/Manager gate, `openAndDismiss`, directly after "Change article number" | none |
| 10 — registration | `lazyWithPreload(loadItemValuationSlidePage)`, `surface: "slide"` | also exports `preloadItemValuationSlideSurface` from the app surfaces file, matching the neighbouring rows |
| 11 — retired identity | automated in `src/boundaries.test.ts`; zero references | check is repo-wide (`packages/` + `apps/`), not a recorded grep |
| 11a — boundary test | `src/boundaries.test.ts`, `node:fs` walk | same file also carries criterion 22 (reverse edge) and task 11 |
| 12 — Playwright | `item-valuation.spec.ts`, 2 tests, seeded from the Reference payload, `press()` helper | none |

### Judgment calls

All six are recorded in full in the phase-2 plan's Review log (2026-08-20 entry) and
not repeated here. In brief: (1) criterion 11's "five" → owner card 1; (2) the
scenario branch-root prefix lives in `socket-events.ts`; (3) the M10 gate reads
`queryClient.getQueryState(...).dataUpdatedAt` rather than the render snapshot,
because TanStack does not always re-render an observer when a refetch changes
nothing; (4) `screenState` stays `loading` for the one frame between the payload
landing and the reducer's `INIT`, so the editor never renders a placeholder `0 SEK`;
(5) 22g by wrapping, with the fold-back above; (6)
`ITEM_COST_VALUATION_AMOUNT_REQUIRED` mapped defensively in the bootstrap.

## Test counts

| Suite | Baseline at session start | Final | Δ |
|---|---|---|---|
| `npm run test:item-economics` | 225 passing / 19 files | **295 / 27** | +70 / +8 |
| `npm run test:tasks` | 68 / 10 | **75 / 10** | +7 |
| `npm run typecheck` | exit 0 | exit 0 | — |
| `npx tsc -p packages/item-economics/tsconfig.json --noEmit` | clean | clean | — |
| Playwright `item-valuation.spec.ts` | n/a | 2 passed (mobile), 2 passed (desktop) | new |

### Criterion → test map

| Criteria | Where |
|---|---|
| 1–7 | `actions/use-bootstrap-purchase-price.test.tsx` (8 tests) |
| 8, 9, 10, 11 | `actions/use-commit-item-valuation.test.tsx` (24 tests; 8's `lastDraft` clause in the controller test as 8b) |
| 12–15 | `controllers/use-item-valuation.controller.test.tsx` |
| 16, 18 | `socket-events.test.ts` (fake timers + `vi.resetModules()` per case) |
| 17 | **inherited** phase-1 `api/item-economics-keys.test.ts`, re-verified; companion 17b in `socket-events.test.ts` |
| 19, 20 | `packages/tasks/src/pages/TaskDetailMenuSheetPage.test.tsx` (7 new tests) |
| 21, 22 | `src/boundaries.test.ts` (21 also held by the absence of a static export in `index.ts`) |
| 22a–22e, 22g | `pages/ItemValuationSlidePage.test.tsx` (9 tests) |
| 22f | `controllers/use-item-valuation.controller.test.tsx` (5 rows) + the non-empty avatar slot in the page test |
| 23 | `apps/managers-app/…/tests/playwright/features/tasks/item-valuation.spec.ts` |
| 24 | the table above |

## Mutation probes — applied and reverted

Every probe was applied to the working tree, run, and restored from a byte-copy taken
before the edit. The post-revert digest equals the pre-probe digest in all three
cases, and `git status` shows no residue.

| # | Probe | File (call site) | Result | Digest before | Digest after revert |
|---|---|---|---|---|---|
| 1 (plan-named, criterion 9) | `const reconciled = isReconciled(...)` → `const reconciled = true` | `packages/item-economics/src/actions/use-commit-item-valuation.ts` — **call site** inside `onSuccess` | criteria **9, 10, 10b red**; 8, 11, 11b and the identity table stayed green | `5964176039…9e02d5` | `5964176039…9e02d5` |
| 2 (self-chosen, M10) | `STALENESS_LIMIT_MS = 60_000` → `Number.POSITIVE_INFINITY` | `packages/item-economics/src/controllers/use-item-valuation.controller.ts` | criteria **12, 13, 13b red**; 14, 15 green (correctly — they never cross the gate) | `42d93820ba…c8c003b` | `42d93820ba…c8c003b` |
| 3 (self-chosen, M9) | `SCENARIO_DEBOUNCE_MS = 12_000` → `0` | `packages/item-economics/src/socket-events.ts` | criteria **16, 16c red**; 16b green | `706ee11012…de40f` | `706ee11012…de40f` |

Full digests: `596417603970fb53d88cac81d3f0e2ef8a7413f377d3e9af20f7e463ed9e02d5`,
`42d93820ba5babcf9fc5595d1768bc0d44fc32ecaa994a65dbbb18e93c8c003b`,
`706ee110127996e59f7bb8d91eb47d7949d58afb3a81a4affb5f80f4d56de40f`.

**No file was touched by a probe that is not in the table above.** The three probe
files are all files this session also changed for real; the probe edits are not
present in the checkpoint commit.

## Full write perimeter

### New files (13)

```
packages/item-economics/src/api/fetch-task-price-scenario.ts
packages/item-economics/src/api/fetch-task-price-scenario.test.ts
packages/item-economics/src/api/put-item-valuation.ts
packages/item-economics/src/api/put-item-valuation.test.ts
packages/item-economics/src/api/commit-task-evaluation.ts
packages/item-economics/src/api/commit-task-evaluation.test.ts
packages/item-economics/src/api/use-task-price-scenario-query.ts
packages/item-economics/src/actions/use-bootstrap-purchase-price.ts
packages/item-economics/src/actions/use-bootstrap-purchase-price.test.tsx
packages/item-economics/src/actions/use-commit-item-valuation.ts
packages/item-economics/src/actions/use-commit-item-valuation.test.tsx
packages/item-economics/src/controllers/use-item-valuation.controller.ts
packages/item-economics/src/controllers/use-item-valuation.controller.test.tsx
packages/item-economics/src/providers/ItemValuationProvider.tsx
packages/item-economics/src/pages/ItemValuationSlidePage.tsx
packages/item-economics/src/pages/ItemValuationSlidePage.test.tsx
packages/item-economics/src/boundaries.test.ts
packages/item-economics/src/test-support/price-scenario-reference.ts
apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/tasks/item-valuation.spec.ts
```

(19 paths — "13 new modules" counts production modules; their tests are the rest.)

**One file is not in the plan's list:**
`packages/item-economics/src/test-support/price-scenario-reference.ts`. It holds the
phase-1 plan's Reference payload, parsed through `PriceScenarioSchema` on the way
out, so the Notes rule ("mocks are seeded from the Reference payload, never from the
component fixtures") has exactly one home instead of four copies. It is imported only
by `*.test.*` files and is never reachable from `index.ts`.

### Edited files (8)

```
packages/item-economics/src/surface-ids.ts        surface id + props type + preload fn
packages/item-economics/src/socket-events.ts      M9: debounce, item:updated, extended commit handler
packages/item-economics/src/socket-events.test.ts criteria 16, 16b, 16c, 17b, 18, 18b
packages/item-economics/src/index.ts              surface exports + loadItemValuationSlidePage
packages/item-economics/package.json              +@beyo/auth, +@beyo/hooks, +@beyo/items peers
packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx       one row
packages/tasks/src/pages/TaskDetailMenuSheetPage.test.tsx  criteria 19, 19b, 19c, 20, 20b
apps/managers-app/…/src/features/tasks/surfaces.ts         registration + preload export
```

Untouched, as required: `components/price-editor/**`, every phase-1 `lib/` file, the
phase-1 scenario-schema block in `src/types.ts`, `api/item-economics-keys.ts`.

### Documents

```
docs/…/item_valuation_edition/plans/PLAN_item_valuation_wiring_20260819.md   Review-log entry
docs/…/item_valuation_edition/master_plan.md                                 appended tracker row
docs/…/item_valuation_edition/handoffs/implementer/handoff_…_implement_1.md  this file
```

### Tool-recorded state

No archgraph in this repo (master plan §8) — nothing recorded. Playwright's
`test-results/.last-run.json` and `playwright-report/index.html` are tracked run
artifacts; they were **restored to HEAD** before the checkpoint commit and are not
part of it.

## Environment findings the master plan should absorb

1. **The Playwright projects have a large pre-existing failure baseline, and §10
   records none.** Measured by stashing this session's work and re-running:

   | project | tree | passed | failed | did not run |
   |---|---|---|---|---|
   | mobile | clean (baseline) | 15 | 54 | 15 |
   | mobile | with phase 2 | 17 | 52 | 15 |
   | desktop | with phase 2 | 16 | 54 | 15 (+1 skipped) |

   The dominant failure is `TypeError: Importing a module script failed` in auth,
   cases, task-creation and worker-stats — a dev-server module-loading problem, not a
   test-content problem. Scoped to `features/tasks/` on desktop: **2 passed / 5 failed
   before, 4 passed / 4 failed after** (both `force-task-ready` specs fail in both
   trees). Nothing this phase changed moved a spec from passing to failing.
   Recommend §10 gain a recorded e2e baseline so future rounds do not re-derive it.

2. **`AuthUser` has no `client_id`.** It exposes `id: UserId`, populated from the
   API's `client_id` at boot (`packages/auth/src/components/AuthProvider.tsx:57`).
   Already corrected in master plan §6 by the coordinator; noted here because the
   controller depends on it.

3. **`setQueryData(key, data, { updatedAt })` does not always refresh an observer's
   `dataUpdatedAt`.** When the new data is deep-equal, structural sharing suppresses
   the notification and the render snapshot keeps the old timestamp while the cache
   holds the new one. This is why the M10 gate reads the cache. Any future test that
   ages a query must know it.

4. Dev server on `:5173` was already running and was reused (`reuseExistingServer:
   true`); no dev server was launched by this session, and
   `http://192.168.1.246:8000` was never touched.

## For the reviewer

- Perimeter above is exact; `git status` at handoff time shows the 8 edited files, the
  19 new files, and the 3 documents — nothing else.
- The checkpoint commit is `CHECKPOINT (not approved): item_valuation_edition phase 2
  (wiring + entry + e2e)`.
- Criterion 17 has no new test of its own by design — it is met by an inherited
  phase-1 test. Please re-verify rather than assume.
- I did not review my own work and archived nothing.
