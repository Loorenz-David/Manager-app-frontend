# PLAN_upholstery_picker_nevotex_corrections_20260625

## Metadata

- Plan ID: `PLAN_upholstery_picker_nevotex_corrections_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T10:47:44Z`
- Related issue/ticket: `SUMMARY_upholstery_picker_nevotex_integration_20260625`
- Intention plan: `—`
- Parent plan: `docs/architecture/archives/implementation/PLAN_upholstery_picker_nevotex_integration_20260625.md`

## Goal and intent

- Goal: Fix four bugs and one schema drift introduced by the Nevotex integration, and remove one piece of dead code that the schema drift created.
- Business/user intent: The picker must not flash `favorite: false` after a user successfully favourites a Nevotex item; the merged list must not thrash on every render; and the parse layer must reject malformed backend responses rather than silently accepting them.
- Non-goals: New features, visual changes, test authoring. Every change in this plan is a correction to existing code only.

## Scope

- In scope:
  - Correction 1 — `useMemo` does not skip: move the merge computation into a stable `useMemo` in the controller.
  - Correction 2 — `pendingNevotexFavorites` race: change cleanup strategy so the optimistic overlay stays alive until the DB cache actually lands; add a `useEffect` that purges stale ids once the item transitions to `origin: "database"` in the merged list; add `onSuccess` cache injection to `useCreateUpholstery` to shrink the race window.
  - Correction 3 — Schema too wide: introduce `UpholsteryDbRecordSchema` in `types.ts`; use it in `fetch-upholstery.ts`, `fetch-create-upholstery.ts`, and `fetch-toggle-upholstery-favorite.ts`; remove the now-dead `client_id === null` guard in `use-toggle-upholstery-favorite.ts`.
  - Correction 4 — `getNevotexIdentity` key mismatch: simplify to `name.trim().toLowerCase()` to match the dedup key used in `mergePickerResults`.
  - Correction 5 (low priority) — Schema duplication: extract `ListUpholsteryPickerResponseSchema` from `fetch-upholstery-picker-options.ts` to `types.ts` and import it in both the DB fetcher and the Nevotex fetcher.
- Out of scope:
  - Any change to the card, page, or filter-tab behavior.
  - Tests, Playwright specs, or Storybook.
  - Any new API calls or query keys.
- Assumptions:
  - `UpholsteryDbRecordSchema` always parses to `{ client_id: string, favorite: boolean, origin: "database" }`. All three endpoints that return a single DB record (`GET /api/v1/upholsteries/:id`, `PUT /api/v1/upholsteries`, `PATCH /api/v1/upholsteries/:id/favorite`) satisfy this shape per the handoff contract.
  - `getClientIdForNevotex` is safe to wrap in `useCallback(fn, [])` because it only reads and writes `nevotexClientIdsRef.current`, which is a stable React ref.

## Clarifications required

_(none — all corrections are fully specified below)_

## Acceptance criteria

1. `npm run typecheck` passes with zero new errors after all corrections.
2. The `client_id === null` guard in `use-toggle-upholstery-favorite.ts` `onSuccess` is gone.
3. `getActiveQueryResult()` is no longer called on every render; `mergedUpholsteries` is behind a `useMemo` whose deps are the TanStack Query `.data` references.
4. `pendingNevotexFavorites` is only cleared on error in `handleToggleFavorite`; a `useEffect` cleans up stale ids.
5. `fetch-toggle-upholstery-favorite.ts`, `fetch-create-upholstery.ts`, and `fetch-upholstery.ts` all use `UpholsteryDbRecordSchema`, not `UpholsteryPickerOptionSchema`.
6. `getNevotexIdentity` returns `record.name.trim().toLowerCase()` only.

## Contracts and skills

### Contracts loaded

- `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_upholstery_nevotex_and_inline_category_20260625.md`: confirms that `PUT /api/v1/upholsteries` and `PATCH …/favorite` always return `origin: "database"` and a non-null `client_id`.

### Local extensions loaded

- `—`

### File read intent — pattern vs. relational

