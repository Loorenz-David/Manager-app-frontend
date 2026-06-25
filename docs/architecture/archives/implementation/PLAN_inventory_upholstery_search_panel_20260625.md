# PLAN_inventory_upholstery_search_panel_20260625

## Metadata

- Plan ID: `PLAN_inventory_upholstery_search_panel_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T11:08:11Z`
- Related issue/ticket: `—`
- Intention plan: `—`
- Related plan: `docs/architecture/archives/implementation/PLAN_upholstery_picker_nevotex_integration_20260625.md`

## Goal and intent

- Goal: When the user types into the inventory page search bar, replace the category card list with upholstery cards sourced from two parallel queries — the existing DB upholstery endpoint and the Nevotex external endpoint — merged with DB-first priority using the same pattern as the upholstery picker. Selecting or adding stock on a Nevotex card fires the upholstery creation call in background (optimistic, frontend-generated `client_id`), then opens the inventory creation form pre-filled.
- Business/user intent: Workers can discover and onboard Nevotex fabrics directly from the inventory page without opening a separate picker. They can immediately log stock for a fabric they just found via search.
- Non-goals: Searching inventories by text (the search targets upholstery records, not inventory records). Viewing the inventory detail for a DB-origin search result (see known limitations). Pagination of Nevotex search results. Favourite toggling in the search panel. Reordering in the search panel.

## Scope

- In scope:
  - New "search panel" — a third panel state (`activePanelId: "search"`) shown whenever the search bar has text, overriding the category and inventory panels.
  - Parallel queries: `GET /api/v1/upholsteries?q=...` (DB) + `GET /api/v1/upholsteries/external/nevotex?q=...` (Nevotex), merged with DB-first dedup by `name.trim().toLowerCase()`, same merge logic as the picker controller.
  - New `InventorySearchCard` component in the inventory feature: shows upholstery image, name, code, stock condition, and an "Add / View" button. Props: `record: UpholsteryPickerRecord`, `onTapCard(record)`, `onTapAdd(record)`.
  - "Tap card" and "Add" actions for **Nevotex-origin** cards: immediately fire `useCreateUpholstery().mutate(...)` (from `@beyo/upholstery`) with the frontend-generated `client_id`, then open `UpholsteryInventoryCreationSlidePage` in a new `"prefill"` mode with the upholstery data and the same `client_id`.
  - "Tap card" and "Add" actions for **DB-origin** cards: open `UpholsteryInventoryCreationSlidePage` in `"prefill"` mode pre-filled with the upholstery data (no background create — upholstery already exists; see known limitations).
  - New `InventoryCreationSurfaceProps` union member: `mode: "prefill"` with `prefill: { name, code, imageUrl, upholsteryClientId }`. `upholsteryClientId` is the frontend-generated id sent as `client_id` in both the background create call and the form's submit payload, so the backend receives the same id from both and avoids duplicate creation.
  - `UpholsteryInventoryCreationSlidePage` updated to handle `mode: "prefill"`: skip the category step, pre-fill `name`, `code`, `image_url`, and include `upholsteryClientId` in the submission payload.
  - `InventoryListHeader` updated: when `activePanelId === "search"`, show a search panel header (back-to-categories button + search bar); when `activePanelId === "categories"`, existing searchbar drives the upholstery search (not category filtering — see notes on category search removal below).
  - `use-inventory-list.controller.ts` extended: new `upholsterySearchQ` state, debounce, two queries, merge, `prepareAndOpenFromSearch(record)`, `refetch` covers the search queries when search is active.
- Out of scope:
  - Viewing an existing inventory's detail from a DB-origin search result (requires a backend filter `GET /api/v1/upholstery-inventories?upholstery_id=...` that does not yet exist).
  - Separate category filtering search bar (the existing category `q` search is replaced by the upholstery search; categories are not filtered by text in this plan).
  - Favourite toggling or reorder actions on search result cards.
  - Any visual badge distinguishing Nevotex-origin cards from DB-origin cards.
