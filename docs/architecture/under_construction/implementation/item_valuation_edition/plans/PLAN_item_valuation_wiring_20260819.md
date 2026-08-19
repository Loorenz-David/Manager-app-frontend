# PLAN_item_valuation_wiring_20260819 (phase 2)

## Metadata

- Plan ID: `PLAN_item_valuation_wiring_20260819`
- Status: `NOT_STARTED`
- Track: **B — logic wiring** (Codex, one session; fix cycles as needed)
- Created at (UTC): `2026-08-19T00:00:00Z`
- Master plan: `../master_plan.md`
- Semantic authority: `../planning/intention.md` — §3.1, §3.3, §3.6, §3.7, §4A
  **M1, M8, M9, M10**; §6 (operations)
- Depends on: **phase 1 APPROVED** (`PLAN_item_valuation_core_20260819`) — hard gate

## Goal

Plug phase 1's pure core and components into a working page: query + actions +
sockets + controller/provider + page assembly + surface registration + menu entry,
validated end to end with Playwright. **NOT in this phase:** any change to phase 1's
pure libs or component internals (a needed change is a fold-back through the
coordinator, not an inline edit).

## Read first

1. Master plan §5, §6 (registry — every name is fixed there), §9, §10, §11
2. Intention §3.1, §3.3 (bootstrap branches), §3.6 (save + reconcile), §3.7
   (realtime), §4A M1/M8/M9/M10
3. Handoffs: price-scenario §1, §6 (whole section), operational §3.1 + §4.1
4. Contracts: `04_api_client` (+local), `05_server_state`, `08_hooks`,
   `23_providers`, `21_realtime`, `28_surfaces` (+local), `30_dynamic_loading`
   (+local), `35_shared_packages` §13–14, `10_pages`, `13_errors`,
   `34_runtime_validation` (+local), `36_scroll_visibility` (registration only)
5. What exists: `packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx`
   (`openAndDismiss`, Force-ready gating), `apps/managers-app/.../features/tasks/surfaces.ts`,
   `packages/items/src/api/fetch-item-lookup.ts`,
   `packages/item-economics/src/socket-events.ts`, `lib/error-identity.ts`

## Files expected to change

Per master plan §6: the eight new `api/`/`actions/`/`controllers/`/`providers/`/
`pages/` files; `surface-ids.ts`, `socket-events.ts`, `index.ts`,
`item-economics-keys.ts` (nothing beyond the registered lines);
`packages/item-economics/package.json` (+`@beyo/items` peer);
`packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx`;
`apps/managers-app/.../features/tasks/surfaces.ts`;
`apps/managers-app/.../tests/playwright/features/tasks/item-valuation.spec.ts`;
tests beside each new module. Nothing under `components/price-editor/`, the phase-1
`lib/` files, or the phase-1 scenario-schema block in `src/types.ts`.

## Tasks (ordered — logic bottom-up per 16_feature_workflow)

1. **API functions** (paths frozen by projection r0-phase2; all under
   `ITEM_ECONOMICS_BASE_PATH` = `/api/v1/item-economics`, `types.ts:13`):
   - `fetchTaskPriceScenario(taskId)` — GET `…/tasks/{taskId}/price-scenario`,
     parses `PriceScenarioSchema` inside `ApiEnvelopeSchema`.
   - `putItemValuation(itemId, body)` — PUT `…/items/{itemId}/valuation`; response
     parsed by a **minimal** schema: `{ item_valuation: { client_id }, preview:
     { status: ItemEconomicsStatusSchema } }` — the bootstrap needs success + status,
     nothing more.
   - `commitTaskEvaluation(taskId, body)` — POST `…/tasks/{taskId}/evaluations/commit`;
     minimal schema: `{ evaluation: { client_id, production_budget_minor:
     z.number().int(), allowed_worker_minutes: z.string() } }` (the two M8
     reconciliation fields + identity).
   Error identity comes from `parseErrorIdentity` — this closes carried item N8 of
   item_pricing_fields (master plan §11). User-facing notices use `notify` from
   `@beyo/lib` (the `use-force-task-ready.controller` idiom) — the M8 neutral notice
   is one `notify` call, never a modal.
