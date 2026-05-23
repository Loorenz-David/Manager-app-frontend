# PLAN_fix_tasks_null_primary_item_20260523

## Metadata

- Plan ID: `PLAN_fix_tasks_null_primary_item_20260523`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-23T00:00:00Z`
- Last updated at (UTC): `2026-05-23T10:33:06Z`
- Related plan: `PLAN_tasks_page_20260523` (archived)

## Goal and intent

- Goal: Fix task cards not rendering after a successful `GET /api/v1/tasks` fetch; and improve the tasks header UI — shrink state filter pills to `text-xs` and replace the thick native horizontal scrollbar with a custom 1 px thin primitive.
- Bug root cause: `primary_item` is nullable in the API response (tasks may exist without an associated item), but `TaskListItemRawSchema` defines `primary_item` as a non-nullable `z.object({...})`. When any item in the response has `"primary_item": null`, Zod throws inside `queryFn`, the query enters error state, `isLoading` goes false while `query.data` remains `undefined` — the loading skeleton disappears and no cards appear.
- Secondary bugs that would crash after fixing the schema: `normalizePageIntoStores` calls `item.primary_item.client_id` unconditionally (null dereference), and `ItemRecord` in `items.store.ts` is derived directly from the nullable schema field, which would make `next[item.client_id]` inside `setMany` crash on null.

## Scope

- In scope:
  - **Data bug (Steps 1–3)**: 3 targeted edits to fix the null `primary_item` parse failure
    - `features/tasks/types.ts` — make `primary_item` nullable in `TaskListItemRawSchema`
    - `features/tasks/store/items.store.ts` — narrow `ItemRecord` to the non-null shape
    - `features/tasks/api/use-list-tasks-query.ts` — guard `normalizePageIntoStores` against null `primary_item`
  - **UI fix (Steps 4–7)**: state filter pills smaller + custom thin horizontal scrollbar primitive
    - `components/primitives/box-picker/box-picker.types.ts` — add `BoxPickerSize` type and `size` prop
    - `components/primitives/box-picker/BoxPicker.tsx` — accept and forward `size` to options
    - `components/primitives/box-picker/BoxPickerOption.tsx` — apply `text-xs` and compact padding when `size='xs'`
    - `components/primitives/box-picker/index.ts` — export `BoxPickerSize`
    - `components/primitives/horizontal-scroll-area/` — new primitive (2 files)
    - `components/primitives/index.ts` — export `HorizontalScrollArea`
    - `features/tasks/components/TasksHeader.tsx` — use `size="xs"` pills + `HorizontalScrollArea`

- Out of scope:
  - The flow already handles null `itemId` gracefully (lines 67–69 of `use-tasks-page.flow.ts`), so tasks with no `primary_item` render as decoy cards automatically
  - Drag-to-scroll on the custom scrollbar (touch-only swipe on the content remains, thumb is display-only)

## Acceptance criteria

1. The tasks page renders a card for every task returned by the API, including those with `"primary_item": null`.
2. State filter pills in the tasks header use `text-xs` and compact padding (`px-3 py-1`) — visually smaller than before.
3. The native horizontal scrollbar under the state pills is hidden. A custom 1 px thin scrollbar indicator is rendered below the pill row; it updates its position and width as the user scrolls.
4. `HorizontalScrollArea` is a standalone primitive usable anywhere in the app with no coupling to the tasks feature.
5. `npm run typecheck` passes with zero errors.
6. Tasks with a `primary_item` continue to have their item data accessible via `useItemsStore`.

## Implementation plan

### Step 1 — `features/tasks/types.ts`

Add `.nullable()` to the `primary_item` field in `TaskListItemRawSchema`. This is the only change to the schema file.

```ts
// Before (line ~189):
primary_item: z.object({
  client_id: z.string(),
  article_number: z.string().nullable(),
  // ... all other fields ...
  item_major_category_snapshot: z.string().nullable(),
}),

// After:
primary_item: z.object({
  client_id: z.string(),
  article_number: z.string().nullable(),
  // ... all other fields unchanged ...
  item_major_category_snapshot: z.string().nullable(),
}).nullable(),
```

### Step 2 — `features/tasks/store/items.store.ts`

Narrow `ItemRecord` so it never includes `null`. The nullable is now in `TaskListItemRaw['primary_item']`; the store itself only holds resolved item records.

```ts
// Before:
type ItemRecord = TaskListItemRaw['primary_item'];

