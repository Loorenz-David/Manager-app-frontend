# PLAN_wiring_real_data_to_fields_20260522

## Metadata

- Plan ID: `PLAN_wiring_real_data_to_fields_20260522`
- Status: `archived`
- Owner agent: `planning`
- Created at (UTC): `2026-05-22T18:00:00Z`
- Last updated at (UTC): `2026-05-22T19:19:20Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_config_read_endpoints_and_upholstery_inline_20260522`
- Intention plan: `docs/architecture/under_construction/intention/wiring_real_data_to_fields.md`

## Goal and intent

- Goal: Replace all mock-data-backed complex form fields with fields that independently fetch, cache, and render real API data via a per-domain Zustand selection store and a flow hook.
- Business/user intent: Any form that includes these fields gets live option data without the parent needing to supply or manage option lists. A field added to a form just works.
- Non-goals: Issue severity picker (no endpoint in this handoff), upholstery inventory management pages, pagination within pickers (limit=200 covers current data scale), field-level write operations.

## Scope

- In scope:
  - `ItemUpholsteryField` — Phase 1 (priority, implement first)
  - `WorkingSectionPickerField` — Phase 2
  - `ItemCategorySelectionField` — Phase 3
  - `ItemIssuesField` — Phase 4
  - Per-field: Response DTO schema, query key extension, API fetch function, query hook, Zustand selection store, flow hook, field + picker page update, test updates
- Out of scope:
  - Issue severity picker (no API endpoint in this handoff)
  - Forms or flows that consume these fields (no call-site changes needed)
  - Upholstery inventory management pages
  - Single-record `GET /{client_id}` fallback for other fields (only upholstery requires this — see Step 1.10a)

- Assumptions:
  - All list endpoints return ≤200 records at `limit=200`; paginated loading is not required for these pickers
  - The Zustand store acts as a cross-form picker cache — this is an intentional local design decision that overrides the server-state-in-Zustand prohibition from `06_client_state.md` for this specific use case
  - Working sections API strips extra fields (`dependencies`, `item_categories`, `supported_issue_types`) silently via Zod `strip` mode
  - `ItemCategoryPickerSheetPage` uses `image_url` from the API; the `icon` (React component) used in test data is dropped — the `BoxPicker` renders text-only options for sub-categories
  - `ItemIssuesField` watches `'item.item_category_id'` from the shared form context (nested under `item` key, consistent with `ItemCategorySelectionField`)

## Clarifications required

- [x] `ItemUpholsteryField` in edit mode: **resolved — single-fetch is required.** When the selected `upholstery_client_id` is set on first mount and the store does not contain it, the field must trigger `GET /api/v1/upholsteries/{client_id}` and display the returned name/image. See Steps 1.10a–1.10b.
- [x] `UpholsteryCard` display field: **resolved — `current_stored_amount_meters` is correct.**

## Acceptance criteria

1. All four field components contain zero references to `TEST_xxx` variables.
2. Options are loaded from the API on the first picker open and cached in their Zustand stores; subsequent form mounts do not trigger new fetches.
3. `ItemUpholsteryField` in edit mode: when the form opens with a pre-set `upholstery_client_id` that is not yet in the store, the field triggers `GET /api/v1/upholsteries/{client_id}` and displays the returned name/image without requiring the user to open the picker.
4. Upholstery picker search sends `q` to the backend when non-empty (with 300ms debounce); clears back to store options when the input is cleared.
5. Working section picker renders the full section list from `GET /api/v1/working-sections` with member sub-rows.
6. `ItemCategorySelectionField` auto-resolves `major_category` from an injected `item_category_id` by looking up the store's `byMajorCategory` map on mount.
7. `ItemIssuesField` shows a "Select a category first" text placeholder (no `BoxPicker`) when `item.item_category_id` is not set; resets selected issues when the category changes.
8. All fields render a loading state during the initial fetch.
9. `npm run typecheck` — zero new TypeScript errors.
10. All Vitest tests pass: existing tests updated to new type shapes (Phase 1); new test files written for Phases 2, 3, and 4.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: query hook, query key factory pattern, `staleTime` defaults
- `architecture/06_client_state.md`: Zustand store definition — `create<State>()(set => ...)`, selectors, one file per store
- `architecture/15_feature_structure.md`: `api/`, `flows/`, `store/` folder placement, `index.ts` public boundary
- `architecture/24_dto.md`: Zod parsing at API boundary only; transformer function in `types.ts`; ViewModel vs Response DTO
- `architecture/04_api_client_local.md`: `{ ok: true, data: <payload>, warnings: [] }` success envelope — all fetch functions unwrap `data`; flat `{ ok: false, error: string }` error

