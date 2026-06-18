# PLAN_upholstery_inventory_bugfix_ui_01_20260618

## Metadata

- Plan ID: `PLAN_upholstery_inventory_bugfix_ui_01_20260618`
- Status: `archived`
- Owner agent: `claude-opus-4-8`
- Created at (UTC): `2026-06-18T00:00:00Z`
- Last updated at (UTC): `2026-06-18T15:27:14Z`
- Related issue/ticket: n/a
- Intention plan: `docs/architecture/under_construction/upholstery_inventory_2.md`
- Source review: `docs/architecture/implemented_summaries/SUMMARY_upholstery_inventory_20260618.md`

## Goal and intent

- Goal: Apply six post-implementation bug fixes, four targeted UI corrections, and a complete filter-system rework driven by a backend param change.
- Business/user intent: The backend removed `inventory_condition` from the list endpoint and replaced multi-condition filtering with a single-select quick-filter (Favorites / In Stock / Out of Stock). The new UX pre-loads all three filter queries at mount (so each list is ready before the user taps a pill) and slides the list view left/right on filter change, exactly mirroring the upholstery picker. On top of that, fix a data-corruption bug on failed delete, a false empty-state flash, a silent save failure, a test gap, and a precision issue — then improve card readability (ordered amount), detail header identity (circular avatar), detail body layout (single ContentCard), and footer CTA label.
- Non-goals: No new surfaces, no new query keys beyond the three pre-loaded filter queries, no changes to any feature outside `features/upholstery-inventory/`.

## Scope

- In scope:
  - All changes are confined to `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery-inventory/`.
  - `flows/use-inventory-list-page.flow.ts` is deleted; its logic is absorbed by the rewritten controller.
  - `use-list-upholstery-inventories-query.ts` is converted from `useInfiniteQuery` to `useQuery` (matching the picker pattern; pagination is dropped in favour of pre-loaded filter queries).
  - The `InventoryDetailFooter` "Edit" button is relabelled and its action cleared — the future action is explicitly deferred.
- Out of scope:
  - History section contents (remains a placeholder).
  - `StoredAmountSheetPage` keyboard/UX rework.
  - Any route, surface, or navigation change.
- Assumptions:
  - `apiClient.get` accepts `boolean | undefined` query-param values (confirmed: `Record<string, string | number | boolean | undefined>`).
  - `InventoryListCardViewModel` adding `orderedDisplay` is a non-breaking additive change (no callers outside `InventoryListCard.tsx` consume that field).
  - `InventoryQuantityOverview` and `InventoryHistorySection` removing their own `ContentCard` wrapper is safe because their only caller is `UpholsteryInventoryDetailSlidePage.tsx`, which will provide the single wrapping card.
  - `ImagePlaceholder` from `@/components/primitives` is safe for the circular avatar fallback (already used in `InventoryListCard.tsx`).
  - The default active filter is `"in_stock"` (most operationally relevant for inventory management).

## Clarifications required

_(none — all changes are self-contained and mechanically specified below)_

## Acceptance criteria

1. Deleting an inventory from the detail actions sheet closes both surfaces and removes the detail cache entry only on success; a failed delete leaves the cache intact and re-enables the button with no error flash on the still-open detail slide.
2. Opening the inventory list page shows the loading skeleton immediately (no false "No upholstery inventories found." flash before data arrives).
3. A failed save in `StoredAmountSheetPage` shows an inline error message ("Could not save. Please try again.") and keeps the sheet open.
4. `npm run test:unit -- upholstery-inventory` passes with the `itemUpholsteryKeys.all` assertion present.
5. Three filter pills — "Favorites", "In Stock", "Out of Stock" — render below the search bar; only one can be selected at a time; tapping a pill fires an x-axis slide animation to the new filter's list.
6. On page load, three queries are pre-fetched in parallel (favorites, in-stock, out-of-stock) so each filter's list is immediately available without a network round-trip when the pill is tapped.
7. When search text is non-empty, filter pills are disabled (pointer-events-none); clearing search restores the active filter's pre-loaded list without a new network request.
8. `formatMeters` makes the decimal-to-float boundary explicit; no change in display output for values under `10^12` meters.
9. The inventory list card shows a secondary "Ordered: X m" line beside the stored amount when `current_amount_ordered_meters > 0`.
10. The detail header shows a circular avatar (image or `ImagePlaceholder` fallback, `size-12`) to the left of the name and code.
11. The detail body renders one single `ContentCard` wrapping both the quantity overview and the history section.
12. The detail footer's second action button reads "Edit" and performs no action (no `openStoredAmountEditor` call).

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: mutation `onSuccess` / `onSettled` semantics — `onSuccess` fires only on success, `onSettled` fires on both. `useQuery` vs `useInfiniteQuery` — regular query for pre-loaded filter lists.
- `architecture/08_hooks.md`: mutation hook shape, invalidation ownership.
- `architecture/07_components.md`: ContentCard as a layout wrapper; `ImagePlaceholder` for absent images.
- `architecture/02_types.md`: view-model transformer ownership (`toInventoryListCardViewModel`).

