# PLAN_upholstery_category_inventory_browse_20260622

## Metadata

- Plan ID: `PLAN_upholstery_category_inventory_browse_20260622`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T12:00:00Z`
- Last updated at (UTC): `2026-06-22T10:56:00Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Replace the flat upholstery inventory list (search bar + filter pills + upholstery cards) with a two-panel category-first browse flow. Panel 1 shows upholstery categories with a search bar. Tapping a category slides to Panel 2, which shows the upholstery inventory cards for that category. Navigation is animated: horizontal slide on the body, vertical slide on the header.
- **Business/user intent:** Upholstery inventory is now organised by category. Users drill into a category to see its upholsteries rather than viewing everything in one flat list.
- **Non-goals:**
  - Searching upholsteries by `q` inside Panel 2 (out of scope).
  - In-stock / out-of-stock / favorite filter pills in Panel 2 (removed entirely).
  - Editing or deleting categories from this page.
  - FAB (`InventoryCreationFab`) — no change.

## Scope

- **In scope:**
  - Add `upholstery_category_ids?: string` to `ListUpholsteryInventoriesParams` and wire it through the list API fetch function.
  - Extract `UpholsteryCategoryCard` from inside `UpholsteryCategoryPickerField.tsx` to its own file; export it from the public `upholstery-category/index.ts`.
  - Rewrite `use-inventory-list.controller.ts`: remove filter logic; add category browse state + inventory-by-category state.
  - Rewrite `InventoryListHeader.tsx`: animated two-state header (category search bar ↔ back button + category detail).
  - Update `InventoryListView.tsx`: use new controller shape; render animated two-panel body.

- **Assumptions:**
  - `GET /api/v1/upholstery-inventories?upholstery_category_ids=<id>` is live (per handoff doc).
  - `UpholsteryCategory.upholstery_count` reflects the number of inventory entries in the category.
  - Both header states render at approximately the same height (`h-14 = 56 px`).

## Acceptance criteria

1. Upholstery inventory route shows a list of upholstery categories with a plain search bar (no sort/filter buttons).
2. Typing in the search bar debounces 300 ms and passes `q` to `GET /api/v1/upholstery-categories`.
3. Tapping a category: body slides left out → inventory cards slide in from the right; header transitions from search bar to back-arrow + category avatar + name.
4. Tapping the back arrow: inventory panel slides right out → category panel slides in from the left; header transitions back to search bar.
5. Inventory panel fetches `GET /api/v1/upholstery-inventories?upholstery_category_ids=<id>` (no other filters).
6. Loading skeletons and empty states appear in both panels.
7. `PullToRefresh` refetches the active panel's query.
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_category_20260622.md` — confirms `upholstery_category_ids` CSV param on `GET /api/v1/upholstery-inventories`

### File read intent — pattern vs. relational

Prohibited (pattern reads — not needed):
- Reading another controller to understand hook aggregation shape.
- Reading another list query hook to understand TanStack Query setup.

Permitted (relational reads already done — no further reads needed):
- `InventoryListView.tsx` — existing `bodyVariants` and layout structure (already read)
- `use-inventory-list.controller.ts` — full existing logic (already read)
- `InventoryListHeader.tsx` — current props and structure (already read)
- `UpholsteryCategoryPickerField.tsx` — local `UpholsteryCategoryCard` definition to extract (already read)
- `upholstery-category/types.ts` — `UpholsteryCategory` shape (already read)
- `upholstery-category/api/use-list-upholstery-categories-query.ts` — existing hook signature (already read)
- `lib/animation.ts` — `transitions.slide` (already read)

## Implementation plan

### Step 1 — `src/features/upholstery-inventory/types.ts`

Add `upholstery_category_ids?: string` to `ListUpholsteryInventoriesParams`. No other changes.

Find:
```ts
export type ListUpholsteryInventoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  in_stock?: boolean;
  favorite?: boolean;
};
```

Replace with:
```ts
export type ListUpholsteryInventoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  in_stock?: boolean;
  favorite?: boolean;
  upholstery_category_ids?: string; // CSV of category client_ids; single id for category drill-down
};
```

---

### Step 2 — `src/features/upholstery-inventory/api/list-upholstery-inventories.ts`

Add `upholstery_category_ids` to the `apiClient.get` params object.

Find the params object inside `listUpholsteryInventories`:
```ts
    {
      limit: params.limit,
      offset: params.offset,
      q: params.q || undefined,
      in_stock: params.in_stock,
      favorite: params.favorite,
    },