### Local extensions loaded

- `architecture/04_api_client_local.md`: standard `data` envelope unwrap applies to every new `fetch-*.ts` file

### File read intent — pattern vs. relational

Permitted relational reads during implementation:
- `features/upholstery/api/upholstery-keys.ts` — existing key shape to extend
- `features/upholstery/components/UpholsteryCard.tsx` — exact field names to update
- `features/working-sections/types.ts` — `WorkingSectionOption` field names for schema alignment
- `features/items/types.ts` — `ItemIssuesFieldSchema` to confirm `issue_id = issue_type_id` semantic
- `features/items/pages/ItemCategoryPickerSheetPage.tsx` — confirm surface props shape before changing

Prohibited:
- Reading other action hooks to learn optimistic update shape → `08_hooks.md` (no mutations in this plan)
- Reading other providers → not needed (no new providers)

### Skill selection

- Primary skill: none (standard data-layer + field wiring, no novel patterns)

---

## Implementation plan

### Phase 1 — ItemUpholstery field (implement first)

**Step 1.1 — Update `features/upholstery/types.ts`**

Add the picker Response DTO schema (matches API response shape with inline inventory):
```ts
export const UpholsteryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  image_url: z.string().nullable(),
  current_stored_amount_meters: z.string().nullable(),
  inventory_condition: z.enum(UPHOLSTERY_INVENTORY_CONDITION).nullable(),
});
export type UpholsteryPickerOption = z.infer<typeof UpholsteryPickerOptionSchema>;
```

Replace the existing `UpholsteryPickerRecord` definition:
- Remove old fields: `image: string`, `current_available_amount_meters: number`
- New: `export type UpholsteryPickerRecord = UpholsteryPickerOption` (type alias)

Remove `formatPickerMeters` (used only for `number` input; the existing `formatMeters(value: string | null)` in the same file already handles the new type — make it exported).

Add query params type:
```ts
export type ListUpholsteryPickerParams = { q?: string; limit?: number; offset?: number };
```

**Step 1.2 — Extend `features/upholstery/api/upholstery-keys.ts`**

Add picker-specific keys (separate from the existing `list`/`detail` keys):
```ts
pickerLists: () => [...upholsteryKeys.all, 'picker', 'list'] as const,
pickerList: (params: ListUpholsteryPickerParams = {}) =>
  [...upholsteryKeys.pickerLists(), params] as const,
```

**Step 1.3 — Create `features/upholstery/api/fetch-upholstery-picker-options.ts`**

Calls `GET /api/v1/upholsteries` with `{ limit: params.limit ?? 50, offset: params.offset ?? 0, q: params.q }` (omit `q` when undefined so it is stripped by `apiClient`).

Response Zod schema (define the pagination shape inline — no shared `PaginationSchema` exists in this codebase):
```ts
z.object({
  upholsteries: z.array(UpholsteryPickerOptionSchema),
  upholsteries_pagination: z.object({
    has_more: z.boolean(),
    limit: z.number(),
    offset: z.number(),
  }),
})
```

Returns `{ upholsteries: UpholsteryPickerOption[], has_more: boolean }`.

Use the same inline pagination object shape in every other `fetch-*-picker*.ts` file in this plan — there is no shared `PaginationSchema` to import.

**Step 1.4 — Create `features/upholstery/api/use-upholstery-picker-options.ts`**