2. **Query hook** `useTaskPriceScenarioQuery(taskId)` on
   `itemEconomicsKeys.priceScenario(taskId)`; refetch on window focus enabled
   (M10's first half); fresh fetch on every surface open (slide unmounts on close).
3. **Bootstrap action** `useBootstrapPurchasePrice` per §3.3 + M1: lookup →
   `purchase_api` selection → validity gate → PUT body built exactly per M1 →
   invalidate `priceScenario(taskId)` on success. All four branches return typed
   outcomes the provider maps to `PurchaseBootstrapCard` props.
4. **Commit action** `useCommitItemValuation` per §3.6 + M8: POST → reconcile
   (`budgetMinor` equality + `formatAllowedWorkerMinutes` string equality) → one
   refetch always; mismatch adds the single neutral notice; identity-mapped errors
   (operational §4.1 table; configuration identities get settings-pointing copy;
   409 → refetch + message).
5. **Socket wiring** per M9 in `socket-events.ts`: 12 s trailing module-scope timer
   for `task:step-state-changed` → invalidate the `priceScenario` branch root
   (active); `item:updated` (new handler) and `item_economics:evaluation-committed`
   (extend existing) → immediate targeted invalidation.
6. **Controller** `useItemValuationController(taskId)`: composes query +
   `useReducer(priceDraftReducer)` + `resolveScreenState` + `resolveCoverage` + both
   actions + the M10 staleness-guarded save (60 s gate, one press ≤ one refetch +
   ≤ one commit, in-flight lockout) + view-model assembly (all formatting through
   phase-1 libs — components receive strings/tones/fractions only). The controller
   owns the "You" substitution: it compares `saved.created_by.client_id` against the
   signed-in user and hands 1A a pre-resolved `authorName`/`avatarName` (`""` for an
   unloadable author) — projection L20/L23 delegation. The controller also owns the
   `useReducer` seed: a module-local blank `PriceDraftState` (every field null/0),
   immediately overwritten by dispatching `INIT` when the scenario lands — the
   registry deliberately adds no constant to phase-1's `price-draft.ts` for this
   (routed from 1B handoff item 2). The current user comes from `useAuth()`
   (`@beyo/auth`) — `user.client_id` vs `saved.created_by.client_id`. Add the
   dev-time step-count assert beside the domain → slider-props mapping (r1 N2:
   `(max − min) % step === 0` in dev, matching `PriceSlider`'s rounding). After a
   successful commit, assert the refetched scenario's saved expected price equals
   the committed draft; if not (replica lag — r1 N6), re-dispatch nothing and rely
   on the T9 arm, but log the mismatch via the M8 notice path.
7. **Provider + page**: `ItemValuationProvider` (context shell per `23_providers`);
   `ItemValuationSlidePage` reads `useSurfaceProps<ItemValuationSlideSurfaceProps>`,
   renders provider + composed phase-1 components, registers its scroll container
   per `36_scroll_visibility`, headerless per the app-wide slide-to-close pattern.
8. **Exports**: `loadItemValuationSlidePage` loader in `index.ts` (no static page
   export); `preloadItemValuationSlideSurface` in `surface-ids.ts`; public
   constants/types.
9. **Menu row** in `TaskDetailMenuSheetPage`: per master plan §6 (label, icon,
   testid, Admin/Manager gate, `openAndDismiss`, position after "Change article
   number").
10. **Managers-app registration** in `features/tasks/surfaces.ts` via
    `lazyWithPreload(loadItemValuationSlidePage)`, `surface: "slide"`.
11. **Retired-identity verification** (master plan §11): one grep-backed test/CI
    assertion or recorded check that the retired inline-pricing refusal identity has
    zero references — expected already-clean.
11a. **Package-wide import-boundary test** (routed from 1B handoff item 1): a
    `src/boundaries.test.ts` in the package root, same `node:fs` walk pattern as
    the price-editor one, asserting no file under `packages/item-economics/src`
    imports `@beyo/tasks` or `@beyo/task-creation` — criterion 55's third clause
    gets its automated home (charter rule 1).
12. **Playwright** `item-valuation.spec.ts` (mocked network per
    `34_runtime_validation_local`): menu row visible as admin → opens page → editor
    renders from mocked scenario → drag slider → chip flips at mocked break-even →
    save posts the drafted `expected_sale_price_minor` and lands in saved-version
    row; a second scenario fixture drives the purchase-required state and asserts
    the bootstrap PUT body. Mobile project first, then desktop (tap()/press()
    caveat, master plan §10).

## Acceptance criteria

**Bootstrap (M1):**
1. Lookup fixture `purchase_price: 474.99`, quantity 6, saved expected 855000,
   currency null → PUT body exactly `{ purchase_cost_minor: 284994,
   expected_sale_price_minor: 855000, currency: "swedish_krona" }`.
2. Quantity 0 → `purchase_cost_minor: 47499`.
3. `saved: null` → the `expected_sale_price_minor` key is **absent** (not null).
4. No `purchase_api` result → no PUT fires; outcome maps to the
   created-on-purchase-app message. 5. `purchase_price: null` → no PUT; the
   set-it-there message. 6. `article_number: null` → CTA disabled; no lookup fires.
7. Success invalidates `priceScenario(taskId)` exactly once.

**Commit + reconcile (M8):**
8. Exact response → zero notices, one refetch, `lastDraft` cleared (T6 through the
   real reducer instance).
9. Response one öre off on `production_budget_minor` → exactly one refetch + one
   neutral notice, no re-commit (named mutation: removing the equality check's
   call in `use-commit-item-valuation.ts` must turn this red).
10. `allowed_worker_minutes` string mismatch alone triggers the same path.
11. 409 `ITEM_COST_CONCURRENT_COMMIT` → refetch + its message; the five
    configuration identities render settings-pointing copy (one assertion per
    identity — enumerate, never sample).

**Staleness guard (M10):**
12. Fake timers: fetch 61 s ago → Save press refetches first, commits after fresh
    `can_commit: true`. 13. Fresh payload with `can_commit: false` → abort with
    reason, zero commits. 14. Fetch 10 s ago → immediate commit, zero extra
    fetches. 15. Double-press while in flight → one commit total.

**Sockets (M9):**
16. Five `task:step-state-changed` events 1 s apart → zero scenario refetches
    before, exactly one after the 12 s trailing edge (fake timers).
17. `itemEconomicsKeys.priceScenario(t)` does **not** extend
    `itemEconomicsKeys.tasks()` (prefix test).
18. `item:updated` → immediate scenario invalidation;
    `item_economics:evaluation-committed` → invalidates **both** production-time and
    scenario keys for that task (adjacent-pair proof that the old handler still
    works).

**Entry + registration:**
19. Menu row hidden for a non-admin/manager role fixture; visible and functional for
    admin (component test in `@beyo/tasks`).
20. Pressing the row opens `ITEM_VALUATION_SLIDE_SURFACE_ID` with `{ taskId }` and
    requests the menu's close (mirror of the existing rows' tests).
21. `packages/item-economics/src/index.ts` contains no static export of
    `ItemValuationSlidePage` (grep criterion; the loader function is the only path).
22. No file under `packages/items/src` imports `@beyo/item-economics` (dependency
    direction, master plan §6).

**State → rendered blocks (review r1 L2 — phase 1's "no numbers" rows cannot bite
without a composition module; these controller/page tests are where intention §1.3
is finally enforceable):**
22a. Page test, `purchase_required` scenario fixture → `item-valuation-per-piece`
    absent, `item-valuation-bootstrap-message` present.
22b. Page test, `blocked` fixture (model null) → no `-per-piece`, no `-total-line`,
    Save disabled with `-save-reason` (a production regression that renders numbers
    for a null block must turn one of these red).
22c. Page test, `unbound` fixture → `-empty-state` present, no `-save-button`.
22d. Testids: the page adds **only** `item-valuation-page` — `-header` and
    `-menu-button` already render from `ItemValuationFrame` (review r1 L3).
22e. **Numbers meet the arithmetic exactly once (r2 N9 / L5):** one page-level test
    renders the editor from the **parsed Reference payload through the phase-1
    libs** and asserts the exact strings: per-piece `"1 425"`, AT PRICE `"2h 25m"`
    (855 000 → 8 681 s), TYPICAL `"3h 25m"` (12 300 s). This is the only place a
    fixture-class error (r1 S1) can be caught by a failing test.
22f. **Provenance composition — one row per §3.5 mapping (r2 N11):** controller
    fixtures where (i) `created_by.client_id === user.client_id` → label `"You"`;
    (ii) another user → their `username` with avatar image src passed through;
    (iii) `created_by === null` → label `"saved version"`, detail `null`,
    `avatarName: ""` — and the rendered `item-valuation-provenance-avatar` slot is
    **non-empty** (r2 N8's unasserted avatar clause, closed here).
22g. A11y (r1 N7): the slider input carries `aria-valuetext` with the formatted
    per-piece price, and the decorative three-dot is removed from the tab order by
    the page (`tabIndex={-1}` via a frame prop or wrapper) until it gains an action.

**End to end:** 23. The Playwright flows of task 12 pass on `test:e2e:mobile` and
`test:e2e:desktop`. 24. `npm run typecheck` clean; `npm run test:item-economics` and
`npm run test:tasks` green against re-measured baselines.

**Structurally held:** none — every criterion is assertable now.

## Notes

- The 12 s debounce timer is module-scope by contract (M9); tests must reset modules
  between cases to avoid cross-test timer bleed. Implementation note (projection
  r0-phase2): handlers receive `queryClient` per event — capture the latest in a
  module-scope variable for the trailing fire.
- Playwright and page-test mocks are seeded from the phase-1 plan's **Reference
  payload** (its JSON block), never from the component fixtures — the fixtures'
  provenance detail string uses an absolute timestamp (r2 N10) and the controller
  produces relative ones.
- The r2 carry-forwards N8–N11 land in criteria 22e–22f; N2/N6 in task 6; N7 in 22g;
  N1 in task 11a. Nothing from reviews r1/r2 remains unrouted.
- Never launch dev servers (master plan §10). Playwright mocks the network; the
  192.168.1.246 backend is out of bounds for tests.
- If the reducer or a component needs a change, stop and route it through the
  coordinator as a phase-1 fold-back — do not edit phase-1 files in this session.

## Review log

*(append-only; implementer and reviewer share it)*
