# PLAN_29_upholstery_picker_quick_filters_favorite_and_reorder_20260527

## Metadata

- Plan ID: `PLAN_29_upholstery_picker_quick_filters_favorite_and_reorder_20260527`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-27T10:00:00Z`
- Last updated at (UTC): `2026-05-27T07:37:23Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_upholsteries_crud_contract_20260527`
- Intention plan: _none (feature described directly in conversation)_

---

## Goal and intent

- **Goal:** Extend `UpholsteryPickerSlidePage` with three quick-filter pills (In Stock, Out of Stock, Favorites), a direction-aware slide animation between filter views, a heart-button to toggle favorite on any upholstery card, and a DnD bottom-sheet surface for reordering upholsteries.
- **Business/user intent:** Managers need to rapidly browse upholsteries by availability or personal curation. The slide animation and pre-fetched filter views make switching instant. Favorite marking and manual ordering allow high-priority materials to surface first.
- **Non-goals:** Creating, editing, or deleting upholstery records. Batch-favorite via multi-select. Changes to the task or item features.

---

## Scope

- **In scope:**
  - Update `UpholsteryPickerOptionSchema` and `ListUpholsteryPickerParams` in `types.ts` to include `favorite` and `list_order` from the updated backend.
  - Add `in_stock` and `favorite` filter params to `fetchUpholsteryPickerOptions`.
  - Add new fetch functions and action hooks: `toggleFavorite`, `updateListOrder`.
  - Create `useUpholsteryPickerController` — aggregates 3 parallel queries, filter state, direction state, and action hooks.
  - Extract `UpholsteryPickerHeader` component (search bar + pills).
  - Update `UpholsteryCard` — add heart toggle button on the right; add a sort-handle button that triggers the reorder sheet.
  - Create `UpholsteryDnDCard` — compact list card used in the reorder sheet (same dimensions as `UpholsteryCard`; shows `list_order` number).
  - Create `UpholsteryReorderSheetPage` — full DnD sortable list in a bottom sheet using `@dnd-kit`.
  - Register reorder sheet surface in `surfaces.ts`.
  - Refactor `UpholsteryPickerSlidePage` to use controller, `UpholsteryPickerHeader`, and animated body switching.
  - Remove `flows/use-upholstery-picker.flow.ts` and `store/upholstery-selection.store.ts` (both made redundant by the controller + TanStack Query caching).
  - Update `index.ts` public API.
  - Vitest unit tests for new action hooks and updated `UpholsteryCard`.

- **Out of scope:**
  - Playlist-style auto-scroll during DnD.
  - Batch-select or multi-select.
  - Any upholstery create/edit/delete UI.

- **Assumptions:**
  - `@dnd-kit/core` and `@dnd-kit/sortable` are already installed (confirmed — used in `ImageSortableGrid`).
  - `framer-motion` is already installed and wired up via `LazyMotion` + `m` components.
  - The sheet surface uses vaul with `handleOnly={true}` on `Drawer.Root` (`BottomSheetSurface.tsx:57`). This restricts swipe-to-dismiss to the handle pill only — the content area does not intercept drag gestures. **No DnD gesture conflict exists; no workaround needed.**
  - The backend sort order for the list is `list_order ASC nulls last → favorite DESC → created_at ASC`. Frontend does not re-sort server data; it trusts this order.

---

## Clarifications required

_(None blocking — design is fully described above. Edge-case notes are in each step.)_

---

## Acceptance criteria

1. The picker page shows three pill filters (In Stock / Out of Stock / Favorites). Tapping each switches the body with a direction-aware horizontal slide (right-to-left when index increases, left-to-right when it decreases).
2. All three filter query results are fetched in parallel on mount. Switching between pills after the first load shows no loading state (instant from cache).
3. Each `UpholsteryCard` has a heart button. Tapping it toggles `favorite` optimistically (red fill ↔ outline). The mutation calls `PATCH /api/v1/upholsteries/{client_id}/favorite`. On settled, all picker list caches are invalidated.
4. Each `UpholsteryCard` has a sort button. Tapping it opens the reorder sheet surface.
5. The reorder sheet shows all upholsteries with an assigned `list_order` (plus the target card if it has no order yet), sorted by `list_order ASC nulls last`. `list_order` values update live during drag. On drop, `PATCH /api/v1/upholsteries/{client_id}/list-order` is called. After 2 s of no drag interaction, the sheet auto-closes. All picker list caches are invalidated on settled.
6. `npm run typecheck` passes with zero errors.
7. Vitest tests for `useToggleUpholsteryFavorite` and `useUpdateUpholsteryListOrder` action hooks.
8. Vitest test for the updated `UpholsteryCard` asserting the heart button renders and triggers `onToggleFavorite`.

---

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: TanStack Query caching, optimistic update lifecycle (onMutate / onError / onSuccess / onSettled), cache invalidation rules.
- `architecture/08_hooks.md`: Action hook pattern (wraps one useMutation), controller pattern (aggregates queries + actions), flow vs. controller distinction.
- `architecture/31_animations.md`: Framer Motion `m` components, `AnimatePresence`, `custom` prop for direction-aware variants, reduced motion rule.
- `architecture/15_feature_structure.md` (implied by guide): Feature file organization — API, actions, controllers, components, pages, surfaces, index.
- `architecture/28_surfaces_local.md` (implied by guide): Active surface types are `slide`, `sheet`, `modal`. Sheet surfaces are registered via `lazyWithPreload` and opened via `useSurfaceStore`.

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `sheet` is a valid surface type; registration pattern uses `lazyWithPreload`; opened via `useSurfaceStore.getState().open(id, props)` or `useSurface()`.

### File read intent — pattern vs. relational

Permitted reads (relational — understanding what exists):
- `features/upholstery/types.ts` — actual field names, existing schemas.
- `features/upholstery/api/upholstery-keys.ts` — existing key structure.
- `features/upholstery/api/fetch-upholstery-picker-options.ts` — existing fetch shape.
- `features/upholstery/api/use-upholstery-picker-options.ts` — existing query hook.
- `features/upholstery/components/UpholsteryCard.tsx` — existing card layout.
- `features/upholstery/surfaces.ts` — existing surface registration.
- `features/upholstery/index.ts` — existing public API.
- `features/images/components/ImageSortableGrid.tsx` — existing DnD pattern (dnd-kit sensors, DragOverlay, SortableContext).
- `features/tasks/components/TasksHeader.tsx` — existing pill filter pattern (BoxPicker, HorizontalScrollArea).
- `features/tasks/surfaces.ts` — existing sheet surface registration pattern with `lazyWithPreload`.

Prohibited (pattern reads — contracts already cover these):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`.
- Reading another controller to understand aggregation shape → `08_hooks.md`.
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`.

### Skill selection

- Primary skill: bottom-up feature build (`16_feature_workflow.md` ordering).
- Trigger terms: `animation`, `framer`, `dnd`, `sortable`, `sheet`, `surface`, `optimistic`, `favorite`, `filter`.

---

## Domain schemas consulted

- `src/features/upholstery/types.ts`: Established entity — `UpholsteryPickerOption` (client_id, name, code, image_url, current_stored_amount_meters, inventory_condition). Needs `favorite: boolean` and `list_order: number | null` added. `ListUpholsteryPickerParams` needs `in_stock?: boolean` and `favorite?: boolean`.

---

## Implementation plan

### Step 1 — Update `types.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/types.ts`

1. Add `favorite: z.boolean()` and `list_order: z.number().nullable()` to `UpholsteryPickerOptionSchema`.

   ```ts
   export const UpholsteryPickerOptionSchema = z.object({
     client_id: z.string(),
     name: z.string(),
     code: z.string().nullable(),
     image_url: z.string().nullable(),
     favorite: z.boolean(),
     list_order: z.number().nullable(),
     current_stored_amount_meters: z.string().nullable(),
     inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION).nullable(),
   });
   ```

2. Update `ListUpholsteryPickerParams` to add optional filter fields:

   ```ts
   export type ListUpholsteryPickerParams = {
     q?: string;
     limit?: number;
     offset?: number;
     in_stock?: boolean;
     favorite?: boolean;
   };
   ```

3. Add `UpholsteryQuickFilter` type and the pill option array used by `BoxPicker`:

   ```ts
   export type UpholsteryQuickFilter = 'in_stock' | 'out_of_stock' | 'favorite';

   export const UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS: Array<BoxPickerOption<UpholsteryQuickFilter>> = [
     { value: 'in_stock', label: 'In Stock' },
     { value: 'out_of_stock', label: 'Out of Stock' },
     { value: 'favorite', label: '♡ Favorites' },
   ];
   ```

   Import `BoxPickerOption` from `@/components/primitives/box-picker/box-picker.types`. The type only requires `value: Value` and `label: string` — all other fields (`icon`, `description`, `testId`, etc.) are optional. The array above is fully type-safe as written; no additional fields are needed.

---

### Step 2 — Update `api/fetch-upholstery-picker-options.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/api/fetch-upholstery-picker-options.ts`

Pass `in_stock` and `favorite` as query params to `apiClient.get`. Both are omitted if `undefined` (falsy params should not be sent — the existing apiClient likely strips `undefined` values; verify and confirm):

```ts
export async function fetchUpholsteryPickerOptions(
  params: ListUpholsteryPickerParams = {},
): Promise<{ upholsteries: UpholsteryPickerOption[]; has_more: boolean }> {
  const response = await apiClient.get('/api/v1/upholsteries', ListUpholsteryPickerResponseSchema, {
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    q: params.q,
    in_stock: params.in_stock,
    favorite: params.favorite,
  });

  return {
    upholsteries: response.data.upholsteries,
    has_more: response.data.upholsteries_pagination.has_more,
  };
}
```

No changes needed to `upholsteryKeys` — `pickerList(params)` already includes the full params object in the key, so adding `in_stock`/`favorite` to params automatically creates distinct cache entries.

---

### Step 3 — Create `api/fetch-toggle-upholstery-favorite.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/api/fetch-toggle-upholstery-favorite.ts`

```ts
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { UpholsteryPickerOptionSchema } from '../types';