### File read intent — pattern vs. relational

All reads performed (relational — understanding what exists):

- `features/upholstery/controllers/use-upholstery-picker.controller.ts`: canonical multi-query preload pattern — `FILTER_INDEXES`, `previousFilterIndexRef`, `direction` state, `handleFilterChange`, `getActiveQueryResult`, per-filter `refetch`. Default filter: `"favorite"`.
- `features/upholstery/pages/UpholsteryPickerSlidePage.tsx`: `AnimatePresence custom={controller.direction} initial={false} mode="sync"` wrapping `m.div` keyed on `controller.activeFilter`; `bodyVariants` enter/center/exit using x-axis `"100%"` / `"-100%"`; `indicatorOffset={144}`, `pt-36`.
- `features/upholstery/components/UpholsteryPickerHeader.tsx`: `BoxPicker mode="single"`, `isFilterDisabled` when search active (pointer-events-none + opacity-60 className), same pill CSS classes.
- `features/upholstery/types.ts`: `UpholsteryQuickFilter`, `UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS` shape (exact labels: Favorites / In Stock / Out of Stock).
- `features/upholstery/api/fetch-upholstery-picker-options.ts`: passes `in_stock`/`favorite` booleans directly to `apiClient.get`; confirmed the client accepts `boolean | undefined`.
- `features/upholstery/api/use-upholstery-picker-options.ts`: uses `useQuery` (not infinite); `queryKey: upholsteryKeys.pickerList(params)`.
- `features/upholstery-inventory/types.ts`: existing filter types, `ListUpholsteryInventoriesParams`, view-model shapes.
- `features/upholstery-inventory/api/list-upholstery-inventories.ts`: current `inventory_condition` param building.
- `features/upholstery-inventory/api/use-list-upholstery-inventories-query.ts`: `useInfiniteQuery` with `PAGE_LIMIT = 25`.
- `features/upholstery-inventory/flows/use-inventory-list-page.flow.ts`: debounce + conditions-join + infinite query + `useDelayedTrue`. To be deleted.
- `features/upholstery-inventory/controllers/use-inventory-list.controller.ts`: current `conditions[]` state, flow call, `setConditions`.
- `features/upholstery-inventory/components/InventoryListHeader.tsx`: `BoxPicker mode="multiple"`, inline label ternary with "Out" bug.
- `features/upholstery-inventory/components/InventoryListView.tsx`: existing scroll layout, `pt-28 / indicatorOffset={128}`, load-more button, `!controller.isLoading` empty-state guard.
- `features/upholstery-inventory/providers/InventoryListViewProvider.tsx`: thin wrapper around `useInventoryListController`; no changes needed.
- `features/upholstery-inventory/components/InventoryDetailHeader.tsx`: confirms `detail.imageUrl` available via context.
- `features/upholstery-inventory/components/InventoryHistorySection.tsx`: wraps itself in `ContentCard`.
- `features/upholstery-inventory/components/InventoryQuantityOverview.tsx`: wraps itself in `ContentCard`.
- `features/upholstery-inventory/pages/UpholsteryInventoryDetailSlidePage.tsx`: `<div className="flex flex-col gap-4 px-4">` wrapper around both sections.
- `features/upholstery/components/UpholsteryCard.tsx`: circular avatar pattern.
- `features/upholstery-inventory/actions/use-delete-upholstery-inventory.ts`: `removeQueries` in `onSettled`.
- `features/upholstery-inventory/lib/decimal.ts`: `toNumber()` usage in `formatMeters`.
- `features/upholstery-inventory/lib/invalidate-inventory.test.ts`: missing `itemUpholsteryKeys.all` assertion.

### Skill selection

- Primary skill: `skills/cross_cutting/intention_planning/SKILL.md` (scoped bugfix + UI correction plan).

## Implementation plan

Steps 1–2 address view-model / decimal primitives. Steps 3–9 replace the filter system top-to-bottom: types → API → query hook → flow deletion → controller → header → view. Steps 10–18 are the original bug fixes and UI corrections unchanged.

