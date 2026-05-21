# PLAN_search_bar_primitive_20260521

## Metadata

- Plan ID: `PLAN_search_bar_primitive_20260521`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T15:45:29Z`
- Related issue/ticket: —
- Intention plan: —

---

## Goal and intent

- **Goal**: Introduce a domain-agnostic `SearchBar` UI primitive at `src/components/primitives/search-bar/` — a unified search container with a left search icon, a controlled text input, and two right-side action buttons (sort + filter) with an active-filter count badge.
- **Business/user intent**: Establish the foundational reusable search orchestration surface for all operational list pages (tasks, customers, items, cases, and future features) while maintaining strict separation between the presentation primitive and feature-level orchestration.
- **Non-goals**: Filter state management, sort logic, RHF integration, surface/sheet opening, query persistence, debounce orchestration, chip filters, saved filters. All of that lives in the parent feature layer.

---

## Scope

**In scope:**
- `src/components/primitives/search-bar/search-bar.types.ts`
- `src/components/primitives/search-bar/search-bar.variants.ts`
- `src/components/primitives/search-bar/SearchBar.tsx`
- `src/components/primitives/search-bar/SearchBar.test.tsx`
- `src/components/primitives/search-bar/index.ts`
- `src/components/primitives/index.ts` — append `SearchBar` + `SearchBarProps` to the barrel

**Out of scope:**
- Feature-level wiring (tasks, customers, items list pages)
- Surface/sheet opening logic
- Filter or sort state management
- Playwright e2e spec — deferred to first feature adoption (requires primitive mounted in a test-harness page)

**Assumptions:**
- `lucide-react` is available (already used throughout the app for `AlertTriangle`, `CalendarIcon`, `Plus`, `Minus`, etc.)
- `framer-motion` `m` components are available via the app-level `LazyMotion` setup (confirmed in `StagedForm.tsx` and `StagedFormTimeline.tsx`)
- `@/lib/animation` exports `transitions` with a `fast` key (confirmed: `src/lib/animation.ts`)
- `FOCUS_WITHIN_RING` and `DISABLED_BASE` are exported from `../shared` (confirmed: `src/components/primitives/shared/primitive-base.ts`)

---

## Clarifications required

None. All decisions derived from existing codebase patterns and user brief.

---

## Acceptance criteria

1. `SearchBar` renders as a single unified container (`div` with `border border-border bg-card rounded-xl`).
2. Input is fully controlled — `value` prop drives displayed text; `onChange` callback receives `(value: string)`.
3. Sort button press invokes `onSortPress` — primitive has no sort logic of its own.
4. Filter button press invokes `onFilterPress` — primitive has no filter logic of its own.
5. `activeFilterCount > 0` → filter button icon turns `text-primary`; count badge renders with AnimatePresence entrance animation.
6. `activeFilterCount === 0` or `undefined` → filter button stays `text-icon`; no badge rendered.
7. `disabled` prop → entire container dims via `DISABLED_BASE`; both action buttons carry the `disabled` HTML attribute.
8. `isLoading` prop → sort and filter buttons replaced by a centered spinner (`Loader2 animate-spin`); input remains interactive.
9. `forwardRef` forwards the ref to the `<input>` element.
10. `data-testid` on wrapper; `${data-testid}-input` on input; `${data-testid}-sort` on sort button; `${data-testid}-filter` on filter button — only emitted when `data-testid` prop is provided.
11. All 7 Vitest unit tests pass.
12. Zero TypeScript errors (`npm run typecheck`).

---

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: shared UI primitive rules — `forwardRef`, named exports, `cva` for variants, `displayName`, no context consumption, all data via props
- `architecture/14_styling.md`: utility classes only, design tokens, `cn()` for conditionals, `cva` for variants, no inline styles, no arbitrary values without justification
- `architecture/31_animations.md`: CSS `transition-colors` for color-only hover/active; `AnimatePresence` + `m` for mount/unmount (count badge enter/exit); `transitions.fast` from `@/lib/animation`
- `architecture/15_feature_structure.md`: primitive lives in `src/components/primitives/`, export through the barrel `primitives/index.ts`
- `architecture/34_runtime_validation_local.md`: `data-testid` naming convention `[component]-[element]`, Vitest test file colocated with source

### Local extensions loaded

- `architecture/28_surfaces_local.md`: not required — SearchBar itself does not open any surface
- `architecture/34_runtime_validation_local.md`: `data-testid` convention reference; Playwright bootstrap status (Playwright out of scope for this plan)

### File read intent — pattern vs. relational

Permitted relational reads executed before this plan:
- `src/components/primitives/input/TextInput.tsx` — existing wrapper pattern with `FOCUS_WITHIN_RING`, `DISABLED_BASE`, `leftIcon`/`rightIcon` slots ✓
- `src/components/primitives/shared/primitive-base.ts` — exact class strings for `FOCUS_WITHIN_RING`, `DISABLED_BASE`, `INVALID_RING` ✓
- `src/components/primitives/number-input/number-input.variants.ts` — `numberStepperButtonVariants` pattern for icon action buttons with CSS transitions ✓
- `src/components/primitives/number-input/types.ts` — `NumberStepperButtonProps` shape reference ✓
- `src/components/primitives/number-input/NumberInput.test.tsx` — Vitest file structure and `userEvent` pattern ✓
- `src/lib/animation.ts` — confirmed `transitions.fast` shape (`duration: 0.12`, `ease: standard`) ✓
- `src/components/primitives/box-picker/box-picker.variants.ts` — confirmed `bg-card`, `text-foreground`, `border-border` token usage for selected/unselected states ✓

Prohibited (pattern reads — contracts already cover these):
- Reading another primitive to understand cva structure → `14_styling.md`
- Reading another feature component to understand action button layout → `07_components.md`

### Skill selection

- Primary skill: None — UI primitive, no data layer
- Trigger terms applied from guide: `animation`, `framer`, `AnimatePresence` → `31_animations.md`; `cva`, `forwardRef` → `07_components.md`, `14_styling.md`
- Excluded alternatives: None

---

## Implementation plan

### Step 1 — Create `search-bar.types.ts`

**File**: `src/components/primitives/search-bar/search-bar.types.ts`

Define `SearchBarProps`. Omit native `onChange` and `value` from `InputHTMLAttributes` and replace with semantically clean callbacks:

```ts
import type { InputHTMLAttributes } from 'react';