All four picker list query hooks in this plan need a second `options` parameter so the flow and the slide page can control `enabled` from outside. Without it, Step 1.6 and Step 1.9 would fail TypeScript (`useUpholsteryPickerOptionsQuery({}, { enabled: ... })` — second arg not accepted).

```ts
export function useUpholsteryPickerOptionsQuery(
  params: ListUpholsteryPickerParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryKeys.pickerList(params),
    queryFn: () => fetchUpholsteryPickerOptions(params),
    enabled: options.enabled ?? true,
  });
}
```

Apply the same `options: { enabled?: boolean } = {}` second parameter to all picker list query hooks created in Phases 2, 3, and 4:
- `useWorkingSectionsPickerQuery` (Phase 2, Step 2.4)
- `useItemCategoriesPickerQuery` (Phase 3, Step 3.4)
- `useIssueCategoryConfigsQuery` (Phase 4, Step 4.4)

**Step 1.5 — Create `features/upholstery/store/upholstery-selection.store.ts`**

```ts
type UpholsterySelectionState = {
  options: UpholsteryPickerRecord[];
  setOptions: (options: UpholsteryPickerRecord[]) => void;
  clear: () => void;
};
export const useUpholsterySelectionStore = create<UpholsterySelectionState>()(
  (set) => ({
    options: [],
    setOptions: (options) => set({ options }),
    clear: () => set({ options: [] }),
  }),
);
```

**Step 1.6 — Create `features/upholstery/flows/use-upholstery-picker.flow.ts`**

```ts
export function useUpholsteryPickerFlow() {
  const storeOptions = useUpholsterySelectionStore((s) => s.options);
  const setOptions   = useUpholsterySelectionStore((s) => s.setOptions);

  const { data, isPending } = useUpholsteryPickerOptionsQuery(
    {},
    { enabled: storeOptions.length === 0 },
  );

  useEffect(() => {
    if (data?.upholsteries && storeOptions.length === 0) {
      setOptions(data.upholsteries);
    }
  }, [data, storeOptions.length, setOptions]);

  return {
    options: storeOptions.length > 0 ? storeOptions : (data?.upholsteries ?? []),
    isLoading: isPending && storeOptions.length === 0,
  };
}
```

**Step 1.7 — Update `features/upholstery/components/UpholsteryCard.tsx`**

- `record.image` → `record.image_url ?? ''` (null-safe `src`)
- Meters span: `{formatMeters(record.current_stored_amount_meters) ?? '—'}` (null shows dash)
- Add a small `inventory_condition` indicator dot (optional: `available` = green, `low_stock` = amber, `out_of_stock` = red) before or after the meters value — null condition shows nothing

**Step 1.8 — Update `features/upholstery/components/UpholsterySearch.tsx`**

Remove the internal `filterAndSort` logic (server handles search).

New props:
```ts
type UpholsterySearchProps = {
  value: string;
  onChange: (q: string) => void;
};
```

Render only `SearchBar` forwarding `value` and `onChange`. Remove `onSortPress` (sort button becomes a no-op; hide or keep as future enhancement). Remove the `onFilteredResults` callback entirely.

**Step 1.9 — Update `features/upholstery/pages/UpholsteryPickerSlidePage.tsx`**

```tsx
export function UpholsteryPickerSlidePage() {
  const { currentClientId, title, description, onSelect } =
    useSurfaceProps<UpholsteryPickerSlidePageProps>();

  const { options: initialOptions, isLoading } = useUpholsteryPickerFlow();
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce the raw input 300ms before sending to the API — prevents a request per keystroke
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Server-side search query — only fires when debouncedQuery is non-empty
  const { data: searchData, isPending: isSearchPending } = useUpholsteryPickerOptionsQuery(
    { q: debouncedQuery },
    { enabled: debouncedQuery.trim().length > 0 },
  );

  const displayedOptions =
    debouncedQuery.trim().length > 0
      ? (searchData?.upholsteries ?? [])
      : initialOptions;

  const isShowingLoading =
    (isLoading && displayedOptions.length === 0) ||
    (debouncedQuery.trim().length > 0 && isSearchPending);

  // ... rest of layout: header with UpholsterySearch, list of UpholsteryCard
}
```