---

### Step 1 — `features/upholstery-inventory/types.ts` — add `orderedDisplay` to list card view model

**What to change:**

Add `orderedDisplay: string | null` to `InventoryListCardViewModel`:

```ts
export type InventoryListCardViewModel = {
  inventoryId: UpholsteryInventoryId;
  name: string;
  code: string;
  imageUrl: string | null;
  storedDisplay: string;
  orderedDisplay: string | null;      // ← add
  condition: InventoryConditionPresentation;
};
```

Update `toInventoryListCardViewModel` to populate it:

```ts
orderedDisplay: isPositive(item.current_amount_ordered_meters)
  ? (formatMeters(item.current_amount_ordered_meters) ?? null)
  : null,
```

Rule: `orderedDisplay` is non-null only when `current_amount_ordered_meters > 0` (decimal comparison via `isPositive`). Returns `null` when null, zero, or non-parseable.

---

### Step 2 — `features/upholstery-inventory/lib/decimal.ts` — make float boundary explicit in `formatMeters`

Replace the offending line:

```ts
// before
return `${metersFormatter.format(decimal.toNumber())} m`;

// after
return `${metersFormatter.format(Number(decimal.toDecimalPlaces(3).toFixed(3)))} m`;
```

`toDecimalPlaces(3)` rounds using Decimal arithmetic; `toFixed(3)` serialises to a bounded 3-decimal string; `Number(...)` converts at that boundary. No display change for realistic inventory values.

---

### Step 3 — `features/upholstery-inventory/types.ts` — replace `InventoryFilterCondition` with `InventoryQuickFilter`, update `ListUpholsteryInventoriesParams`

**Remove these entirely:**

```ts
export const INVENTORY_FILTER_CONDITIONS = [...INVENTORY_CONDITIONS, "ordered"] as const;
export type InventoryFilterCondition = (typeof INVENTORY_FILTER_CONDITIONS)[number];
```

**Add:**

```ts
export type InventoryQuickFilter = "favorite" | "in_stock" | "out_of_stock";

export const INVENTORY_QUICK_FILTER_OPTIONS: {
  value: InventoryQuickFilter;
  label: string;
}[] = [
  { value: "favorite", label: "Favorites" },
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export const INVENTORY_FILTER_INDEXES: Record<InventoryQuickFilter, number> = {
  favorite: 0,
  in_stock: 1,
  out_of_stock: 2,
};
```

**Replace `inventory_condition` in `ListUpholsteryInventoriesParams`:**

```ts
// before
export type ListUpholsteryInventoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  inventory_condition?: string;
};

// after
export type ListUpholsteryInventoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  in_stock?: boolean;
  favorite?: boolean;
};
```

**Fix `InventoryDetailViewModel.condition` to use `InventoryConditionPresentation` directly** (removes the local inline type that referenced the now-deleted `InventoryFilterCondition`):

```ts
// before
export type InventoryDetailViewModel = {
  ...
  condition: {
    key: InventoryFilterCondition;
    label: string;
    variant: StatePillVariant;
  };
  ...
};

// after
export type InventoryDetailViewModel = {
  ...
  condition: InventoryConditionPresentation;
  ...
};
```

Remove `import type { StatePillVariant }` if it becomes unused after this change.

---

### Step 4 — `features/upholstery-inventory/api/list-upholstery-inventories.ts` — replace `inventory_condition` param with `in_stock` / `favorite`

Rewrite the function body to follow the picker API pattern:

```ts
export async function listUpholsteryInventories(
  params: ListUpholsteryInventoriesParams,
): Promise<ListUpholsteryInventoriesResult> {
  const parsed = await apiClient.get(
    "/api/v1/upholstery-inventories",
    ListUpholsteryInventoriesResponseSchema,
    {
      limit: params.limit,
      offset: params.offset,
      q: params.q || undefined,
      in_stock: params.in_stock,
      favorite: params.favorite,
    },
  );

  return parsed.data.upholstery_inventories_pagination;
}
```

`apiClient.get` accepts `Record<string, string | number | boolean | undefined>` — booleans and undefined values are handled natively (confirmed in `fetch-upholstery-picker-options.ts`). Remove the old `queryParams` object entirely.

---

### Step 5 — `features/upholstery-inventory/api/use-list-upholstery-inventories-query.ts` — switch from `useInfiniteQuery` to `useQuery`

Replace the entire file:

