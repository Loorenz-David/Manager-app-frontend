# Stock Report — Logic Phase Handoff

## Built

- Added the stock-report DTO mapper, nullish display defaults, bucket query keys,
  API functions, list/detail hooks, optimistic priority/reorder/assignment
  actions, permissions, controller, route loader, surface registry, and socket
  handlers.
- Replaced the managers fixture preview; wired the Stock needs tab, package
  source, surfaces, and socket registry into managers, sellers, and workers.
  Managers open `TASK_CREATION_INTERNAL_SURFACE_ID`; wood workers open
  `TASK_CREATION_WORKER_INTERNAL_SURFACE_ID`; sellers have no creation opener.
- Added structured API error fields, stock socket types, locked-sheet support,
  worker callback props, generic candidate-gate/after-create seams, and the two
  unrelated `live_accrual_rate` fixture repairs.
- Adopted API v2: detail-only errors now work at any status, preview accepts
  only its verified envelope and required request shape, and compact assignment
  payloads map safely to `TaskListCard` (including the first item image).
- Completed the injected gate flow in both forms: debounced category/identifier/
  quantity previews, live status slot, locked sheet props, lookup-owned-field
  cleanup, accepted-override reset, task-then-assignment, 409 confirm/retry,
  and an honest partial-failure notification. Preview transport failures remain
  advisory while stale replies never decide; 422 refusals now use the same
  closed-vocabulary copy as preview blocks. Managers and sellers now inject
  task-detail/image openers; workers inject image only, leaving body taps inert.
- Added credential-gated manager, worker, and seller Playwright route specs.
  They mock the board endpoint with `page.route` and use `tap()` under touch
  emulation for the More-tab interaction.
- Fixed the detail slide's root height. Its pull-to-refresh body is absolutely
  positioned, so it must explicitly fill the non-flex surface content wrapper;
  empty assignment responses now show the summary, Add item, and empty state.

## Verification

- `npm run test:stock-report` — 90 passed.
- `npm run test:ui` — 193 passed.
- `npm run test:api-client` — 5 passed.
- `npm run test:realtime` — 5 passed.
- `npm run test:tasks` — 130 passed.
- `npm run test:task-creation` — 126 passed.
- `npm run typecheck` — passed.
- Managers, sellers, and workers production builds passed. No dev server was
  started.
- Guard-proof mutations were deliberately planted and reverted. The tests
  failed for 0-based reorder requests, Unset-bucket reorder availability,
  worker Unset exposure, locked-sheet browser Back, stale preview allowance,
  and loss of the accepted override.

## Backend Follow-ups

- `item_category.image_url` remains nullish in schemas until the promised final
  verification handoff; `packages/stock-report/src/stock-report.types.ts` is
  the single tightening point.
- The backend's final nullability handoff may tighten schemas in
  `packages/stock-report/src/stock-report.types.ts`.

## Deviations / Remaining Verification

- Dedicated MSW coverage is still missing for API adapters, priority/reorder
  optimistic rollback, full controller opening rules, and assignment mutation
  fallback. The new cache-handler tests exercise the public API/cache boundary
  with mocked adapters; they do not claim MSW v2 transport coverage.
- The per-app Playwright specs were deliberately not run: each app config's
  `webServer` starts `npm run dev`, prohibited by this phase. They also need
  role-appropriate `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` to
  execute rather than skip. No development server was started by this work.
- The mutation campaign covers the critical index, bucket, role, locked-Back,
  stale-result, and accepted-override regressions. It does not yet contain a
  browser-level mutation proof for the worker's inert task-card body, lookup
  clearing, or a cross-bucket event move; the corresponding unit behavior is
  covered by controlled props, form injection maps, and cache-handler tests.
- `npm install --package-lock-only` updated the lockfile. It reported the
  existing Node-engine warning for `@zxing/library` and 13 audit findings; no
  native-binding error occurred.

## Files Outside `packages/stock-report`

- Three app shells: tabs, route/preload, surfaces, socket registries, styles,
  dependency declarations, and two new thin route pages.
- `packages/api-client`, `packages/lib`, `packages/realtime`, `packages/ui`,
  `packages/task-creation`, `packages/items`, and the two permitted
  `live_accrual_rate` fixture files.
- `architecture/04_api_client_local.md` and `package-lock.json`.
- This continuation additionally touches the three stock-report route pages,
  their new Playwright specs, `packages/api-client` (including its regression
  test), `packages/ui` (locked Back regression), and the task-creation
  candidate-gate/public form seam.

## Explicit non-stock-report repairs

- Corrected the stale comment in `packages/items/src/types.ts`: the item lookup
  does return `properties`.
- Corrected the two pre-existing `live_accrual_rate` fixtures in the workers
  step-budget test and item-economics budget-overrun test so root typecheck is
  green. These are unrelated to stock report.
