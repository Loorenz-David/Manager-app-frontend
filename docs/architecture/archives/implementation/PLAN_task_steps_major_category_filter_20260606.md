# PLAN_task_steps_major_category_filter_20260606

## Metadata

- Plan ID: `PLAN_task_steps_major_category_filter_20260606`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-06T00:00:00Z`
- Last updated at (UTC): `2026-06-06T14:58:16Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Add a `major_category` multi-select filter to the step state filter sheet in the workers app so workers can narrow the task-step list to `"seat"`, `"wood"`, or both.
- Business/user intent: The backend API `/api/v1/working-sections/{working_section_id}/steps` now accepts a `major_category` query param (comma-separated values). Workers need a UI to drive it.
- Non-goals: No new routes, no new surfaces, no changes to the managers app.

## Scope

- In scope:
  - Add `MajorCategory` type and `major_category?` param to `ListWorkingSectionStepsParams` in `types.ts`
  - Extend `task-step-keys.ts` query key to include `major_category`
  - Extend `StepStateFilterSheetSurfaceProps` in `surface-ids.ts` to carry `selectedMajorCategories` and update `onApply` signature
  - Add `majorCategoryFilters` local state to the controller; pass it to the query; update `activeFilterCount`; update `handleOpenStateFilter` to pass the current selection
  - Add a major-category `BoxPicker` section to `StepStateFilterSheetPage` using the same image URLs as `ItemCategorySelectionField` in the managers app
- Out of scope:
  - Playwright / e2e tests (filter-sheet surface tests not established for this feature)
  - Vitest unit tests (no new pure logic; logic is covered by existing controller test patterns)
- Assumptions:
  - The API accepts `major_category` as a comma-separated string param identical in shape to `record_step_state`
  - Default behaviour (no `major_category` param) is unchanged — all categories are returned
  - Image URLs for wood/seat categories are stable (same S3 paths already used in the managers app)

## Clarifications required

_(none — all details confirmed by user)_

## Acceptance criteria

1. Filter sheet shows a "Category" section below the state picker with two BoxPicker tiles: Wood and Seat, using the same images as in `ItemCategorySelectionField`.
2. On page open, no major-category tile is selected (empty default).
3. Selecting one or both tiles and pressing Apply sends `major_category=seat`, `major_category=wood`, or `major_category=seat,wood` as a query param.
4. When no tile is selected, `major_category` is omitted entirely from the API call.
5. `activeFilterCount` on the search bar badge reflects major-category selections in addition to non-default state selections.
6. TypeScript type-checks pass (`npm run typecheck`).

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure and layer rules
- `architecture/02_types.md`: type and schema authoring rules
- `architecture/05_server_state.md`: TanStack Query hook pattern, query key structure
- `architecture/06_client_state.md`: local `useState` for ephemeral UI state
- `architecture/08_hooks.md`: controller pattern (useCallback, useMemo, derived state)
- `architecture/15_feature_structure.md`: feature folder layout
- `architecture/28_surfaces.md`: surface prop types and the `useSurfaceProps` contract
- `architecture/28_surfaces_local.md`: active surface types for this app

### Local extensions loaded

- `architecture/28_surfaces_local.md`: confirms `sheet` is an active surface type here

### File read intent — pattern vs. relational

Permitted reads already done (understanding what exists):
- `src/features/task_steps/types.ts` — established actual field names and existing `ListWorkingSectionStepsParams`
- `src/features/task_steps/api/task-step-keys.ts` — verified query key structure
- `src/features/task_steps/api/fetch-working-section-steps.ts` — confirmed API call shape
- `src/features/task_steps/api/use-working-section-steps.ts` — confirmed query hook wiring
- `src/features/task_steps/surface-ids.ts` — confirmed `StepStateFilterSheetSurfaceProps` shape
- `src/features/task_steps/controllers/use-working-section-steps.controller.ts` — confirmed controller state and surface open calls
- `src/pages/task_steps/StepStateFilterSheetPage.tsx` — confirmed current page structure
- `apps/managers-app/.../ItemCategorySelectionField.tsx` — extracted image URLs and BoxPicker usage pattern

Prohibited (not needed):
- Reading other controller files to understand controller shape → `08_hooks.md` covers it

### Skill selection

- Primary skill: none (direct edit; no new feature scaffold needed)

## Implementation plan

### Step 1 — Extend types (`src/features/task_steps/types.ts`)

Add a `MajorCategory` union type and extend `ListWorkingSectionStepsParams`:

```typescript
export type MajorCategory = "seat" | "wood";

// Inside ListWorkingSectionStepsParams, add:
major_category?: string;   // comma-separated MajorCategory values, omit when empty
```

### Step 2 — Extend query key (`src/features/task_steps/api/task-step-keys.ts`)

Include `major_category` in the params object of `sectionList` so cache entries are correctly scoped:

```typescript
sectionList: (params: ListWorkingSectionStepsParams) =>
  [
    ...taskStepKeys.sectionLists(),
    params.working_section_id,
    {
      q: params.q,
      limit: params.limit,
      offset: params.offset,
      record_step_state: params.record_step_state,
      major_category: params.major_category,   // ← add
    },
  ] as const,
```

### Step 3 — Extend surface props (`src/features/task_steps/surface-ids.ts`)

Replace the existing `StepStateFilterSheetSurfaceProps` with:

```typescript
export type StepStateFilterSheetSurfaceProps = {
  selectedStates: StepState[];
  selectedMajorCategories: MajorCategory[];
  onApply: (states: StepState[], majorCategories: MajorCategory[]) => void;
};
```

Import `MajorCategory` from `"./types"`.

### Step 4 — Update controller (`src/features/task_steps/controllers/use-working-section-steps.controller.ts`)

Four changes in this file:

**4a. Import `MajorCategory` from `"../types"`.**

**4b. Add `majorCategoryFilters` state** (default `[]`) alongside `stateFilters`:

```typescript
const [majorCategoryFilters, setMajorCategoryFilters] = useState<MajorCategory[]>([]);
```

**4c. Pass `major_category` to the query:**

```typescript
const query = useWorkingSectionStepsQuery({
  working_section_id: sectionId,
  q: debouncedSearch || undefined,
  record_step_state: stateFilters.join(","),
  major_category: majorCategoryFilters.length > 0
    ? majorCategoryFilters.join(",")
    : undefined,
  limit: 50,
  offset: 0,
});
```

**4d. Update `activeFilterCount`** to also count selected major categories:

```typescript
const activeFilterCount = useMemo(() => {
  const isDefaultStateFilter =
    stateFilters.length === DEFAULT_STATE_FILTERS.length &&
    DEFAULT_STATE_FILTERS.every((state) => stateFilters.includes(state));

  const stateCount = isDefaultStateFilter ? 0 : stateFilters.length;
  return stateCount + majorCategoryFilters.length;
}, [stateFilters, majorCategoryFilters]);
```

**4e. Update `handleOpenStateFilter`** to pass the current major category selection and handle the updated `onApply` signature:

```typescript
const handleOpenStateFilter = useCallback(() => {
  openSurface(STEP_STATE_FILTER_SHEET_SURFACE_ID, {
    selectedStates: stateFilters,
    selectedMajorCategories: majorCategoryFilters,
    onApply: (newStates: StepState[], newMajorCategories: MajorCategory[]) => {
      setStateFilters(newStates);
      setMajorCategoryFilters(newMajorCategories);
    },
  } as StepStateFilterSheetSurfaceProps);
}, [openSurface, stateFilters, majorCategoryFilters]);
```

Also expose `majorCategoryFilters` on the `WorkingSectionStepsController` return type (and return value) in case it is ever needed downstream — but it is not consumed by the view currently, so it can be omitted from the public type if preferred. _(Codex: add it to the type and return value regardless, for consistency.)_

### Step 5 — Update filter sheet page (`src/pages/task_steps/StepStateFilterSheetPage.tsx`)

Five changes:

**5a. Import `MajorCategory` from `"@/features/task_steps/types"`.**

**5b. Define `MAJOR_CATEGORY_OPTIONS`** at module scope (identical image URLs to managers app):

```typescript
import type { BoxPickerOptionType } from "@beyo/ui";
import type { MajorCategory } from "@/features/task_steps/types";

const MAJOR_CATEGORY_OPTIONS: BoxPickerOptionType<MajorCategory>[] = [
  {
    value: "wood",
    label: "Wood",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/wood_category.webp",
    imageClassName: "size-[2.4rem]",
    testId: "filter-major-category-wood",
  },
  {
    value: "seat",
    label: "Seat",
    image:
      "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/seating_category.webp",
    imageClassName: "size-[2.4rem]",
    testId: "filter-major-category-seat",
  },
];
```

**5c. Read `selectedMajorCategories` from `useSurfaceProps` and initialize local state:**

```typescript
const { selectedStates, selectedMajorCategories, onApply } =
  useSurfaceProps<StepStateFilterSheetSurfaceProps>();

const [localMajorCategories, setLocalMajorCategories] = useState<MajorCategory[]>(
  selectedMajorCategories ?? [],
);
```

**5d. Update `handleApply`** to pass both values:

```typescript
function handleApply() {
  onApply?.(localFilters, localMajorCategories);
  closeSheet();
}
```

**5e. Add the category `BoxPicker` section below the state picker**, between the state `BoxPicker` and the Apply button:

```tsx
<div className="flex flex-col gap-3">
  <p className="text-sm font-medium text-muted-foreground">Category</p>
  <BoxPicker
    columns={2}
    data-testid="step-major-category-filter-picker"
    mode="multiple"
    onValueChange={setLocalMajorCategories}
    options={MAJOR_CATEGORY_OPTIONS}
    value={localMajorCategories}
  />
</div>
```

The full return JSX order becomes:
1. State `BoxPicker` (existing)
2. Category section (new)
3. Apply button (existing)

The outer `div` already uses `gap-6` which naturally separates the three sections.

## Risks and mitigations

- Risk: Image URLs are hard-coded from the test S3 bucket and may differ per environment.
  Mitigation: This is the same approach used in `ItemCategorySelectionField` in the managers app; environment consistency is already accepted.

- Risk: `selectedMajorCategories` may be `undefined` when an old surface open call is still in flight.
  Mitigation: Step 5c defaults to `?? []` on init; the controller always passes the array in step 4e.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across workers app and shared packages
- Manual smoke: Open filter sheet, confirm two category tiles appear with images below the state picker. Select "Wood", press Apply, confirm API call includes `major_category=wood`. Deselect, press Apply, confirm `major_category` is absent from the request.

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