- Assumptions:
  - The `@beyo/upholstery` package exports `useCreateUpholstery`, `useUpholsteryPickerOptionsQuery`, `useNevotexUpholsteryOptionsQuery`, `UpholsteryPickerRecord`, and `generateClientId` (or the project utility for client ID generation). Codex must verify actual export names from `packages/upholstery/src/index.ts`.
  - The merge utility (`mergePickerResults` / `toDatabaseRecords`) from the picker controller is either extractable to a shared location or inlined here. Codex must decide: if it can be imported from the upholstery package, import it; if not, copy the two pure functions into the inventory controller file (they have no side effects).
  - `PUT /api/v1/upholsteries` accepts an optional `client_id` field and associates it with the created upholstery. The `CreateInventoryPayload` in `types.ts` will gain an optional `client_id` field so the inventory creation form can send the same id as the background pre-create call.
  - For DB-origin search results, opening the creation form pre-filled may result in a backend 422 or 409 if a matching name or `client_id` already exists. The creation form already has error handling for this; no special new handling is needed in this plan. This is the known limitation for this phase.

## Clarifications required

_(none — the design is sufficiently specified; all unknowns are noted as assumptions or known limitations)_

## Acceptance criteria

1. Typing in the inventory page search bar shows upholstery cards (DB + Nevotex merged) instead of category cards.
2. Clearing the search bar returns the page to the previously active panel (categories or inventory).
3. DB-origin cards appear before Nevotex-origin cards. No duplicate names appear.
4. Tapping a Nevotex card (either the card body or the "Add" button) fires `PUT /api/v1/upholsteries` in the background and opens the creation form pre-filled.
5. Tapping a DB-origin card opens the creation form pre-filled without firing a background create call.
6. The creation form in `"prefill"` mode opens directly on the details step (category step skipped).
7. Submitting the creation form from `"prefill"` mode uses the `upholsteryClientId` from the surface props as the `client_id` in the API payload.
8. `npm run typecheck`: zero TypeScript errors.

## Contracts and skills

### Contracts loaded

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_nevotex_and_inline_category_20260625.md`: endpoint shapes for `GET /api/v1/upholsteries/external/nevotex` and `PUT /api/v1/upholsteries`

### Local extensions loaded

- `—`

### File read intent — pattern vs. relational

Permitted (relational reads — understanding what exists):
- `packages/upholstery/src/index.ts` — to verify what is exported and what import paths to use
- `packages/upholstery/src/controllers/use-upholstery-picker.controller.ts` — to verify the `mergePickerResults` / `toDatabaseRecords` functions (determine whether to import or inline)
- `src/features/upholstery-inventory/controllers/use-inventory-list.controller.ts` — full file before editing
- `src/features/upholstery-inventory/components/InventoryListView.tsx` — before editing
- `src/features/upholstery-inventory/components/InventoryListHeader.tsx` — before editing
- `src/features/upholstery-inventory/surfaces.ts` — before editing `InventoryCreationSurfaceProps`
- `src/features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx` — to understand the mode-detection logic before adding `"prefill"` mode
- `src/features/upholstery-inventory/types.ts` — to verify `CreateInventoryPayload` before adding `client_id` field
- `src/features/upholstery-inventory/api/create-upholstery-inventory.ts` — to verify the request shape before editing

### Skill selection

- Primary skill: `—`

## Implementation plan

### Step 1 — Extend `CreateInventoryPayload` in `types.ts`

File: `src/features/upholstery-inventory/types.ts`

Add optional `client_id?: string | null` to `CreateInventoryPayload`. This field is passed through to `PUT /api/v1/upholsteries` so the frontend-generated id from the picker search flow is used for the newly created upholstery.

```ts
export type CreateInventoryPayload = {
  client_id?: string | null;   // NEW — optional; used when creating from search
  upholstery_category_id: string | null;
  name: string;
  code: string | null;
  image_url: string | null;
  current_stored_amount_meters: string | null;
  low_stock_threshold_meters: string | null;
  favorite: boolean;
};
```

Also add `client_id` to the corresponding API call in `api/create-upholstery-inventory.ts` so it is forwarded in the request body when present.

---

### Step 2 — Extend `InventoryCreationSurfaceProps` in `surfaces.ts`

File: `src/features/upholstery-inventory/surfaces.ts`

Change the type from a single object type to a discriminated union. Add the `"prefill"` member:

```ts
export type InventoryCreationPrefillData = {
  name: string;
  code: string | null;
  imageUrl: string | null;
  upholsteryClientId: string;
};

