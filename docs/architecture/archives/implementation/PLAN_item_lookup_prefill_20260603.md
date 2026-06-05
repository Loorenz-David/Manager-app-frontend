# PLAN_item_lookup_prefill_20260603

## Metadata

- Plan ID: `PLAN_item_lookup_prefill_20260603`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-03T00:00:00Z`
- Last updated at (UTC): `2026-06-05T13:19:28Z`
- Related issue/ticket: `—`
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_item_lookup_prefill_20260603.md`

## Goal and intent

- Goal: Add a debounced lookup query to `ItemIdentityField` that fires `GET /api/v1/items/lookup`, emits the result list to each parent task-creation form, and applies form prefill + external image creation based on `external_source` selection logic per form type.
- Business/user intent: Reduce manual data entry during task creation. When the user enters a known article number/SKU, the form should auto-populate item category, quantity, and register any remote catalogue images so they appear in the image gallery when the task is submitted.
- Non-goals: Selection overlay UI for multiple matches (future); customer prefill; any change to the scanner flow.

## Scope

### In scope

- New Zod schema and types: `ItemLookupResultSchema`, `ItemLookupResult`, `LookupItemsParams` — added to `src/features/items/types.ts`; `LookupItemsParams` accepts either `article_number` or `sku` (exclusive, at least one required)
- New query key: `itemKeys.lookup(params)` — added to `src/features/items/api/item-keys.ts`
- New API fetcher: `src/features/items/api/fetch-item-lookup.ts`
- New query hook: `src/features/items/api/use-item-lookup-query.ts`
- New image types: `CreateImageFromUrlInput`, `CreateImageFromUrlBatch` — added to `src/features/items/subfeatures/item_images/types.ts`; also extend `IMAGE_SOURCE_TYPE` to include `"external_url"`
- New image API function: `src/features/items/subfeatures/item_images/api/create-images-from-url.ts`
- New image mutation hook: `src/features/items/subfeatures/item_images/actions/use-create-images-from-url.ts`
- New debounce hook: `src/hooks/use-debounce.ts`
- `ItemIdentityField` changes: debounced lookup query for both tabs + new `onLookupResult` callback prop; article_number tab fires at `> 7` chars, SKU tab fires at `> 3` chars
- `InternalFormContent`: `handleLookupResult` handler — selects `purchase_api` item, prefills `item_category_id` + `major_category` + `quantity`, fires image creation
- `PreOrderFormContent`: identical handler to Internal
- `ReturnFormContent`: `handleLookupResult` handler — selects `external_source === null` item, prefills same fields, no image creation
- Export surface: `src/features/items/index.ts` and `src/features/items/subfeatures/item_images/index.ts`

### Out of scope

- Selection overlay UI when multiple results share same `external_source`
- Customer field prefill from lookup result
- Changes to the scanner barcode/QR flow

### Assumptions

1. `itemClientId` (pre-generated) from `useTaskCreationFormContext()` is safe to use as `entity_client_id` when creating images before the task/item exists in the DB. The backend tolerates this.
2. Calling `form.setValue("item.item_category_id", id)` updates the `useController`-bound `categoryField` in `ItemCategorySelectionField`. The field's own `useEffect` auto-derives `major_category` when `major_category` is falsy — but from the parent we also set `major_category` explicitly (looked up from the picker query cache) so the form is consistent even if major_category was already set.
3. A `useDebounce` hook does not exist in `@beyo/ui` or `src/hooks/`. We create one locally.
4. Both `itemCategoryPickerKeys.list({})` data and `itemCategoryPickerKeys.list({ limit: 200 })` may be in the cache depending on the prefetch call. We use `queryClient.getQueryData` with the same default params used in `fetchItemCategoriesPicker` (`limit: 200, offset: 0`).
5. Empty lookup results (`items: []`) call `onLookupResult([])`. Parent does nothing when no matching item is found for its selection rule.

## Clarifications required

- [x] **SKU tab lookup** ✅ RESOLVED — Backend now accepts `sku` as a query parameter on `GET /api/v1/items/lookup`. Both tabs fire the query: article_number tab sends `?article_number=<value>` (threshold > 7), SKU tab sends `?sku=<value>` (threshold > 3). `LookupItemsParams` is a discriminated union covering both.
- [x] **Image creation before task exists** ✅ RESOLVED — Pre-generated `itemClientId` is intentionally used as `entity_client_id` before the item exists. This is the purpose of client-side ID control and the polymorphic image system. Image creation fires immediately on lookup result.