export type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  onSortPress: () => void;
  onFilterPress: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  activeFilterCount?: number;
  wrapperClassName?: string;
  'data-testid'?: string;
};
```

**Rationale**: Replacing the native `onChange: ChangeEventHandler` with `onChange: (value: string) => void` removes the DOM event from the public interface. Parent features work with string values, not events. The spread `InputHTMLAttributes` base preserves `onFocus`, `onBlur`, `autoComplete`, `inputMode`, `id`, and similar native attributes.

---

### Step 2 — Create `search-bar.variants.ts`

**File**: `src/components/primitives/search-bar/search-bar.variants.ts`

Two exports:

**1. `SEARCH_BAR_WRAPPER`** — constant string (no variants needed; the container has one visual form):

```ts
export const SEARCH_BAR_WRAPPER =
  'relative flex h-12 items-center overflow-hidden rounded-xl border border-border bg-card transition-colors duration-150';
```

**2. `searchBarActionButtonVariants`** — `cva` for sort and filter buttons; the `active` variant controls whether the icon is `text-icon` (resting) or `text-primary` (active/engaged):

```ts
import { cva } from 'class-variance-authority';

export const searchBarActionButtonVariants = cva(
  [
    'flex h-full min-w-11 shrink-0 items-center justify-center',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
    'disabled:pointer-events-none disabled:opacity-40',
  ].join(' '),
  {
    variants: {
      active: {
        true: 'text-primary',
        false: 'text-icon',
      },
    },
    defaultVariants: { active: false },
  },
);
```

**Rationale**: `active: false` (resting `text-icon`) is the default for both buttons. Sort has no active state exposed by this primitive — the parent controls it by passing `active={true}` when a sort is applied. Filter `active` is derived from `activeFilterCount > 0` inside the component.

---

### Step 3 — Create `SearchBar.tsx`

**File**: `src/components/primitives/search-bar/SearchBar.tsx`

#### Imports

```ts
import { AnimatePresence, m } from 'framer-motion';
import { forwardRef } from 'react';
import { ArrowUpDown, Loader2, Search, SlidersHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { transitions } from '@/lib/animation';

import { DISABLED_BASE, FOCUS_WITHIN_RING } from '../shared';
import type { SearchBarProps } from './search-bar.types';
import { SEARCH_BAR_WRAPPER, searchBarActionButtonVariants } from './search-bar.variants';
```

#### Private helper — `FilterCountBadge`

Define at module scope (never inside the main component body):

```tsx
function FilterCountBadge({ count }: { count: number }): React.JSX.Element {
  return (
    <m.span
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-card"
      exit={{ opacity: 0, scale: 0.7 }}
      initial={{ opacity: 0, scale: 0.7 }}
      transition={transitions.fast}
    >
      {count > 99 ? '99+' : count}
    </m.span>
  );
}
```

**Note**: `text-[10px]` is an arbitrary value. Justification: no standard Tailwind token maps to 10px text, which is the standard compact badge size. The `[10px]` is intentional and must be preserved.

#### Main component

```tsx
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onSortPress,
      onFilterPress,
      placeholder,
      disabled = false,
      isLoading = false,
      activeFilterCount = 0,
      wrapperClassName,
      className,
      'data-testid': testId,
      ...inputProps
    },
    ref,
  ) => {
    const isFilterActive = activeFilterCount > 0;

    return (
      <div
        className={cn(SEARCH_BAR_WRAPPER, FOCUS_WITHIN_RING, DISABLED_BASE, wrapperClassName)}
        data-testid={testId}
      >
        {/* Left search icon — non-interactive */}
        <span className="pointer-events-none shrink-0 pl-3 text-icon">
          <Search className="size-4" />
        </span>

        {/* Controlled text input */}
        <input
          ref={ref}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent px-3 text-base text-foreground',
            'placeholder:text-border appearance-none outline-none',
            'disabled:cursor-not-allowed',
            className,
          )}
          data-testid={testId ? `${testId}-input` : undefined}
          disabled={disabled}
          placeholder={placeholder}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...inputProps}
        />

        {/* Vertical divider */}
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />

        {/* Right action area */}
        {isLoading ? (
          <span className="flex h-full min-w-[88px] shrink-0 items-center justify-center text-icon">
            <Loader2 className="size-4 animate-spin" />
          </span>
        ) : (
          <>
            {/* Sort button */}
            <button
              aria-label="Sort"
              className={searchBarActionButtonVariants({ active: false })}
              data-testid={testId ? `${testId}-sort` : undefined}
              disabled={disabled}
              type="button"
              onClick={onSortPress}
            >
              <ArrowUpDown className="size-4" />
            </button>

            {/* Filter button */}
            <button
              aria-label="Filter"
              className={cn(
                searchBarActionButtonVariants({ active: isFilterActive }),
                'gap-1 pr-3',
              )}
              data-testid={testId ? `${testId}-filter` : undefined}
              disabled={disabled}
              type="button"
              onClick={onFilterPress}
            >
              <SlidersHorizontal className="size-4" />
              <AnimatePresence initial={false}>
                {isFilterActive ? <FilterCountBadge key="badge" count={activeFilterCount} /> : null}
              </AnimatePresence>
            </button>
          </>
        )}
      </div>
    );
  },
);

