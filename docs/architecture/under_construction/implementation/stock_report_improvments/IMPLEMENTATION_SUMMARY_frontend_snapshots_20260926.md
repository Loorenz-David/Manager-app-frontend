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
- **API.** `fetchStockReportItems` sends `priority` (including `all`) and `missing_only`; new `fetchActiveStockReportVersion`, `fetchStockReportVersions` (offset pages), `createStockReportVersion` (no body), `fetchStockReportMissingSummary`, `setStockReportMissingQuantity` (absolute value). **Progress filter (added later on 2026-09-26, backend `_priority_filter.py`, not in the v4 handoff):** both version reads take the board's `priority` parameter to choose which snapshots `progress` sums — a comma list or `all` alone; *omitted means the null-priority snapshots only*. The frontend always sends it: `STOCK_REPORT_PROGRESS_PRIORITIES` (`high,medium,low`) is the default of `fetchActiveStockReportVersion` / `fetchStockReportVersions` and of their hooks, and the wire value is a trailing segment of `activeVersion()` / `versionList()` keys (the bare key stays the invalidation prefix). The Playwright mocks match the version reads by pathname because of the query string. Both reads also return **`filtered_snapshot_count`** (the stored `snapshot_count` under the same filter, deleted rows included); it is parsed but unread: the owner then chose the version cards' size line to be `progress.quantity_requested` (the units the filtered snapshots asked for, `formatVersionRequested` → "19 units requested"), so neither snapshot count is displayed. `POST /snapshots/versions` returns neither key. **Version bars are segmented** (owner, 2026-09-26): `StockVersionProgressBar` draws done → in progress → in queue → missing → open with `computeFulfilmentSegments` over the group's counters (`StockReportVersionGroupProgress.quantities`), thin and without numerals, because a group with work under way but nothing completed drew an empty track; the count beside it is still `quantity_completed / quantity_target`, and `percent` is `null` only for a group without a snapshot (a fully-missing group is 0 of 0 with an amber bar).
- **Actions.** Priority/reorder patch `snapshot.*`; an `all` list keeps a moved row. `useSetStockReportMissingQuantity` is optimistic, drops a cleared row from missing lists, toasts the backend sentence on 422. `useCreateStockReportVersion` removes the cached board and invalidates the version/summary keys.
- **Realtime.** `stock_report_item:updated` patches counters only (snapshot awaiting = row awaiting + resolved; converges in either event order). New `stock_report_item_snapshot:updated` moves/patches by `stock_report_item_id`, honours `all` and missing lists, sorts All lists rank → order → created_at. Version events invalidate. `@beyo/realtime` `socket-types.ts` updated.
- **Board.** The controller takes `{ mode: "board" | "missing" }`; missing mode opens on All with `missing_only=true`; no reorder in Unset or All; the priority label is per card (`card.hasPriority`).
- **Surfaces.** `stock-report-board-slide` (the board as a slide page, opened by the managers' hub; titled "Stock requested MM-DD" after the active version's `active_at`, read from the cached active-version query — owner, 2026-09-26), `stock-report-missing-slide`, `stock-report-version-history-slide`, `stock-report-detail-menu-sheet` (no header, `pb-4`), `stock-report-legend-sheet` (owner, 2026-09-26: the summary card no longer shows the legend inline — a right-aligned "Legend" control under the bar opens a headerless sheet that draws the same bar above one row per colour with its number, `remaining` from the bar's own arithmetic). The three slide pages hide the surface's fixed header on touch (`useHeaderlessSlidePage`) and render their own `StockReportSlideHeader` back row **inside the scroll content** (owner, 2026-09-26); `StockReportBoardView` has a `header` slot for it. The detail page keeps the surface header and puts a ⋮ there for admin/manager/worker, opening Mark / Unmark missing computed by `missingQuantityBounds`; it keeps the last row seen so it survives the row leaving a list.

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