export type InventoryCreationSurfaceProps =
  | {
      mode: "edit";
      upholsteryId: UpholsteryId;
      inventoryId: UpholsteryInventoryId;
      prefill: EditInventoryPrefill;
    }
  | {
      mode: "prefill";
      prefill: InventoryCreationPrefillData;
    };
```

The existing `isEditInventorySurfaceProps` type guard in the creation page remains valid — it checks `mode === "edit"` and presence of `upholsteryId` / `inventoryId`.

Add a new type guard:

```ts
function isPrefillInventorySurfaceProps(
  props: Partial<InventoryCreationSurfaceProps>,
): props is Extract<InventoryCreationSurfaceProps, { mode: "prefill" }> {
  return props.mode === "prefill" && Boolean(props.prefill);
}
```

Export `InventoryCreationPrefillData`.

---

### Step 3 — Update `UpholsteryInventoryCreationSlidePage.tsx` to handle `mode: "prefill"`

File: `src/features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx`

After the existing `isEditInventorySurfaceProps` check, add a `isPrefillInventorySurfaceProps` check:

```ts
const editProps = isEditInventorySurfaceProps(props) ? props : null;
const prefillProps = isPrefillInventorySurfaceProps(props) ? props : null;
const isEditMode = Boolean(editProps);
const isPrefillMode = Boolean(prefillProps);
```

Update `defaultCreateValues()` to accept an optional prefill argument:

```ts
function defaultCreateValues(
  prefill?: InventoryCreationPrefillData,
): CreateInventoryFormValues {
  return {
    upholstery_category_id: null,
    name: prefill?.name ?? "",
    code: prefill?.code ?? "",
    image_url: prefill?.imageUrl ?? null,
    current_stored_amount_meters: null,
    low_stock_threshold_meters: null,
    favorite: false,
  };
}
```

Pass `prefillProps?.prefill` to `defaultCreateValues()` when in prefill mode:

```ts
defaultValues:
  editProps
    ? { /* existing edit defaults */ }
    : defaultCreateValues(prefillProps?.prefill ?? undefined),