Pass `value={searchQuery}` and `onChange={setSearchQuery}` to `UpholsterySearch`. Show a loading indicator or skeleton when `isShowingLoading`. Show "No results" empty state when options are empty and not loading.

**Step 1.10 — Create `features/upholstery/api/fetch-upholstery.ts`**

Single-record fetch for edit-mode display:

`GET /api/v1/upholsteries/{client_id}`

Response schema:
```ts
z.object({ upholstery: UpholsteryPickerOptionSchema })
```

Returns `UpholsteryPickerOption`.

**Step 1.10a — Create `features/upholstery/api/use-upholstery-picker-option.ts`**

Follow the exact same pattern as the existing `useImageQuery` (query hooks must not read from Zustand stores — that coupling belongs in the caller, not in `api/`). The caller (Step 1.10b) already handles the store-first logic by passing `null` when a store match exists:

```ts
export function useUpholsteryPickerOptionQuery(clientId: string | null | undefined) {
  return useQuery({
    queryKey: upholsteryKeys.detail((clientId ?? '') as UpholsteryId),
    queryFn: () => fetchUpholstery(clientId!),
    enabled: Boolean(clientId),
  });
}
```

The `detail` keys already exist in `upholstery-keys.ts` — no changes needed there.

**Step 1.10b — Update `features/items/components/fields/ItemUpholsteryField.tsx`**

Replace `TEST_UPHOLSTERIES.find(...)` with store lookup + single-fetch fallback:

```ts
const storeOptions = useUpholsterySelectionStore((s) => s.options);
const storeMatch  = value ? storeOptions.find((e) => e.client_id === value) ?? null : null;

// Only fires when value is set and not in store (edit mode before picker opened)
const { data: fetchedOption } = useUpholsteryPickerOptionQuery(
  storeMatch === null ? value : null,
);

const selectedUpholstery = storeMatch ?? fetchedOption ?? null;
```

Update display references:
- `selectedUpholstery.image` → `selectedUpholstery.image_url ?? ''`
- While `value` is set but `selectedUpholstery` is still null (fetch in flight): render the trigger button in a loading/skeleton state (dims the button, no image, no name)

**Step 1.11 — Update `features/upholstery/index.ts`**

Add exports:
- `UpholsteryPickerOption`, `ListUpholsteryPickerParams` (types)
- `useUpholsteryPickerFlow`
- `useUpholsterySelectionStore`
- `useUpholsteryPickerOptionQuery` (single-record hook — used by `ItemUpholsteryField`)

Remove `TEST_UPHOLSTERIES` from the public index — it remains in `upholstery-test-data.ts` for use by tests only (not exported by `index.ts`).

**Step 1.12 — Update tests**

- `UpholsteryCard.test.tsx`: update mock `UpholsteryPickerRecord` to new shape (`image_url`, `current_stored_amount_meters: string | null`, `inventory_condition: ... | null`)
- `UpholsterySearch.test.tsx`: update to new controlled props (`value`, `onChange`); remove `items` / `onFilteredResults` assertions
- `ItemUpholsteryField.test.tsx`:
  - Mock `useUpholsterySelectionStore` via `vi.mock`; supply a mock store option matching `UpholsteryPickerRecord` new shape — verifies normal selection display
  - Add case: store returns empty array + `useUpholsteryPickerOptionQuery` returns a record — verifies edit-mode single-fetch display path
  - Add case: store empty + single-fetch pending — verifies loading/skeleton state is shown

---

### Phase 2 — WorkingSectionPickerField

**Step 2.1 — Update `features/working-sections/types.ts`**

Add Zod schemas (existing types are plain TS — add schemas for API parsing):
```ts
export const WorkingSectionMemberSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string(),
});

// Only parses the fields needed by the picker; API extras are stripped silently
export const WorkingSectionPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  image: z.string(),
  members: z.array(WorkingSectionMemberSchema),
});
export type WorkingSectionPickerOption = z.infer<typeof WorkingSectionPickerOptionSchema>;
```