// After:
type ItemRecord = NonNullable<TaskListItemRaw['primary_item']>;
```

No other changes to this file.

### Step 3 — `features/tasks/api/use-list-tasks-query.ts`

Replace the `normalizePageIntoStores` function body to skip null `primary_item` items for the item/image stores while still registering every task:

```ts
function normalizePageIntoStores(items: TaskListItemRaw[]): void {
  const { setMany: setTasks, setTaskItemRelation } = useTasksStore.getState();
  const { setMany: setItems } = useItemsStore.getState();
  const { setForItem } = useTaskListImagesStore.getState();

  // Always register all tasks.
  setTasks(items.map((r) => r.task));

  // Tasks without a primary_item are valid (task created before an item is linked).
  // Skip item/image stores for those — the flow handles null itemId gracefully.
  const primaryItems: NonNullable<TaskListItemRaw['primary_item']>[] = [];

  for (const r of items) {
    const primaryItem = r.primary_item;
    if (primaryItem == null) continue;

    primaryItems.push(primaryItem);
    setTaskItemRelation(r.task.client_id, primaryItem.client_id);
    setForItem(
      primaryItem.client_id,
      r.item_images.map((image, index) =>
        toImageViewModelFromListItem(image, primaryItem.client_id, index),
      ),
    );
  }

  setItems(primaryItems);
}
```

---

### Step 4 — Extend `BoxPicker` with a `size` prop

Three files inside `components/primitives/box-picker/`:

**`box-picker.types.ts`** — add the size type and the prop:

```ts
// Add after the existing type exports:
export type BoxPickerSize = 'sm' | 'xs';
```

Add `size?: BoxPickerSize` to `BoxPickerProps` (inside the shared `& { ... }` intersection):

```ts
export type BoxPickerProps<Value extends string = string> = (
  | BoxPickerSingleProps<Value>
  | BoxPickerMultipleProps<Value>
) & {
  // ... existing props ...
  size?: BoxPickerSize;   // ADD
};
```

**`BoxPicker.tsx`** — destructure `size` (default `'sm'`) and forward to each option:

```ts
export function BoxPicker<Value extends string = string>({
  // ... existing props ...
  size = 'sm',   // ADD
}: BoxPickerProps<Value>) {
  // ... existing logic ...

  return (
    <div ...>
      {options.map((option) => (
        <BoxPickerOption
          // ... existing props ...
          size={size}   // ADD
        />
      ))}
    </div>
  );
}
```

**`BoxPickerOption.tsx`** — accept `size`, apply compact overrides for `xs`:

```ts
import type { BoxPickerSize, BoxPickerVisualVariant, BoxPickerOption as BoxPickerOptionType } from './box-picker.types';

type BoxPickerOptionProps<Value extends string> = {
  // ... existing props ...
  size?: BoxPickerSize;   // ADD (default 'sm')
};

export function BoxPickerOption<Value extends string>({
  // ... existing destructuring ...
  size = 'sm',   // ADD
}: BoxPickerOptionProps<Value>) {
  // ...
  return (
    <div
      className={cn(
        boxOptionVariants({ visualVariant, selected: isSelected }),
        // Compact overrides for xs pill — reduce height, padding, min-height.
        size === 'xs' && visualVariant === 'pill' && 'px-3 py-1 min-h-0',
        optionClassName,
        isSelected && selectedOptionClassName,
        !isSelected && unselectedOptionClassName,
        option.disabled && disabledOptionClassName,
      )}
      // ... other props unchanged ...
    >
      <span ...>
        {showIcon && Icon ? <Icon className="size-5 shrink-0" /> : null}
        <span className="flex min-w-0 flex-col gap-0.5">
          {showLabel ? (
            // Text size is driven by size prop — xs → text-xs, sm → text-sm (default).
            <span className={cn('truncate font-medium', size === 'xs' ? 'text-xs' : 'text-sm')}>
              {option.label}
            </span>
          ) : null}
          {/* description unchanged */}
        </span>
      </span>
      {/* renderSelectedAction unchanged */}
    </div>
  );
}
```

**`box-picker/index.ts`** — add `BoxPickerSize` to type exports:

```ts
export type {
  BoxPickerOption as BoxPickerOptionType,
  BoxPickerProps,
  BoxPickerLayout,
  BoxPickerSelectionMode,
  BoxPickerVisualVariant,
  BoxPickerSize,   // ADD
} from './box-picker.types';
```

---

### Step 5 — Create `HorizontalScrollArea` primitive

Create the folder `components/primitives/horizontal-scroll-area/` with two files.

**`HorizontalScrollArea.tsx`**:

```tsx
import { useCallback, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

export type HorizontalScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
  'data-testid'?: string;
};

