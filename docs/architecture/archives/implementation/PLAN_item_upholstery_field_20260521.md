# PLAN_item_upholstery_field_20260521

## Metadata

- Plan ID: `PLAN_item_upholstery_field_20260521`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T16:27:28Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Build a reusable upholstery selection field system composed of a form field trigger, a full-page slide picker surface, a search orchestration component, and presentation cards. Initial data is static mocked data; architecture must be API-ready.
- **Business/user intent:** Allow item forms to assign an upholstery by client_id via a searchable, scrollable picker that immediately resolves the selection and closes the surface.
- **Non-goals:** API fetching, TanStack Query integration, pagination, infinite scroll, RHF form context (the field is a controlled component; RHF wiring lives in the parent form), optimistic updates, filter chips/advanced filters beyond sort.

## Scope

- **In scope:**
  - `UpholsteryPickerRecord` type + `TEST_UPHOLSTERIES` mocked dataset
  - `UpholsteryCard` — presentation card (image, name, code, meters, selected state)
  - `UpholsterySearch` — search orchestration component wrapping `SearchBar` primitive
  - `UpholsteryPickerSlidePage` — full-page slide surface (sticky search header + scrolling card list)
  - `upholstery-picker` surface registration in `upholstery/surfaces.ts`
  - `ItemUpholsteryField` — controlled form field trigger (empty/selected states, opens picker)
  - `ItemUpholsteryFieldsSchema` Zod field composition schema added to `items/types.ts`
  - Vitest unit tests for `UpholsteryCard`, `UpholsterySearch`, `ItemUpholsteryField`
  - `surface-registry.ts` updated to include `upholsterySurfaces`
  - `upholstery/index.ts` updated to export new public types and surfaces

- **Out of scope:**
  - Route registration (`router.tsx`, `routes.ts`) — the slide surface operates without a URI path, matching the existing `testing-forms-slide` and `test-slide` pattern in this app
  - API query hooks for upholstery list or current selection hydration
  - Filter chip UI beyond sort order toggle
  - Playwright e2e spec (deferred to first complete feature adoption pass)
  - Image upload or upholstery creation

- **Assumptions:**
  - `SearchBar` primitive is already implemented and exported from `@/components/primitives` (PLAN_search_bar_primitive_20260521 is complete)
  - `SlidePageSurface` operates without a `path` property, matching the `testing-forms-slide` pattern
  - `useSurfaceStore.getState().closeTop()` is the correct imperative close pattern (confirmed from `ItemCategoryPickerSheetPage`)
  - `FOCUS_WITHIN_RING` and `DISABLED_BASE` are exported from `@/components/primitives/shared/primitive-base.ts`
  - `useSurface()` hook is at `@/hooks/use-surface`
  - `useSurfaceProps()` hook is at `@/hooks/use-surface-props`
  - `useSurfaceHeader()` hook is at `@/hooks/use-surface-header`

## Clarifications required

_None — all questions resolved from codebase inspection._

## Acceptance criteria

