# PLAN_upholstery_picker_nevotex_integration_20260625

## Metadata

- Plan ID: `PLAN_upholstery_picker_nevotex_integration_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T10:35:45Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_upholstery_nevotex_and_inline_category_20260625`
- Intention plan: `—`

## Goal and intent

- Goal: Extend the upholstery picker to fire a parallel Nevotex search alongside the existing DB query when a search term is active, merge results with DB-first priority, and handle selection and favorite-toggling for Nevotex-origin items via sequential create-then-act with optimistic UI.
- Business/user intent: Workers can search and pick Nevotex fabric candidates directly from the picker without needing to first create them manually. Selecting or favouriting a Nevotex candidate auto-creates the DB record transparently.
- Non-goals: Nevotex items on filter tabs (favorites / in_stock / out_of_stock — Nevotex only appears during active search). Creating a brand-new upholstery from scratch outside the Nevotex flow. Pagination of Nevotex results (backend always returns `has_more: false`). Visual Nevotex badge on the card (not part of this plan).

## Scope

- In scope:
  - Parallel search queries: DB (`GET /api/v1/upholsteries?q=…`) + Nevotex (`GET /api/v1/upholsteries/external/nevotex?q=…`) fired simultaneously when `searchQuery.trim().length >= 1`
  - Merge logic: DB items first, dedup by lowercased `name` (DB wins), Nevotex fills remaining slots; frontend assigns a stable `client_id` to each Nevotex item whose API `client_id` is `null`
  - "Show more" / pagination: only applies to the DB query; Nevotex results are fixed-size and never paginated
  - Selection of a Nevotex item: optimistically call `onSelect(client_id)` + close; fire `PUT /api/v1/upholsteries` in background; invalidate picker lists on settle
  - Favourite toggle of a Nevotex item: optimistically mark as favourite in UI; call `PUT /api/v1/upholsteries` (create), then `PATCH /api/v1/upholsteries/{client_id}/favorite` (sequential); revert on error
  - Schema update: add `origin: "nevotex" | "database"` to `UpholsteryPickerOptionSchema`; make `client_id` and `favorite` nullable in the raw API schema
  - Type update: narrow `UpholsteryPickerRecord` so that after controller merge, `client_id` is always `string` (never null)
- Out of scope:
  - Nevotex search on filter tabs (tabs use the DB query only)
  - Inline category creation (`create_category` body field) — Nevotex candidates have no category in this phase; send neither `upholstery_category_id` nor `create_category` when creating from a Nevotex candidate
  - Any UI badge or visual distinction for Nevotex items on the card
  - Error recovery beyond cache rollback and a console error (no toast in scope)
- Assumptions:
  - The project exposes a client-ID generation utility (e.g. `generateId()` or `ulid()` from `@beyo/lib` or a shared util). Codex must look up the correct import before writing the merge step.
  - `PUT /api/v1/upholsteries` accepts a frontend-supplied `client_id` and stores it verbatim.
  - The Nevotex endpoint requires `q` (min 1 char); it is never called when the field is empty.
  - `favorite: null` on a Nevotex raw item is treated as `false` in the merged record for UI purposes.

## Clarifications required

_(none blocking — all information is available in the handoff doc and the existing source)_

## Acceptance criteria

1. Typing a search query fires both the DB and Nevotex requests in parallel; the list renders DB results first, then Nevotex-origin items not already covered by name, with no duplicates.
2. Selecting a DB-origin item behaves exactly as before: `onSelect(clientId)` fires and the surface closes.
3. Selecting a Nevotex-origin item: the surface closes immediately with the frontend-generated `client_id`; `PUT /api/v1/upholsteries` is called in the background; on settle, picker lists are invalidated.
4. Toggling favourite on a DB-origin item behaves exactly as before.
5. Toggling favourite on a Nevotex-origin item: UI optimistically shows the item as favourite; create is awaited; then favourite PATCH is called; on error the optimistic update reverts.
6. `npm run typecheck` reports zero new TypeScript errors.
7. No existing filter-tab behaviour (favorites, in_stock, out_of_stock) is changed.

## Contracts and skills

