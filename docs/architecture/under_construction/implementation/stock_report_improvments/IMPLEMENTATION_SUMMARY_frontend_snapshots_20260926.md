---
audience: frontend / owner
subject: Stock report — snapshot layer, versions and missing quantity, as implemented on the frontend
date: 2026-09-26
contract: HANDOFF_TO_FRONTEND_stock_report_snapshots_20260926.md (+ `priority=all`, added by the backend on request the same day)
---

# What changed

## `@beyo/stock-report` (shared by managers, workers, sellers)

- **Schema.** `StockReportItemSchema` lost `priority` / `priority_order` and gained `snapshot` (§6.6; nullable only for the never-sent `live_stock` read) plus the §6.1 row fields. New `StockReportSnapshotVersionSchema` (§6.7 + `progress` §6.8) and `StockReportMissingSummarySchema`. The view model reads the **snapshot** — frozen `quantity_requested`, awaiting including resolved — and drops a row without one.
- **Bar.** `FulfilmentQuantities` gained `missing`; order is fulfilled → in progress → in queue → **missing** → remaining. Queue is teal `#11827a`; missing wears the amber `#d99e0b` that used to be the queue's. Legend gained "Missing"; the `in_queue` assignment pill is `standby` now (no teal pill exists — owner may flip).
- **Keys.** `list(bucket, filter)` = `[…, bucket, majorCategory|"all", "board"|"missing"]`; new `versionList()`, `activeVersion()`, `missingSummary()`. `StockReportBoardBucket` adds `"all"` (board-only; the priority sheet keeps four).
- **API.** `fetchStockReportItems` sends `priority` (including `all`) and `missing_only`; new `fetchActiveStockReportVersion`, `fetchStockReportVersions` (offset pages), `createStockReportVersion` (no body), `fetchStockReportMissingSummary`, `setStockReportMissingQuantity` (absolute value).
- **Actions.** Priority/reorder patch `snapshot.*`; an `all` list keeps a moved row. `useSetStockReportMissingQuantity` is optimistic, drops a cleared row from missing lists, toasts the backend sentence on 422. `useCreateStockReportVersion` removes the cached board and invalidates the version/summary keys.
- **Realtime.** `stock_report_item:updated` patches counters only (snapshot awaiting = row awaiting + resolved; converges in either event order). New `stock_report_item_snapshot:updated` moves/patches by `stock_report_item_id`, honours `all` and missing lists, sorts All lists rank → order → created_at. Version events invalidate. `@beyo/realtime` `socket-types.ts` updated.
- **Board.** The controller takes `{ mode: "board" | "missing" }`; missing mode opens on All with `missing_only=true`; no reorder in Unset or All; the priority label is per card (`card.hasPriority`).
- **Surfaces.** `stock-report-board-slide` (the board as a slide page, opened by the managers' hub), `stock-report-missing-slide`, `stock-report-version-history-slide`, `stock-report-detail-menu-sheet`. The three slide pages hide the surface's fixed header on touch (`useHeaderlessSlidePage`) and render their own `StockReportSlideHeader` back row **inside the scroll content** (owner, 2026-09-26); `StockReportBoardView` has a `header` slot for it. The detail page keeps the surface header and puts a ⋮ there for admin/manager/worker, opening Mark / Unmark missing computed by `missingQuantityBounds`; it keeps the last row seen so it survives the row leaving a list.

## Managers app (`src/features/stock-report/`)

- The earlier hub → board **slide stack was removed** (owner, 2026-09-26): the tab renders `StockReportHub` directly and every destination is a slide page surface.
- `use-stock-report-hub-controller` composes the active version, the missing summary and the create mutation, preloads the three slides, and exposes `openBoard` / `openMissing` / `openHistory`; navigation on success is the caller's (`createVersion(onCreated)`).
- Hub layout: `StockVersionProgressCard` (age counted forward, three bars by priority; tap → board slide) → `StockMissingRow` (amber, only when total > 0; → missing slide) → `[New version (tap-again, "Confirm Tap")] [History]`.
- `StockVersionCreateOverlay` blocks the tab while creating; on success the board slide opens and fetches the new version's snapshots (the action dropped the cached lists).

# Verified

- `npm run test:stock-report`: 27 files, 215 tests green. Managers `src/features/stock-report`: 11 tests green. Realtime package tests green. Managers eslint clean on the feature.
- `tsc` clean for `packages/stock-report`, `packages/realtime`, workers and sellers apps; the managers app has only the pre-existing `CaseTaskInfoCard` `StatePillVariant` error.
- **Not run:** the rewritten Playwright spec (needs a dev server and `PLAYWRIGHT_TEST_EMAIL/PASSWORD`); device checks for the FAB inside the missing slide and swipe-back vs reorder drags.

# Not built (by decision)

`live_stock`, `apply-priorities` (history cards are read-only), `item_category_ids`, text search, closed-version snapshot read.