const ToggleFavoriteResponseSchema = ApiEnvelopeSchema(
  z.object({ upholstery: UpholsteryPickerOptionSchema }),
);

export type ToggleFavoriteInput = {
  client_id: string;
  favorite: boolean;
};

export async function fetchToggleUpholsteryFavorite(
  input: ToggleFavoriteInput,
): Promise<z.infer<typeof UpholsteryPickerOptionSchema>> {
  const response = await apiClient.patch(
    `/api/v1/upholsteries/${input.client_id}/favorite`,
    ToggleFavoriteResponseSchema,
    { favorite: input.favorite },
  );
  return response.data.upholstery;
}
```

---

### Step 4 — Create `api/fetch-update-upholstery-list-order.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/api/fetch-update-upholstery-list-order.ts`

```ts
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';

import { UpholsteryPickerOptionSchema } from '../types';

const UpdateListOrderResponseSchema = ApiEnvelopeSchema(
  z.object({ upholstery: UpholsteryPickerOptionSchema }),
);

export type UpdateListOrderInput = {
  client_id: string;
  list_order: number | null;
};

export async function fetchUpdateUpholsteryListOrder(
  input: UpdateListOrderInput,
): Promise<z.infer<typeof UpholsteryPickerOptionSchema>> {
  const response = await apiClient.patch(
    `/api/v1/upholsteries/${input.client_id}/list-order`,
    UpdateListOrderResponseSchema,
    { list_order: input.list_order },
  );
  return response.data.upholstery;
}
```

---

### Step 5 — Create `actions/use-toggle-upholstery-favorite.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-toggle-upholstery-favorite.ts`

Follow the `08_hooks.md` action pattern with full optimistic lifecycle.

**Optimistic strategy:**
- Snapshot all active `pickerLists()` caches.
- Apply optimistic toggle: set `favorite` to the new value on the matching card in each cached list.
- Additionally, if the update removes a `favorite` from a cached list that was fetched with `{ favorite: true }`, remove that item from the list entirely (it no longer belongs in the favorites view).
- On `onError`: restore all snapshots.
- On `onSuccess`: seed the updated upholstery into all active picker lists (patch, not replace, since the backend response is authoritative).
- On `onSettled`: invalidate all `pickerLists()`.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/lib/notify';

import { fetchToggleUpholsteryFavorite, type ToggleFavoriteInput } from '../api/fetch-toggle-upholstery-favorite';
import { upholsteryKeys } from '../api/upholstery-keys';
import type { UpholsteryPickerOption } from '../types';

type PickerListData = { upholsteries: UpholsteryPickerOption[]; has_more: boolean };

export function useToggleUpholsteryFavorite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: fetchToggleUpholsteryFavorite,

    onMutate: async ({ client_id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: upholsteryKeys.pickerLists() });

      const previousLists = queryClient.getQueriesData<PickerListData>({
        queryKey: upholsteryKeys.pickerLists(),
      });

      queryClient.setQueriesData<PickerListData>(
        { queryKey: upholsteryKeys.pickerLists() },
        (old, key) => {
          if (!old) return old;
          const params = key[key.length - 1] as Record<string, unknown> | undefined;
          const isFavoriteFilteredView = params?.favorite === true;

          let nextUpholsteries = old.upholsteries.map((item) =>
            item.client_id === client_id ? { ...item, favorite } : item,
          );

          // Remove the item from a favorites-filtered view when it is being un-favorited.
          if (isFavoriteFilteredView && !favorite) {
            nextUpholsteries = nextUpholsteries.filter((item) => item.client_id !== client_id);
          }

          return { ...old, upholsteries: nextUpholsteries };
        },
      );

      return { previousLists };
    },

    onSuccess: (updatedUpholstery) => {
      queryClient.setQueriesData<PickerListData>(
        { queryKey: upholsteryKeys.pickerLists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            upholsteries: old.upholsteries.map((item) =>
              item.client_id === updatedUpholstery.client_id ? updatedUpholstery : item,
            ),
          };
        },
      );
    },

    onError: (_err, _input, context) => {
      context?.previousLists.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      notify.error('Could not update favorite', 'Please try again.');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
    },
  });

  return {
    toggleFavorite: mutation.mutate,
    toggleFavoriteAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}

export type ToggleUpholsteryFavoriteAction = ReturnType<typeof useToggleUpholsteryFavorite>;
```