### Contracts loaded

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_nevotex_and_inline_category_20260625.md`: endpoint shapes, field nullability rules, mutual-exclusion rule for `create_category`

### Local extensions loaded

- `—`

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading another action hook to understand cache snapshot / rollback shape → `08_hooks.md`
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another controller to understand aggregation shape → `08_hooks.md`

Permitted (relational reads — understanding what exists):
- `packages/upholstery/src/types.ts` — exact field names and current Zod schemas before modifying them
- `packages/upholstery/src/api/upholstery-keys.ts` — query key structure before extending it
- `packages/upholstery/src/api/fetch-upholstery-picker-options.ts` — response parsing pattern to replicate for the Nevotex fetcher
- `packages/upholstery/src/api/use-upholstery-picker-options.ts` — hook signature to replicate for the Nevotex hook
- `packages/upholstery/src/actions/use-toggle-upholstery-favorite.ts` — optimistic update / rollback pattern to reference for the new Nevotex favourite action
- `packages/upholstery/src/controllers/use-upholstery-picker.controller.ts` — full controller before modifying it
- `packages/upholstery/src/pages/UpholsteryPickerSlidePage.tsx` — page before modifying it
- `packages/upholstery/src/components/UpholsteryCard.tsx` — to verify props interface before deciding whether it needs changes
- Any `@beyo/lib` barrel or util file that exports an ID-generation utility — to find the correct import for `generateId()`

### Skill selection

- Primary skill: `—`
- Trigger terms: `—`
- Excluded alternatives: `—`

## Implementation plan

### Step 1 — Update `types.ts`

File: `packages/upholstery/src/types.ts`

Changes:
- Add `"nevotex" | "database"` origin enum: `origin: z.enum(["nevotex", "database"])`
- Change `client_id` to `z.string().nullable()` — Nevotex API returns `null`
- Change `favorite` to `z.boolean().nullable()` — Nevotex API returns `null`
- Keep `UpholsteryPickerOption = z.infer<typeof UpholsteryPickerOptionSchema>` (now has nullable `client_id`, nullable `favorite`, required `origin`)
- Redefine `UpholsteryPickerRecord` so it narrows the nullable fields after the controller merge step:
  ```ts
  export type UpholsteryPickerRecord = Omit<UpholsteryPickerOption, "client_id" | "favorite"> & {
    client_id: string;   // guaranteed non-null after merge
    favorite: boolean;   // null treated as false in merge
  };
  ```
- Add `CreateUpholsteryInput` type (for step 5):
  ```ts
  export type CreateUpholsteryInput = {
    client_id: string;
    name: string;
    code: string | null;
    image_url: string | null;
  };
  ```

### Step 2 — Extend `api/upholstery-keys.ts`

File: `packages/upholstery/src/api/upholstery-keys.ts`

Add one key factory:
```ts
nevotexSearch: (q: string) =>
  [...upholsteryKeys.all, "nevotex", "search", q] as const,