`WorkingSectionOption` already matches `WorkingSectionPickerOption`; add `export type WorkingSectionOption = WorkingSectionPickerOption` alias (or simply keep both and confirm they are identical).

**Step 2.2 — Create `features/working-sections/api/working-section-keys.ts`**

Standard factory:
```ts
export const workingSectionKeys = {
  all: ['working-sections'] as const,
  lists: () => [...workingSectionKeys.all, 'list'] as const,
  list: (params: { limit?: number; offset?: number } = {}) =>
    [...workingSectionKeys.lists(), params] as const,
};
```

**Step 2.3 — Create `features/working-sections/api/fetch-working-sections-picker.ts`**

`GET /api/v1/working-sections?limit=200&offset=0`

Response schema:
```ts
z.object({
  working_sections: z.array(WorkingSectionPickerOptionSchema),
  working_sections_pagination: z.object({ has_more: z.boolean(), limit: z.number(), offset: z.number() }),
})
```

Returns `{ workingSections: WorkingSectionPickerOption[] }`.

**Step 2.4 — Create `features/working-sections/api/use-working-sections-picker.ts`**

`useWorkingSectionsPickerQuery()` — no params (no search for working sections).

**Step 2.5 — Create `features/working-sections/store/working-section-selection.store.ts`**

Same shape as upholstery store: `{ options, setOptions, clear }`.

**Step 2.6 — Create `features/working-sections/flows/use-working-section-picker.flow.ts`**

Identical pattern to upholstery flow. Returns `{ options, isLoading }`.

**Step 2.7 — Update `features/working-sections/components/fields/WorkingSectionPickerField.tsx`**

- Import and call `useWorkingSectionPickerFlow()`
- Replace `TEST_WORKING_SECTIONS` references with `flow.options`
- Show a loading row or placeholder while `flow.isLoading && flow.options.length === 0`

**Step 2.8 — Update `features/working-sections/index.ts`**

Export: `WorkingSectionPickerOption`, `WorkingSectionPickerOptionSchema`, `useWorkingSectionPickerFlow`, `useWorkingSectionSelectionStore`.

**Step 2.9 — Tests**

No existing test file for `WorkingSectionPickerField`. Write a new `WorkingSectionPickerField.test.tsx`:
- Mock `useWorkingSectionPickerFlow` via `vi.mock`
- Case: flow returns options → all section boxes render
- Case: flow returns `isLoading: true, options: []` → loading state renders (no section boxes crash)
- Case: single-member section → auto-selects the member without opening the worker picker surface

---

### Phase 3 — ItemCategorySelectionField

**Step 3.1 — Update `features/items/types.ts`**

Add picker option schema (real API shape — note: API has `image_url`, NOT `icon`):
```ts
export const ItemCategoryPickerOptionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  major_category: z.string(),
  image_url: z.string().nullable(),
});
export type ItemCategoryPickerOption = z.infer<typeof ItemCategoryPickerOptionSchema>;
export type ListItemCategoriesPickerParams = { q?: string; limit?: number; offset?: number };
```

**Step 3.2 — Create `features/items/api/item-category-picker-keys.ts`**

```ts
export const itemCategoryPickerKeys = {
  all: ['item-categories', 'picker'] as const,
  lists: () => [...itemCategoryPickerKeys.all, 'list'] as const,
  list: (params: ListItemCategoriesPickerParams = {}) =>
    [...itemCategoryPickerKeys.lists(), params] as const,
};
```

**Step 3.3 — Create `features/items/api/fetch-item-categories-picker.ts`**

`GET /api/v1/item-categories?limit=200`

Response schema: `z.object({ item_categories: z.array(ItemCategoryPickerOptionSchema), item_categories_pagination: PaginationSchema })`

Returns `{ itemCategories: ItemCategoryPickerOption[] }`.

**Step 3.4 — Create `features/items/api/use-item-categories-picker.ts`**

