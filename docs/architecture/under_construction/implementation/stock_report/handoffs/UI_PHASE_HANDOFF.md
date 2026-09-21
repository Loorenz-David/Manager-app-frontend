# Stock Report — UI phase handoff to the logic session

**Written:** 2026-09-21 · **Phase:** session 1 of 2 (Claude, UI) → session 2 (Codex, logic)
**Authority followed:** `planning/intention.md` (RATIFIED), `ui_design_documentation/` (visual),
`architecture/*.md` (+ `_local`) via `task_system/frontend_contract_goal_mapping_guide.md`.

Everything below is **pure and prop-driven**. No component fetches, reads a role, opens a surface,
parses a response or holds server state. Every value arrives as a prop, every interaction leaves as
a callback. Your job is to build the view models, map them onto these props, and wire the callbacks.

---

## 1. What shipped

### `@beyo/ui` (two additions — nothing existing was restyled or forked)

| Item | Path |
|---|---|
| `FabMenu` primitive + `fabMenuActionOffset` | `packages/ui/src/components/primitives/fab-menu/` |
| `BoxSlidePickerOption.quiet` flag | `packages/ui/src/components/primitives/box-slide-picker/` |

The two existing FABs (`TaskCreationFab` in managers and sellers) were **not** migrated, as the
intention requires.

### `packages/stock-report/` (new)

Scaffolded per `35_shared_packages.md`: `package.json` with peers only, `tsconfig.json`,
`vitest.config.ts`, `src/index.ts`. Root `package.json` gained `test:stock-report` and a
`tsc -p packages/stock-report/tsconfig.json --noEmit` link in the `typecheck` chain.

```
src/
  index.ts                                   named exports only
  stock-report.types.ts                      shared value types
  lib/fulfilment-bar.ts        (+ .test.ts)  the bar arithmetic, pure
  lib/stock-report-theme.ts                  the three meaning-carrying colours, in one place
  fixtures/stock-report-fixtures.ts          one fixture per state in 05-ui-states.md
  components/board/                          picker, search row, card, list, skeleton, states, FAB, view
  components/detail/                         summary card, add-item, section header, list, states, view
  components/sheets/                         priority, actions, match-warning, match status row
  components/preview/StockReportFixturePreview.tsx      TEMPORARY — see §7
```

### Suites

| Command | Result |
|---|---|
| `npm run test:stock-report` | **67 passed** (8 files) |
| `npm run test:ui` | **192 passed** (36 files) |
| `npm run test:tasks` | **130 passed** (13 files) — unchanged, checked for regression |
| `npm run typecheck` | `packages/stock-report` and `packages/ui` both clean. **The chain itself fails earlier**, on two pre-existing errors in committed code this phase never touched — see §8. |

---

## 2. Components, props and callbacks

Prop types live beside their components and are all exported from `src/index.ts`.
`toXxxViewModel` and `StockReportItemViewModel` are yours (§12B B17); map them onto these.

### 2.1 Shared value types — `stock-report.types.ts`

```ts
const STOCK_NEED_BUCKETS = ["unset", "high", "medium", "low"] as const;   // as const, never a TS enum
type StockNeedBucket = "unset" | "high" | "medium" | "low";
const STOCK_NEED_BUCKET_LABEL: Record<StockNeedBucket, string>;

type FulfilmentQuantities = { requested: number; fulfilled: number; inProgress: number };

type StockNeedCardData = {
  stockNeedId: string;                 // the row's client_id — drag id and testid suffix
  title: string;                       // item_category.name
  imageUrl: string | null;             // item_category.image_url
  propertyTags: readonly string[];     // ALREADY FORMATTED — see §4
  quantities: FulfilmentQuantities;
};

type StockReportAssignmentCardData =
  Pick<TaskListCardProps, "taskId" | "task" | "item" | "imageUrl" | "statePill">;

type StockReportLoadStatus = "loading" | "error" | "ready";
```

`StockReportAssignmentCardData` is deliberately a `Pick` of `@beyo/tasks`'s own props so the two
cannot drift. `statePill` is optional: supply it to force a label/variant (that is how an
**unknown assignment state degrades to the neutral pill** per intention §8.1); leave it out and the
card derives one from `task.state`.

### 2.2 Board

**`StockReportBoardView`** — the whole board. Composes everything below.