```

Replace with:
```ts
    {
      limit: params.limit,
      offset: params.offset,
      q: params.q || undefined,
      in_stock: params.in_stock,
      favorite: params.favorite,
      upholstery_category_ids: params.upholstery_category_ids || undefined,
    },
```

---

### Step 3 — NEW `src/features/upholstery-category/components/UpholsteryCategoryCard.tsx`

Create this new file by extracting the private `UpholsteryCategoryCard` component that currently lives inside `UpholsteryCategoryPickerField.tsx`. The `isSelected` prop defaults to `false` so existing picker usage (which passes it explicitly) continues to work.

```tsx
import { cn } from "@/lib/utils";

import type { UpholsteryCategory } from "../types";

type UpholsteryCategoryCardProps = {
  category: UpholsteryCategory;
  isSelected?: boolean;
  onPress: (category: UpholsteryCategory) => void;
};

export function UpholsteryCategoryCard({
  category,
  isSelected = false,
  onPress,
}: UpholsteryCategoryCardProps): React.JSX.Element {
  return (
    <div
      aria-pressed={isSelected}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
        isSelected
          ? "border-primary bg-primary text-card"
          : "border-border bg-card text-foreground",
      )}
      role="button"
      tabIndex={0}
      onClick={() => onPress(category)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress(category);
        }
      }}
    >
      {category.image_url ? (
        <img
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
          src={category.image_url}
        />
      ) : (
        <div className="size-10 shrink-0 rounded-full bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{category.name}</p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            isSelected ? "opacity-70" : "text-muted-foreground",
          )}
        >
          {category.upholstery_count} upholstery entries
        </p>
      </div>
    </div>
  );
}
```

---

### Step 4 — `src/features/upholstery-category/components/UpholsteryCategoryPickerField.tsx`

Remove the local `UpholsteryCategoryCardProps` type definition and the local `UpholsteryCategoryCard` function. Add one import at the top:

```ts
import { UpholsteryCategoryCard } from "./UpholsteryCategoryCard";
```

All call sites inside `UpholsteryCategoryPickerField` (`isSelected={value === category.client_id}`, `onPress={handleCardPress}`) remain unchanged — the prop names match.

The local code to REMOVE is the entire block:
```tsx
type UpholsteryCategoryCardProps = {
  category: UpholsteryCategory;
  isSelected: boolean;
  onPress: (category: UpholsteryCategory) => void;
};

function UpholsteryCategoryCard({
  category,
  isSelected,
  onPress,
}: UpholsteryCategoryCardProps): React.JSX.Element {
  return (
    <div
      aria-pressed={isSelected}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
        isSelected
          ? "border-primary bg-primary text-card"
          : "border-border bg-card text-foreground",
      )}
      role="button"
      tabIndex={0}
      onClick={() => onPress(category)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPress(category);
        }
      }}
    >
      {category.image_url ? (
        <img
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
          src={category.image_url}
        />
      ) : (
        <div className="size-10 shrink-0 rounded-full bg-muted" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{category.name}</p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            isSelected ? "opacity-70" : "text-muted-foreground",
          )}
        >
          {category.upholstery_count} upholstery entries
        </p>
      </div>
    </div>
  );
}
```

After the removal and import addition, the file will still import `cn` from `@/lib/utils` (used elsewhere in the file) and `UpholsteryCategory` type (used in `Props` and `handleCardPress`). Verify no unused imports remain.

---

### Step 5 — `src/features/upholstery-category/index.ts`

Add `UpholsteryCategoryCard` to the public export. Full file after change:

```ts
export {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
  preloadUpholsteryCategoryCreationSurface,
  upholsteryCategorySurfaces,
} from "./surfaces";
export { UpholsteryCategoryCard } from "./components/UpholsteryCategoryCard";
export { UpholsteryCategoryPickerField } from "./components/UpholsteryCategoryPickerField";
export type { UpholsteryCategory, UpholsteryCategoryInline } from "./types";
```

---

### Step 6 — `src/features/upholstery-inventory/controllers/use-inventory-list.controller.ts`

Complete rewrite. Remove all filter/search logic. Add two-panel state:

```ts
import { useEffect, useState } from "react";