---

### Step 6 — Create `actions/use-update-upholstery-list-order.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/actions/use-update-upholstery-list-order.ts`

**Optimistic strategy:**
The backend shifts all items with `list_order >= new_value` by +1, making a precise optimistic update of the full list unreliable from the frontend alone. Use a limited optimistic update: update only the target item's `list_order` in all active picker list caches. Let `onSettled` invalidation reconcile the shifted neighbors.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/lib/notify';

import { fetchUpdateUpholsteryListOrder, type UpdateListOrderInput } from '../api/fetch-update-upholstery-list-order';
import { upholsteryKeys } from '../api/upholstery-keys';
import type { UpholsteryPickerOption } from '../types';

type PickerListData = { upholsteries: UpholsteryPickerOption[]; has_more: boolean };

export function useUpdateUpholsteryListOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: fetchUpdateUpholsteryListOrder,

    onMutate: async ({ client_id, list_order }) => {
      await queryClient.cancelQueries({ queryKey: upholsteryKeys.pickerLists() });

      const previousLists = queryClient.getQueriesData<PickerListData>({
        queryKey: upholsteryKeys.pickerLists(),
      });

      queryClient.setQueriesData<PickerListData>(
        { queryKey: upholsteryKeys.pickerLists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            upholsteries: old.upholsteries.map((item) =>
              item.client_id === client_id ? { ...item, list_order } : item,
            ),
          };
        },
      );

      return { previousLists };
    },

    onError: (_err, _input, context) => {
      context?.previousLists.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      notify.error('Could not update order', 'Please try again.');
    },

    onSettled: () => {
      // Full invalidation so sibling items shifted by the backend are also refreshed.
      queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() });
    },
  });

  return {
    updateListOrder: mutation.mutate,
    updateListOrderAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    variables: mutation.variables,
  };
}

export type UpdateUpholsteryListOrderAction = ReturnType<typeof useUpdateUpholsteryListOrder>;
```

---

### Step 7 — Create `controllers/use-upholstery-picker.controller.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/controllers/use-upholstery-picker.controller.ts`

This controller:
- Fires **three parallel queries** on mount (`in_stock: true`, `in_stock: false`, `favorite: true`) plus a debounced search query (enabled only when `q` is non-empty).
- Manages `activeFilter` state (default `'in_stock'`).
- Derives slide `direction` by comparing new filter index to previous filter index.
- Exposes `toggleFavorite` and `openReorderSheet` (via `useSurfaceStore`).

```ts
import { useRef, useState } from 'react';

import { useSurfaceStore } from '@/providers/SurfaceProvider';

import { useUpholsteryPickerOptionsQuery } from '../api/use-upholstery-picker-options';
import { useToggleUpholsteryFavorite } from '../actions/use-toggle-upholstery-favorite';
import { useUpdateUpholsteryListOrder } from '../actions/use-update-upholstery-list-order';
import { UPHOLSTERY_PICKER_REORDER_SHEET_ID } from '../surfaces';
import {
  type UpholsteryPickerOption,
  type UpholsteryQuickFilter,
  UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
} from '../types';

const FILTER_INDEXES: Record<UpholsteryQuickFilter, number> = {
  in_stock: 0,
  out_of_stock: 1,
  favorite: 2,
};