Permitted (relational reads — all are "what does this existing code do"):
- `packages/upholstery/src/types.ts` — current schema before adding `UpholsteryDbRecordSchema`
- `packages/upholstery/src/controllers/use-upholstery-picker.controller.ts` — full file before editing
- `packages/upholstery/src/actions/use-create-upholstery.ts` — full file before editing
- `packages/upholstery/src/actions/use-toggle-upholstery-favorite.ts` — full file before editing
- `packages/upholstery/src/api/fetch-upholstery-picker-options.ts` — to locate `ListUpholsteryPickerResponseSchema` for extraction (Correction 5)
- `packages/upholstery/src/api/fetch-nevotex-upholstery-options.ts` — to locate `ListNevotexUpholsteryResponseSchema` for replacement (Correction 5)
- `packages/upholstery/src/api/fetch-create-upholstery.ts` — before editing schema import
- `packages/upholstery/src/api/fetch-toggle-upholstery-favorite.ts` — before editing schema import
- `packages/upholstery/src/api/fetch-upholstery.ts` — before editing schema import
- `packages/upholstery/src/index.ts` — to add any new exports required by the corrections

### Skill selection

- Primary skill: `—`

## Implementation plan

### Correction 1 — Fix `useMemo` in the controller

File: `packages/upholstery/src/controllers/use-upholstery-picker.controller.ts`

**Problem:** `getActiveQueryResult()` is called bare at module level inside the hook. It calls `mergePickerResults` which creates new arrays on every call, so `rawResult.upholsteries` is a new reference on every render. The downstream `useMemo` for `upholsteries` has `rawResult.upholsteries` as a dependency and therefore never skips.

**Changes:**

Step A — Wrap `getClientIdForNevotex` in `useCallback` with empty deps so it is referentially stable:

```ts
const getClientIdForNevotex = useCallback(
  (record: UpholsteryPickerOption): string => {
    const key = getNevotexIdentity(record);
    const existing = nevotexClientIdsRef.current.get(key);
    if (existing) return existing;
    const clientId = generateClientId("Upholstery");
    nevotexClientIdsRef.current.set(key, clientId);
    return clientId;
  },
  [],
);
```

Step B — Replace the bare `getActiveQueryResult()` call with a `useMemo`. Inline the body of `getActiveQueryResult` directly inside the memo (or keep the function and call it from within the memo — either is fine). The memo must list every query `.data` value and stable accessor it uses:

```ts
const { upholsteries: mergedUpholsteries, isLoading } = useMemo(() => {
  if (searchQuery.trim().length > 0) {
    const dbItems = searchResultsQuery.data?.upholsteries ?? [];
    const nevotexItems = nevotexSearchQuery.data?.upholsteries ?? [];
    return {
      upholsteries: mergePickerResults(dbItems, nevotexItems, getClientIdForNevotex),
      isLoading: searchResultsQuery.isPending || nevotexSearchQuery.isPending,
    };
  }

  switch (activeFilter) {
    case "out_of_stock":
      return {
        upholsteries: toDatabaseRecords(outOfStockQuery.data?.upholsteries ?? []),
        isLoading: outOfStockQuery.isPending,
      };
    case "favorite":
      return {
        upholsteries: toDatabaseRecords(favoritesQuery.data?.upholsteries ?? []),
        isLoading: favoritesQuery.isPending,
      };
    case "in_stock":
    default:
      return {
        upholsteries: toDatabaseRecords(inStockQuery.data?.upholsteries ?? []),
        isLoading: inStockQuery.isPending,
      };
  }
}, [
  searchQuery,
  activeFilter,
  searchResultsQuery.data,
  searchResultsQuery.isPending,
  nevotexSearchQuery.data,
  nevotexSearchQuery.isPending,
  inStockQuery.data,
  inStockQuery.isPending,
  outOfStockQuery.data,
  outOfStockQuery.isPending,
  favoritesQuery.data,
  favoritesQuery.isPending,
  getClientIdForNevotex,
]);
```

Step C — Update the existing overlay `useMemo` to depend on `mergedUpholsteries` (the stable memoized output from Step B) instead of `rawResult.upholsteries`. Remove the `rawResult` variable entirely.

```ts
const upholsteries = useMemo(
  () =>
    mergedUpholsteries.map((record) =>
      pendingNevotexFavorites.has(record.client_id)
        ? { ...record, favorite: true }
        : record,
    ),
  [mergedUpholsteries, pendingNevotexFavorites],
);
```

---

### Correction 2 — Fix `pendingNevotexFavorites` race and add `onSuccess` cache injection

**Part A — `use-create-upholstery.ts`**

File: `packages/upholstery/src/actions/use-create-upholstery.ts`