```ts
import { useQuery } from "@tanstack/react-query";

import { upholsteryInventoryKeys } from "@/features/upholstery/api/upholstery-keys";

import { listUpholsteryInventories } from "./list-upholstery-inventories";
import type { ListUpholsteryInventoriesParams } from "../types";

const LIST_LIMIT = 50;

export function useListUpholsteryInventoriesQuery(
  params: Omit<ListUpholsteryInventoriesParams, "limit" | "offset"> = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryInventoryKeys.list({ ...params, limit: LIST_LIMIT }),
    queryFn: () =>
      listUpholsteryInventories({ ...params, limit: LIST_LIMIT, offset: 0 }),
    enabled: options.enabled ?? true,
  });
}
```

`LIST_LIMIT = 50` matches the picker. Remove `keepPreviousData`, `useInfiniteQuery`, `PAGE_LIMIT`, and the `loadMore` helper — infinite pagination is dropped.

---

### Step 6 — `features/upholstery-inventory/flows/use-inventory-list-page.flow.ts` — delete file

Delete this file entirely. `useInventoryListPageFlow`, `InventoryListPageFlow`, and `useDelayedTrue` are no longer exported or needed. All logic (debounce, three queries, direction, filter state) moves into the controller (step 7).

The only importer of this module is the controller (which is fully rewritten in step 7).

---

### Step 7 — `features/upholstery-inventory/controllers/use-inventory-list.controller.ts` — rewrite with three-query preload pattern

Replace the entire file. Modelled directly on `use-upholstery-picker.controller.ts`:

```ts
import { useEffect, useRef, useState } from "react";

import { useSurfaceStore } from "@/providers/SurfaceProvider";
import type { UpholsteryInventoryId } from "@/types/common";

import { useListUpholsteryInventoriesQuery } from "../api/use-list-upholstery-inventories-query";
import {
  INVENTORY_CARD_ACTIONS_SHEET_ID,
  INVENTORY_DETAIL_SLIDE_ID,
  type InventoryCardActionsSurfaceProps,
  type InventoryDetailSurfaceProps,
} from "../surfaces";
import {
  INVENTORY_FILTER_INDEXES,
  INVENTORY_QUICK_FILTER_OPTIONS,
  toInventoryListCardViewModel,
  type InventoryQuickFilter,
} from "../types";

const FILTER_INDEXES = INVENTORY_FILTER_INDEXES;

export function useInventoryListController() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [activeFilter, setActiveFilter] =
    useState<InventoryQuickFilter>("in_stock");
  const previousFilterIndexRef = useRef(FILTER_INDEXES.in_stock);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Debounce raw search query
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => window.clearTimeout(timeout);
  }, [q]);

  const isSearchActive = debouncedQ.trim().length > 0;
  // Disable pills immediately when the user starts typing (before debounce settles)
  const isFilterDisabled = q.trim().length > 0;

  // Three pre-loaded queries — all three fire at mount
  const inStockQuery = useListUpholsteryInventoriesQuery({ in_stock: true });
  const outOfStockQuery = useListUpholsteryInventoriesQuery({ in_stock: false });
  const favoritesQuery = useListUpholsteryInventoriesQuery({ favorite: true });

  // Search query — only enabled when search is active
  const searchQuery = useListUpholsteryInventoriesQuery(
    { q: debouncedQ || undefined },
    { enabled: isSearchActive },
  );

  function handleFilterChange(nextFilter: InventoryQuickFilter): void {
    const nextIndex = FILTER_INDEXES[nextFilter];
    const previousIndex = previousFilterIndexRef.current;

    if (nextIndex !== previousIndex) {
      setDirection(nextIndex > previousIndex ? 1 : -1);
      previousFilterIndexRef.current = nextIndex;
    }

    setActiveFilter(nextFilter);
  }

  function getActiveQueryResult() {
    if (isSearchActive) {
      return {
        items: searchQuery.data?.items ?? [],
        isLoading: searchQuery.isPending,
        isFetched: searchQuery.isFetched,
      };
    }

    switch (activeFilter) {
      case "out_of_stock":
        return {
          items: outOfStockQuery.data?.items ?? [],
          isLoading: outOfStockQuery.isPending,
          isFetched: outOfStockQuery.isFetched,
        };
      case "favorite":
        return {
          items: favoritesQuery.data?.items ?? [],
          isLoading: favoritesQuery.isPending,
          isFetched: favoritesQuery.isFetched,
        };
      case "in_stock":
      default:
        return {
          items: inStockQuery.data?.items ?? [],
          isLoading: inStockQuery.isPending,
          isFetched: inStockQuery.isFetched,
        };
    }
  }

  const { items, isLoading, isFetched } = getActiveQueryResult();
  const cards = items.map(toInventoryListCardViewModel);

  async function refetch(): Promise<void> {
    if (isSearchActive) {
      await searchQuery.refetch();
      return;
    }
    switch (activeFilter) {
      case "out_of_stock":
        await outOfStockQuery.refetch();
        return;
      case "favorite":
        await favoritesQuery.refetch();
        return;
      case "in_stock":
      default:
        await inStockQuery.refetch();
        return;
    }
  }

  function openDetail(inventoryId: UpholsteryInventoryId): void {
    useSurfaceStore.getState().open(INVENTORY_DETAIL_SLIDE_ID, {
      inventoryId,
    } satisfies InventoryDetailSurfaceProps);
  }

  function openCardActions(inventoryId: UpholsteryInventoryId): void {
    useSurfaceStore.getState().open(INVENTORY_CARD_ACTIONS_SHEET_ID, {
      inventoryId,
    } satisfies InventoryCardActionsSurfaceProps);
  }

  return {
    q,
    activeFilter,
    direction,
    filterOptions: INVENTORY_QUICK_FILTER_OPTIONS,
    isSearchActive,
    isFilterDisabled,
    cards,
    isLoading,
    isFetched,
    setQ,
    onFilterChange: handleFilterChange,
    refetch,
    openDetail,
    openCardActions,
  };
}

export type InventoryListController = ReturnType<
  typeof useInventoryListController
>;
```