## Acceptance criteria

1. Typing ≥ 8 characters in the article_number input fires `GET /api/v1/items/lookup?article_number=<value>` after a 400 ms debounce.
2. Typing ≥ 4 characters in the SKU input fires `GET /api/v1/items/lookup?sku=<value>` after a 400 ms debounce.
3. Typing below the respective threshold (≤ 7 for article_number, ≤ 3 for SKU) disables the query — no network request is sent.
4. On Internal and PreOrder forms: when a `purchase_api` result is present, `item.item_category_id`, `item.major_category`, and `item.quantity` are prefilled via `form.setValue`.
5. On Internal and PreOrder forms: each URL in `selected.images` is registered via `POST /api/v1/images/from-url` with the form's `itemClientId` as `entity_client_id`.
6. On Return form: when an `external_source === null` result is present, the same item fields are prefilled; no image creation is triggered.
7. If no result matches the selection rule, no form fields are touched.
8. Lookup network errors are silently swallowed — the form stays unchanged.
9. `ItemIdentityField` validation, error display, scanner, and tab-switching continue to work correctly.

## Contracts and skills

### Domain schemas consulted

- `src/features/items/types.ts`: `Item`, `ItemDetailsFieldsSchema`, `ItemCategoryPickerOption` — entity names (`item_category_id`, `quantity`, `major_category`, `external_source`, `article_number`), schema shapes, existing field types
- `src/features/items/subfeatures/item_images/types.ts`: `ItemImageSchema`, `IMAGE_SOURCE_TYPE`, existing mutation input shapes; confirmed `"external_url"` is a missing enum value
- `src/features/task-creation/types.ts`: `InternalFormValues`, `PreOrderFormValues`, `ReturnFormValues` — form field paths to be prefilled
- `src/features/items/components/fields/ItemCategorySelectionField.tsx`: confirmed it uses `useController` (not a Zustand store) for both `item.major_category` and `item.item_category_id`; confirmed a `useEffect` auto-derives `major_category` from `item_category_id` when `major_category` is falsy

### Selected contracts

Read order:
- `../architecture/01_architecture.md` (baseline) + `../architecture/01_architecture_local.md` (app delta)
- `../architecture/02_types.md`
- `../architecture/04_api_client.md` (baseline) + `../architecture/04_api_client_local.md` (backend error shape, refresh envelope)
- `../architecture/05_server_state.md`
- `../architecture/06_client_state.md`
- `../architecture/08_hooks.md`
- `../architecture/09_forms.md`
- `../architecture/13_errors.md`
- `../architecture/15_feature_structure.md` (baseline) + `../architecture/15_feature_structure_local.md`
- `../architecture/07_components.md`
- `../architecture/24_dto.md`

Applied precedence: local extension overrides baseline only for this app.

### Trigger expansion map activations

- "form", "useForm", "handleSubmit", "setValue" → `09_forms.md`, `24_dto.md`
- "dto", "view model", "response schema", "toXxxViewModel" → `24_dto.md`

### File read intent — pattern vs. relational

Permitted reads already taken (relational — understanding what exists):
- `src/features/items/types.ts` — field names and Zod schemas
- `src/features/items/subfeatures/item_images/types.ts` — existing image schema
- `src/features/task-creation/types.ts` — form value shapes
- `src/features/items/components/fields/ItemCategorySelectionField.tsx` — how category is stored (controller not store)
- `src/features/items/api/item-keys.ts` — existing query key shape
- `src/features/items/api/item-category-picker-keys.ts` — key shape for cache lookup
- `src/features/items/api/fetch-item-categories-picker.ts` — existing fetch pattern
- `src/features/items/api/use-item-categories-picker.ts` — existing query hook pattern
- `src/features/task-creation/components/InternalFormContent.tsx` — existing form context and how `itemClientId` is accessed

Prohibited (already covered by contracts):
- Reading another query hook to understand TanStack Query setup → `05_server_state.md`
- Reading another mutation hook to understand cache rollback shape → `08_hooks.md`

### Excluded contracts

- `11_routing.md` — no new routes
- `28_surfaces.md` — no new surfaces
- `23_providers.md` — no new providers
- `12_auth.md` — no auth changes
- `17_testing.md` — Playwright tests deferred to follow-up plan
- `31_animations.md` — no new animations
- `32_loading_skeletons.md` — no skeleton needed; lookup is a silent background prefill

## Implementation plan

### Step 1 — Types: `src/features/items/types.ts`