Add an `onSuccess` handler that immediately injects the new item into all existing DB picker list caches. This ensures the item is in the TanStack cache before `toggleFavoriteAsync.onMutate` takes its snapshot, minimising the window between create-success and DB refetch completion.

```ts
import type { UpholsteryPickerOption } from "../types";

type PickerListData = {
  upholsteries: UpholsteryPickerOption[];
  has_more: boolean;
};

// inside useMutation:
onSuccess: (upholstery) => {
  queryClient.setQueriesData<PickerListData>(
    { queryKey: upholsteryKeys.pickerLists() },
    (old) =>
      old
        ? { ...old, upholsteries: [...old.upholsteries, upholstery] }
        : old,
  );
},
// onSettled invalidation stays as-is
```

**Part B — `controllers/use-upholstery-picker.controller.ts`**

Change `handleToggleFavorite` so that `pendingNevotexFavorites` is only cleared on **error**, not in `finally`. On success the overlay stays alive until the cleanup effect (Step C below) removes the stale id after the item transitions to `origin: "database"` in the merged list.

```ts
async function handleToggleFavorite(
  clientId: string,
  currentFavorite: boolean,
): Promise<void> {
  const record = upholsteries.find((entry) => entry.client_id === clientId);

  if (!record || record.origin === "database") {
    toggleFavoriteAction.toggleFavorite({
      client_id: clientId,
      favorite: !currentFavorite,
    });
    return;
  }

  if (pendingNevotexFavorites.has(clientId)) {
    return;
  }

  const nextFavorite = !currentFavorite;

  setPendingNevotexFavorites((previous) => {
    const next = new Set(previous);
    if (nextFavorite) {
      next.add(clientId);
    } else {
      next.delete(clientId);
    }
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
    // Do NOT clear pendingNevotexFavorites here.
    // The cleanup effect below handles removal once the item is gone from the
    // Nevotex section of the merged list.
  } catch (error) {
    console.error("Failed to toggle Nevotex upholstery favorite", error);
    // Revert optimistic update only on failure.
    setPendingNevotexFavorites((previous) => {
      const next = new Set(previous);
      next.delete(clientId);
      return next;
    });
  }
}
```

**Part C — cleanup `useEffect` in the controller**

Add a `useEffect` that runs whenever `mergedUpholsteries` changes (after Correction 1, this is the stable memoized list). It removes any `pendingNevotexFavorites` ids that are no longer present as `origin: "nevotex"` items — meaning the DB cache has landed and the overlay is no longer needed.

```ts
useEffect(() => {
  if (pendingNevotexFavorites.size === 0) return;

  const activeNevotexIds = new Set(
    mergedUpholsteries
      .filter((r) => r.origin === "nevotex")
      .map((r) => r.client_id),
  );

  const stale = [...pendingNevotexFavorites].filter(
    (id) => !activeNevotexIds.has(id),
  );

  if (stale.length === 0) return;

  setPendingNevotexFavorites((previous) => {
    const next = new Set(previous);
    stale.forEach((id) => next.delete(id));
    return next;
  });
}, [mergedUpholsteries]);
// pendingNevotexFavorites intentionally omitted from deps:
// this effect only reacts to the merged list changing, not to the set itself.
// Add the eslint-disable comment if the linter flags it.
```

---

### Correction 3 — Introduce `UpholsteryDbRecordSchema` and remove dead guard

**Step A — `types.ts`**

File: `packages/upholstery/src/types.ts`

Add `UpholsteryDbRecordSchema` and its inferred type immediately after `UpholsteryPickerOptionSchema`:

```ts
export const UpholsteryDbRecordSchema = UpholsteryPickerOptionSchema.extend({
  client_id: z.string(),
  favorite: z.boolean(),
  origin: z.literal("database"),
});
export type UpholsteryDbRecord = z.infer<typeof UpholsteryDbRecordSchema>;
```

Export `UpholsteryDbRecordSchema` and `UpholsteryDbRecord` from `index.ts`.

**Step B — `api/fetch-toggle-upholstery-favorite.ts`**

Replace:
```ts
import { UpholsteryPickerOptionSchema } from "../types";

const ToggleFavoriteResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryPickerOptionSchema,
  }),
);
```
With:
```ts
import { UpholsteryDbRecordSchema } from "../types";

const ToggleFavoriteResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery: UpholsteryDbRecordSchema,
  }),
);
```