SearchBar.displayName = 'SearchBar';
```

#### Layout notes

- Container: `h-12` matches the `md` size of `TextInput` for vertical alignment consistency.
- Input `type="search"` provides native mobile keyboard `Search` action button on iOS/Android.
- Loading spinner reserves `min-w-[88px]` to hold the same width as the two action buttons combined, preventing a layout jump when switching states. `[88px]` is an arbitrary value: 44px × 2 (two `min-w-11` buttons = 44px each). Justification comment required in code.
- Filter button `pr-3` adds right padding to the last element so the badge and icon sit away from the container edge, matching the `pr-3` of TextInput's right icon span.
- `type="search"` input: on WebKit/Blink, `type="search"` adds a native clear button. If this is unwanted, add `[&::-webkit-search-cancel-button]:appearance-none` to the input classes.

---

### Step 4 — Create `search-bar/index.ts`

**File**: `src/components/primitives/search-bar/index.ts`

```ts
export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './search-bar.types';
```

---

### Step 5 — Register in `primitives/index.ts`

**File**: `src/components/primitives/index.ts`

Append at the end of the file:

```ts
export { SearchBar } from './search-bar';
export type { SearchBarProps } from './search-bar';
```

---

### Step 6 — Write `SearchBar.test.tsx`

**File**: `src/components/primitives/search-bar/SearchBar.test.tsx`

Import pattern follows `NumberInput.test.tsx`: `render`, `screen` from `@testing-library/react`; `userEvent` from `@testing-library/user-event`; `describe`, `expect`, `it`, `vi` from `vitest`; `SearchBar` from `./SearchBar`.

Write 7 test cases:

**Test 1 — controlled input**
Render `<SearchBar value="" onChange={fn} onSortPress={vi.fn()} onFilterPress={vi.fn()} data-testid="sb" />`. Type into `sb-input`. Assert `onChange` was called with the typed string value.

**Test 2 — sort button callback**
Render with `onSortPress={sortFn}`. Click the button with `aria-label="Sort"`. Assert `sortFn` called once.

**Test 3 — filter button callback**
Render with `onFilterPress={filterFn}`. Click the button with `aria-label="Filter"`. Assert `filterFn` called once.

**Test 4 — filter count badge appears**
Render with `activeFilterCount={3}`. Assert `screen.getByText('3')` is visible. Assert filter button has class `text-primary` (via `toHaveClass`).

**Test 5 — filter count badge absent at zero**
Render with `activeFilterCount={0}` (or omit). Assert `screen.queryByText('0')` is null. Assert filter button does not have class `text-primary`.

**Test 6 — disabled state**
Render with `disabled={true}`. Assert `screen.getByLabelText('Sort')` is disabled. Assert `screen.getByLabelText('Filter')` is disabled. Assert input `screen.getByRole('searchbox')` is disabled.

**Test 7 — loading state**
Render with `isLoading={true}`. Assert sort button absent (`queryByLabelText('Sort')` is null). Assert filter button absent. Assert a spinner is present — use `document.querySelector('.animate-spin')` or add `data-testid="search-bar-spinner"` to the `Loader2` wrapper span and assert it exists.

---

## Risks and mitigations

- **Risk**: `text-[10px]` arbitrary value in `FilterCountBadge` triggers lint warning.
  **Mitigation**: Required because no Tailwind token maps to 10px. Add inline comment: `{/* text-[10px] — no 10px token exists; smallest legible badge text */}`.

- **Risk**: `type="search"` input shows native WebKit clear (✕) button overlapping the controlled input area.
  **Mitigation**: Add `[&::-webkit-search-cancel-button]:appearance-none` to the input field classes to suppress it. The parent can add its own clear action via a right-side button if needed.

- **Risk**: `DISABLED_BASE` uses `has-[:disabled]` which fires when *any* descendant is disabled. If only `disabled={disabled}` is passed to the `<input>` but not to the buttons, the selector will still fire from the input, dimming the container while the buttons remain clickable.
  **Mitigation**: Always pass `disabled={disabled}` to both `<button>` elements and the `<input>`. The component already does this by design — the `disabled` prop is destructured and applied to all three interactive elements.

- **Risk**: `min-w-[88px]` on the loading spinner container is derived from two `min-w-11` (44px) buttons. If action button sizing changes, the loading placeholder width will mismatch.
  **Mitigation**: Add an inline comment: `{/* min-w-[88px] = 2 × min-w-11 action buttons — update if button sizing changes */}`.

- **Risk**: AnimatePresence badge causes a micro layout shift in the filter button on count appearance.
  **Mitigation**: The filter button uses `gap-1` and the badge is `inline-flex` — the button width grows slightly when the badge appears. This is intentional and contained. The outer container `overflow-hidden` prevents any external layout impact.

---

## Validation plan

- `npm run typecheck` — zero TypeScript errors across all 5 new files + modified `primitives/index.ts`
- `npm run test -- SearchBar` — all 7 Vitest unit tests pass
- **Playwright**: out of scope for primitive isolation. Playwright runtime validation requires `SearchBar` mounted in a live page (testing-forms harness or first adopting feature list). Defer until first feature integration. At that point: `npx playwright test --grep "search bar" --project=mobile` → verify input focus, sort/filter tap targets, badge animation on mobile viewport.

---

## Review log

_(empty — awaiting Codex implementation pass)_

---

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