```

Skip the category step when in prefill mode. In the existing `useLayoutEffect` that handles edit mode skipping the category step, extend it to also handle prefill mode:

```ts
useLayoutEffect(() => {
  if (isEditMode || isPrefillMode) {
    staged.setStepStatus("category", "completed");
    staged.navigateTo("details");
  }
}, []);
```

In `handleSubmit`, when creating (not edit mode), pass `prefillProps?.prefill.upholsteryClientId` as `client_id` in the payload:

```ts
createInventory.mutate(
  {
    client_id: prefillProps?.prefill.upholsteryClientId ?? null,
    upholstery_category_id: values.upholstery_category_id,
    name: values.name.trim(),
    // ... rest unchanged
  },
  { /* callbacks unchanged */ },
);
```

Update the header title:

```ts
header?.setTitle(isEditMode ? "Edit inventory" : "New inventory");
```

No change needed here — prefill mode shows "New inventory", which is correct.

---

### Step 4 — Create `components/InventorySearchCard.tsx`

New file: `src/features/upholstery-inventory/components/InventorySearchCard.tsx`

A card component specifically for upholstery search results in the inventory page context. Does NOT use or modify `UpholsteryCard` from the picker package.

Props:
```ts
type InventorySearchCardProps = {
  record: UpholsteryPickerRecord;
  onTapCard: (record: UpholsteryPickerRecord) => void;
  onTapAdd: (record: UpholsteryPickerRecord) => void;
};
```

Layout: mirror `InventoryListCard` — `mx-4`, image on the left (square thumbnail), content body (name, code, stock indicator, condition pill), "Add" button in the bottom-right corner.

Data mapping from `UpholsteryPickerRecord`:
- Image: `record.image_url`
- Name: `record.name`
- Code: `record.code ?? "No code"`
- Stored amount: `formatMeters(record.current_stored_amount_meters) ?? "0 m"` (import `formatMeters` from `@beyo/upholstery`)
- Condition dot color: derive from `record.inventory_condition` using the existing local `conditionColors` map (same as `UpholsteryCard`)
- "Add" button label: `"Add"` (icon `Plus` from lucide-react)

Both `onTapCard` and `onTapAdd` receive the full `record` (not just `client_id`), so the controller can inspect `origin` without a lookup.

---

### Step 5 — Extend `use-inventory-list.controller.ts`

File: `src/features/upholstery-inventory/controllers/use-inventory-list.controller.ts`

**New imports:**
```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateClientId,
  useCreateUpholstery,
  useUpholsteryPickerOptionsQuery,
  useNevotexUpholsteryOptionsQuery,
  type UpholsteryPickerOption,
  type UpholsteryPickerRecord,
} from "@beyo/upholstery";
```
(Verify exact export names from `packages/upholstery/src/index.ts` before writing.)

**`InventoryPanelId` extended:**
```ts
export type InventoryPanelId = "categories" | "inventory" | "search";
```

**New state in the hook:**
```ts
const [upholsterySearchQ, setUpholsterySearchQ] = useState("");
const [debouncedUpholsterySearchQ, setDebouncedUpholsterySearchQ] = useState("");
const isSearchActive = upholsterySearchQ.trim().length > 0;
const nevotexClientIdsRef = useRef(new Map<string, string>());
```

**Debounce for `upholsterySearchQ`** (same 300ms pattern as the page's existing debounce):
```ts
useEffect(() => {
  const timeout = window.setTimeout(
    () => setDebouncedUpholsterySearchQ(upholsterySearchQ),
    300,
  );
  return () => window.clearTimeout(timeout);
}, [upholsterySearchQ]);
```

**New queries:**
```ts
const dbSearchQuery = useUpholsteryPickerOptionsQuery(
  { q: debouncedUpholsterySearchQ },
  { enabled: isSearchActive },
);
const nevotexSearchQuery = useNevotexUpholsteryOptionsQuery(
  { q: debouncedUpholsterySearchQ, limit: 7 },
  { enabled: isSearchActive },
);
```

**Merge utility:**
Copy (or import, if exported) `mergePickerResults` and `toDatabaseRecords` from the picker controller. These are pure functions with no side effects. If the picker package does not export them, inline them verbatim.

**`getNevotexIdentityForInventory` and stable-ID helper** (same ref-based pattern as picker controller):
```ts
const getClientIdForNevotex = useCallback(
  (record: UpholsteryPickerOption): string => {
    const key = record.name.trim().toLowerCase();
    const existing = nevotexClientIdsRef.current.get(key);
    if (existing) return existing;
    const clientId = generateClientId("Upholstery");
    nevotexClientIdsRef.current.set(key, clientId);
    return clientId;
  },
  [],
);
```

**Memoized merged search results:**
```ts
const searchUpholsteries = useMemo(() => {
  if (!isSearchActive) return [];
  return mergePickerResults(
    dbSearchQuery.data?.upholsteries ?? [],
    nevotexSearchQuery.data?.upholsteries ?? [],
    getClientIdForNevotex,
  );
}, [
  isSearchActive,
  dbSearchQuery.data,
  nevotexSearchQuery.data,
  getClientIdForNevotex,
]);

const isSearchLoading =
  isSearchActive &&
  (dbSearchQuery.isPending || nevotexSearchQuery.isPending);
```

**New action:**
```ts
const createUpholsteryAction = useCreateUpholstery();
```

**`prepareAndOpenFromSearch` function:**
```ts
function prepareAndOpenFromSearch(record: UpholsteryPickerRecord): void {
  if (record.origin === "nevotex") {
    // Fire background create — non-blocking.
    // Uses the same client_id that will be forwarded through the creation form.
    createUpholsteryAction.mutate({
      client_id: record.client_id,
      name: record.name,
      code: record.code,
      image_url: record.image_url,
    });
  }

  useSurfaceStore.getState().open(INVENTORY_CREATION_SLIDE_ID, {
    mode: "prefill",
    prefill: {
      name: record.name,
      code: record.code,
      imageUrl: record.image_url,
      upholsteryClientId: record.client_id,
    },
  } satisfies InventoryCreationSurfaceProps);
}
```

**`activePanelId` derivation:**
Replace the raw `activePanelId` state with a computed value: when `isSearchActive`, the panel is always `"search"`, regardless of the stored panel state.

```ts
const [storedPanelId, setStoredPanelId] =
  useState<Exclude<InventoryPanelId, "search">>("categories");