export function HorizontalScrollArea({
  children,
  className,
  trackClassName,
  thumbClassName,
  'data-testid': testId,
}: HorizontalScrollAreaProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Direct DOM updates — no React state, so scroll events cause zero re-renders.
  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!el || !thumb || !track) return;

    const { clientWidth, scrollWidth, scrollLeft } = el;
    const ratio = clientWidth / scrollWidth;

    if (ratio >= 1) {
      track.style.visibility = 'hidden';
      return;
    }

    track.style.visibility = 'visible';
    const trackWidth = track.clientWidth;
    const thumbWidth = Math.max(ratio * trackWidth, 24); // 24 px min for tap-ability
    const maxScroll = scrollWidth - clientWidth;
    const thumbLeft = maxScroll > 0 ? (scrollLeft / maxScroll) * (trackWidth - thumbWidth) : 0;

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translateX(${thumbLeft}px)`;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateThumb();
    el.addEventListener('scroll', updateThumb, { passive: true });

    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);
    // Observe first child so content-width changes (e.g. items added) update the thumb.
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    return () => {
      el.removeEventListener('scroll', updateThumb);
      ro.disconnect();
    };
  }, [updateThumb]);

  return (
    <div className="flex flex-col" data-testid={testId}>
      {/* Scroll container — native scrollbar hidden cross-browser */}
      <div
        ref={scrollRef}
        className={cn(
          'overflow-x-auto overflow-y-hidden scrollbar-none [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {children}
      </div>

      {/* 1 px custom scrollbar track */}
      <div
        ref={trackRef}
        className={cn('relative mx-4 mt-1.5 h-px rounded-full bg-muted/30', trackClassName)}
      >
        <div
          ref={thumbRef}
          className={cn(
            'absolute left-0 top-0 h-full rounded-full bg-muted-foreground/30',
            thumbClassName,
          )}
        />
      </div>
    </div>
  );
}
```

**`index.ts`**:

```ts
export { HorizontalScrollArea } from './HorizontalScrollArea';
export type { HorizontalScrollAreaProps } from './HorizontalScrollArea';
```

---

### Step 6 — Export from `components/primitives/index.ts`

Add exports at the end of the existing primitives barrel:

```ts
export { HorizontalScrollArea } from './horizontal-scroll-area';
export type { HorizontalScrollAreaProps } from './horizontal-scroll-area';
```

Also add `BoxPickerSize` to the existing box-picker type export block:

```ts
export type {
  BoxPickerLayout,
  BoxPickerOptionType,
  BoxPickerProps,
  BoxPickerSelectionMode,
  BoxPickerVisualVariant,
  BoxPickerSize,   // ADD
} from './box-picker';
```

---

### Step 7 — Update `features/tasks/components/TasksHeader.tsx`

Two changes in this file.

1. Import `HorizontalScrollArea`:

```ts
// The BoxPicker, BoxSlidePicker, SearchBar import already uses @/components/primitives.
// Add HorizontalScrollArea to that same import:
import { BoxPicker, BoxSlidePicker, HorizontalScrollArea, SearchBar } from '@/components/primitives';
```

2. Replace the native-scrollbar `div` wrapper with `HorizontalScrollArea`, and add `size="xs"` to `BoxPicker`:

```tsx
// Before:
<div className="overflow-x-auto pb-2">
  <BoxPicker
    className="flex flex-nowrap flex-row gap-1.5 px-4"
    ...
    visualVariant="pill"
    ...
  />
</div>

// After:
<HorizontalScrollArea className="pb-2">
  <BoxPicker
    className="flex flex-nowrap flex-row gap-1.5 px-4"
    ...
    size="xs"
    visualVariant="pill"
    ...
  />
</HorizontalScrollArea>
```

---

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `features/tasks/types.ts` | Add `.nullable()` to `primary_item` in `TaskListItemRawSchema` |
| `features/tasks/store/items.store.ts` | Change `ItemRecord` to `NonNullable<TaskListItemRaw['primary_item']>` |
| `features/tasks/api/use-list-tasks-query.ts` | Guard `normalizePageIntoStores` against null `primary_item` |
| `components/primitives/box-picker/box-picker.types.ts` | Add `BoxPickerSize` type; add `size?: BoxPickerSize` to `BoxPickerProps` |
| `components/primitives/box-picker/BoxPicker.tsx` | Accept `size` prop (default `'sm'`); pass `size` to each `BoxPickerOption` |
| `components/primitives/box-picker/BoxPickerOption.tsx` | Accept `size` prop; apply `px-3 py-1 min-h-0` + `text-xs` when `size='xs'` on pill |
| `components/primitives/box-picker/index.ts` | Export `BoxPickerSize` from `./box-picker.types` |
| `components/primitives/index.ts` | Export `HorizontalScrollArea` + `HorizontalScrollAreaProps`; export `BoxPickerSize` |
| `features/tasks/components/TasksHeader.tsx` | Import `HorizontalScrollArea`; wrap pill row with it; add `size="xs"` to `BoxPicker` |

### New files to create

| Path (relative to `src/`) |
|---|
| `components/primitives/horizontal-scroll-area/HorizontalScrollArea.tsx` |
| `components/primitives/horizontal-scroll-area/index.ts` |

## Validation plan

- `npm run typecheck`: zero errors
- Manual (data bug): navigate to tasks page → cards render for all tasks including those with `"primary_item": null`
- Manual (UI): state filter pills are visibly smaller; native scrollbar is hidden; a thin 1 px indicator appears below the pills when content overflows; the indicator tracks scroll position correctly

## Review log

_(empty — awaiting implementation)_

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `davidloorenz`