`useItemCategoriesPickerQuery(params?: ListItemCategoriesPickerParams)`

**Step 3.5 — Create `features/items/store/item-category-selection.store.ts`**

Includes a fast lookup map keyed by `major_category`:
```ts
type ItemCategorySelectionState = {
  options: ItemCategoryPickerOption[];
  byMajorCategory: Record<string, ItemCategoryPickerOption[]>;
  setOptions: (options: ItemCategoryPickerOption[]) => void;
  clear: () => void;
};
```

`setOptions` builds `byMajorCategory` by grouping the options by `major_category` before writing to store.

**Step 3.6 — Create `features/items/flows/use-item-category-picker.flow.ts`**

Same store-first pattern. Returns `{ options, byMajorCategory, isLoading }`.

**Step 3.7 — Update `features/items/components/fields/ItemCategorySelectionField.tsx`**

- Call `useItemCategoryPickerFlow()`
- Replace `TEST_ITEM_CATEGORIES` with `flow.options` / `flow.byMajorCategory`
- On mount (useEffect `[]`): if `categoryField.value` is set and `majorField.value` is empty, derive major_category from `flow.options.find(c => c.client_id === categoryField.value)?.major_category`
  - Note: if flow is still loading on mount, defer this lookup to a second effect that fires when `flow.options` is non-empty
- When opening the picker: pass `categories: flow.byMajorCategory[majorCategory] ?? []` in the surface props (so the sheet page does not need its own flow call)
- Add `categories: ItemCategoryPickerOption[]` to the surface open payload type

**Step 3.8 — Update `features/items/pages/ItemCategoryPickerSheetPage.tsx`**

- Surface prop type: add `categories: ItemCategoryPickerOption[]` (pre-filtered by major_category, passed from the field)
- Replace `TEST_ITEM_CATEGORIES.filter(...)` with `categories` from surface props
- Map to `BoxPicker` options without `icon` (API has no icon):
  ```ts
  options = categories.map((c) => ({
    value: c.client_id,
    label: c.name,
    testId: `item-category-${c.client_id}-option`,
  }));
  ```

**Step 3.9 — Update `features/items/index.ts`**

Export: `ItemCategoryPickerOption`, `ItemCategoryPickerOptionSchema`, `ListItemCategoriesPickerParams`, `useItemCategoryPickerFlow`, `useItemCategorySelectionStore`.

**Step 3.10 — Tests**

No existing test file for `ItemCategorySelectionField`. Write a new `ItemCategorySelectionField.test.tsx`:
- Mock `useItemCategoryPickerFlow` via `vi.mock` returning both `options` and `byMajorCategory`
- Case: injected `item_category_id` with `major_category: 'wood'` → `majorField` auto-set to `'wood'` on mount
- Case: `isLoading: true` → major category `BoxPicker` is still rendered (options come from `MAJOR_CATEGORY_OPTIONS` which is a static constant, not from the flow); category trigger does not open picker until flow resolves

---

### Phase 4 — ItemIssuesField

**Step 4.1 — Update `features/items/types.ts`**

Add issue category config schema (the picker options for issues):
```ts
export const IssueCategoryConfigSchema = z.object({
  client_id: z.string(),
  item_category_id: z.string(),
  issue_type_id: z.string(),
  base_time_seconds: z.number().int(),
  issue_type_name: z.string(),
});
export type IssueCategoryConfig = z.infer<typeof IssueCategoryConfigSchema>;

export type ListIssueCategoryConfigsParams = {
  item_category_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};
```

Note: `issue_id` in `ItemIssuesFieldSchema` maps to `issue_type_id` in `IssueCategoryConfig` — confirmed by `ItemIssueSchema.issue_type_id` field.

**Step 4.2 — Create `features/items/api/issue-category-config-keys.ts`**

```ts
export const issueCategoryConfigKeys = {
  all: ['issue-category-configs'] as const,
  lists: () => [...issueCategoryConfigKeys.all, 'list'] as const,
  list: (params: ListIssueCategoryConfigsParams = {}) =>
    [...issueCategoryConfigKeys.lists(), params] as const,
};
```