**Removed from controller return:** `conditions`, `setConditions`, `activeFilterCount`, `hasMore`, `isFetchingMore`, `loadMore`. The view must not reference these any longer.

---

### Step 8 — `features/upholstery-inventory/components/InventoryListHeader.tsx` — single-select pills, new props

Replace the entire file:

```tsx
import { cn } from "@beyo/lib";

import {
  BoxPicker,
  HorizontalScrollArea,
  SearchBar,
} from "@/components/primitives";

import {
  INVENTORY_QUICK_FILTER_OPTIONS,
  type InventoryQuickFilter,
} from "../types";

const COLLAPSE =
  "grid transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";

type InventoryListHeaderProps = {
  isCompact: boolean;
  isLoading: boolean;
  q: string;
  activeFilter: InventoryQuickFilter;
  isFilterDisabled: boolean;
  onQChange: (value: string) => void;
  onFilterChange: (filter: InventoryQuickFilter) => void;
};

export function InventoryListHeader({
  isCompact,
  isLoading,
  q,
  activeFilter,
  isFilterDisabled,
  onQChange,
  onFilterChange,
}: InventoryListHeaderProps): React.JSX.Element {
  const filterOptions = INVENTORY_QUICK_FILTER_OPTIONS.map((option) => ({
    ...option,
    disabled: isFilterDisabled,
  }));

  return (
    <div
      className="flex flex-col bg-background"
      data-testid="upholstery-inventory-header"
    >
      <div className="px-4 py-2">
        <SearchBar
          activeFilterCount={0}
          data-testid="upholstery-inventory-search-bar"
          isLoading={isLoading}
          placeholder="Search upholstery..."
          value={q}
          wrapperClassName="bg-[var(--color-card)]"
          onChange={onQChange}
          onFilterPress={() => undefined}
          onSortPress={() => undefined}
        />
      </div>

      <div
        className={cn(
          COLLAPSE,
          isCompact
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <HorizontalScrollArea className="pb-1">
            <BoxPicker
              className={cn(
                "flex flex-nowrap flex-row gap-1.5 px-4 transition-opacity duration-150",
                isFilterDisabled && "pointer-events-none opacity-60",
              )}
              data-testid="upholstery-inventory-quick-filter-pills"
              layout="stack"
              mode="single"
              options={filterOptions}
              size="sm"
              showDescription={false}
              showIcon={false}
              value={activeFilter}
              visualVariant="pill"
              selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
              unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
              onValueChange={onFilterChange}
            />
          </HorizontalScrollArea>
        </div>
      </div>
    </div>
  );
}
```

