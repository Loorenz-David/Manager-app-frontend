# PLAN_step_state_filter_sheet_20260601

## Metadata

- Plan ID: `PLAN_step_state_filter_sheet_20260601`
- Status: `archived`
- Owner agent: `copilot`
- Created at (UTC): `2026-06-01T00:00:00Z`
- Last updated at (UTC): `2026-06-01T06:23:25Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Wire the existing filter button in `WorkingSectionStepsView`'s `SearchBar` to open a bottom-sheet surface where the worker can select which task step states to display. Selections are applied back to the query param `record_step_state` in the working-section-steps controller.
- Business/user intent: Workers need to filter their task list by state (e.g. view only paused tasks, or see completed work). The default view shows active work; the filter lets them switch context intentionally.
- Non-goals: No sorting functionality. No changes to the API shape or `ListWorkingSectionStepsParams` — `record_step_state: string` already exists. No changes to the `LastActiveStepCard` or `TaskDetailSlidePage`.

## Scope

- In scope:
  - New `sheet` surface `task-step-state-filter-sheet` with BoxPicker in `mode="multiple"` showing 5 state options
  - Mutual exclusivity rule between `completed` and the non-terminal states
  - Default filter state on mount: `["pending", "working", "paused", "ended_shift"]`
  - `activeFilterCount` badge on the SearchBar filter button (non-zero only when filter deviates from default)
  - Apply button inside the sheet — applies filters and closes the surface
  - Wiring `onFilterPress` in `WorkingSectionStepsView` to open the surface
- Out of scope:
  - Sort functionality (`onSortPress` remains a stub)
  - Persisting the filter selection across sessions (no `localStorage` or `IndexedDB`)
  - Filter state for `LastActiveStepCard`, `TaskDetailSlidePage`, or the manager app

## Clarifications required

- [ ] Should the `record_step_state` API param accept comma-separated values (e.g. `"pending,working"`) or be passed as multiple params? Assumed **comma-separated string** based on the existing `record_step_state?: string` field in `ListWorkingSectionStepsParams`. Verify with backend if the query doesn't return expected results.

## Acceptance criteria

1. On initial mount, the query sends `record_step_state="pending,working,paused,ended_shift"` and the SearchBar filter badge shows no count.
2. Opening the filter sheet shows 5 options (`Pending`, `Working`, `Paused`, `Ended shift`, `Completed`); the four default states are pre-selected.
3. Selecting `Completed` deselects all other options (only `Completed` remains checked).
4. Selecting any non-completed state while `Completed` is checked deselects `Completed` and checks the new state.
5. Tapping "Apply" closes the sheet and updates the query with the new `record_step_state` value.
6. After applying a non-default filter set, the SearchBar filter badge shows the count of selected states.
7. After applying the default filter set again, the badge disappears.
8. TypeScript reports zero errors (`npm run typecheck`).

## Contracts and skills

### Contracts loaded

- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface type `sheet`, `BottomSheetSurface`, close-animation timing, callback-through-props pattern
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui`, `preloadXxx` export convention
- `architecture/08_hooks.md`: action/mutation pattern — no mutation here; filter is pure client state
- `architecture/15_feature_structure.md`: surface-id constants, lazy surface registration in `surfaces.ts`, page in `pages/<domain>/`
- `architecture/05_server_state.md`: `useQuery` with stable key — `record_step_state` is already part of `taskStepKeys.sectionList(params)`; changing `stateFilters` produces a new cache key and a new request automatically

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `sheet` confirmed for bottom overlays; callback props pattern in use (see `CaseCreationSurfaceOpeners` in `use-task-step-detail.controller.ts`)
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui`

### File read intent — pattern vs. relational

Permitted reads used:
- `src/features/task_steps/types.ts`: `StepState` enum values, `ListWorkingSectionStepsParams.record_step_state?: string`
- `src/features/task_steps/api/task-step-keys.ts`: `record_step_state` is already part of the sectionList key — confirmed no key changes needed
- `src/features/task_steps/controllers/use-working-section-steps.controller.ts`: established where `stateFilters` state and `handleOpenStateFilter` will be added; confirmed `openSurface` is already imported
- `src/features/task_steps/surface-ids.ts` + `surfaces.ts`: verified existing surface ID constants and `lazyWithPreload` pattern
- `src/features/task_steps/providers/WorkingSectionStepsProvider.tsx`: thin shell that passes full controller to context — no change required; extending the controller return type is sufficient
- `src/features/task_steps/components/WorkingSectionStepsView.tsx`: `SearchBar` props `activeFilterCount={0}` and `onFilterPress={() => {}}` are already present as stubs — confirmed the wiring points
- `packages/ui/src/components/primitives/search-bar/SearchBar.tsx`: `activeFilterCount > 0` shows animated badge; `onFilterPress` is the tap callback
- `packages/ui/src/components/primitives/box-picker/*`: `mode="multiple"`, `onValueChange` receives the full new array

## Domain types established

From `src/features/task_steps/types.ts`:
- `StepState` includes: `"pending" | "working" | "paused" | "ended_shift" | "blocked" | "completed" | "skipped" | "failed" | "cancelled"`
- Filterable states (per spec): `"pending"`, `"working"`, `"paused"`, `"ended_shift"`, `"completed"`
- `ListWorkingSectionStepsParams.record_step_state?: string` — already present, sent as query param

## Implementation plan

### Step 1 — `surface-ids.ts` (modify)

File: `src/features/task_steps/surface-ids.ts`

Add:
```ts
export const STEP_STATE_FILTER_SHEET_SURFACE_ID = "task-step-state-filter-sheet";

export type StepStateFilterSheetSurfaceProps = {
  selectedStates: StepState[];
  onApply: (states: StepState[]) => void;
};
```

Import `StepState` from `../types` (already imported in adjacent exports in this file — add if not present).

---

### Step 2 — `surfaces.ts` (modify)

File: `src/features/task_steps/surfaces.ts`

Add a lazy surface for `StepStateFilterSheetPage` and register it as `sheet`:

```ts
function loadStepStateFilterSheetPage() {
  return import("@/pages/task_steps/StepStateFilterSheetPage").then(
    (module) => ({ default: module.StepStateFilterSheetPage }),
  );
}

const stepStateFilterSheet = lazyWithPreload(loadStepStateFilterSheetPage);

export const preloadStepStateFilterSheetSurface = stepStateFilterSheet.preload;

// Add to taskStepSurfaces:
[STEP_STATE_FILTER_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: stepStateFilterSheet.Component,
},
```

---

### Step 3 — `StepStateFilterSheetPage.tsx` (new)

File: `src/pages/task_steps/StepStateFilterSheetPage.tsx`

#### 3a — Options constant

```ts
import type { StepState } from "@/features/task_steps/types";
import type { BoxPickerOption } from "@beyo/ui";

const DEFAULT_FILTER_STATES: StepState[] = [
  "pending",
  "working",
  "paused",
  "ended_shift",
];

const FILTER_OPTIONS: BoxPickerOption<StepState>[] = [
  { value: "pending",      label: "Pending",     testId: "filter-option-pending" },
  { value: "working",      label: "Working",     testId: "filter-option-working" },
  { value: "paused",       label: "Paused",      testId: "filter-option-paused" },
  { value: "ended_shift",  label: "Ended shift", testId: "filter-option-ended-shift" },
  { value: "completed",    label: "Completed",   testId: "filter-option-completed" },
];
```

#### 3b — Component structure

```tsx
export function StepStateFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { selectedStates, onApply } = useSurfaceProps<StepStateFilterSheetSurfaceProps>();
  const { close } = useSurface();

  const [localFilters, setLocalFilters] = useState<StepState[]>(
    selectedStates ?? DEFAULT_FILTER_STATES,
  );

  useEffect(() => {
    header?.setTitle("Filter by state");
    header?.setActions(null);
  }, [header]);

  function handleValueChange(newValues: StepState[]) {
    const justAdded = newValues.find((v) => !localFilters.includes(v));

    if (justAdded === "completed") {
      setLocalFilters(["completed"]);
      return;
    }

    if (justAdded !== undefined) {
      // non-completed state added — strip "completed" if present
      setLocalFilters(newValues.filter((v) => v !== "completed"));
      return;
    }

    // a value was deselected — allow empty selection to reach minimum of 1
    if (newValues.length === 0) return; // do not allow empty selection
    setLocalFilters(newValues);
  }

  function handleApply() {
    onApply?.(localFilters);
    close();
  }

  return (
    <div
      className="flex flex-col gap-6 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="step-state-filter-sheet"
    >
      <BoxPicker
        mode="multiple"
        value={localFilters}
        options={FILTER_OPTIONS}
        columns={2}
        onValueChange={handleValueChange}
        data-testid="step-state-filter-picker"
      />

      <button
        type="button"
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="step-state-filter-apply"
        disabled={localFilters.length === 0}
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
}
```

#### 3c — `data-testid` inventory

| Element | `data-testid` |
|---|---|
| Sheet root | `step-state-filter-sheet` |
| BoxPicker | `step-state-filter-picker` |
| Option — pending | `filter-option-pending` |
| Option — working | `filter-option-working` |
| Option — paused | `filter-option-paused` |
| Option — ended_shift | `filter-option-ended-shift` |
| Option — completed | `filter-option-completed` |
| Apply button | `step-state-filter-apply` |

---

### Step 4 — `use-working-section-steps.controller.ts` (modify)

File: `src/features/task_steps/controllers/use-working-section-steps.controller.ts`

#### 4a — Default filter constant (module-level, outside the hook)

```ts
const DEFAULT_STATE_FILTERS: StepState[] = [
  "pending",
  "working",
  "paused",
  "ended_shift",
];
```

#### 4b — New state inside the hook

```ts
const [stateFilters, setStateFilters] = useState<StepState[]>(DEFAULT_STATE_FILTERS);
```

#### 4c — Wire to query

Change the query call to include `record_step_state`:

```ts
const query = useWorkingSectionStepsQuery({
  working_section_id: sectionId,
  q: debouncedSearch || undefined,
  record_step_state: stateFilters.join(","),
  limit: 50,
  offset: 0,
});
```

#### 4d — Compute `activeFilterCount`

```ts
const isDefaultFilter =
  stateFilters.length === DEFAULT_STATE_FILTERS.length &&
  DEFAULT_STATE_FILTERS.every((s) => stateFilters.includes(s));

const activeFilterCount = isDefaultFilter ? 0 : stateFilters.length;
```

#### 4e — `handleOpenStateFilter` callback

```ts
const handleOpenStateFilter = useCallback(() => {
  openSurface(STEP_STATE_FILTER_SHEET_SURFACE_ID, {
    selectedStates: stateFilters,
    onApply: (newFilters: StepState[]) => {
      setStateFilters(newFilters);
    },
  } as StepStateFilterSheetSurfaceProps);
}, [openSurface, stateFilters]);
```

#### 4f — Extend `WorkingSectionStepsController` type and return

Add to the `WorkingSectionStepsController` type:
```ts
stateFilters: StepState[];
activeFilterCount: number;
handleOpenStateFilter: () => void;
```

Add to the return object:
```ts
stateFilters,
activeFilterCount,
handleOpenStateFilter,
```

Add imports: `STEP_STATE_FILTER_SHEET_SURFACE_ID`, `StepStateFilterSheetSurfaceProps` from `../surface-ids`.

---

### Step 5 — `WorkingSectionStepsView.tsx` (modify)

File: `src/features/task_steps/components/WorkingSectionStepsView.tsx`

Destructure new values from context:

```ts
const {
  // ...existing...
  activeFilterCount,
  handleOpenStateFilter,
} = useWorkingSectionStepsContext();
```

Update `SearchBar` props:
```tsx
<SearchBar
  activeFilterCount={activeFilterCount}       // was: 0
  data-testid="working-section-steps-search"
  placeholder="Search by article, SKU…"
  value={search}
  onChange={setSearch}
  onFilterPress={handleOpenStateFilter}        // was: () => {}
  onSortPress={() => {}}
/>
```

No other changes to this file.

---

### Step 6 — `index.ts` (modify)

File: `src/features/task_steps/index.ts`

Add exports:
```ts
export { STEP_STATE_FILTER_SHEET_SURFACE_ID } from "./surface-ids";
export { preloadStepStateFilterSheetSurface } from "./surfaces";
```

---

### Build order summary

```
surface-ids.ts  (add ID + props type)
  → surfaces.ts  (lazy registration)
  → pages/task_steps/StepStateFilterSheetPage.tsx  (new)
  → controllers/use-working-section-steps.controller.ts  (state + query + handler)
  → components/WorkingSectionStepsView.tsx  (wire props)
  → index.ts  (exports)
```

## File change matrix

| File | Action | Change summary |
|---|---|---|
| `src/features/task_steps/surface-ids.ts` | Modify | Add `STEP_STATE_FILTER_SHEET_SURFACE_ID` + `StepStateFilterSheetSurfaceProps` type |
| `src/features/task_steps/surfaces.ts` | Modify | Add `stepStateFilterSheet` lazy surface + `preloadStepStateFilterSheetSurface` + register as `sheet` |
| `src/pages/task_steps/StepStateFilterSheetPage.tsx` | New | BoxPicker multi-select, mutual exclusivity logic, Apply button, surface header title |
| `src/features/task_steps/controllers/use-working-section-steps.controller.ts` | Modify | `stateFilters` state, `record_step_state` query param, `activeFilterCount`, `handleOpenStateFilter`, updated `WorkingSectionStepsController` type |
| `src/features/task_steps/components/WorkingSectionStepsView.tsx` | Modify | Wire `activeFilterCount` and `onFilterPress={handleOpenStateFilter}` to `SearchBar` |
| `src/features/task_steps/index.ts` | Modify | Export new surface ID and preload |

**No provider changes required** — `WorkingSectionStepsProvider` is a transparent shell that passes the full controller through context. Extending the controller return type is sufficient.

**No API or query-hook changes required** — `record_step_state?: string` already exists in `ListWorkingSectionStepsParams` and is already part of `taskStepKeys.sectionList(params)`. TanStack Query automatically creates a distinct cache entry when the filter value changes.

## Risks and mitigations

- Risk: Empty filter selection — user deselects all options and taps Apply, sending an empty `record_step_state=""` which may return unexpected results from the API.
  Mitigation: The Apply button is `disabled` when `localFilters.length === 0`. Additionally, `handleValueChange` guards against deselecting below 1 item. The backend receives at minimum 1 state value.

- Risk: Stale `stateFilters` captured in the `onApply` closure passed through surface props.
  Mitigation: `handleOpenStateFilter` is wrapped in `useCallback` with `stateFilters` in its dep array. Each time the filter sheet is opened, the freshest `stateFilters` snapshot is passed as `selectedStates`. The `onApply` callback is a direct `setStateFilters` call, so it always updates the latest state slot regardless of closure age.

- Risk: The `record_step_state` query key was previously always `undefined` (the param existed in the type but was never passed). On first mount with the new code the key changes from `{ ..., record_step_state: undefined }` to `{ ..., record_step_state: "pending,working,paused,ended_shift" }`, which is a new cache entry — the first fetch will always be a cold miss.
  Mitigation: This is expected and acceptable. The initial load was already a fresh fetch. The UX is unchanged.

- Risk: BoxPicker in `mode="multiple"` calls `onValueChange` with the deduped array after every toggle. The mutual exclusivity logic runs synchronously and a second `setLocalFilters` call never fires mid-render.
  Mitigation: All three paths in `handleValueChange` call `setLocalFilters` at most once, with a fully computed next array. No intermediate state is set.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual smoke test (mobile viewport):
  1. Open any working section → confirm task list shows pending/working/paused/ended_shift steps, SearchBar filter badge is absent
  2. Tap filter button → sheet opens with all 4 default states selected, "Completed" unselected
  3. Tap "Completed" → only "Completed" is checked (others deselect)
  4. Tap "Apply" → sheet closes, list re-fetches showing only completed steps, badge shows "1"
  5. Reopen filter → "Completed" is still checked (persisted in controller state for this session)
  6. Tap "Working" → "Completed" deselects, "Working" checks
  7. Tap "Apply" → list shows only working steps, badge shows "1"
  8. Reopen filter → select all 4 default states → Apply → badge disappears
- `npm run test -- --grep step-state-filter`: (no unit tests authored yet)

## Review log

- `2026-06-01` copilot: plan authored
- `2026-06-01` codex: implemented, typechecked, summarized, and archived

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `codex`
- Transition owner: `david`