export function useUpholsteryPickerController(searchQuery: string) {
  const [activeFilter, setActiveFilter] = useState<UpholsteryQuickFilter>('in_stock');
  const previousFilterIndexRef = useRef(0);
  const [direction, setDirection] = useState(1);

  // Three parallel queries — pre-fetched on mount, cached for instant switching.
  const inStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: true });
  const outOfStockQuery = useUpholsteryPickerOptionsQuery({ in_stock: false });
  const favoritesQuery = useUpholsteryPickerOptionsQuery({ favorite: true });
  const searchQuery_ = useUpholsteryPickerOptionsQuery(
    { q: searchQuery },
    { enabled: searchQuery.trim().length > 0 },
  );

  const toggleFavoriteAction = useToggleUpholsteryFavorite();
  const updateListOrderAction = useUpdateUpholsteryListOrder();

  function handleFilterChange(filter: UpholsteryQuickFilter) {
    const newIndex = FILTER_INDEXES[filter];
    const prevIndex = previousFilterIndexRef.current;
    setDirection(newIndex > prevIndex ? 1 : -1);
    previousFilterIndexRef.current = newIndex;
    setActiveFilter(filter);
  }

  function getActiveQueryResult() {
    if (searchQuery.trim().length > 0) {
      return {
        upholsteries: searchQuery_.data?.upholsteries ?? [],
        isLoading: searchQuery_.isPending,
      };
    }
    switch (activeFilter) {
      case 'in_stock':
        return { upholsteries: inStockQuery.data?.upholsteries ?? [], isLoading: inStockQuery.isPending };
      case 'out_of_stock':
        return { upholsteries: outOfStockQuery.data?.upholsteries ?? [], isLoading: outOfStockQuery.isPending };
      case 'favorite':
        return { upholsteries: favoritesQuery.data?.upholsteries ?? [], isLoading: favoritesQuery.isPending };
    }
  }

  const { upholsteries, isLoading } = getActiveQueryResult();

  function openReorderSheet(clientId: string) {
    useSurfaceStore.getState().open(UPHOLSTERY_PICKER_REORDER_SHEET_ID, { clientId });
  }

  return {
    // Filter state
    activeFilter,
    direction,
    filterOptions: UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
    onFilterChange: handleFilterChange,

    // Current list
    upholsteries,
    isLoading,

    // Actions
    toggleFavorite: (clientId: string, currentFavorite: boolean) =>
      toggleFavoriteAction.toggleFavorite({ client_id: clientId, favorite: !currentFavorite }),
    openReorderSheet,
  };
}

export type UpholsteryPickerController = ReturnType<typeof useUpholsteryPickerController>;
```

> **Note:** The controller takes `searchQuery` as a parameter (the debounced value) rather than owning its own `useState` for search. The page owns the raw + debounced search state (same pattern as the original page) and passes the debounced value to the controller.

---

### Step 8 — Create `components/UpholsteryPickerHeader.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/components/UpholsteryPickerHeader.tsx`

Extracted from the page. Renders the search bar and the three quick-filter pills using `BoxPicker` with `visualVariant="pill"` + `mode="single"` wrapped in `HorizontalScrollArea` (matching the TasksHeader pattern).

```tsx
import { BoxPicker, HorizontalScrollArea } from '@/components/primitives';
import { UpholsterySearch } from './UpholsterySearch';
import {
  type UpholsteryQuickFilter,
  UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS,
} from '../types';

type UpholsteryPickerHeaderProps = {
  q: string;
  activeFilter: UpholsteryQuickFilter;
  description?: string;
  onQChange: (value: string) => void;
  onFilterChange: (filter: UpholsteryQuickFilter) => void;
};