**Step 4.3 — Create `features/items/api/fetch-issue-category-configs.ts`**

`GET /api/v1/issue-category-configs` with `{ item_category_id, limit: 200, q }` (omit undefined fields).

Response schema: `z.object({ issue_category_configs: z.array(IssueCategoryConfigSchema), issue_category_configs_pagination: PaginationSchema })`

Returns `{ issueConfigs: IssueCategoryConfig[] }`.

**Step 4.4 — Create `features/items/api/use-issue-category-configs.ts`**

`useIssueCategoryConfigsQuery(params: ListIssueCategoryConfigsParams)`

Note: key includes `item_category_id` so each category's configs are cached separately.

**Step 4.5 — Create `features/items/store/issue-category-config-selection.store.ts`**

```ts
type IssueCategoryConfigSelectionState = {
  configsByCategory: Record<string, IssueCategoryConfig[]>;
  setConfigsForCategory: (categoryId: string, configs: IssueCategoryConfig[]) => void;
  clear: () => void;
};
```

`setConfigsForCategory` merges the new `categoryId` entry into `configsByCategory` without clearing other categories.

**Step 4.6 — Create `features/items/flows/use-item-issues-picker.flow.ts`**

```ts
export function useItemIssuesPickerFlow(itemCategoryId: string | null) {
  const configsByCategory = useIssueCategoryConfigSelectionStore((s) => s.configsByCategory);
  const setConfigsForCategory = useIssueCategoryConfigSelectionStore((s) => s.setConfigsForCategory);

  const alreadyCached = itemCategoryId ? (configsByCategory[itemCategoryId] ?? null) : null;

  const { data, isPending } = useIssueCategoryConfigsQuery(
    { item_category_id: itemCategoryId ?? undefined },
    { enabled: itemCategoryId !== null && alreadyCached === null },
  );

  useEffect(() => {
    if (data?.issueConfigs && itemCategoryId && alreadyCached === null) {
      setConfigsForCategory(itemCategoryId, data.issueConfigs);
    }
  }, [data, itemCategoryId, alreadyCached, setConfigsForCategory]);

  if (itemCategoryId === null) {
    return { options: [] as IssueCategoryConfig[], isLoading: false, isDisabled: true };
  }

  const options =
    alreadyCached !== null ? alreadyCached : (data?.issueConfigs ?? []);

  return {
    options,
    isLoading: isPending && alreadyCached === null,
    isDisabled: false,
  };
}
```

**Step 4.7 — Update `features/items/components/fields/ItemIssuesField.tsx`**

- Watch `item.item_category_id` from form context:
  ```ts
  const { watch } = useFormContext();
  const itemCategoryId: string | undefined = watch('item.item_category_id');
  ```
- Call `useItemIssuesPickerFlow(itemCategoryId ?? null)`
- If `flow.isDisabled`: do NOT render `BoxPicker` — `BoxPickerProps` has no top-level `disabled` prop (only individual options have `disabled?: boolean`). Instead render a text placeholder:
  ```tsx
  {flow.isDisabled ? (
    <p
      className="text-sm text-muted-foreground"
      data-testid="item-issues-disabled-state"
    >
      Select a category first
    </p>
  ) : (
    <BoxPicker ... />
  )}
  ```
- `BoxPicker` options: map `flow.options` as `IssueCategoryConfig[]` to `BoxPickerOptionType[]`:
  ```ts
  const options = flow.options.map((config) => ({
    value: config.issue_type_id,
    label: config.issue_type_name,
    testId: `item-issue-${config.issue_type_id}-option`,
  }));
  ```
- Issue matching: `handleIssuePress(issueId)` where `issueId = issue_type_id`
  - `currentPairs.find(p => p.issue_id === issueId)` — unchanged
  - `onSelect` in the severity picker surface: unchanged (`issue_id: id, issue_severity_id: severityId`)