1. `UpholsteryCard` renders upholstery `name`, `code` (or null gracefully), and formatted meters (`"1.05 m"`) from `current_available_amount_meters`
2. `UpholsteryCard` renders the `image` as a rounded image element
3. `UpholsteryCard` applies `bg-primary text-card` styles when `isSelected=true`; default card styles otherwise; CSS `transition-colors duration-150` handles the change
4. `UpholsterySearch` calls `onFilteredResults` with all items when `searchText` is empty
5. `UpholsterySearch` calls `onFilteredResults` with items whose `name` or `code` contain the search string (case-insensitive) when `searchText` is non-empty
6. `UpholsterySearch` toggles sort order (A→Z / Z→A by name) when the sort button is pressed; `SearchBar` active sort state is reflected via `activeFilterCount` or sort button visual (N/A — sort is always "active" but tracked separately from filter count; filter badge is 0 unless filters are set)
7. `UpholsteryPickerSlidePage` sets the surface title via `useSurfaceHeader()?.setTitle()` on mount using the `title` surface prop (fallback: `'Select upholstery'`)
8. `UpholsteryPickerSlidePage` renders a description paragraph when the `description` surface prop is provided
9. Selecting a card calls `onSelect(clientId)` from surface props and calls `useSurfaceStore.getState().closeTop()`
10. `ItemUpholsteryField` renders empty state (`placeholder` text + chevron icon) when `value` is `null | undefined`
11. `ItemUpholsteryField` renders selected upholstery name and code inline when `value` matches a `TEST_UPHOLSTERIES` entry; renders fallback ID text when no match is found
12. `ItemUpholsteryField` calls `surface.open('upholstery-picker', { currentClientId: value, onSelect: onChange, title, description })` when tapped
13. `upholstery-picker` is registered as `surface: 'slide'` with no `path` in `upholstery/surfaces.ts`
14. `ItemUpholsteryFieldsSchema` is added to `features/items/types.ts` with `upholstery_client_id: z.string().nullable().optional()`
15. `npm run typecheck` reports zero errors
16. `npm run test -- --grep upholstery` passes all unit tests

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: `forwardRef`, named exports, `cva`, `displayName`, controlled component shape
- `architecture/09_forms.md`: `Controller` integration for custom field components, schema-first field composition
- `architecture/14_styling.md`: `cn()`, `cva`, design token usage, no inline styles
- `architecture/15_feature_structure.md`: folder layout, layer responsibilities, `index.ts` public API boundary
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: `slide` surface type, `useSurfaceProps()`, `useSurfaceHeader()`, `useSurface().open()`, `SurfaceRegistrations` shape
- `architecture/31_animations.md`: CSS `transition-colors` for state color changes; no Framer Motion for selection toggle

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `slide` type maps to `SlidePageSurface`, no `drawer` type, `sheet` = Vaul, `modal` = center scale

### File read intent — pattern vs. relational

Permitted reads executed:
- `features/upholstery/types.ts` — actual `Upholstery` entity fields (`id`, `name`, `code`); existing `UpholsteryInventory` shape
- `features/items/types.ts` — existing `ItemUpholsterySchema`, `ItemDetailsFieldsSchema`, `ItemIssuesFieldsSchema` patterns
- `features/items/surfaces.ts` — surface registration pattern for `sheet` type and `lazy()` + `.then()` import shape
- `features/items/pages/ItemCategoryPickerSheetPage.tsx` — `useSurfaceProps()` callback pattern, `useSurfaceStore.getState().closeTop()` call
- `features/testing_forms/surfaces.ts` + `features/test_feature/surfaces.ts` — confirmed `slide` surface works without `path`
- `src/app/surface-registry.ts` — exact spread merge pattern and import structure
- `src/components/surfaces/SlidePageSurface.tsx` — `SurfaceHeaderContext` provided, header chrome structure, content scroll area

### Skill selection

- Primary skill: `architecture/28_surfaces.md` + local — surface registration and picker surface pattern
- Trigger terms: `surface`, `slide`, `picker`, `useSurfaceProps`, `form field`
- Excluded alternatives: `33_vaul_drawer.md` — not applicable; `slide` not `sheet`

## Domain schemas consulted

- `src/features/upholstery/types.ts`: `Upholstery` = `{ id: UpholsteryId, name: string, code: string | null, ... }`; `UpholsteryInventory` has `current_stored_amount_meters: string | null`; existing `metersFormatter` + `formatMeters()` utility reusable. No `image` field on real entity — mock data introduces it.
- `src/features/items/types.ts`: `ItemUpholsterySchema` has `client_id`, `upholstery_id`, `name`, `code`, `amount_meters`; `ItemIssuesFieldsSchema` establishes the field-composition schema pattern for separate concerns.

## Implementation plan

### Step 1 — Add `UpholsteryPickerRecord` type to `features/upholstery/types.ts`

Append after the existing view model section:

```ts
// ─── Picker record (mock shape — future: hydrated from API) ───────────────────

export type UpholsteryPickerRecord = {
  client_id: string;
  name: string;
  code: string | null;
  image: string;
  current_available_amount_meters: number;
};

export function formatPickerMeters(value: number): string {
  return `${metersFormatter.format(value)} m`;
}
```

`metersFormatter` is already defined in the file at module scope — reuse it.

---

### Step 2 — Create `features/upholstery/upholstery-test-data.ts`