Append after the existing `IssueCategoryConfig` block:

```typescript
export const ITEM_LOOKUP_EXTERNAL_SOURCE = ["purchase_api"] as const;

export const ItemLookupResultSchema = z.object({
  article_number: z.string(),
  sku: z.string().nullable(),
  item_category_id: z.string().nullable(),
  quantity: z.number().int(),
  external_id: z.string().nullable(),
  external_source: z.enum(ITEM_LOOKUP_EXTERNAL_SOURCE).nullable(),
  images: z.array(z.string()),
});
export type ItemLookupResult = z.infer<typeof ItemLookupResultSchema>;

export type LookupItemsParams =
  | { article_number: string; sku?: never }
  | { sku: string; article_number?: never };
```

### Step 2 — Query keys: `src/features/items/api/item-keys.ts`

Add `lookup` factory alongside the existing keys:

```typescript
import type { ItemId } from '@/types/common';
import type { ListItemsParams, LookupItemsParams } from '@/features/items/types';

export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (params: ListItemsParams = {}) => [...itemKeys.lists(), params] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: ItemId) => [...itemKeys.details(), id] as const,
  lookup: (params: LookupItemsParams) => [...itemKeys.all, 'lookup', params] as const,
};
```

### Step 3 — API fetcher: `src/features/items/api/fetch-item-lookup.ts` (new file)

```typescript
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import { ItemLookupResultSchema, type LookupItemsParams } from '../types';

const LookupItemsResponseSchema = ApiEnvelopeSchema(
  z.object({ items: z.array(ItemLookupResultSchema) }),
);

export async function fetchItemLookup(params: LookupItemsParams) {
  const queryParams = "article_number" in params
    ? { article_number: params.article_number }
    : { sku: params.sku };

  const response = await apiClient.get(
    '/api/v1/items/lookup',
    LookupItemsResponseSchema,
    queryParams,
  );
  return { items: response.data.items };
}
```

### Step 4 — Query hook: `src/features/items/api/use-item-lookup-query.ts` (new file)

```typescript
import { useQuery } from '@tanstack/react-query';

import type { LookupItemsParams } from '../types';
import { fetchItemLookup } from './fetch-item-lookup';
import { itemKeys } from './item-keys';

export function useItemLookupQuery(
  params: LookupItemsParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: itemKeys.lookup(params),
    queryFn: () => fetchItemLookup(params),
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  });
}
```

### Step 5 — Image types: `src/features/items/subfeatures/item_images/types.ts`

Extend `IMAGE_SOURCE_TYPE` and add create-from-url input shape:

```typescript
// extend existing enum
export const IMAGE_SOURCE_TYPE = ['uploaded', 'shopify_sync', 'generated', 'external_url'] as const;

// append new schema
export const CreateImageFromUrlInputSchema = z.object({
  image_url: z.string().url(),
  entity_type: z.literal('item'),
  entity_client_id: z.string().transform((v) => v as ItemId),
  image_client_id: z.string().optional(),
  width_px: z.number().int().positive().nullable().optional(),
  height_px: z.number().int().positive().nullable().optional(),
});
export type CreateImageFromUrlInput = z.infer<typeof CreateImageFromUrlInputSchema>;
```

No response schema required in the caller — the mutation is fire-and-forget for prefill. If we need to invalidate images later, the image list query is keyed by `itemId`.

### Step 6 — Image API function: `src/features/items/subfeatures/item_images/api/create-images-from-url.ts` (new file)

```typescript
import { z } from 'zod';

import { apiClient } from '@/lib/api-client';
import { ApiEnvelopeSchema } from '@/types/api';
import type { CreateImageFromUrlInput } from '../types';

const CreateImagesFromUrlResponseSchema = ApiEnvelopeSchema(
  z.object({ images: z.array(z.object({ client_id: z.string() })) }),
);

export async function createImagesFromUrl(payload: CreateImageFromUrlInput[]) {
  const response = await apiClient.post(
    '/api/v1/images/from-url',
    CreateImagesFromUrlResponseSchema,
    payload,
  );
  return response.data.images;
}
```

Send as array unconditionally — the endpoint accepts both single object and array; array is simpler.

### Step 7 — Image mutation hook: `src/features/items/subfeatures/item_images/actions/use-create-images-from-url.ts` (new file)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ItemId } from '@/types/common';
import { itemImageKeys } from '../api/item-image-keys';
import { createImagesFromUrl } from '../api/create-images-from-url';
import type { CreateImageFromUrlInput } from '../types';