- Reset on category change:
  ```ts
  const previousCategoryRef = useRef(itemCategoryId);
  useEffect(() => {
    if (previousCategoryRef.current !== itemCategoryId) {
      previousCategoryRef.current = itemCategoryId;
      field.onChange([]);
    }
  }, [itemCategoryId, field]);
  ```
- Issue severity picker (`item-issue-severity-picker` surface) continues to use `TEST_ISSUE_SEVERITIES` until a backend endpoint is available

**Step 4.8 — Update `features/items/index.ts`**

Export: `IssueCategoryConfig`, `IssueCategoryConfigSchema`, `ListIssueCategoryConfigsParams`, `useItemIssuesPickerFlow`, `useIssueCategoryConfigSelectionStore`.

**Step 4.9 — Tests**

No existing test file for `ItemIssuesField`. Write a new `ItemIssuesField.test.tsx`:
- Mock `useItemIssuesPickerFlow` and `useFormContext` (`watch`) via `vi.mock`
- Case: `itemCategoryId = null` → disabled placeholder text "Select a category first" renders; `BoxPicker` absent
- Case: `itemCategoryId = 'cat_wood'`, flow returns options → `BoxPicker` renders with mapped options
- Case: `itemCategoryId` changes from `'cat_wood'` to `'cat_seat'` → `field.onChange([])` called (issues reset)

---

## Risks and mitigations

- Risk: `UpholsteryPickerRecord` type change (`image` → `image_url`, `current_available_amount_meters: number` → `current_stored_amount_meters: string | null`) cascades to `UpholsteryCard`, `UpholsterySearch`, `ItemUpholsteryField`, and their tests.
  Mitigation: Steps 1.7–1.10 explicitly touch all affected files. Tests updated in Step 1.12. Run `npm run typecheck` after Step 1.10 before proceeding to Phase 2.

- Risk: Working sections API payload includes large extra fields (`dependencies`, `item_categories`, `supported_issue_types`) that are not in `WorkingSectionPickerOptionSchema`.
  Mitigation: Zod `strip` mode (default) silently drops undeclared fields. No special handling needed.

- Risk: `ItemCategorySelectionField` on-mount derive of `major_category` from store may fire before the flow has loaded options (empty store, pending query).
  Mitigation: A second `useEffect` keyed on `flow.options.length` fires once options arrive; no race condition — it simply waits.

- Risk: `ItemIssuesField` watches `'item.item_category_id'` — this form field path is specific to the combined item creation/edit form. If the field is used in a form with a different nesting, the watch returns undefined and the field renders as disabled.
  Mitigation: Acceptable for the current forms. If future forms use a different path, the field can be given a `categoryIdFormPath?: string` prop (defaulting to `'item.item_category_id'`). Do not add this now — YAGNI.

- Risk: `ItemCategoryPickerSheetPage` currently maps `TEST_ITEM_CATEGORIES` to options including `icon` (Lucide component). Removing `icon` changes the visual appearance of the sheet picker.
  Mitigation: The `BoxPicker` renders gracefully without icons (text-only). Visual enhancement (thumbnail images via `image_url`) can be added to `BoxPicker` as a follow-up once the data is confirmed correct.

## Validation plan

- `npm run typecheck`: zero TypeScript errors (run after each phase before starting the next)
- `npm run test:unit -- src/features/upholstery`: all upholstery tests pass after Phase 1 (Step 1.12 updates existing tests)
- `npm run test:unit -- src/features/working-sections`: all tests pass after Phase 2 (Step 2.9 adds new test)
- `npm run test:unit -- src/features/items`: all item tests pass after Phases 3 and 4 (Steps 3.10 and 4.9 add new tests)
- Manual smoke: open each form field, confirm API requests fire in the network tab, confirm store is populated, confirm a second form open triggers no new requests
- Manual smoke: open an edit form with a pre-filled `upholstery_client_id` before opening the picker — confirm name/image display without opening the picker

## Review log

_(empty — awaiting review)_

## Lifecycle transition

- Current state: `archived`
- Next state: `none`
- Transition owner: `Codex`