| Prop | Type | What you must cause |
|---|---|---|
| `buckets` | `readonly StockNeedBucket[]` | the §5 row for the role: four for admin/manager/seller, `["high","medium","low"]` for workers |
| `bucket` | `StockNeedBucket` | the active bucket; opening rule (Unset, or High when Unset is empty; workers High) is yours |
| `onBucketChange` | `(b) => void` | issue that bucket's query; Unset **omits** the `priority` parameter |
| `searchValue` / `onSearchChange` | `string` / `(v) => void` | hold the value; it is inert today |
| `cards` | `readonly StockNeedCardData[]` | the backend's rows for that bucket, **in backend order** — do not re-sort |
| `status` | `StockReportLoadStatus` | `loading` → card skeletons, `error` → error state, `ready` → list or empty state |
| `errorMessage` / `onRetry` | `string?` / `() => void?` | mapped copy (`13_errors`), refetch |
| `onRefresh` | `() => Promise\|void` | refetch the active bucket (pull-to-refresh) |
| `onCardPress` | `(stockNeedId) => void` | open the detail slide — works in reorganise mode too |
| `canReorganise` | `boolean` | `canPrioritise`. `false` renders **no FAB at all** |
| `isReorganiseMode` / `onToggleReorganise` | `boolean` / `() => void` | package client state |
| `onSetPriority` | `(stockNeedId) => void` | open the priority sheet for that row |
| `onReorder` | `(stockNeedId, toIndex) => void` | **see the warning below** |
| `reorderDisabled` | `boolean?` | `true` while a reorder request is in flight (§12B B16) |

> ### ⚠ `onReorder`'s `toIndex` is a **0-based array index**
> It is the drop position in the list as rendered. The endpoint wants the **1-based**
> `priority_order` (intention §8.4), so you send `toIndex + 1`. A drop in place never fires the
> callback at all, so "one write per drop" holds without a guard on your side.

Behaviour already handled here, so you do not need to:
- `<PullToRefresh>` with **no `scrollRef`** (§12B B10 — the only package-legal scroll registration),
  `disabled` while reorganise mode is on so pull and drag never compete.
- `sortable` is derived internally: the **Unset bucket gets no handles**, only "Set priority".
- Outside reorganise mode no `DndContext` is mounted at all and no card shows a handle or a button.
- The dragged card keeps its place and takes the accent border + reduced opacity; the list reflows
  live with no drop indicator (design B2/B3).

**Smaller pieces**, all exported if you want them separately: `StockReportBucketPicker`,
`StockReportSearchRow`, `StockNeedCard`, `StockNeedCardSkeleton`, `StockNeedSortableList`,
`FulfilmentBar`, `FulfilmentLegend`, `StockNeedPropertyTags`, `StockNeedQuantityPanel`,
`StockReportBoardFab`, `StockReportBoardEmptyState`, `StockReportBoardErrorState`,
`StockReportBoardSkeleton`.

### 2.3 Detail

**`StockReportDetailView`**

| Prop | Type | What you must cause |
|---|---|---|
| `title`, `imageUrl`, `propertyTags`, `quantities` | — | the instance, resolved from the cached bucket lists (§12B B6) |
| `assignments` | `readonly StockReportAssignmentCardData[]` | the assignments query, all states as returned |
| `status`, `errorMessage`, `onRetry`, `onRefresh` | — | the **assignments** query only — see the note below |
| `canAssign` | `boolean` | `false` hides the Add-item button entirely |
| `onAddItem` | `() => void` | open task creation in stock-assignment mode |
| `onTapCard` | `(taskId) => void?` | **omit for workers** (§12B B8 defers their task detail) |
| `onTapImage` | `(taskId) => void?` | the image viewer, all three apps |
| `onTapActions` | `(taskId, itemId) => void?` | **omit for sellers** — no handler means no ⋮ is rendered |
| `isMissing` | `boolean?` | the "this stock need no longer exists" notice |

- **No back-arrow header bar** — the slide surface supplies the header. Set the title at runtime with
  `useSurfaceHeader().setTitle(categoryName)` (§12B B19). The summary card deliberately does not
  repeat the name.
- `status` describes **the assignments query alone**. The summary card comes from the board cache
  and stays on screen while the list loads, so the loading state reflects only the list. If the
  instance itself is not resolvable yet, render your own boundary above this view.