export function UpholsteryPickerHeader({
  q,
  activeFilter,
  description,
  onQChange,
  onFilterChange,
}: UpholsteryPickerHeaderProps): React.JSX.Element {
  return (
    <div
      className="sticky top-0 z-10 border-b border-border bg-background"
      data-testid="upholstery-picker-header"
    >
      <div className="px-4 pt-3 pb-2">
        <UpholsterySearch value={q} onChange={onQChange} />
        {description ? (
          <p
            className="mt-2 text-sm text-muted-foreground"
            data-testid="upholstery-picker-description"
          >
            {description}
          </p>
        ) : null}
      </div>

      <HorizontalScrollArea className="pb-3">
        <BoxPicker
          className="flex flex-nowrap flex-row gap-1.5 px-4"
          data-testid="upholstery-quick-filter-pills"
          layout="stack"
          mode="single"
          options={UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS}
          size="xs"
          showDescription={false}
          showIcon={false}
          value={activeFilter}
          visualVariant="pill"
          onValueChange={onFilterChange}
        />
      </HorizontalScrollArea>
    </div>
  );
}
```

---

### Step 9 — Update `components/UpholsteryCard.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/components/UpholsteryCard.tsx`

Add two new interactive elements on the right side of the card:

1. **Heart button** — toggles `favorite`. Renders as a filled red heart when `favorite === true`, outline when `false`. Sits to the right of the meter display. Uses a `button` type with `e.stopPropagation()` so it does not trigger `onSelect`.

2. **Sort handle button** — a gripper/sort icon (`GripVertical` from Lucide). Taps open the reorder sheet. Same stop-propagation pattern.

New props:
```ts
type UpholsteryCardProps = {
  record: UpholsteryPickerRecord;           // now includes favorite and list_order
  isSelected: boolean;
  onSelect: (clientId: string) => void;
  onToggleFavorite?: (clientId: string, currentFavorite: boolean) => void;
  onOpenReorder?: (clientId: string) => void;
  testId?: string;
};
```

The heart button is only rendered when `onToggleFavorite` is provided. The sort button is only rendered when `onOpenReorder` is provided. This keeps the card composable and backward-compatible.

**Color for heart:**
- `record.favorite === true`: `text-rose-500` (filled heart icon, `Heart` from Lucide with `fill="currentColor"`)
- `record.favorite === false`: `text-muted-foreground` (outline heart icon, `Heart` from Lucide, no fill)

**Required `data-testid` and ARIA attributes on the two new buttons:**

| Element | `data-testid` | Notes |
|---|---|---|
| Heart button | `upholstery-card-favorite-button` | Also set `aria-pressed={record.favorite}` so Playwright can assert toggle state without relying on visual styling |
| Reorder button | `upholstery-card-reorder-button` | No aria-pressed needed |

Lay out the right-side controls as a flex column or row. Suggested layout:
```
[image] [name/code] ... [meters + dot] [sort-btn] [heart-btn]
```

All controls are inline in the row, separated with small gaps.

---

### Step 10 — Create `components/UpholsteryDnDCard.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/components/UpholsteryDnDCard.tsx`

Used inside the reorder sheet as both the sortable list item and the `DragOverlay`. Same outer dimensions as `UpholsteryCard`. Layout:

```
[order-badge] [image] [name / code] ... [—]
```

- `orderBadge`: a small circular badge on the left showing the 1-based index (derived from array position during DnD, not the stored `list_order`).
- No select action (not a picker context).
- No heart button (not for favorites management here).
- Accepts `isDragOverlay?: boolean` — when true, adds `shadow-2xl` and `opacity-90` to signal it is floating.

Props:
```ts
type UpholsteryDnDCardProps = {
  record: UpholsteryPickerRecord;
  displayOrder: number;       // 1-based index in the current local sort
  isDragOverlay?: boolean;
};
```

Set `data-testid={`upholstery-dnd-card-${record.client_id}`}` on the card's root element so Playwright can assert on individual cards within the sheet.

---

### Step 11 — Create `pages/UpholsteryReorderSheetPage.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryReorderSheetPage.tsx`

**Purpose:** Full DnD sortable list inside a bottom sheet. The user drops a card to assign or change its `list_order`. The sheet auto-closes 2 s after the last successful drop.

Set `data-testid="upholstery-reorder-sheet"` on the page's root `div`. This is the Playwright selector used to assert the sheet is open or closed.

**Surface props:**
```ts
type UpholsteryReorderSheetPageProps = {
  clientId: string;   // the upholstery being reordered (highlighted in the list)
};
```

**Data sourcing:**
- Calls `useUpholsteryPickerOptionsQuery({})` (no filters — all items) to get all upholsteries.
- Derives `orderedItems`: filters to items where `list_order !== null` + the target item (if it has no order, append it at end). Sort by `list_order ASC nulls last`.
- `localOrder` is a `useState<UpholsteryPickerOption[]>` initialized from `orderedItems`. During DnD, `localOrder` is updated locally via `arrayMove` to show live order numbers.
- After settling server response, invalidation causes the parent query to refresh and `localOrder` re-syncs (only when DnD is not active).

**DnD setup (mirroring `ImageSortableGrid` pattern):**

Call `const updateListOrder = useUpdateUpholsteryListOrder()` directly in the page (no controller here — the sheet page is a standalone entry point).

Sensors: `TouchSensor` (delay 250ms, tolerance 8px) + `PointerSensor` (distance 6px).

**`SortableUpholsteryDnDCard` wrapper** — co-locate this as a module-level function inside `UpholsteryReorderSheetPage.tsx`, exactly like `SortableTile` wraps `ImagePreviewTile` in `ImageSortableGrid`:

```tsx
type SortableDnDCardProps = {
  record: UpholsteryPickerOption;
  displayOrder: number;
};

function SortableUpholsteryDnDCard({ record, displayOrder }: SortableDnDCardProps): React.JSX.Element {
  const { active } = useDndContext();
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: record.client_id,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0 : 1,                              // ghost while overlay floats
    transform: CSS.Transform.toString(transform),
    transition: active && !isDragging ? transition : undefined, // animate neighbors; snap on drop
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-none select-none"
      onContextMenu={(e) => e.preventDefault()}
      {...attributes}
      {...listeners}
    >
      <UpholsteryDnDCard record={record} displayOrder={displayOrder} />
    </div>
  );
}
```

**`SortableContext` and `DragOverlay`:**

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={localOrder.map((item) => item.client_id)}
    strategy={verticalListSortingStrategy}
  >
    {localOrder.map((item, index) => (
      <SortableUpholsteryDnDCard
        key={item.client_id}
        record={item}
        displayOrder={index + 1}
      />
    ))}
  </SortableContext>

  <DragOverlay dropAnimation={null}>
    {activeId ? (
      <UpholsteryDnDCard
        record={localOrder.find((item) => item.client_id === activeId)!}
        displayOrder={localOrder.findIndex((item) => item.client_id === activeId) + 1}
        isDragOverlay
      />
    ) : null}
  </DragOverlay>
</DndContext>
```

On `dragEnd`: compute `newIndex` as the 1-based position in the new `arrayMove` result, call `updateListOrder.updateListOrder({ client_id: activeId, list_order: newIndex })`. Start the 2-second auto-close timer. If another drag starts, cancel the timer via `clearTimeout`.

**Sheet gesture conflict:** None. `BottomSheetSurface` uses vaul's `handleOnly` prop, which restricts swipe-to-dismiss to the handle pill only. The content area is fully available for DnD gestures without interference.

**Auto-close:**
```ts
const autoCloseTimerRef = useRef<number | null>(null);
const header = useSurfaceHeader();

function scheduleAutoClose() {
  if (autoCloseTimerRef.current) window.clearTimeout(autoCloseTimerRef.current);
  autoCloseTimerRef.current = window.setTimeout(() => {
    header?.requestClose();
  }, 2000);
}
```

Call `scheduleAutoClose()` inside `handleDragEnd` after calling `updateListOrder`.

Cancel the timer in `handleDragStart`:
```ts
if (autoCloseTimerRef.current) window.clearTimeout(autoCloseTimerRef.current);
```

Clean up on unmount:
```ts
useEffect(() => {
  return () => {
    if (autoCloseTimerRef.current) window.clearTimeout(autoCloseTimerRef.current);
  };
}, []);
```

**Loading state:** Show a skeleton list (`animate-pulse rounded-xl bg-muted h-16`) while the picker query is loading.

---

### Step 12 — Update `surfaces.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/surfaces.ts`

Export the new surface ID constant and register the reorder sheet alongside the existing picker slide. Use `lazyWithPreload` for the new sheet (matching the task surfaces pattern):