```

### Step 3 — Create `api/fetch-nevotex-upholstery-options.ts`

New file: `packages/upholstery/src/api/fetch-nevotex-upholstery-options.ts`

- Mirror the shape of `fetch-upholstery-picker-options.ts`
- Endpoint: `GET /api/v1/upholsteries/external/nevotex`
- Required param: `q: string` (caller must guarantee `q.trim().length >= 1`)
- Optional param: `limit` (default `7`, max `20` per handoff)
- Reuse `ListUpholsteryPickerResponseSchema` — the response envelope is identical
- Return `{ upholsteries: UpholsteryPickerOption[], has_more: boolean }`

### Step 4 — Create `api/use-nevotex-upholstery-options.ts`

New file: `packages/upholstery/src/api/use-nevotex-upholstery-options.ts`

- Mirror `use-upholstery-picker-options.ts`
- `enabled` default: `q.trim().length >= 1` (never fire on empty query)
- Query key: `upholsteryKeys.nevotexSearch(q)`
- Query fn: `fetchNevotexUpholsteryOptions({ q, limit: 7 })`

### Step 5 — Create `api/fetch-create-upholstery.ts`

New file: `packages/upholstery/src/api/fetch-create-upholstery.ts`

- Endpoint: `PUT /api/v1/upholsteries`
- Body: `CreateUpholsteryInput` (fields: `client_id`, `name`, `code`, `image_url`)
- Do NOT send `upholstery_category_id` or `create_category` (Nevotex candidates have no category in this phase)
- Response schema: `ApiEnvelopeSchema(z.object({ upholstery: UpholsteryPickerOptionSchema }))`
- Return `response.data.upholstery`

### Step 6 — Create `actions/use-create-upholstery.ts`

New file: `packages/upholstery/src/actions/use-create-upholstery.ts`

- `useMutation({ mutationFn: fetchCreateUpholstery })`
- `onSettled`: `void queryClient.invalidateQueries({ queryKey: upholsteryKeys.pickerLists() })`
- No optimistic update in this hook — callers manage optimism externally
- Export `{ mutate, mutateAsync, isPending }`

### Step 7 — Update `controllers/use-upholstery-picker.controller.ts`

File: `packages/upholstery/src/controllers/use-upholstery-picker.controller.ts`

**New hooks instantiated:**
```ts
const nevotexSearchQuery = useNevotexUpholsteryOptionsQuery(
  { q: searchQuery },
  { enabled: searchQuery.trim().length > 0 },
);
const createUpholsteryAction = useCreateUpholstery();
```

**New local state:**
```ts
// Tracks nevotex client_ids that the user has optimistically toggled to favourite
// while the create+favourite sequential call is in flight.
const [pendingNevotexFavorites, setPendingNevotexFavorites] = useState<Set<string>>(new Set());
```

**New pure helper — `mergePickerResults`** (define outside the hook, in module scope):

```ts
function mergePickerResults(
  dbItems: UpholsteryPickerOption[],
  nevotexItems: UpholsteryPickerOption[],
  generateId: () => string,
): UpholsteryPickerRecord[] {
  const dbNames = new Set(dbItems.map((i) => i.name.toLowerCase()));

  // DB items — guaranteed to have non-null client_id from the DB endpoint
  const dbRecords: UpholsteryPickerRecord[] = dbItems.map((i) => ({
    ...i,
    client_id: i.client_id as string,   // DB items always have a client_id
    favorite: i.favorite ?? false,
  }));

  // Nevotex items — exclude name duplicates, assign frontend client_id
  const nevotexRecords: UpholsteryPickerRecord[] = nevotexItems
    .filter((i) => !dbNames.has(i.name.toLowerCase()))
    .map((i) => ({
      ...i,
      client_id: generateId(),   // frontend-generated; used for creation
      favorite: false,           // null from API normalised to false
    }));

  return [...dbRecords, ...nevotexRecords];
}
```

> Codex: replace `generateId` with the project's actual ID-generation utility import before writing this.

**Update `getActiveQueryResult()`:**

When `searchQuery.trim().length > 0`:
- Merge with `mergePickerResults(dbItems, nevotexItems, generateId)`
- `isLoading` is `true` if either `searchResultsQuery.isPending` or `nevotexSearchQuery.isPending`

All filter-tab branches remain unchanged (they never touch nevotex data).

**Update `refetch()`:**

When `searchQuery.trim().length > 0`, also `await nevotexSearchQuery.refetch()`.

**Add `prepareSelect(clientId: string): void`** to the returned object:

```ts
function prepareSelect(clientId: string): void {
  const record = upholsteries.find((r) => r.client_id === clientId);
  if (!record || record.origin !== "nevotex") return;

  // Fire-and-forget — page closes optimistically; creation runs in background
  createUpholsteryAction.mutate({
    client_id: clientId,
    name: record.name,
    code: record.code,
    image_url: record.image_url,
  });
}
```

**Replace `toggleFavorite` in the returned object with `handleToggleFavorite`:**

```ts
async function handleToggleFavorite(clientId: string, currentFavorite: boolean): Promise<void> {
  const record = upholsteries.find((r) => r.client_id === clientId);

  if (!record || record.origin === "database") {
    // Existing DB path — unchanged
    toggleFavoriteAction.toggleFavorite({
      client_id: clientId,
      favorite: !currentFavorite,
    });
    return;
  }

  // Nevotex path — sequential: create then favourite
  const nextFavorite = !currentFavorite;

  // Optimistic UI: mark as pending favourite immediately
  setPendingNevotexFavorites((prev) => {
    const next = new Set(prev);
    next.add(clientId);
    return next;
  });

  try {
    await createUpholsteryAction.mutateAsync({
      client_id: clientId,
      name: record.name,
      code: record.code,
      image_url: record.image_url,
    });
    await toggleFavoriteAction.toggleFavoriteAsync({
      client_id: clientId,
      favorite: nextFavorite,
    });
  } catch {
    // Revert optimistic update on any failure
    setPendingNevotexFavorites((prev) => {
      const next = new Set(prev);
      next.delete(clientId);
      return next;
    });
  } finally {
    setPendingNevotexFavorites((prev) => {
      const next = new Set(prev);
      next.delete(clientId);
      return next;
    });
  }
}
```

**Apply `pendingNevotexFavorites` to the merged list** when building `upholsteries`:

After `getActiveQueryResult()`, map over the result to apply optimistic favourite state for Nevotex pending items:

```ts
const upholsteries = rawResult.upholsteries.map((r) =>
  pendingNevotexFavorites.has(r.client_id) ? { ...r, favorite: true } : r,
);
```

**Updated return shape:**
```ts
return {
  // ... existing fields unchanged ...
  upholsteries,           // now includes merged nevotex items during search
  prepareSelect,          // NEW — page must call before onSelect
  toggleFavorite: (clientId: string, currentFavorite: boolean) =>
    void handleToggleFavorite(clientId, currentFavorite),  // replaces old inline
};
```

Rename `UpholsteryPickerController` inferred return type — no change needed as it is `ReturnType<typeof useUpholsteryPickerController>`.

### Step 8 — Update `pages/UpholsteryPickerSlidePage.tsx`

File: `packages/upholstery/src/pages/UpholsteryPickerSlidePage.tsx`

Update `handleSelect`:

```ts
function handleSelect(clientId: string): void {
  controller.prepareSelect(clientId);  // fire nevotex create if needed (non-blocking)
  onSelect?.(clientId);
  header?.requestClose();
}
```

No other changes to the page.

### Step 9 — Verify `UpholsteryCard.tsx` (relational read only)

Codex must read `packages/upholstery/src/components/UpholsteryCard.tsx` before completing the plan.

Expected: the card calls `onSelect(record.client_id)` and `onToggleFavorite(record.client_id, record.favorite)`. Since `UpholsteryPickerRecord` now guarantees `client_id: string` and `favorite: boolean`, no card changes should be required. If the card's props type is `UpholsteryPickerOption` (nullable `client_id`), update the prop type to `UpholsteryPickerRecord`.

## Risks and mitigations

- Risk: `mergePickerResults` generates a new `client_id` for each Nevotex item on every render cycle (both queries re-run), causing React keys to churn.
  Mitigation: Memoize the merged result with `useMemo` keyed on `[searchResultsQuery.data, nevotexSearchQuery.data]`. Generated IDs are stable within a memoized call.

- Risk: User selects a Nevotex item, picker closes, create call fails — consumer now holds an `client_id` that does not exist in the DB.
  Mitigation: `onSettled` invalidation ensures the next time the picker opens, the DB query reflects reality. The host consumer is responsible for handling a missing upholstery (existing responsibility — no change needed).

- Risk: User taps favourite on a Nevotex item twice (double-tap race).
  Mitigation: `pendingNevotexFavorites` check: if `clientId` is already in the set, `handleToggleFavorite` can early-return.

- Risk: The existing `use-toggle-upholstery-favorite.ts` `onMutate` rollback tries to access `upholsteryKeys.detail(client_id)` for a newly-created item that is not yet in the cache.
  Mitigation: `getQueryData` returns `undefined` for missing keys; the existing rollback handles that case gracefully (it already guards with `if (previousDetail)`).

- Risk: Nevotex endpoint returns `502` (Nevotex upstream failure).
  Mitigation: TanStack Query surface the error in `nevotexSearchQuery.isError`; the controller should treat a Nevotex error as an empty result (show only DB results, no crash). Add `const nevotexItems = nevotexSearchQuery.data?.upholsteries ?? []` with no special error UI (acceptable for this phase).

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: type a search query in the picker → confirm both network requests fire in DevTools → confirm merged list shows DB items first, then Nevotex items with no name duplicates
- Manual: select a Nevotex item → picker closes immediately → DevTools shows `PUT /api/v1/upholsteries` request fires after close
- Manual: tap favourite on a Nevotex item → heart toggles immediately → DevTools shows sequential `PUT` then `PATCH` requests → on success both requests complete 200
- Manual: tap favourite on a DB item → behaviour unchanged

## Review log

- `2026-06-25` `user`: Initial plan created
- `2026-06-25` `codex`: Implemented, summarized, and archived

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex`