**Changed from existing header:**
- `BoxPicker mode="multiple"` → `mode="single"`, `value={conditions}` → `value={activeFilter}`, `onValueChange={onConditionsChange}` → `onValueChange={onFilterChange}`.
- `CONDITION_OPTIONS` (inline ternary, had "Out" bug) → `INVENTORY_QUICK_FILTER_OPTIONS` from `types.ts`.
- Props: removed `conditions`, `activeFilterCount`, `onConditionsChange`; added `activeFilter`, `isFilterDisabled`, `onFilterChange`.
- `activeFilterCount={0}` on `SearchBar` (pills are always visible; no badge needed).
- `BoxPicker` gains `transition-opacity pointer-events-none opacity-60` when `isFilterDisabled`.

---

### Step 9 — `features/upholstery-inventory/components/InventoryListView.tsx` — slide animation + updated header wiring

Replace the entire file:

```tsx
import { AnimatePresence, m } from "framer-motion";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";

import { transitions } from "@/lib/animation";

import { useInventoryListViewContext } from "../providers/InventoryListViewProvider";
import { InventoryListCard } from "./InventoryListCard";
import { InventoryListHeader } from "./InventoryListHeader";

const bodyVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: transitions.slide,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: transitions.slide,
  }),
} as const;

export function InventoryListView(): React.JSX.Element {
  const controller = useInventoryListViewContext();
  const { scrollRef, isHidden: isCompact } = useScrollVisibility({
    mode: "relative",
  });

  return (
    <div
      className="relative flex-1 min-h-0"
      data-testid="upholstery-inventory-view"
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <InventoryListHeader
          activeFilter={controller.activeFilter}
          isCompact={isCompact}
          isFilterDisabled={controller.isFilterDisabled}
          isLoading={controller.isLoading}
          q={controller.q}
          onFilterChange={controller.onFilterChange}
          onQChange={controller.setQ}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={128}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div className="pt-28" data-testid="upholstery-inventory-list-scroll">
          <div className="relative flex min-h-[calc(100dvh-7rem)]">
            <AnimatePresence
              custom={controller.direction}
              initial={false}
              mode="sync"
            >
              <m.div
                key={controller.activeFilter}
                animate="center"
                className="absolute inset-0 flex flex-col gap-3 py-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]"
                custom={controller.direction}
                data-testid={`upholstery-inventory-body-${controller.activeFilter}`}
                exit="exit"
                initial="enter"
                variants={bodyVariants}
              >
                {controller.cards.map((card) => (
                  <InventoryListCard
                    key={card.inventoryId}
                    card={card}
                    onTapActions={controller.openCardActions}
                    onTapCard={controller.openDetail}
                  />
                ))}

                {controller.isLoading && controller.cards.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                ) : null}

                {controller.isFetched && controller.cards.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                    No upholstery inventories found.
                  </div>
                ) : null}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
```