import type { UpholsteryCategory } from "@/features/upholstery-category";
import { useListUpholsteryCategoriesQuery } from "@/features/upholstery-category/api/use-list-upholstery-categories-query";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import type { UpholsteryInventoryId } from "@/types/common";

import { useListUpholsteryInventoriesQuery } from "../api/use-list-upholstery-inventories-query";
import {
  INVENTORY_CARD_ACTIONS_SHEET_ID,
  INVENTORY_DETAIL_SLIDE_ID,
  type InventoryCardActionsSurfaceProps,
  type InventoryDetailSurfaceProps,
} from "../surfaces";
import { toInventoryListCardViewModel } from "../types";

export type InventoryPanelId = "categories" | "inventory";

export function useInventoryListController() {
  const [activePanelId, setActivePanelId] = useState<InventoryPanelId>("categories");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedCategory, setSelectedCategory] = useState<UpholsteryCategory | null>(null);

  const [categoryQ, setCategoryQ] = useState("");
  const [debouncedCategoryQ, setDebouncedCategoryQ] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedCategoryQ(categoryQ), 300);
    return () => window.clearTimeout(timeout);
  }, [categoryQ]);

  const categoriesQuery = useListUpholsteryCategoriesQuery({
    q: debouncedCategoryQ.trim() || undefined,
  });

  const inventoriesQuery = useListUpholsteryInventoriesQuery(
    { upholstery_category_ids: selectedCategory?.client_id ?? "" },
    { enabled: activePanelId === "inventory" && Boolean(selectedCategory) },
  );

  function selectCategory(category: UpholsteryCategory): void {
    setDirection(1);
    setSelectedCategory(category);
    setActivePanelId("inventory");
  }

  function goBack(): void {
    setDirection(-1);
    setActivePanelId("categories");
  }

  async function refetch(): Promise<void> {
    if (activePanelId === "inventory") {
      await inventoriesQuery.refetch();
    } else {
      await categoriesQuery.refetch();
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
    activePanelId,
    direction,
    selectedCategory,
    categoryQ,
    setCategoryQ,
    categoryCards: categoriesQuery.data?.items ?? [],
    isCategoriesLoading: categoriesQuery.isPending,
    isCategoriesFetched: categoriesQuery.isFetched,
    isCategoriesFetching: categoriesQuery.isFetching,
    inventoryCards: (inventoriesQuery.data?.items ?? []).map(toInventoryListCardViewModel),
    isInventoryLoading: inventoriesQuery.isPending,
    isInventoryFetched: inventoriesQuery.isFetched,
    selectCategory,
    goBack,
    refetch,
    openDetail,
    openCardActions,
  };
}

export type InventoryListController = ReturnType<typeof useInventoryListController>;
```

What was removed vs. old file:
- `useRef` (no longer needed — `previousFilterIndexRef` gone)
- `q`, `debouncedQ`, `activeFilter`, `isSearchActive`, `activeQ`
- Three filter queries (`inStockQuery`, `outOfStockQuery`, `favoritesQuery`)
- `FILTER_INDEXES`, `INVENTORY_QUICK_FILTER_OPTIONS` imports
- `handleFilterChange`, `getActiveQueryResult` functions
- Filter-branching `refetch`

What was added:
- `activePanelId`, `direction` (now panel-based, not filter-based)
- `selectedCategory`
- `categoryQ`, `debouncedCategoryQ`, debounce `useEffect`
- `categoriesQuery` (category list with `q` search)
- `inventoriesQuery` (enabled only in inventory panel with a selected category)
- `selectCategory(category)`, `goBack()`

---

### Step 7 — `src/features/upholstery-inventory/components/InventoryListHeader.tsx`

Complete rewrite. Two animated header states (category browse ↔ inventory detail), driven by `activePanelId` and `direction`.

```tsx
import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft } from "lucide-react";

import { SearchBar } from "@/components/primitives";
import type { UpholsteryCategory } from "@/features/upholstery-category";
import { transitions } from "@/lib/animation";

import type { InventoryPanelId } from "../controllers/use-inventory-list.controller";

const headerVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: transitions.slide,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: transitions.slide,
  }),
} as const;

type InventoryListHeaderProps = {
  activePanelId: InventoryPanelId;
  direction: 1 | -1;
  selectedCategory: UpholsteryCategory | null;
  categoryQ: string;
  isCategoriesFetching: boolean;
  onCategoryQChange: (value: string) => void;
  onBack: () => void;
};