export function useCreateImagesFromUrl(entityClientId: ItemId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateImageFromUrlInput[]) => createImagesFromUrl(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemImageKeys.list(entityClientId),
      });
    },
  });
}
```

Invalidating the item image list ensures the `EntityImagesProvider` gallery (in the "task" step) reflects the pre-created images when the user navigates to that step.

### Step 8 — Debounce hook: `src/hooks/use-debounce.ts` (new file)

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### Step 9 — `ItemIdentityField` changes

**Props interface:** add `onLookupResult`:

```typescript
type ItemIdentityFieldProps = {
  onOpenScanner?: (tab: IdentityTab) => void;
  onLookupResult?: (items: ItemLookupResult[]) => void;
};
```

**Inside the component body**, after the existing state declarations:

```typescript
// Observe both inputs for the lookup query
const articleNumberValue = (useWatch({ name: "item.article_number" }) as string) ?? "";
const skuValue = (useWatch({ name: "item.sku" }) as string) ?? "";

const rawLookupValue = activeTab === "article_number"
  ? articleNumberValue.trim()
  : skuValue.trim();

const LOOKUP_THRESHOLD = activeTab === "article_number" ? 7 : 3;
const debouncedLookupValue = useDebounce(rawLookupValue, 400);
const isLookupEnabled = debouncedLookupValue.length > LOOKUP_THRESHOLD;

const lookupParams: LookupItemsParams = activeTab === "article_number"
  ? { article_number: debouncedLookupValue }
  : { sku: debouncedLookupValue };

const lookupQuery = useItemLookupQuery(lookupParams, { enabled: isLookupEnabled });

useEffect(() => {
  if (lookupQuery.data) {
    onLookupResult?.(lookupQuery.data.items);
  }
}, [lookupQuery.data, onLookupResult]);
```

**Imports to add:**
- `useWatch` from `"react-hook-form"`
- `useEffect` from `"react"`
- `useItemLookupQuery` from `"@/features/items/api/use-item-lookup-query"`
- `useDebounce` from `"@/hooks/use-debounce"`
- `type ItemLookupResult, type LookupItemsParams` from `"@/features/items/types"`

No UI changes — the lookup is invisible to the user.

### Step 10 — `InternalFormContent` changes

**Add to imports:**
- `useCreateImagesFromUrl` from `@/features/items/subfeatures/item_images/actions/use-create-images-from-url`
- `type ItemLookupResult` from `@/features/items/types`
- `itemCategoryPickerKeys` from `@/features/items/api/item-category-picker-keys`
- `type ItemCategoryPickerOption` from `@/features/items/types`

**Inside `InternalFormContent`**, after existing hook calls:

```typescript
const createImagesFromUrl = useCreateImagesFromUrl(itemClientId);
```

**Add handler function:**

```typescript
function handleLookupResult(items: ItemLookupResult[]): void {
  const selected = items.find((i) => i.external_source === "purchase_api") ?? null;
  if (!selected) return;

  if (selected.item_category_id) {
    form.setValue("item.item_category_id", selected.item_category_id, { shouldDirty: true });

    // Also set major_category from the picker cache so the field reflects
    // the selection even if major_category was previously set to a different value
    const cached = queryClient.getQueryData<{ itemCategories: ItemCategoryPickerOption[] }>(
      itemCategoryPickerKeys.list({ limit: 200, offset: 0 }),
    );
    const match = cached?.itemCategories.find((c) => c.client_id === selected.item_category_id);
    if (match) {
      form.setValue("item.major_category", match.major_category, { shouldDirty: true });
    }
  }

  form.setValue("item.quantity", selected.quantity, { shouldDirty: true });

  if (selected.images.length > 0) {
    createImagesFromUrl.mutate(
      selected.images.map((url) => ({
        image_url: url,
        entity_type: "item" as const,
        entity_client_id: itemClientId,
      })),
    );
  }
}
```

**Pass to `ItemIdentityField`:**

```tsx
<ItemIdentityField
  onOpenScanner={handleOpenScanner}
  onLookupResult={handleLookupResult}