```ts
import { lazy } from 'react';
import { lazyWithPreload } from '@/utils/lazy-with-preload';
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const UPHOLSTERY_PICKER_SLIDE_ID = 'upholstery-picker';
export const UPHOLSTERY_PICKER_REORDER_SHEET_ID = 'upholstery-picker-reorder-sheet';

function loadUpholsteryPickerSlidePage() {
  return import('@/features/upholstery/pages/UpholsteryPickerSlidePage').then((module) => ({
    default: module.UpholsteryPickerSlidePage,
  }));
}

function loadUpholsteryReorderSheetPage() {
  return import('@/features/upholstery/pages/UpholsteryReorderSheetPage').then((module) => ({
    default: module.UpholsteryReorderSheetPage,
  }));
}

const upholsteryReorderSheet = lazyWithPreload(loadUpholsteryReorderSheetPage);

export const upholsterySurfaces: SurfaceRegistrations = {
  [UPHOLSTERY_PICKER_SLIDE_ID]: {
    surface: 'slide',
    component: lazy(loadUpholsteryPickerSlidePage),
  },
  [UPHOLSTERY_PICKER_REORDER_SHEET_ID]: {
    surface: 'sheet',
    component: upholsteryReorderSheet.Component,
  },
};
```

> The existing picker slide keeps using `lazy` (no preload needed for it currently). The reorder sheet uses `lazyWithPreload` in case preload is needed in the future.

---

### Step 13 — Refactor `pages/UpholsteryPickerSlidePage.tsx`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx`

Full rewrite using the controller and animated body switching.

**Animation setup:**
Direction-aware horizontal slide using `AnimatePresence` with `custom` prop.

```ts
const bodyVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    transition: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
  }),
};
```

**Body switching:**
- `AnimatePresence mode="sync"` wraps the body `m.div`. `"sync"` plays the exit and enter animations simultaneously — the outgoing panel slides out while the incoming panel slides in, producing the expected horizontal page-flip feel. The outer container uses `position: relative; overflow: hidden` to clip both panels during the transition.
- The `key` of the body is `activeFilter` (changes key = triggers enter/exit).
- `custom={direction}` passed to `AnimatePresence` and to the `m.div`.
- Wrap the body area in `overflow-hidden` so sliding panels don't escape the container.

**Search state (local, not in controller):**
- Raw `searchQuery` state + 300 ms debounce in `useEffect` (same pattern as original page).
- Debounced value passed to controller.
- When `searchQuery.trim().length > 0`, the pills are visually disabled (lower opacity, non-interactive) — the search results override the filter view. When search is cleared, pills restore to active.

**Full page structure:**
```tsx
<div className="flex min-h-full flex-col overflow-hidden" data-testid="upholstery-picker-slide-page">
  <UpholsteryPickerHeader
    q={searchQuery}
    activeFilter={controller.activeFilter}
    description={description}
    onQChange={setSearchQuery}
    onFilterChange={controller.onFilterChange}
  />

  <div className="relative flex flex-1 overflow-hidden">
    <AnimatePresence custom={controller.direction} initial={false} mode="sync">
      <m.div
        key={controller.activeFilter}
        custom={controller.direction}
        variants={bodyVariants}
        initial="enter"
        animate="center"
        exit="exit"
        className="absolute inset-0 flex flex-col gap-3 overflow-y-auto px-4 py-4"
        data-testid={`upholstery-picker-body-${controller.activeFilter}`}
      >
        {/* loading, empty, or list */}
      </m.div>
    </AnimatePresence>
  </div>
</div>
```

**List rendering inside body:**
```tsx
{controller.isLoading && controller.upholsteries.length === 0 ? (
  <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
) : controller.upholsteries.length > 0 ? (
  controller.upholsteries.map((record) => (
    <UpholsteryCard
      key={record.client_id}
      record={record}
      isSelected={record.client_id === currentClientId}
      onSelect={handleSelect}
      onToggleFavorite={controller.toggleFavorite}
      onOpenReorder={controller.openReorderSheet}
      testId={`upholstery-card-${record.client_id}`}
    />
  ))
) : (
  <p className="py-8 text-center text-sm text-muted-foreground">No results.</p>
)}
```

**Remove:**
- `useUpholsteryPickerFlow` import and usage.
- `useUpholsteryPickerOptionsQuery` direct usage from the page.
- `useEffect`-based debounce can be replaced with local debounce as before (or extracted to `useDebounce` utility hook if one already exists).

---

### Step 14 — Remove deprecated flow and store

Delete:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/flows/use-upholstery-picker.flow.ts`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/store/upholstery-selection.store.ts`

Before deleting, verify with `grep -r "useUpholsterySelectionStore\|useUpholsteryPickerFlow"` that these are not imported outside the upholstery feature. If any outside imports are found, update those consumers first.

---

### Step 15 — Update `index.ts` public API

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/upholstery/index.ts`

- Remove exports of `useUpholsteryPickerFlow` and `useUpholsterySelectionStore`.
- Add exports for new public API:
  - `type UpholsteryQuickFilter`
  - `UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS`
  - `type ToggleFavoriteInput`
  - `type UpdateListOrderInput`
  - `UPHOLSTERY_PICKER_REORDER_SHEET_ID` (from surfaces)
- Keep existing exports: `UpholsteryPickerOptionSchema`, `formatMeters`, `useUpholsteryPickerOptionQuery`, `upholsterySurfaces`.

---

### Step 16 — Vitest tests

#### `actions/use-toggle-upholstery-favorite.test.ts`

Test:
1. Optimistic `favorite` toggle is applied to all active picker list caches on `onMutate`.
2. When `favorite=false` is applied to a cache that was fetched with `{ favorite: true }`, the item is removed from that cache optimistically.
3. Cache is restored to snapshots on mutation error.
4. All `pickerLists()` are invalidated on `onSettled`.

Use MSW to mock `PATCH /api/v1/upholsteries/:id/favorite`. Render with `renderHook` inside a `QueryClientProvider`.

#### `actions/use-update-upholstery-list-order.test.ts`

Test:
1. Optimistic `list_order` is applied to the target item across all active picker list caches.
2. Cache rolls back on error.
3. All `pickerLists()` are invalidated on `onSettled`.

#### `components/UpholsteryCard.test.tsx`

Test (update/extend existing test file):
1. Heart button renders when `onToggleFavorite` is provided.
2. Tapping heart button calls `onToggleFavorite` with `(clientId, currentFavorite)`.
3. Heart button does NOT trigger `onSelect`.
4. Sort button renders when `onOpenReorder` is provided.
5. Tapping sort button calls `onOpenReorder(clientId)` without triggering `onSelect`.
6. Heart icon is filled / styled differently when `record.favorite === true` vs `false` (assert `aria-pressed` attribute difference).

---

### Step 17 — Playwright runtime validation spec

**File:** `tests/playwright/features/upholstery/upholstery-picker.spec.ts`

Import from `../../fixtures/app-fixture` (never from `@playwright/test` directly). All API responses are mocked via `page.route()` for determinism. The `withDelayedRoute` helper from `../../helpers/assert-optimistic` is used for optimistic update assertions.

**Test fixture data (define at the top of the spec):**

```ts
const IN_STOCK_RESPONSE = {
  ok: true, warnings: [],
  data: {
    upholsteries: [
      { client_id: 'uph_TEST_IN_STOCK_01', name: 'Linen Mist', code: 'LIN-MST',
        image_url: null, favorite: false, list_order: null,
        current_stored_amount_meters: '12.000', inventory_condition: 'available' },
    ],
    upholsteries_pagination: { has_more: false, limit: 50, offset: 0 },
  },
};