**Changed from existing view:**
- Header props: removed `conditions`, `activeFilterCount`, `onConditionsChange`; added `activeFilter`, `isFilterDisabled`, `onFilterChange`.
- Replaced flat card list `<div>` with `AnimatePresence` + `m.div` keyed on `controller.activeFilter` for the slide animation.
- Empty-state guard: `!controller.isLoading` → `controller.isFetched` (fixes AC #2 — no false flash).
- Removed load-more button entirely (no infinite pagination — each filter query loads up to `LIST_LIMIT = 50` items).
- `m.div` absolute-positioned inside a `relative flex min-h-[calc(100dvh-7rem)]` container so both the entering and exiting frames are visible during the cross-fade/slide.
- Import `transitions` from `@/lib/animation` (same import `UpholsteryPickerSlidePage.tsx` uses).

**Note for Codex:** Verify `transitions.slide` is exported from `@/lib/animation`. If the export name differs, define the transition inline as `{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.25 }`.

---

### Step 10 — `features/upholstery-inventory/actions/use-delete-upholstery-inventory.ts` — fix `removeQueries` lifecycle

Move `removeQueries` from `onSettled` to `onSuccess`, and stop passing `inventoryId` to `invalidateAfterInventoryMutation`:

```ts
export function useDeleteUpholsteryInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUpholsteryInventory,
    onSuccess: (_data, inventoryId) => {
      void queryClient.removeQueries({
        queryKey: upholsteryInventoryKeys.detail(inventoryId),
      });
    },
    onSettled: () => {
      // No inventoryId here — do not invalidate the detail.
      // On success it is already removed; on error it must remain intact.
      invalidateAfterInventoryMutation(queryClient);
    },
  });
}
```

**Why:** `onSettled` fires on both success and error. On a failed delete, passing `inventoryId` was causing `removeQueries` to evict a still-valid cache entry.

---

### Step 11 — `features/upholstery-inventory/lib/invalidate-inventory.test.ts` — add missing assertion

Add `itemUpholsteryKeys` import and assertion to the existing test:

```ts
import { itemUpholsteryKeys } from "@beyo/tasks";

// inside the existing test:
expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
  queryKey: itemUpholsteryKeys.all,
});
```

---

### Step 12 — `features/upholstery-inventory/pages/StoredAmountSheetPage.tsx` — add `onError` handler

Inside the `setStoredAmount.mutate(...)` call, add:

```ts
setStoredAmount.mutate(
  { inventoryId, current_stored_amount_meters: normalized },
  {
    onSuccess: () => {
      useSurfaceStore.getState().close(STORED_AMOUNT_SHEET_ID);
    },
    onError: () => {
      setError("Could not save. Please try again.");
    },
  },
);
```

---

### Step 13 — `features/upholstery-inventory/components/InventoryListCard.tsx` — render ordered amount

Update the card body to show `orderedDisplay` beside `storedDisplay` when non-null.

Replace the current single stored-amount block with a two-column row:

```tsx
<div className="mt-auto flex items-end gap-4 pt-3">
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground">Stored</span>
    <span className="text-lg font-semibold text-foreground">{card.storedDisplay}</span>
  </div>
  {card.orderedDisplay ? (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-muted-foreground">Ordered</span>
      <span className="text-base font-semibold text-foreground">{card.orderedDisplay}</span>
    </div>
  ) : null}
</div>
```

`Stored` uses `text-lg` (primary emphasis); `Ordered` uses `text-base` (secondary). Both align at the baseline row via `items-end`.

---

### Step 14 — `features/upholstery-inventory/components/InventoryDetailHeader.tsx` — add circular avatar

Add a circular avatar to the left of name and code, reusing the `UpholsteryCard.tsx` pattern:

```tsx
import { ImagePlaceholder, StatePill } from "@/components/primitives";

<div className="flex items-center gap-3 px-4 py-3">
  {/* circular avatar */}
  {detail.imageUrl ? (
    <img
      alt=""
      className="size-12 shrink-0 rounded-full object-cover"
      decoding="async"
      draggable={false}
      loading="lazy"
      src={detail.imageUrl}
    />
  ) : (
    <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
      <ImagePlaceholder iconClassName="size-5 text-muted-foreground/60" />
    </div>
  )}

  {/* name / code / actions column */}
  <div className="flex min-w-0 flex-1 flex-col gap-1">
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-md font-semibold text-foreground">
        {detail.name}
      </span>
      <StatePill label={detail.condition.label} variant={detail.condition.variant} />
      <button aria-label="Inventory actions" ... >
        {/* three-dot — unchanged */}
      </button>
    </div>
    <span className="truncate text-sm text-muted-foreground">{detail.code}</span>
  </div>
</div>
```

The outer container changes from `flex flex-col` to `flex items-center gap-3`. Name/code/actions move into a nested `flex-col` column.

---

### Step 15 — `features/upholstery-inventory/components/InventoryQuantityOverview.tsx` — remove own `ContentCard` wrapper

Strip the outer `<ContentCard>`:

```tsx
// before
return (
  <ContentCard data-testid="upholstery-inventory-quantity-overview">
    {/* ... */}
  </ContentCard>
);

// after
return (
  <div data-testid="upholstery-inventory-quantity-overview">
    {/* ... unchanged inner content ... */}
  </div>
);
```

Remove the `ContentCard` import if unused.

---

### Step 16 — `features/upholstery-inventory/components/InventoryHistorySection.tsx` — remove own `ContentCard` wrapper

```tsx
// before
return (
  <ContentCard data-testid="upholstery-inventory-history-section">
    {/* ... */}
  </ContentCard>
);

// after
return (
  <div data-testid="upholstery-inventory-history-section">
    {/* ... unchanged inner content ... */}
  </div>
);
```

---

### Step 17 — `pages/UpholsteryInventoryDetailSlidePage.tsx` — single ContentCard for the entire body

Replace the current two-section wrapper with a single `<ContentCard className="mx-4">`:

```tsx
// before
<div className="flex flex-col gap-4 px-4">
  <InventoryQuantityOverview />
  <InventoryHistorySection />
</div>

// after
<ContentCard className="mx-4">
  <InventoryQuantityOverview />
  <div className="h-px bg-border" />
  <InventoryHistorySection />
</ContentCard>
```

Add `import { ContentCard } from "@/components/primitives"` if not already present.

---

### Step 18 — `features/upholstery-inventory/components/InventoryDetailFooter.tsx` — relabel "Stored amount" → "Edit"

```tsx
// before
<button
  className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm"
  type="button"
  onClick={openStoredAmountEditor}
>
  Stored amount
</button>

// after
<button
  className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm"
  type="button"
>
  Edit
</button>
```

Remove `onClick` entirely. Remove `openStoredAmountEditor` from the destructure if it becomes unused in this component (it stays on the controller for use by `InventoryQuantityOverview`).

---

## Risks and mitigations

- Risk: `transitions.slide` import path — `UpholsteryPickerSlidePage` uses `@/lib/animation`. If the export name or path differs, `bodyVariants` center transition won't apply.
  Mitigation: Codex must verify the import resolves and the export key matches before using it. If not found, define the transition inline as `{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.25 }`.

- Risk: Dropping `useInfiniteQuery` (load-more) may be noticeable to users if a filter has > 50 inventories.
  Mitigation: `LIST_LIMIT = 50` is consistent with the upholstery picker. If more are needed, increase the constant. Infinite scroll per pre-loaded filter is architecturally complex and is explicitly deferred.

- Risk: Removing `ContentCard` from `InventoryQuantityOverview` / `InventoryHistorySection` breaks their `data-testid` selectors in existing tests.
  Mitigation: The `data-testid` attributes move to the inner `<div>` wrappers (steps 15–16), so selectors remain valid.

- Risk: `invalidateAfterInventoryMutation(queryClient)` called without `inventoryId` on a failed delete leaves the detail stale in cache.
  Mitigation: TanStack Query's `staleTime` default is 0, so the next mount of the detail page refetches automatically. The detail is NOT removed, so no error flash.

- Risk: Step 1 (`orderedDisplay` added to VM) causes a TypeScript error at `InventoryListCard.tsx` until step 13 is also applied.
  Mitigation: Apply both in the same edit pass.

- Risk: The framer-motion `m.div` keyed on `controller.activeFilter` must be a direct child of `AnimatePresence`. If any wrapper element is inserted between them, exit animations silently drop.
  Mitigation: Keep `AnimatePresence` and `m.div` as strict parent/child with no intermediate elements.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all modified files. Pay special attention to `InventoryDetailViewModel.condition` (now `InventoryConditionPresentation`), `InventoryListController` shape consumed by `InventoryListView` (removed fields must not be referenced), and `BoxPicker mode="single"` value type (`InventoryQuickFilter` not `InventoryQuickFilter[]`).
- `npm run test:unit -- upholstery-inventory`: 3 test files / ≥ 7 tests pass (step 11 adds one new assertion).
- Manual — filter pills: open inventory list; verify three pills render; tap each; verify the list slides left (forward) then right (backward) depending on pill order; verify only one pill is highlighted at a time.
- Manual — pre-load: open inventory list with network throttled (devtools "Slow 3G"); tap a pill that hasn't been touched yet; verify list appears immediately (no skeleton on second tap, only on first page load).
- Manual — search disables pills: type in search bar; verify pills dim and become non-interactive; clear search; verify pills re-enable and show the previously active filter's list.
- Manual — delete flow: open a detail, tap three-dot → delete → confirm; surfaces close, card disappears. With network blocked: confirm button re-enables, detail slide stays open with inventory data intact.
- Manual — list cold load: open inventory list on a fresh page; skeleton appears first, no empty-state flash.
- Manual — save failure: open stored-amount editor, block network, tap Save; "Could not save. Please try again." appears inline.
- Manual — card ordered amount: use a dev seed that has `current_amount_ordered_meters > 0`; verify "Stored" and "Ordered" values both appear on the card.
- Manual — detail header avatar: verify image (when present) renders as a circle; placeholder is circular.
- Manual — detail body: verify quantity overview and history section share one card with a hairline divider.
- Manual — detail footer: verify "Edit" label; tapping does nothing.

## Review log

- `2026-06-18` `claude-opus-4-8`: Plan authored from the post-implementation code review (6 bugs) and 4 UI corrections specified by the owner.
- `2026-06-18` `claude-opus-4-8`: Added filter-system rework (steps 3–9): backend removed `inventory_condition` param; new single-select quick filter (Favorites / In Stock / Out of Stock) with three pre-loaded queries and framer-motion slide animation mirroring `UpholsteryPickerSlidePage`. Old steps 3–6 (condition label export + flow `isFetched`) replaced; remaining bug-fix/UI steps renumbered 10–18. Total steps: 18.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` → ready for Codex immediately (no open clarifications).
- Transition owner: `David` / `claude-opus-4-8`