export function InventoryListHeader({
  activePanelId,
  direction,
  selectedCategory,
  categoryQ,
  isCategoriesFetching,
  onCategoryQChange,
  onBack,
}: InventoryListHeaderProps): React.JSX.Element {
  return (
    <div
      className="relative h-14 overflow-hidden bg-background"
      data-testid="upholstery-inventory-header"
    >
      <AnimatePresence custom={direction} initial={false} mode="sync">
        {activePanelId === "categories" ? (
          <m.div
            key="category-browse-header"
            animate="center"
            className="absolute inset-0 flex flex-col justify-center px-4"
            custom={direction}
            exit="exit"
            initial="enter"
            variants={headerVariants}
          >
            <SearchBar
              isLoading={isCategoriesFetching}
              placeholder="Search categories..."
              showFilterButton={false}
              showSortButton={false}
              value={categoryQ}
              wrapperClassName="bg-[var(--color-card)]"
              onChange={onCategoryQChange}
              onFilterPress={() => undefined}
              onSortPress={() => undefined}
            />
          </m.div>
        ) : selectedCategory ? (
          <m.div
            key="inventory-category-detail-header"
            animate="center"
            className="absolute inset-0 flex items-center gap-3 px-4"
            custom={direction}
            exit="exit"
            initial="enter"
            variants={headerVariants}
          >
            <button
              aria-label="Go back to categories"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground"
              type="button"
              onClick={onBack}
            >
              <ChevronLeft className="size-5" />
            </button>

            {selectedCategory.image_url ? (
              <img
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
                src={selectedCategory.image_url}
              />
            ) : (
              <div className="size-9 shrink-0 rounded-full bg-muted" />
            )}

            <p className="min-w-0 flex-1 truncate font-medium text-foreground">
              {selectedCategory.name}
            </p>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
```

Key decisions:
- Container `relative h-14 overflow-hidden`: fixed 56 px height; `overflow-hidden` clips both children as they slide vertically.
- Both children are `absolute inset-0` so they occupy the same space (required for `mode="sync"` simultaneous exit/enter).
- Forward navigation (`direction = 1`): category header exits **upward** (`y: "-100%"`); inventory header enters from **below** (`y: "100%" → 0`).
- Back navigation (`direction = -1`): inventory header exits **downward** (`y: "100%"`); category header enters from **above** (`y: "-100%" → 0`).
- `custom={direction}` on `AnimatePresence` is required so the `exit` variant also receives `direction` correctly.
- `showSortButton={false}` and `showFilterButton={false}` on the category search `SearchBar`.
- `onFilterPress` and `onSortPress` are passed as no-ops to avoid TypeScript errors if they are required props on the current `SearchBar` type.

Removed from old file: `BoxPicker`, `HorizontalScrollArea`, `cn`, `INVENTORY_QUICK_FILTER_OPTIONS`, `InventoryQuickFilter`, the `COLLAPSE` CSS variable, the `isCompact` / filter pills section.

---

### Step 8 — `src/features/upholstery-inventory/components/InventoryListView.tsx`

Replace the entire file:

```tsx
import { useRef } from "react";

import { AnimatePresence, m } from "framer-motion";
import { PullToRefresh } from "@beyo/ui";

import { transitions } from "@/lib/animation";
import { UpholsteryCategoryCard } from "@/features/upholstery-category";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className="relative flex-1 min-h-0"
      data-testid="upholstery-inventory-view"
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <InventoryListHeader
          activePanelId={controller.activePanelId}
          direction={controller.direction}
          selectedCategory={controller.selectedCategory}
          categoryQ={controller.categoryQ}
          isCategoriesFetching={controller.isCategoriesFetching}
          onCategoryQChange={controller.setCategoryQ}
          onBack={controller.goBack}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={56}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div className="pt-14" data-testid="upholstery-inventory-list-scroll">
          <div className="relative flex min-h-[calc(100dvh-3.5rem)]">
            <AnimatePresence
              custom={controller.direction}
              initial={false}
              mode="sync"
            >
              {controller.activePanelId === "categories" ? (
                <m.div
                  key="categories-panel"
                  animate="center"
                  className="absolute inset-0 flex flex-col gap-3 px-4 py-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]"
                  custom={controller.direction}
                  data-testid="upholstery-inventory-body-categories"
                  exit="exit"
                  initial="enter"
                  variants={bodyVariants}
                >
                  {controller.categoryCards.map((category) => (
                    <UpholsteryCategoryCard
                      key={category.client_id}
                      category={category}
                      onPress={controller.selectCategory}
                    />
                  ))}

                  {controller.isCategoriesLoading &&
                  controller.categoryCards.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-16 animate-pulse rounded-2xl bg-muted"
                        />
                      ))}
                    </div>
                  ) : null}

                  {controller.isCategoriesFetched &&
                  controller.categoryCards.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                      No categories found.
                    </div>
                  ) : null}
                </m.div>
              ) : (
                <m.div
                  key="inventory-panel"
                  animate="center"
                  className="absolute inset-0 flex flex-col gap-3 py-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]"
                  custom={controller.direction}
                  data-testid="upholstery-inventory-body-inventory"
                  exit="exit"
                  initial="enter"
                  variants={bodyVariants}
                >
                  {controller.inventoryCards.map((card) => (
                    <InventoryListCard
                      key={card.inventoryId}
                      card={card}
                      onTapActions={controller.openCardActions}
                      onTapCard={controller.openDetail}
                    />
                  ))}

                  {controller.isInventoryLoading &&
                  controller.inventoryCards.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                        />
                      ))}
                    </div>
                  ) : null}

                  {controller.isInventoryFetched &&
                  controller.inventoryCards.length === 0 ? (
                    <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                      No upholstery inventories found.
                    </div>
                  ) : null}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