const OUT_OF_STOCK_RESPONSE = {
  ok: true, warnings: [],
  data: {
    upholsteries: [
      { client_id: 'uph_TEST_OUT_STOCK_01', name: 'Velvet Noir', code: 'VLV-NR',
        image_url: null, favorite: false, list_order: null,
        current_stored_amount_meters: '0.000', inventory_condition: 'out_of_stock' },
    ],
    upholsteries_pagination: { has_more: false, limit: 50, offset: 0 },
  },
};

const FAVORITES_RESPONSE = {
  ok: true, warnings: [],
  data: {
    upholsteries: [
      { client_id: 'uph_TEST_FAV_01', name: 'Cotton Cloud', code: 'CTN-CLD',
        image_url: null, favorite: true, list_order: 1,
        current_stored_amount_meters: '8.000', inventory_condition: 'available' },
    ],
    upholsteries_pagination: { has_more: false, limit: 50, offset: 0 },
  },
};
```

**Route helper (use in `test.beforeEach` or inline per test):**

```ts
async function mockUpholsteryRoutes(page: Page) {
  await page.route('**/api/v1/upholsteries**', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('in_stock') === 'true')
      return route.fulfill({ json: IN_STOCK_RESPONSE });
    if (url.searchParams.get('in_stock') === 'false')
      return route.fulfill({ json: OUT_OF_STOCK_RESPONSE });
    if (url.searchParams.get('favorite') === 'true')
      return route.fulfill({ json: FAVORITES_RESPONSE });
    return route.fulfill({ json: IN_STOCK_RESPONSE }); // fallback: all-items query (reorder sheet)
  });
}
```

> **Codex note:** The upholstery picker opens as a slide surface from an item or task upholstery field. Navigate to the most direct location in the app that has an upholstery field trigger, open the picker from there, and run the assertions. Choose a task or item detail that already exists in the test environment. If no such record is reliably available, mock the task/item detail API response as well and open the picker programmatically via `page.evaluate(() => useSurfaceStore.getState().open('upholstery-picker', {}))`.

---

#### Test group 1 — Three parallel queries fire on mount

```ts
test('fires three parallel queries on mount — in_stock, out_of_stock, favorite', async ({ page, auth }) => {
  await auth.signIn();

  const requests: string[] = [];
  await page.route('**/api/v1/upholsteries**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.search);
    await route.fulfill({ json: IN_STOCK_RESPONSE });
  });

  // Open the picker (navigate to trigger and tap it)
  // ... (Codex: insert navigation + trigger tap here)
  await expect(page.getByTestId('upholstery-picker-slide-page')).toBeVisible();

  // All three filter queries must have fired
  expect(requests.some((q) => q.includes('in_stock=true'))).toBe(true);
  expect(requests.some((q) => q.includes('in_stock=false'))).toBe(true);
  expect(requests.some((q) => q.includes('favorite=true'))).toBe(true);
});
```

---

#### Test group 2 — Quick filter pill switching

```ts
test('switching to Out of Stock pill shows out-of-stock body', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  // ... open picker
  await expect(page.getByTestId('upholstery-picker-header')).toBeVisible();

  await page.getByTestId('upholstery-quick-filter-pills').getByText('Out of Stock').click();

  await expect(page.getByTestId('upholstery-picker-body-out_of_stock')).toBeVisible();
  await expect(page.getByTestId('upholstery-picker-body-in_stock')).not.toBeVisible();
});

test('switching back to In Stock shows in-stock body', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  // ... open picker
  await page.getByTestId('upholstery-quick-filter-pills').getByText('Out of Stock').click();
  await page.getByTestId('upholstery-quick-filter-pills').getByText('In Stock').click();

  await expect(page.getByTestId('upholstery-picker-body-in_stock')).toBeVisible();
});

test('switching to Favorites pill shows favorites body', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  // ... open picker
  await page.getByTestId('upholstery-quick-filter-pills').getByText('♡ Favorites').click();

  await expect(page.getByTestId('upholstery-picker-body-favorite')).toBeVisible();
});
```

---

#### Test group 3 — Favorite toggle (optimistic + rollback)

```ts
test('heart button toggles aria-pressed optimistically before server confirms', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  // ... open picker

  const heartBtn = page.getByTestId('upholstery-card-favorite-button').first();
  await expect(heartBtn).toHaveAttribute('aria-pressed', 'false');

  const { resolve } = await withDelayedRoute(
    page,
    '**/api/v1/upholsteries/*/favorite',
    'PATCH',
    async () => { await heartBtn.click(); },
  );

  // Optimistic: aria-pressed must flip before server responds
  await expect(heartBtn).toHaveAttribute('aria-pressed', 'true');

  // Resolve server response — state must persist
  resolve();
  await expect(heartBtn).toHaveAttribute('aria-pressed', 'true');
});

