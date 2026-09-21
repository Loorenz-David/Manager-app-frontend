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

## Verification

- `npm run test:stock-report` — 69 passed.
- `npm run test:ui` — 192 passed.
- `npm run test:api-client` — 3 passed.
- `npm run test:realtime` — 5 passed.
- `npm run test:tasks` — 130 passed.
- `npm run test:task-creation` — 126 passed.
- `npm run typecheck` — passed.
- Managers, sellers, and workers production builds passed. No dev server was
  started.

## Backend Follow-ups

- `item_category.image_url` is read nullishly and falls back to the placeholder.
- Match-preview response field names and envelope remain isolated in
  `packages/stock-report/src/api/stock-report-api.ts`.
- The backend's final nullability handoff may tighten schemas in
  `packages/stock-report/src/stock-report.types.ts`.

## Deviations / Remaining Verification

- **This checkpoint is not feature-complete.** The generic task-creation seam
  exists, but stock match-preview is not yet connected to identifier/category/
  quantity changes, its status slot, locked warning-sheet choices, or the
  accepted-override flag on the initial assignment request.
- Detail task/image opener injection and assignment-card mapping need final
  app-specific wiring. The worker body-tap restriction is present, but the
  corresponding managers/sellers openers must be completed and exercised.
- The match-warning surface is registered and lock-capable, but its runtime
  props/callback flow needs completion before it can enforce Change item /
  Continue behavior.
- Dedicated MSW coverage for API adapters, mutations, controller opening rules,
  optimistic rollback, and cache convergence remains to be written.
- Playwright stock-report specifications and the requested mutation/guard
  campaign were not run in this session; they remain required before declaring
  the phase fully verified.
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