The return type of `fetchToggleUpholsteryFavorite` becomes `UpholsteryDbRecord` (inferred automatically).

**Step C — `api/fetch-create-upholstery.ts`**

Replace `UpholsteryPickerOptionSchema` with `UpholsteryDbRecordSchema` in `CreateUpholsteryResponseSchema`. Same pattern as Step B.

**Step D — `api/fetch-upholstery.ts`**

Replace `UpholsteryPickerOptionSchema` with `UpholsteryDbRecordSchema` in `FetchUpholsteryResponseSchema`. Same pattern as Step B.

**Step E — `actions/use-toggle-upholstery-favorite.ts`**

Remove the now-dead guard from `onSuccess`:

```ts
// DELETE these lines:
if (updatedUpholstery.client_id === null) {
  return;
}
```

The schema now rejects a null `client_id` at parse time, so this guard is unreachable.

Note: `PickerListData` in this file uses `upholsteries: UpholsteryPickerOption[]`. The cache can contain both DB and Nevotex items (DB items returned by the list endpoint include `origin: "database"`). Keep `UpholsteryPickerOption` here — do not change the cache type.

---

### Correction 4 — Simplify `getNevotexIdentity`

File: `packages/upholstery/src/controllers/use-upholstery-picker.controller.ts`

Replace the three-part identity key with the same single field used by the dedup logic in `mergePickerResults`:

```ts
// Before
function getNevotexIdentity(record: UpholsteryPickerOption): string {
  return [
    record.name.trim().toLowerCase(),
    record.code ?? "",
    record.image_url ?? "",
  ].join("::");
}

// After
function getNevotexIdentity(record: UpholsteryPickerOption): string {
  return record.name.trim().toLowerCase();
}
```

This ensures that if Nevotex updates an image URL or code for the same product name between two query fires, the stable `client_id` assignment still matches the dedup key and the in-flight id is not orphaned.

---

### Correction 5 (low priority) — Extract shared list response schema

File: `packages/upholstery/src/types.ts`

Add and export `UpholsteryListResponseSchema`:

```ts
export const UpholsteryListResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholsteries: z.array(UpholsteryPickerOptionSchema),
    upholsteries_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number(),
      offset: z.number(),
    }),
  }),
);
```

This requires importing `ApiEnvelopeSchema` from `@beyo/lib` in `types.ts`.

File: `packages/upholstery/src/api/fetch-upholstery-picker-options.ts`

Remove the local `ListUpholsteryPickerResponseSchema` definition. Import `UpholsteryListResponseSchema` from `../types` and use it instead.

File: `packages/upholstery/src/api/fetch-nevotex-upholstery-options.ts`

Remove the local `ListNevotexUpholsteryResponseSchema` definition. Import `UpholsteryListResponseSchema` from `../types` and use it instead.

---

## Risks and mitigations

- Risk: The `useEffect` cleanup in Correction 2C depends on `mergedUpholsteries` from Correction 1. If Correction 1 is not applied first, the memo is not stable and the effect fires every render.
  Mitigation: Apply corrections in order. Corrections 1 and 2 must be applied in the same edit pass.

- Risk: Changing `UpholsteryDbRecordSchema` to `origin: z.literal("database")` means if the DB list endpoint ever returns an item without `origin` (old API version), the fetchers for single items will fail at parse time.
  Mitigation: The handoff confirms `origin` is always present. The parse error is the correct behavior — it surfaces a backend contract violation rather than hiding it.

- Risk: `useCallback(fn, [])` on `getClientIdForNevotex` suppresses the exhaustive-deps lint rule because it closes over `nevotexClientIdsRef`. Add a comment: the ref is stable by React contract and intentionally omitted.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- Manual: open picker → type a search query → observe DevTools Network — confirm both requests fire once per debounce, not on every keystroke after data has loaded
- Manual: type a query → tap favourite on a Nevotex item → confirm the heart stays filled until the DB list refetch completes (no flash back to unfilled)
- Manual: type a query → select a Nevotex item → picker closes → confirm `PUT /api/v1/upholsteries` fires in background → on next open, item appears in DB list

## Review log

- `2026-06-25` `user/reviewer`: Correction plan created from post-implementation review
- `2026-06-25` `codex`: Implemented, summarized, and archived

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `codex`