const activePanelId: InventoryPanelId = isSearchActive
  ? "search"
  : storedPanelId;
```

All existing `setActivePanelId(...)` calls become `setStoredPanelId(...)`.

**`refetch` update:**
```ts
async function refetch(): Promise<void> {
  if (activePanelId === "search") {
    await Promise.all([dbSearchQuery.refetch(), nevotexSearchQuery.refetch()]);
    return;
  }
  // ... existing logic unchanged
}
```

**Existing `categoriesQuery` — remove `q` param:**
Since the searchbar no longer filters categories (it searches upholsteries), remove the `q: debouncedCategoryQ` param from `categoriesQuery`. Remove `categoryQ`, `setCategoryQ`, `debouncedCategoryQ`, and the related `useEffect`. The categories list loads in full (the backend's default limit applies).

The existing `categoryQ` state and `setCategoryQ` are replaced by `upholsterySearchQ` and `setUpholsterySearchQ`.

**Return value additions:**
```ts
return {
  // existing fields — replace categoryQ/setCategoryQ:
  upholsterySearchQ,
  setUpholsterySearchQ,
  // existing panel + direction fields (using new storedPanelId internally)
  activePanelId,    // now includes "search"
  // existing inventory/category fields unchanged
  searchUpholsteries,
  isSearchLoading,
  openFromSearch: prepareAndOpenFromSearch,
  // ... rest unchanged
};
```

---

### Step 6 — Update `InventoryListHeader.tsx`

File: `src/features/upholstery-inventory/components/InventoryListHeader.tsx`

**Props changes:**
- Remove `categoryQ: string` and `onCategoryQChange`
- Add `upholsterySearchQ: string` and `onUpholsterySearchQChange: (value: string) => void`
- `activePanelId` now includes `"search"`

**Category panel header:**
The search bar now drives the upholstery search. Update placeholder to `"Search upholstery..."`. Wire `value={upholsterySearchQ}` and `onChange={onUpholsterySearchQChange}`.

**Search panel header** (new, shown when `activePanelId === "search"`):
Show a back button (calls `onBack`) and the search bar pre-populated with the current query. Layout mirrors the category panel header but uses the back chevron.

```tsx
{activePanelId === "search" ? (
  <m.div key="search-panel-header" ...>
    <button aria-label="Back" onClick={onBack} ...>
      <ChevronLeft className="size-5" />
    </button>
    <SearchBar
      value={upholsterySearchQ}
      onChange={onUpholsterySearchQChange}
      placeholder="Search upholstery..."
      isLoading={isSearchLoading}
    />
  </m.div>
) : /* existing category and inventory panel headers */ }
```

Add `isSearchLoading: boolean` prop.

**Props type:**
```ts
type InventoryListHeaderProps = {
  activePanelId: InventoryPanelId;
  direction: 1 | -1;
  selectedCategory: UpholsteryCategory | null;
  upholsterySearchQ: string;
  isSearchLoading: boolean;
  isCategoriesFetching: boolean;
  onUpholsterySearchQChange: (value: string) => void;
  onBack: () => void;
};
```

---

### Step 7 — Update `InventoryListView.tsx`

File: `src/features/upholstery-inventory/components/InventoryListView.tsx`

**Import `InventorySearchCard`** from the local components folder.

**Update `InventoryListHeader` call-site**: pass `upholsterySearchQ`, `onUpholsterySearchQChange`, `isSearchLoading` from controller; remove `categoryQ` / `onCategoryQChange`.

**`onBack` for search panel**: when in `"search"` panel, `onBack` should clear the search (`setUpholsterySearchQ("")`) rather than going back to categories. Pass `controller.setUpholsterySearchQ` as the clear action, wrapped:

```ts
function handleBack(): void {
  if (controller.activePanelId === "search") {
    controller.setUpholsterySearchQ("");
  } else {
    controller.goBack();
  }
}
```

**Add the search panel** to the `AnimatePresence` body:

```tsx
{controller.activePanelId === "search" ? (
  <m.div
    key="search-panel"
    animate="center"
    className="absolute inset-0 flex flex-col gap-3 px-0 py-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]"
    custom={controller.direction}
    data-testid="upholstery-inventory-body-search"
    exit="exit"
    initial="enter"
    variants={bodyVariants}
  >
    {controller.isSearchLoading &&
    controller.searchUpholsteries.length === 0 ? (
      <div className="flex flex-col gap-3 px-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 shrink-0 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    ) : controller.searchUpholsteries.length > 0 ? (
      controller.searchUpholsteries.map((record) => (
        <InventorySearchCard
          key={record.client_id}
          record={record}
          onTapAdd={controller.openFromSearch}
          onTapCard={controller.openFromSearch}
        />
      ))
    ) : (
      <div className="px-6 py-16 text-center text-sm text-muted-foreground">
        No upholstery found.
      </div>
    )}
  </m.div>
) : controller.activePanelId === "categories" ? (
  /* existing categories panel — unchanged */
) : (
  /* existing inventory panel — unchanged */
)}
```

---

### Step 8 — Update `InventoryListViewProvider.tsx`

No changes to the provider file. The controller's return type changes flow through via `ReturnType<typeof useInventoryListController>`. TypeScript will catch any prop-name mismatches at the view level.

---

## Risks and mitigations

- Risk: For Nevotex-origin cards, the background `createUpholsteryAction.mutate(...)` fires before the creation form opens. If the background call succeeds and the user then submits the form with the same `client_id`, the backend returns 409 (client_id already exists). The creation form already has error display (`submitError`) but the message will be generic.
  Mitigation: The `UpholsteryInventoryCreationSlidePage` already surfaces the error string from the API response. The user sees an error and can try submitting again or closing. In a future iteration, the form can detect 409 and redirect to the existing inventory.

- Risk: For DB-origin cards, the creation form is opened with a pre-filled name. If an inventory already exists for this upholstery, the backend may 409 on the name or silently create a second inventory record.
  Mitigation: Documented as a known limitation for this phase. Future work: add `GET /api/v1/upholstery-inventories?upholstery_client_id=...` backend support and a "find or create" controller path.

- Risk: `mergePickerResults` / `toDatabaseRecords` are inlined from the picker controller. If the picker's version is updated (e.g., for a bug fix), the inventory page copy becomes stale.
  Mitigation: If the picker package exports these utilities, import them instead of copying. Codex should check the package exports first. If not exported, add them to the package's `index.ts` export and import from there.

- Risk: Clearing the search bar (`setUpholsterySearchQ("")`) while in the `"search"` panel returns to the `storedPanelId`. If the user was on the inventory panel (inside a category) before searching, the back action from search correctly returns them there.
  Mitigation: The `storedPanelId` is preserved while searching (it's separate state). No risk — the logic is correct as specified.

- Risk: The `InventoryListHeader` currently handles only two animation keys (`"category-browse-header"` and `"inventory-category-detail-header"`). Adding a third key for the search header needs a matching `variants` entry.
  Mitigation: Add a third `m.div` with `key="search-panel-header"` using the same `headerVariants`. The animation is consistent.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open inventory page → type "afrodite" in search bar → verify both `GET /api/v1/upholsteries?q=afrodite` and `GET /api/v1/upholsteries/external/nevotex?q=afrodite` fire in DevTools → verify upholstery cards render (DB items first, Nevotex items after, no name duplicates)
- Manual: clear search bar → verify category panel returns
- Manual: tap a Nevotex-origin card → verify `PUT /api/v1/upholsteries` fires in background → verify creation form opens pre-filled with the upholstery's name, code, and image
- Manual: tap a DB-origin card → verify NO `PUT /api/v1/upholsteries` fires → verify creation form opens pre-filled
- Manual: submit the creation form from prefill mode → verify the submitted payload includes the `client_id` field

## Review log

- `2026-06-25` `user/reviewer`: Initial plan created
- `2026-06-25` `codex`: Implemented, summarized, and archived

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex`