- Assignments are rendered with `TaskListCard` from `@beyo/tasks` **as-is**. It brings its own
  `mx-4` inset, which is this page's 16 px gutter, so the list adds no horizontal padding.

**Smaller pieces:** `StockNeedSummaryCard`, `StockReportAddItemButton`,
`StockReportSelectedItemsHeader`, `StockReportAssignmentList`, `StockReportAssignmentsEmptyState`,
`StockReportAssignmentListSkeleton`, `StockReportDetailErrorState`, `StockReportMissingNotice`.

### 2.4 Sheet **content** (you wrap each in a surface page — none is registered here)

**`StockReportPrioritySheetContent`** — `{ current: StockNeedBucket; onSelect: (p) => void; disabled?: boolean }`.
Four choices, the current one marked (`aria-pressed`). It reports **every** choice including the
current one; deciding that setting the same value is not sent (§8.4) is the action hook's.

**`StockReportActionsSheetContent`** — `{ onRemove: () => void; disabled?: boolean }`. One action,
"Remove from stock need", as a `ConfirmActionButton` ("Tap again to remove"), which is the confirm
step — no second surface (§12B B19). `onRemove` fires only after the second tap.

**`StockMatchWarningSheetContent`** — a discriminated union:

```ts
| { kind: "blocked"; reasonText: string; checkedAgainstStoredItem?: boolean; onChangeItem: () => void }
| { kind: "warning"; failures: readonly { label: string; explanation: string }[];
    checkedAgainstStoredItem?: boolean; onChangeItem: () => void; onContinue: () => void }
```

It receives **ready-made text**: mapping `refusal_reason` and `property_failures` through the closed
vocabularies is yours, with one renderer shared between the preview's answer and the create 422/409
(intention §8.5). It renders **no close affordance** — open it with `dismissible: false` (§12A A6,
§12B B7); its buttons are the visible way out `33_vaul_drawer.md` requires. `onContinue` is the
user's explicit override and must ride the **first** create call.

**`StockMatchStatusRow`** — `{ state: "idle" | "checking" | "mismatch-accepted"; onPress?: () => void }`.
`idle` renders `null`. `checking` is a spinner line (correct per `32_loading_skeletons.md` — unknown
duration, no layout to preview). `mismatch-accepted` is a quiet tappable line that should reopen the
sheet (§12A A6a). Insert it through the generic slot per §12B B12 (manager: inside the item
`ContentCard` above `ItemPositionZoneField`; worker: above `ItemQuantityField`) — inserting the slot
is your work; this phase did not touch `@beyo/task-creation` at all.

---

## 3. `data-testid` inventory

Convention `[feature]-[element-type]-[context]` per `34_runtime_validation_local.md`.