```ts
import type { UpholsteryPickerRecord } from '@/features/upholstery/types';

export const TEST_UPHOLSTERIES: UpholsteryPickerRecord[] = [
  {
    client_id: 'uph_linen_natural',
    name: 'Natural Linen',
    code: 'LN-001',
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=80&h=80&fit=crop',
    current_available_amount_meters: 12.5,
  },
  {
    client_id: 'uph_velvet_midnight',
    name: 'Midnight Velvet',
    code: 'VL-002',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=80&h=80&fit=crop',
    current_available_amount_meters: 3.2,
  },
  {
    client_id: 'uph_cotton_offwhite',
    name: 'Off-White Cotton',
    code: 'CT-003',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=80&h=80&fit=crop',
    current_available_amount_meters: 8.0,
  },
  {
    client_id: 'uph_leather_tan',
    name: 'Tan Leather',
    code: 'LT-004',
    image: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=80&h=80&fit=crop',
    current_available_amount_meters: 20.75,
  },
  {
    client_id: 'uph_wool_charcoal',
    name: 'Charcoal Wool',
    code: null,
    image: 'https://images.unsplash.com/photo-1549497538-303791108f95?w=80&h=80&fit=crop',
    current_available_amount_meters: 0.4,
  },
];
```

---

### Step 3 — Create `features/upholstery/components/UpholsteryCard.tsx`

**File:** `src/features/upholstery/components/UpholsteryCard.tsx`

```tsx
import { cn } from '@/lib/utils';
import { formatPickerMeters, type UpholsteryPickerRecord } from '@/features/upholstery/types';

type UpholsteryCardProps = {
  record: UpholsteryPickerRecord;
  isSelected: boolean;
  onSelect: (clientId: string) => void;
  testId?: string;
};

export function UpholsteryCard({ record, isSelected, onSelect, testId }: UpholsteryCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      data-testid={testId}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'active:scale-[0.99]',
        isSelected
          ? 'border-primary bg-primary text-card'
          : 'border-border bg-card text-foreground',
      )}
      onClick={() => onSelect(record.client_id)}
    >
      <img
        src={record.image}
        alt={record.name}
        className="size-10 flex-shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', isSelected ? 'text-card' : 'text-foreground')}>
          {record.name}
        </p>
        {record.code !== null && (
          <p className={cn('truncate text-xs', isSelected ? 'text-card/70' : 'text-muted-foreground')}>
            {record.code}
          </p>
        )}
      </div>
      <span
        className={cn(
          'flex-shrink-0 text-sm font-medium tabular-nums',
          isSelected ? 'text-card/80' : 'text-muted-foreground',
        )}
      >
        {formatPickerMeters(record.current_available_amount_meters)}
      </span>
    </button>
  );
}
```

**Design notes:**
- `transition-colors duration-150` handles selected ↔ default color change (CSS — no Framer Motion needed per `31_animations.md`)
- `active:scale-[0.99]` adds subtle press micro-interaction
- When `isSelected`, icon/code text uses opacity-based variants (`text-card/70`, `text-card/80`) to maintain hierarchy on primary background
- No `cva` needed: only two visual states and no prop combinations; `cn()` with boolean condition is sufficient

---

### Step 4 — Create `features/upholstery/components/UpholsterySearch.tsx`

**File:** `src/features/upholstery/components/UpholsterySearch.tsx`

This component owns search text and sort order state. It calls `onFilteredResults` whenever state changes and renders the `SearchBar` primitive.

```tsx
import { useEffect, useMemo, useState } from 'react';

import { SearchBar } from '@/components/primitives';
import type { UpholsteryPickerRecord } from '@/features/upholstery/types';

type UpholsterySearchProps = {
  allItems: UpholsteryPickerRecord[];
  onFilteredResults: (filtered: UpholsteryPickerRecord[]) => void;
  testId?: string;
};

function filterAndSort(
  items: UpholsteryPickerRecord[],
  query: string,
  sortAsc: boolean,
): UpholsteryPickerRecord[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.code !== null && item.code.toLowerCase().includes(q)),
      )
    : items;
  return [...filtered].sort((a, b) =>
    sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
  );
}

export function UpholsterySearch({
  allItems,
  onFilteredResults,
  testId,
}: UpholsterySearchProps): React.JSX.Element {
  const [searchText, setSearchText] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(
    () => filterAndSort(allItems, searchText, sortAsc),
    [allItems, searchText, sortAsc],
  );

  useEffect(() => {
    onFilteredResults(filtered);
  }, [filtered, onFilteredResults]);

  return (
    <SearchBar
      value={searchText}
      onChange={setSearchText}
      onSortPress={() => setSortAsc((prev) => !prev)}
      onFilterPress={() => {
        // Future: open filter sheet
      }}
      placeholder="Search upholsteries…"
      activeFilterCount={0}
      data-testid={testId}
    />
  );
}
```