```

Key changes vs. old file:
- `useScrollVisibility` removed; `scrollRef = useRef<HTMLDivElement | null>(null)` used directly.
- `isCompact` removed entirely (no more collapsible pills section).
- `InventoryListHeader` receives the new prop set (see Step 7).
- `indicatorOffset` changed `128 → 56` to match the `h-14` (56 px) header.
- `pt-28 → pt-14`; `min-h-[calc(100dvh-7rem)] → min-h-[calc(100dvh-3.5rem)]`.
- `AnimatePresence` body: was keyed on `controller.activeFilter` (three possible keys); now is an if/else with two static keys (`"categories-panel"` and `"inventory-panel"`).
- Categories panel renders `UpholsteryCategoryCard` items (no `isSelected` prop needed — defaults to `false`).
- Inventory panel renders `InventoryListCard` items, identical to the previous single-panel body.

---

## Risks and mitigations

- **Risk:** `h-14` (56 px) header container clips the `SearchBar` if its intrinsic height exceeds 56 px.
  **Mitigation:** If this occurs, increase container to `h-16` (64 px) and update `indicatorOffset={64}`, `pt-16`, and `min-h-[calc(100dvh-4rem)]` consistently.

- **Risk:** `mode="sync"` in the header `AnimatePresence` causes both headers to overlap visually during the slide.
  **Mitigation:** Both children are `absolute inset-0` and the container has `overflow-hidden`, so the overlap is fully clipped. This is intentional.

- **Risk:** `inventoriesQuery` fires with `upholstery_category_ids: ""` if `selectedCategory` is null when `activePanelId` changes.
  **Mitigation:** `enabled: activePanelId === "inventory" && Boolean(selectedCategory)` prevents the query from firing when no category is set.

- **Risk:** `InventoryListController` type consumers (e.g., `InventoryListViewProvider`) break because removed fields (`q`, `activeFilter`, `onFilterChange`, `filterOptions`, `isSearchActive`).
  **Mitigation:** `InventoryListViewProvider` only forwards the controller to context — it has no typed reference to individual fields. The `InventoryListHeader` and `InventoryListView` are the only consumers, and both are rewritten in this plan. Run `npm run typecheck` to confirm.

## Validation plan

- `npm run typecheck`: zero errors
- Manual — category panel: open inventory route → category list renders; type in search → list filters after 300 ms
- Manual — forward navigation: tap a category → body slides left/right, header transitions to back+title
- Manual — back navigation: tap back arrow → body slides back, header transitions to search bar
- Manual — inventory panel: correct upholstery cards render for the selected category
- Manual — pull to refresh: categories panel refetches category list; inventory panel refetches inventory list

## Review log

- `2026-06-22` David: authored

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