| Element | testid |
|---|---|
| Board root | `stock-report-board` |
| Bucket picker | `stock-report-bucket-picker`, indicator `…-indicator` (carries `data-quiet` when the active bucket is Unset) |
| One bucket pill | `stock-report-bucket-{unset\|high\|medium\|low}` |
| Search row / its input | `stock-report-search`, `stock-report-search-input` |
| Board list | `stock-report-board-list` |
| Board empty / error / retry | `stock-report-empty`, `stock-report-error`, `stock-report-error-retry` |
| Board skeleton / one card skeleton | `stock-report-board-skeleton`, `stock-need-card-skeleton` |
| Card root | `stock-need-card-{id}` (`data-dragging` while dragging) |
| Card body (tap target) | `stock-need-card-body-{id}` |
| Card drag handle | `stock-need-card-handle-{id}` |
| Card "Set priority" | `stock-need-card-set-priority-{id}` |
| Card quantity panel / its number | `stock-need-card-panel-{id}`, `…-panel-{id}-quantity` |
| Card tags / bar | `stock-need-card-tags-{id}`, `stock-need-card-bar-{id}` |
| Bar segments | `{bar-testid}-fulfilled`, `-in-progress`, `-remaining` |
| FAB / its one action | `stock-report-fab`, `stock-report-fab-action-reorganise` |
| Detail root | `stock-report-detail` |
| Summary card / panel / quantity / tags / bar | `stock-report-summary-card`, `-panel`, `-panel-quantity`, `-tags`, `-bar` |
| Legend | `stock-report-fulfilment-legend` |
| Add item | `stock-report-add-item` |
| Item count | `stock-report-assignment-count` |
| Assignment list | `stock-report-assignment-list` (rows keep `TaskListCard`'s own `tasks-card-{taskId}` ids) |
| Assignments empty / skeleton | `stock-report-assignments-empty`, `stock-report-assignments-skeleton` |
| Detail error / retry | `stock-report-detail-error`, `stock-report-detail-error-retry` |
| Gone notice | `stock-report-missing-notice` |
| Priority sheet / one choice | `stock-report-priority-sheet`, `stock-report-priority-{value}` |
| Actions sheet / remove | `stock-report-actions-sheet`, `stock-report-remove-assignment` |
| Match sheet | `stock-match-warning-blocked`, `stock-match-warning-warning` |
| Match failures / stored note | `stock-match-warning-failures`, `stock-match-stored-note` |
| Match buttons | `stock-match-change-item`, `stock-match-continue` |
| Match status row | `stock-match-status-row` (`data-state` = `checking` \| `mismatch-accepted`) |
| `FabMenu` generally | `{dataTestId}` and `{dataTestId}-action-{id}` |

---

## 4. What the UI deliberately does **not** do

- **It never formats criteria.** `propertyTags` is an already-formatted `readonly string[]`.
  Per intention §4.1: one tag per key, values joined with `" / "` and capitalised
  (`"Dark / Teak"`), a key whose value list is `null` produces **no** tag, keys in the order
  received. That mapping is yours, and no component compares properties with an item's.
- **It never maps a backend quantity.** `FulfilmentQuantities` takes three plain numbers. Per
  intention §4.3: `fulfilled = quantity_awaiting`,
  `inProgress = quantity_in_queue + quantity_in_progress`. `remaining` is computed inside the bar.
- **It never maps a reason code.** Both match-sheet views and the status row take finished copy.
- **It never decides a role.** `canReorganise`, `canAssign`, `buckets` and the presence of
  `onTapCard` / `onTapActions` are the only role-shaped inputs, and they are plain props.
- **It builds no surfaces, ids or loaders.** Sheet *content* only. Page-level components will need
  the loader-function treatment (`35_shared_packages §14`) when you add them; nothing exported today
  is a surface page, so `index.ts` exports components statically and correctly.
- It does not build the generic "Created — Add another / Done" prompt.

---

## 5. The bar arithmetic — reuse it, do not re-derive it

`computeFulfilmentSegments({ requested, fulfilled, inProgress })` in `lib/fulfilment-bar.ts` is the
single definition and is covered by 13 unit tests over design states A1–A7 plus the clamp.

- `remaining = max(0, requested − fulfilled − inProgress)`; negatives and non-finite inputs → 0.
- A zero segment is `null` — renders nothing, occupies no width.
- Each non-zero coloured segment keeps a **14 %** minimum.
- The coloured pair is scaled into an **84 %** budget while `remaining > 0` (100 % when it is 0), so
  the grey remainder always keeps room for its number.
- Over-fulfilment clamps at 100 % — the surplus is invisible, no indicator (A7, intention §6.3).
- `requested: 0` with coloured work present reads the proportions against the work itself rather
  than dividing by zero.

Exported as `computeFulfilmentSegments`, `SEGMENT_MIN_PERCENT`, `COLOURED_BUDGET_PERCENT`.

---

## 6. Literal values kept without a token

`@beyo/styles` has no blue accent (`--color-primary` is `#303030`), so the bar's two meaning-carrying
hues could not both be tokenised. **Owner decision, 2026-09-21:** use the repo's own values rather
than the mockup's. All of them live in `lib/stock-report-theme.ts` as complete class strings.

| Mockup | Ships as | Note |
|---|---|---|
| `#2f6ee0` fulfilled / accent | **`#1f5ea8`** — the only literal | the blue `StatePill`'s `active` variant already uses |
| `#b5801f` in progress | `var(--color-warning)` | token |
| `#ededee` bar track | `var(--color-light-border)` | token |
| `#dcdcde` legend "remaining" swatch | `var(--color-muted)` | token |
| `#e0e0e2` full-bleed divider | `var(--color-between-border)` | token |
| `#e6e6e8` card border, `#ededee` inner rule | `var(--color-border)`, `var(--color-light-border)` | token |
| `#f4f4f5` property tag background | `var(--color-soft-container)` | token |
| `#b9c4d6` dashed Add-item border | `var(--color-border)` | token; the mockup's bluish dashed line becomes the system's neutral one |
| `#6b6b70` / `#63636a` / `#5f5f66` inks | `var(--color-muted-foreground)` | the mockup's four-step grey ramp collapses to the system's three |

Arbitrary Tailwind values used for geometry with no token, each carrying the comment
`14_styling.md` rule 3 requires:

| Value | Where | Why |
|---|---|---|
| `h-[22px]` | summary bar height | no spacing token lands on 22 px |
| `w-[5.125rem]` | summary quantity panel (82 px) | no width token lands on 82 px |
| `rounded-[1.125rem]` | summary card (18 px) | sits between `rounded-2xl` (16) and `rounded-3xl` (24) |
| `text-[1.625rem]` | summary numeral (26 px) | between `text-2xl` and `text-3xl` |
| `text-[11px]`, `text-[13px]`, `text-[15px]` | bar numbers, item count, section label | the design's small ramp has no token equivalents |
| `rounded-[10px]` | category picture frame | between `rounded-lg` and `rounded-xl` |
| `size-[18px]` | drag-handle glyph | the design's handle size |
| `bg-[#1f5ea8]`, `border-[#1f5ea8]` | bar / drag accent | the one literal above |

---

## 7. The temporary preview — exactly what to remove

| File | Action |
|---|---|
| `packages/stock-report/src/components/preview/StockReportFixturePreview.tsx` | **delete** |
| `packages/stock-report/src/index.ts` — the final `StockReportFixturePreview` export block | **delete** (the comment above it marks it) |
| `apps/managers-app/.../src/pages/stock-report/StockReportPage.tsx` | **rewrite**: swap the lazy preview import for `loadStockReportRouteEntryPage()`; keep the file, its path and the `PageSkeleton` fallback |
| `apps/managers-app/.../src/lib/routes.ts` — the TEMPORARY comment above `stockReport` | **delete the comment**, keep the route |

Everything else in the managers app **stays** and is the real wiring: `ROUTES.stockReport`
(`/stock-needs`), `TAB_ORDER`, `MORE_TABS`, `TAB_ROUTES` in `router.tsx`, `stockReportPageRoute` +
both records in `primary-tab-preload.ts`, the `TABS` entry and `MORE_TAB_META` in `BottomTabBar.tsx`,
the `MORE_TAB_META` entry in `MoreTabsPopup.tsx`, `"@beyo/stock-report": "*"` in `package.json`, and
`@source "../../../../packages/stock-report/src";` in `index.css`.

`src/fixtures/stock-report-fixtures.ts` is **not** temporary — it is the component tests' input and
should stay.

Two notes on the preview's own shape, so you do not mistake them for design:
- the detail is shown as an in-page panel with a temporary back control. In the product it is a slide
  surface whose own header carries the title and the way back. **This page must never grow a
  back-arrow bar of its own** (intention §6.3).
- the sheets are shown in a plain bottom panel and are dismissible there. The match sheet ships
  locked (§12A A6, §12B B7).

### Labels

The More popup entry reads **"Stock needs"**. The bottom bar's compact chip reads **"Stock"** — that
column is `text-xs` and roughly 60 px wide, and the full label wraps there. If you would rather both
read the same, the chip is in `BottomTabBar.tsx`'s `TABS` array. While adding the tab, `MORE_TAB_META`
in that file was changed from positional (`TABS[3]`, `TABS[4]`, `TABS[5]`) to a path keyed lookup, so
the next More tab cannot silently shift someone else's icon.

---

## 8. Things you should know before you start

1. **`npm run typecheck` currently fails before it reaches the packages**, on two errors in
   committed code this phase never touched — both are the same in-flight `live_accrual_rate`
   change: `apps/workers-app/.../task_steps/domain/step-budget.test.ts:59` and
   `packages/item-economics/src/components/task-budget-overrun/TaskBudgetOverrunBand.test.tsx:61`
   (a required `live_accrual_rate` missing from two test fixtures). Run the package half by hand
   until they are fixed; `packages/stock-report` and `packages/ui` are both clean.
2. **`PullToRefresh` swallows synthetic clicks.** Its `useDrag` binding has `filterTaps: true`, so
   `userEvent.click` inside it does nothing in jsdom — and Playwright's `click()` does nothing inside
   it on the mobile project. In Vitest use `fireEvent.click`; in Playwright use `tap()` / `press()`.
   Both board and detail views are inside one, so this affects every interaction on them. The two
   view tests carry a `tapInsidePullContainer` helper you can copy.
3. **`packages/stock-report/vitest.config.ts` shims `VITE_API_URL`.** Importing `@beyo/tasks` reaches
   `@beyo/api-client`, which validates its environment at import time — same `define` as
   `packages/item-economics/vitest.config.ts`.
4. **`@beyo/ui` exports `BoxSlidePickerOption` as a component**; the option *type* is
   `BoxSlidePickerOptionType`.
5. **Sellers still need the three `@dnd-kit/*` dependencies** (intention §7) — the package declares
   them as peers and the sellers app does not have them yet. Managers and workers already do.
6. `npm install` linked the workspace cleanly; the lockfile diff is only the new package. The
   `lightningcss-darwin-arm64` binding is absent from `node_modules`, but it was absent before this
   phase too — if a build hits "Cannot find native binding", that is the known rolldown /
   lightningcss lockfile issue, not this package.

---

## 9. Design deviations, each traced

Every departure from `ui_design_documentation/` is one the owner already made in intention §6.3,
with one addition of my own noted at the end.

| Mockup | Ships | Authority |
|---|---|---|
| Sort button | hidden | §6.3 |
| Filter button (+ count badge) | hidden | §6.3 (card 6 → B) |
| Whole card draggable, always | handle only, reorganise mode only | §6.3 |
| No way to set priority | per-card button + four-choice sheet | §6.3 |
| Live search | visible, unwired, value held | §6.3 |
| Back-arrow header bar | the slide surface's own header | §6.3 (card 8) |
| ⋮ = the task menu | this page's own menu with Remove | §6.3 (card 5) |
| CSS-drawn furniture type icons | the item category's picture, `BackendImage` + `ImagePlaceholder` | §6.3 (card 10) |
| Over-fulfilment undefined (A7) | the bar clamps at 100 %, no indicator, the row stays listed | §6.3 closing note |
| Item status vocabulary `Working`/`Assigned`/`Pending` | `TaskListCard`'s real vocabulary | §6.2 (design ambiguities 6–8: reuse, do not invent) |
| No loading or error states | card-shaped skeletons + the app's error pattern | design ambiguity 12 |
| No keyboard path for reordering | dnd-kit `KeyboardSensor` + `sortableKeyboardCoordinates` | design ambiguity 11, §6.1 |
| No pull-to-refresh | `PullToRefresh` on both views | §12B B10 |
| Mockup colour literals | the repo's tokens plus one literal | §6 above, owner 2026-09-21 |

**Mine, and small:** the category picture is framed as a 40 px (card) / 44 px (summary) rounded
square with a hairline border rather than sitting bare, so a photograph reads as an icon slot at the
size the design reserved; the frame border is what takes the accent while the card is dragged. The
`FabMenu` places a lone action straight up rather than at the arc's midpoint — with one action there
is no arc to spread across, and the diagonal reads as an accident.

---

## 10. Verification status

**Automated:** `test:stock-report` 67 passed, `test:ui` 192 passed, `test:tasks` 130 passed (no
regression), `tsc` clean on both packages touched. The component tests cover the states that carry
logic: bar segments and the budget/minimum rules, singular vs plural item count, the quiet Unset
pill, handle presence by mode and by bucket, ⋮ presence by handler, Add-item presence by capability,
the blocked vs warning sheet, and the three status-row looks.

**Seen running:** the board, in the managers app at phone width — bucket picker with Unset quiet and
High filled, the search row without sort or filter, the full-bleed divider, five cards with correct
bar segments across states A1–A4, and the FAB.

**Left to the owner (2026-09-21):** `ui_design_documentation/08-implementation-checklist.md` is being
walked manually against the preview. The items that genuinely need a device rather than a DOM are
the drag feel (a touch off the handle must scroll, never drag), the 44 px handle target, tag and
legend wrapping at narrow widths, and the detail page and both sheets in motion. **No checklist walk
document exists yet** — add one here, or fold the owner's notes into a corrections plan.