**Notes:**
- `useEffect` fires after render when `filtered` changes, pushing results to the parent
- `onFilteredResults` is a callback — caller must wrap with `useCallback` to avoid infinite loops (documented in the acceptance criteria / caller contract)
- Sort button toggles `sortAsc`; `activeFilterCount={0}` until filter chips are implemented
- `filterAndSort` is a pure function at module scope — easy to unit test independently

---

### Step 5 — Create `features/upholstery/pages/UpholsteryPickerSlidePage.tsx`

**File:** `src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx`

```tsx
import { useCallback, useEffect, useState } from 'react';

import { useSurfaceHeader } from '@/hooks/use-surface-header';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { TEST_UPHOLSTERIES } from '@/features/upholstery/upholstery-test-data';
import type { UpholsteryPickerRecord } from '@/features/upholstery/types';
import { UpholsteryCard } from '@/features/upholstery/components/UpholsteryCard';
import { UpholsterySearch } from '@/features/upholstery/components/UpholsterySearch';

type UpholsteryPickerSurfaceProps = {
  currentClientId?: string | null;
  onSelect?: (clientId: string) => void;
  title?: string;
  description?: string;
};

export function UpholsteryPickerSlidePage(): React.JSX.Element {
  const { currentClientId, onSelect, title, description } =
    useSurfaceProps<UpholsteryPickerSurfaceProps>();

  const surfaceHeader = useSurfaceHeader();
  const [filteredItems, setFilteredItems] = useState<UpholsteryPickerRecord[]>(TEST_UPHOLSTERIES);

  useEffect(() => {
    surfaceHeader?.setTitle(title ?? 'Select upholstery');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]); // surfaceHeader intentionally omitted — it is a new object every SlidePageSurface render (context value created inline); including it would call setTitle on every surface re-render. Pattern matches canonical 28_surfaces.md example.

  const handleFilteredResults = useCallback((filtered: UpholsteryPickerRecord[]) => {
    setFilteredItems(filtered);
  }, []);

  function handleSelect(clientId: string): void {
    onSelect?.(clientId);
    useSurfaceStore.getState().closeTop();
  }

  return (
    <div className="flex min-h-full flex-col" data-testid="upholstery-picker-slide">
      {/* Sticky search + description header — stays in view while cards scroll */}
      <div className="sticky top-0 z-10 shrink-0 space-y-3 bg-background px-4 pb-3 pt-2">
        {description && (
          <p className="text-sm text-muted-foreground" data-testid="upholstery-picker-description">
            {description}
          </p>
        )}
        <UpholsterySearch
          allItems={TEST_UPHOLSTERIES}
          onFilteredResults={handleFilteredResults}
          testId="upholstery-picker-search"
        />
      </div>

      {/* Scrollable card list */}
      <div className="flex-1 px-4 pb-6 pt-2">
        {filteredItems.length === 0 ? (
          <p
            className="mt-12 text-center text-sm text-muted-foreground"
            data-testid="upholstery-picker-empty"
          >
            No upholsteries match your search.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <UpholsteryCard
                key={item.client_id}
                record={item}
                isSelected={item.client_id === currentClientId}
                onSelect={handleSelect}
                testId={`upholstery-card-${item.client_id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Notes:**
- `sticky top-0 z-10 bg-background` keeps the search bar visible as the card list scrolls. The scroll container is `SlidePageSurface`'s `overflow-y-auto` div — `sticky` works within it.
- `TEST_UPHOLSTERIES` is passed to `UpholsterySearch` as `allItems`. Future: replace with query hook result.
- `handleFilteredResults` is wrapped in `useCallback` (no deps) to satisfy `UpholsterySearch`'s `onFilteredResults` stability contract.
- Importing both `UpholsteryCard` and `UpholsterySearch` directly — these are internal to the upholstery feature; no `index.ts` boundary breach.
- `useSurfaceStore.getState().closeTop()` is the same imperative close pattern used by `ItemCategoryPickerSheetPage`.

---

### Step 6 — Create `features/upholstery/surfaces.ts`

**File:** `src/features/upholstery/surfaces.ts`

```ts
import { lazy } from 'react';

import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

function loadUpholsteryPickerSlidePage() {
  return import('@/features/upholstery/pages/UpholsteryPickerSlidePage').then((module) => ({
    default: module.UpholsteryPickerSlidePage,
  }));
}

const preloadedUpholsterySurfaces = new Set<string>();

export function preloadUpholsteryPickerSurface(): Promise<unknown> {
  if (preloadedUpholsterySurfaces.has('upholstery-picker')) {
    return Promise.resolve();
  }
  preloadedUpholsterySurfaces.add('upholstery-picker');
  return loadUpholsteryPickerSlidePage();
}

export const upholsterySurfaces: SurfaceRegistrations = {
  'upholstery-picker': {
    surface: 'slide',
    component: lazy(loadUpholsteryPickerSlidePage),
  },
};
```

**Note:** No `path` property — matches the established pattern of `testing-forms-slide` and `test-slide` in this app. The slide surface operates as a state-managed overlay without URL changes.

---

### Step 7 — Add `ItemUpholsteryFieldsSchema` to `features/items/types.ts`

Append after the `ItemIssuesFieldsSchema` block (after line ~233):

```ts
// ─── Item upholstery field composition schema ─────────────────────────────────

export const ItemUpholsteryFieldsSchema = z.object({
  upholstery_client_id: z.string().nullable().optional(),
});
export type ItemUpholsteryFields = z.infer<typeof ItemUpholsteryFieldsSchema>;
```

---

### Step 8 — Create `features/items/components/ItemUpholsteryField.tsx`

**File:** `src/features/items/components/ItemUpholsteryField.tsx`

```tsx
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSurface } from '@/hooks/use-surface';
import { TEST_UPHOLSTERIES } from '@/features/upholstery';

type ItemUpholsteryFieldProps = {
  value?: string | null;
  onChange: (clientId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
  description?: string;
  testId?: string;
};

const FIELD_BASE = [
  'flex h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-border',
  'bg-card px-4 text-left',
  'transition-colors duration-150',
  // focus-visible variants used instead of FOCUS_WITHIN_RING (which targets :focus-within on a wrapper, not a standalone button)
  'focus-visible:outline-none focus-visible:border-primary/70 focus-visible:shadow-[0_0_5px_3px_color-mix(in_oklab,var(--color-primary)_10%,transparent)]',
  // disabled variants used instead of DISABLED_BASE (which uses has-[:disabled] targeting a wrapper's disabled child)
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

export function ItemUpholsteryField({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select upholstery',
  title = 'Select upholstery',
  description,
  testId,
}: ItemUpholsteryFieldProps): React.JSX.Element {
  const surface = useSurface();

  const selected = value
    ? (TEST_UPHOLSTERIES.find((u) => u.client_id === value) ?? null)
    : null;

  function handlePress(): void {
    surface.open('upholstery-picker', {
      currentClientId: value ?? null,
      onSelect: onChange,
      title,
      description,
    });
  }

  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      className={cn(FIELD_BASE)}
      onClick={handlePress}
    >
      {selected ? (
        <>
          <img
            src={selected.image}
            alt={selected.name}
            className="size-8 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{selected.name}</p>
            {selected.code !== null && (
              <p className="truncate text-xs text-muted-foreground">{selected.code}</p>
            )}
          </div>
        </>
      ) : (
        <span className="flex-1 text-sm text-muted-foreground">{placeholder}</span>
      )}
      <ChevronRight className="size-4 shrink-0 text-icon" />
    </button>
  );
}
```

**Notes:**
- `FOCUS_WITHIN_RING` and `DISABLED_BASE` from `primitive-base.ts` use `:focus-within` and `has-[:disabled]` — both require a child element to target. They are intentionally NOT used here because `ItemUpholsteryField` is a standalone `<button>`. The inline `focus-visible:*` and `disabled:*` utilities baked into `FIELD_BASE` are the correct replacements.
- `surface.open('upholstery-picker', { ... })` passes `onSelect: onChange` — this is a function passed via surface props, matching the `ItemCategoryPickerSheetPage` pattern.
- `TEST_UPHOLSTERIES` is imported from `@/features/upholstery` (the public `index.ts`), not from the internal test-data file directly — see Step 9 for the required export addition.
- The `selected` lookup against `TEST_UPHOLSTERIES` is temporary. Future: replace with a query hook that resolves the current selection by `client_id`.
- When `value` is set but no match is found in `TEST_UPHOLSTERIES`, `selected` is `null` — renders placeholder. This is safe and handles stale IDs gracefully.

---

### Step 9 — Update `features/upholstery/index.ts`

**Do not replace the file.** Make two targeted changes to the existing content:

1. In the existing `export type { ... } from './types'` line, add `UpholsteryPickerRecord` to the list.
2. Append two new export lines after the types export.

Result after edits:

```ts
export type {
  Upholstery,
  UpholsteryInventory,
  UpholsteryInventoryViewModel,
  UpholsteryPickerRecord,          // ← added
} from './types';

export { TEST_UPHOLSTERIES } from './upholstery-test-data';              // ← added (required by ItemUpholsteryField cross-feature import)
export { upholsterySurfaces, preloadUpholsteryPickerSurface } from './surfaces';  // ← added
```

---

### Step 10 — Update `src/app/surface-registry.ts`

Add upholstery surfaces to the registry:

```ts
import { calendarSurfaces } from '@/components/primitives/date/surfaces';
import { itemSurfaces } from '@/features/items';
import { phoneInputSurfaces } from '@/features/phone-input';
import { testingFormsSurfaces } from '@/features/testing_forms';
import { testSurfaces } from '@/features/test_feature';
import { upholsterySurfaces } from '@/features/upholstery';  // ← ADD
import type { SurfaceRegistrations } from '@/providers/SurfaceProvider';

export const surfaceRegistry: SurfaceRegistrations = {
  ...testSurfaces,
  ...calendarSurfaces,
  ...testingFormsSurfaces,
  ...itemSurfaces,
  ...phoneInputSurfaces,
  ...upholsterySurfaces,  // ← ADD
};

export type SurfaceId = keyof typeof surfaceRegistry;
```

---

### Step 11 — Write Vitest unit tests

**File:** `src/features/upholstery/components/UpholsteryCard.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { UpholsteryCard } from './UpholsteryCard';

const MOCK_RECORD = {
  client_id: 'uph_test',
  name: 'Test Fabric',
  code: 'TF-001',
  image: 'https://example.com/image.jpg',
  current_available_amount_meters: 5.25,
};

describe('UpholsteryCard', () => {
  it('renders name, code, and formatted meters', () => {
    render(<UpholsteryCard record={MOCK_RECORD} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('Test Fabric')).toBeVisible();
    expect(screen.getByText('TF-001')).toBeVisible();
    // Regex tolerates locale decimal separators (e.g. "5.25 m" vs "5,25 m" on European locales)
    expect(screen.getByText(/5[.,]25\s*m/)).toBeVisible();
  });

  it('renders image with alt text', () => {
    render(<UpholsteryCard record={MOCK_RECORD} isSelected={false} onSelect={vi.fn()} />);

    const img = screen.getByRole('img', { name: 'Test Fabric' });
    expect(img).toHaveAttribute('src', MOCK_RECORD.image);
  });

  it('applies selected styles when isSelected=true', () => {
    render(<UpholsteryCard record={MOCK_RECORD} isSelected={true} onSelect={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-card');
  });

  it('does not apply selected styles when isSelected=false', () => {
    render(<UpholsteryCard record={MOCK_RECORD} isSelected={false} onSelect={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('bg-primary');
    expect(button).toHaveClass('bg-card');
  });

  it('calls onSelect with client_id when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<UpholsteryCard record={MOCK_RECORD} isSelected={false} onSelect={onSelect} />);

    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('uph_test');
  });

  it('renders gracefully when code is null', () => {
    const record = { ...MOCK_RECORD, code: null };
    render(<UpholsteryCard record={record} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('Test Fabric')).toBeVisible();
    expect(screen.queryByText('TF-001')).not.toBeInTheDocument();
  });
});
```

**File:** `src/features/upholstery/components/UpholsterySearch.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { UpholsteryPickerRecord } from '@/features/upholstery/types';
import { UpholsterySearch } from './UpholsterySearch';

const ITEMS: UpholsteryPickerRecord[] = [
  { client_id: 'a', name: 'Alpha Velvet', code: 'AV-1', image: '', current_available_amount_meters: 2 },
  { client_id: 'b', name: 'Beta Linen', code: 'BL-2', image: '', current_available_amount_meters: 5 },
  { client_id: 'c', name: 'Gamma Wool', code: null, image: '', current_available_amount_meters: 1 },
];

describe('UpholsterySearch', () => {
  it('calls onFilteredResults with all items on initial render', () => {
    const onFilteredResults = vi.fn();
    render(
      <UpholsterySearch
        allItems={ITEMS}
        onFilteredResults={onFilteredResults}
        testId="search-bar"
      />,
    );

    // useEffect fires synchronously post-render in JSDOM; check the last call rather than calls[0] to be robust across re-renders
    expect(onFilteredResults).toHaveBeenLastCalledWith(
      expect.arrayContaining([ITEMS[0], ITEMS[1], ITEMS[2]]),
    );
    const lastArgs = onFilteredResults.mock.lastCall![0] as typeof ITEMS;
    expect(lastArgs).toHaveLength(3);
  });

  it('filters items by name match (case-insensitive)', async () => {
    const user = userEvent.setup();
    const onFilteredResults = vi.fn();

    render(
      <UpholsterySearch
        allItems={ITEMS}
        onFilteredResults={onFilteredResults}
        testId="search-bar"
      />,
    );

    const input = screen.getByTestId('search-bar-input');
    await user.type(input, 'velvet');

    const lastCall = onFilteredResults.mock.calls[onFilteredResults.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].client_id).toBe('a');
  });

  it('filters items by code match', async () => {
    const user = userEvent.setup();
    const onFilteredResults = vi.fn();

    render(
      <UpholsterySearch
        allItems={ITEMS}
        onFilteredResults={onFilteredResults}
        testId="search-bar"
      />,
    );

    const input = screen.getByTestId('search-bar-input');
    await user.type(input, 'BL-2');

    const lastCall = onFilteredResults.mock.calls[onFilteredResults.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].client_id).toBe('b');
  });

  it('returns empty array when no items match search', async () => {
    const user = userEvent.setup();
    const onFilteredResults = vi.fn();

    render(
      <UpholsterySearch
        allItems={ITEMS}
        onFilteredResults={onFilteredResults}
        testId="search-bar"
      />,
    );

    const input = screen.getByTestId('search-bar-input');
    await user.type(input, 'zzz-no-match');

    const lastCall = onFilteredResults.mock.calls[onFilteredResults.mock.calls.length - 1][0];
    expect(lastCall).toHaveLength(0);
  });
});
```

**File:** `src/features/items/components/ItemUpholsteryField.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted creates the mock fn before vi.mock hoisting — the only safe way to reference
// a variable from the outer scope inside a vi.mock factory.
const mockOpen = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/use-surface', () => ({
  useSurface: () => ({
    open: mockOpen,
    close: vi.fn(),
    closeTop: vi.fn(),
    closeAll: vi.fn(),
    isOpen: () => false,
  }),
}));

import { ItemUpholsteryField } from './ItemUpholsteryField';

describe('ItemUpholsteryField', () => {
  beforeEach(() => {
    mockOpen.mockClear();
  });

  it('renders placeholder text when value is null', () => {
    render(<ItemUpholsteryField value={null} onChange={vi.fn()} placeholder="Select upholstery" />);
    expect(screen.getByText('Select upholstery')).toBeVisible();
  });

  it('renders selected upholstery name when value matches test data', () => {
    render(<ItemUpholsteryField value="uph_linen_natural" onChange={vi.fn()} />);
    expect(screen.getByText('Natural Linen')).toBeVisible();
    expect(screen.getByText('LN-001')).toBeVisible();
  });

  it('renders placeholder when value does not match any test record', () => {
    render(<ItemUpholsteryField value="uph_unknown_xyz" onChange={vi.fn()} placeholder="Select upholstery" />);
    expect(screen.getByText('Select upholstery')).toBeVisible();
  });

  it('calls surface.open with correct props when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ItemUpholsteryField value={null} onChange={onChange} testId="uph-field" />);

    await user.click(screen.getByTestId('uph-field'));

    expect(mockOpen).toHaveBeenCalledWith(
      'upholstery-picker',
      expect.objectContaining({
        currentClientId: null,
        onSelect: onChange,
      }),
    );
  });
});
```

---

## File summary

| # | File | Action |
|---|---|---|
| 1 | `features/upholstery/types.ts` | Append `UpholsteryPickerRecord` type + `formatPickerMeters()` |
| 2 | `features/upholstery/upholstery-test-data.ts` | **New** — 5-entry mock dataset |
| 3 | `features/upholstery/surfaces.ts` | **New** — `upholstery-picker` slide registration |
| 4 | `features/upholstery/components/UpholsteryCard.tsx` | **New** — presentation card |
| 5 | `features/upholstery/components/UpholsteryCard.test.tsx` | **New** — 6 Vitest tests |
| 6 | `features/upholstery/components/UpholsterySearch.tsx` | **New** — search orchestration |
| 7 | `features/upholstery/components/UpholsterySearch.test.tsx` | **New** — 4 Vitest tests |
| 8 | `features/upholstery/pages/UpholsteryPickerSlidePage.tsx` | **New** — full-page slide selector |
| 9 | `features/upholstery/index.ts` | Append `UpholsteryPickerRecord`, `upholsterySurfaces`, `preloadUpholsteryPickerSurface` |
| 10 | `features/items/types.ts` | Append `ItemUpholsteryFieldsSchema` + `ItemUpholsteryFields` |
| 11 | `features/items/components/ItemUpholsteryField.tsx` | **New** — form field trigger |
| 12 | `features/items/components/ItemUpholsteryField.test.tsx` | **New** — 4 Vitest tests |
| 13 | `src/app/surface-registry.ts` | Add `upholsterySurfaces` import + spread |

**Total: 8 new files + 5 modified files = 13 files**

---

## Risks and mitigations

- **Risk:** `onFilteredResults` callback instability in `UpholsterySearch` causing infinite `useEffect` loops if the caller forgets `useCallback`.
  **Mitigation:** `UpholsteryPickerSlidePage` wraps `handleFilteredResults` in `useCallback` with no deps (documented in Step 5). Codex must not break this pattern.

- **Risk:** `sticky top-0` within `SlidePageSurface`'s `overflow-y-auto` container may not work if an intermediate ancestor has `overflow: hidden`.
  **Mitigation:** The page root is `<div className="flex min-h-full flex-col">` with no overflow set. `sticky` propagates to the nearest scroll container (`SlidePageSurface`'s `overflow-y-auto` div). Verify scroll behavior in the dev environment.

- **Risk:** Passing `onChange` (RHF field's `onChange`) through `surface.open()` props means a function reference is stored in Zustand state. Zustand supports non-serializable values — this is acceptable and follows the existing `ItemCategoryPickerSheetPage` pattern. Deep-link URL restoration is not possible for this surface (fine since no `path` is registered).
  **Mitigation:** Accepted pattern.

- **Risk:** Mock image URLs (Unsplash) require network access; tests rendering `UpholsteryCard` will load `<img>` tags that 404 in the test environment.
  **Mitigation:** Unit tests assert only DOM attributes (`toHaveAttribute('src', ...)`), not image load success. No `onError` handling required.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep "UpholsteryCard"`: 6 tests pass
- `npm run test -- --grep "UpholsterySearch"`: 4 tests pass
- `npm run test -- --grep "ItemUpholsteryField"`: 4 tests pass
- Manual smoke test: Open a form that uses `ItemUpholsteryField` → tap field → picker slides in → search filters cards → tap a card → field updates to show selected upholstery name → re-tap → previous selection is pre-highlighted in picker

---

## Review log

- `2026-05-21` `claude-sonnet-4-6`: Initial plan authored
- `2026-05-21` `claude-sonnet-4-6`: Applied 8 pre-Codex corrections — cross-feature deep import fixed (Step 8 import + Step 9 export), `FOCUS_WITHIN_RING`/`DISABLED_BASE` replaced with button-appropriate utilities in `FIELD_BASE`, `vi.hoisted` pattern applied to `ItemUpholsteryField.test.tsx`, `h-full` → `min-h-full`, `surfaceHeader` removed from `useEffect` deps, Step 9 instruction clarified to targeted edits, locale-safe regex in card test, `lastCall` pattern in search test, `flex-shrink-0` → `shrink-0` throughout

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: user (David)