/>
```

### Step 11 — `PreOrderFormContent` changes

Identical to step 10. Same imports, same `handleLookupResult` body (selects `purchase_api`), same prop pass. `itemClientId` is already available from `useTaskCreationFormContext()`.

### Step 12 — `ReturnFormContent` changes

Same imports minus `useCreateImagesFromUrl`. Handler selects `external_source === null` (internal DB item) — no image creation:

```typescript
function handleLookupResult(items: ItemLookupResult[]): void {
  const selected = items.find((i) => i.external_source === null) ?? null;
  if (!selected) return;

  if (selected.item_category_id) {
    form.setValue("item.item_category_id", selected.item_category_id, { shouldDirty: true });
    const cached = queryClient.getQueryData<{ itemCategories: ItemCategoryPickerOption[] }>(
      itemCategoryPickerKeys.list({ limit: 200, offset: 0 }),
    );
    const match = cached?.itemCategories.find((c) => c.client_id === selected.item_category_id);
    if (match) {
      form.setValue("item.major_category", match.major_category, { shouldDirty: true });
    }
  }

  form.setValue("item.quantity", selected.quantity, { shouldDirty: true });
  // internal DB items always have images: [] per handoff — no image creation needed
}
```

Pass `onLookupResult={handleLookupResult}` to `<ItemIdentityField>`.

### Step 13 — Public API exports

**`src/features/items/index.ts`** — add:

```typescript
export type { ItemLookupResult, LookupItemsParams } from './types';
export { ItemLookupResultSchema } from './types';
```

**`src/features/items/subfeatures/item_images/index.ts`** — add:

```typescript
export { useCreateImagesFromUrl } from './actions/use-create-images-from-url';
export type { CreateImageFromUrlInput } from './types';
```

## Risks and mitigations

- **Risk**: `itemCategoryPickerKeys.list({ limit: 200, offset: 0 })` cache miss — data not in cache when lookup result arrives.
  **Mitigation**: All three forms call `prefetchTaskCreationFormData(queryClient)` on mount which prefetches categories. This should warm the cache before any lookup fires (lookup is gated behind ≥ 8 characters of typing). If cache is cold, `major_category` won't be set from cache — `ItemCategorySelectionField`'s own `useEffect` will derive it on next render when the component observes the changed `item_category_id`. No hard failure.

- **Risk**: `IMAGE_SOURCE_TYPE` enum extension breaks Zod parse of existing uploaded images.
  **Mitigation**: Adding `"external_url"` to the tuple only widens the accepted values — existing `"uploaded"`, `"shopify_sync"`, `"generated"` values still parse correctly.

- **Risk**: `useEffect([lookupQuery.data])` in `ItemIdentityField` fires on every render if TanStack Query returns a new object reference for unchanged data.
  **Mitigation**: TanStack Query returns a structurally stable reference per successful fetch — it only creates a new object when data actually changes. No extra guard needed.

- **Risk**: `createImagesFromUrl` is called while `ItemIdentityField` is receiving rapid lookup updates (user keeps typing).
  **Mitigation**: The debounce (400 ms) and length threshold (> 7 chars) reduce noise significantly. The mutation is idempotent at the image level (unique URLs). Multiple calls with the same URLs are not harmful but wasteful. A future enhancement could guard with a ref tracking the last article_number that triggered image creation.

## Validation plan

- `npm run typecheck`: zero TypeScript errors
- `npm run test -- --grep ItemIdentityField`: existing field tests pass; no regression in tab switching, error display, or scanner
- Manual (article_number tab): type 8+ chars → observe debounced `GET /api/v1/items/lookup?article_number=<value>` in DevTools → confirm `item_category_id`, `major_category`, `quantity` prefilled on Internal form → confirm `POST /api/v1/images/from-url` fires
- Manual (article_number tab): type ≤ 7 chars → confirm no lookup request fires
- Manual (SKU tab): type 4+ chars → observe debounced `GET /api/v1/items/lookup?sku=<value>` → confirm prefill applies
- Manual (SKU tab): type ≤ 3 chars → confirm no lookup request fires
- Manual: open Return task creation form → type 8+ chars in article_number → confirm category/quantity populated → confirm no image creation request fires
- Manual: ensure scanner flow still works (open scanner → scan → value set → lookup triggers if value meets threshold)
- Manual: switch tabs mid-lookup — confirm only the active tab's query fires

## Review log

- `2026-06-03` david: SKU param now accepted by backend — both tabs fire the query; article_number threshold > 7, SKU threshold > 3. Image creation before item exists is confirmed correct (client ID control + polymorphic image system).
- `2026-06-03` codex: Applied — `LookupItemsParams` updated to discriminated union; fetcher, query hook, and field step updated to route correct param per active tab; SKU tab removed from out-of-scope; image creation risk entry removed.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