test('heart button reverts aria-pressed on server failure', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  await page.route('**/api/v1/upholsteries/*/favorite', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'Server error' }),
    }),
  );
  // ... open picker

  const heartBtn = page.getByTestId('upholstery-card-favorite-button').first();
  await heartBtn.click();

  // Rollback: aria-pressed must revert to false
  await expect(heartBtn).toHaveAttribute('aria-pressed', 'false');
});
```

---

#### Test group 4 — Reorder sheet open and DnD

```ts
test('tapping reorder button opens the reorder sheet', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  // ... open picker

  await page.getByTestId('upholstery-card-reorder-button').first().click();
  await expect(page.getByTestId('upholstery-reorder-sheet')).toBeVisible();
});

test('drag-drop in reorder sheet sends PATCH list-order with correct payload', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  // ... open picker and reorder sheet

  // Wait for the mock data to render DnD cards
  const firstCard = page.getByTestId('upholstery-dnd-card-uph_TEST_IN_STOCK_01');
  await expect(firstCard).toBeVisible();

  const listOrderRequest = page.waitForRequest(
    (req) => req.url().includes('/list-order') && req.method() === 'PATCH',
  );

  // Simulate drag: pick up the first card and drop it below itself
  const box = await firstCard.boundingBox();
  if (!box) throw new Error('DnD card not found');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 2.5, { steps: 15 });
  await page.mouse.up();

  const req = await listOrderRequest;
  expect(req.postDataJSON()).toMatchObject({ list_order: expect.any(Number) });
});

test('reorder sheet auto-closes within 3 s after a drop', async ({ page, auth }) => {
  await auth.signIn();
  await mockUpholsteryRoutes(page);
  await page.route('**/api/v1/upholsteries/*/list-order', (route) =>
    route.fulfill({ json: { ok: true, warnings: [], data: { upholstery: FAVORITES_RESPONSE.data.upholsteries[0] } } }),
  );
  // ... open picker and reorder sheet

  // Perform a drag-drop
  const firstCard = page.getByTestId('upholstery-dnd-card-uph_TEST_IN_STOCK_01');
  const box = await firstCard.boundingBox();
  if (!box) throw new Error('DnD card not found');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 2.5, { steps: 15 });
  await page.mouse.up();

  // Sheet should auto-close after ~2 s — wait up to 3.5 s
  await expect(page.getByTestId('upholstery-reorder-sheet')).not.toBeVisible({ timeout: 3500 });
});
```

---

**Run commands (mobile first):**

```
npm run test:e2e:mobile -- --grep "upholstery-picker"
npm run test:e2e:desktop -- --grep "upholstery-picker"
```

Both projects must pass before the implementation is considered complete.

---

## Risks and mitigations

- **Risk:** `setQueriesData` with a callback that receives `(old, key)` — TanStack Query v5 does not pass `key` as the second argument to the updater callback.
  **Mitigation:** Use `queryClient.getQueriesData` to get snapshot + key pairs, then iterate and call `queryClient.setQueryData(key, updater(old))` per key in `onMutate`. This gives full access to the key for the favorites-view removal logic. See the contract's `previousLists.forEach(([key, data]) => ...)` pattern — the same `previousLists` array can be re-iterated with a custom updater.

  Concretely:
  ```ts
  onMutate: async ({ client_id, favorite }) => {
    await queryClient.cancelQueries({ queryKey: upholsteryKeys.pickerLists() });

    const previousLists = queryClient.getQueriesData<PickerListData>({
      queryKey: upholsteryKeys.pickerLists(),
    });

    for (const [key, old] of previousLists) {
      if (!old) continue;
      const params = key[key.length - 1] as Record<string, unknown> | undefined;
      const isFavoriteView = params?.favorite === true;

      let next = old.upholsteries.map((item) =>
        item.client_id === client_id ? { ...item, favorite } : item,
      );
      if (isFavoriteView && !favorite) {
        next = next.filter((item) => item.client_id !== client_id);
      }
      queryClient.setQueryData(key, { ...old, upholsteries: next });
    }

    return { previousLists };
  },
  ```

- **Risk:** Both slide panels are in the DOM simultaneously during a `mode="sync"` transition, and without a clipping container the exiting panel can bleed outside the viewport.
  **Mitigation:** The outer body wrapper uses `position: relative; overflow: hidden` (already specified in the page structure above) — this clips both panels to the container bounds during transition. No further action needed.

- **Risk:** Auto-close timer in the reorder sheet closes while the user is mid-interaction (e.g., hesitating between drags).
  **Mitigation:** Only start the auto-close timer after `handleDragEnd` successfully fires (i.e., after a drop event completes). Cancel it on `handleDragStart`. The user must complete a drag-and-drop cycle to start the timer — browsing the sheet without dragging does not trigger auto-close.

- **Risk:** `UpholsteryReorderSheetPage` re-syncs `localOrder` from the query data while the user is dragging, causing the list to jump.
  **Mitigation:** Use an `isDraggingRef` (same pattern as `ImageSortableGrid`) and only sync `localOrder` from query data when `!isDraggingRef.current`.

---

## Validation plan

1. `npm run typecheck` — zero TypeScript errors across all modified and new files.
2. `npm run test -- --grep upholstery` — all new and existing upholstery Vitest tests pass.
3. `npm run test:e2e:mobile -- --grep "upholstery-picker"` — all Playwright tests in `tests/playwright/features/upholstery/upholstery-picker.spec.ts` pass on the `mobile` project (iPhone 14 Pro, 390×844). Fix any failures before proceeding to desktop.
4. `npm run test:e2e:desktop -- --grep "upholstery-picker"` — same spec passes on the `desktop` project (1440×900).

Steps 3 and 4 are not optional. The implementation is not complete until both Playwright projects pass with zero console errors and zero uncaught exceptions.

---

## Review log

_(empty — awaiting implementation)_

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david` (user review) → `codex` (implementation)
