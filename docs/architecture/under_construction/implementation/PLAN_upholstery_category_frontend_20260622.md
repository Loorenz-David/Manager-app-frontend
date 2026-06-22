# PLAN_upholstery_category_frontend_20260622

## Metadata

- Plan ID: `PLAN_upholstery_category_frontend_20260622`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T12:00:00Z`
- Last updated at (UTC): `2026-06-22T12:00:00Z`
- Related issue/ticket: `HANDOFF_TO_FRONTEND_upholstery_category_20260622`
- Intention plan: `docs/architecture/under_construction/intention/` _(none — derived directly from handoff)_

> All `src/` paths below are relative to
> `apps/managers-app/ManagerBeyo-app-managers/src/`

---

## Goal and intent

- **Goal:** Implement the `UpholsteryCategory` entity on the frontend — creation UI, category picker, and wiring of `upholstery_category_id` into the upholstery creation / update flow.
- **Business/user intent:** Managers need to organise upholsteries into named categories (with image + favorite), and select a category when creating or editing an upholstery inventory entry.
- **Non-goals:** Editing / deleting / reordering categories. Filtering the inventory list by category. Favorite-toggle for categories.

---

## Scope

- **In scope:**
  - New `features/upholstery-category/` feature directory (12 files).
  - `InventoryCreationFab` gains a second action button that opens the category creation slide.
  - `UpholsteryInventoryCreationSlidePage` is reworked into a 2-step `StagedForm` (step 1 = category picker, step 2 = existing form fields).
  - `upholstery_category_id` sent on PUT/PATCH upholstery calls.
  - `upholstery_category` nested object added to `UpholsteryPickerOptionSchema` so the edit flow can read the current category.
- **Out of scope:** Editing or deleting categories. Filtering the inventory list by category. Workers app changes. Any route changes.
- **Assumptions:**
  - `GET /api/v1/upholsteries/{client_id}` now returns `upholstery_category: { id, name, image_url } | null`.
  - `GET /api/v1/upholstery-inventories/{client_id}` does **not** return `upholstery_category` — category info is fetched from the upholstery endpoint.
  - The existing `apiClient`, `ApiEnvelopeSchema`, and primitive components are available unchanged.

---

## Clarifications required

_(none — handoff is explicit)_

---

## Acceptance criteria

1. Tapping the FAB on the inventory list page shows **two** action buttons: "New inventory" and "New category".
2. Tapping "New category" opens a slide with name / image_url / favorite fields; submitting calls `PUT /api/v1/upholstery-categories` and closes the slide.
3. Tapping "New inventory" opens a **2-step** staged form; step 1 shows the category picker, selecting a category auto-advances to step 2 and pre-fills `image_url`.
4. Step 2 contains the same fields as the current creation form plus the category selection is preserved.
5. Submitting step 2 calls `PUT /api/v1/upholsteries` with `upholstery_category_id`.
6. Opening the **edit** form opens directly on step 2 (details). Going back to step 1 shows the current category highlighted and the searchbar pre-filled with the category name; the list query is **not** re-fired because of the searchbar prefill.
7. Saving in edit mode calls `PATCH /api/v1/upholsteries/{id}` with `upholstery_category_id` when it changed.
8. `npm run typecheck` passes with zero errors.

---

## Contracts and skills

### Contracts loaded

_(standard feature patterns — no external contract files loaded)_

### File read intent — pattern vs. relational

Prohibited (pattern reads — contract already covers these):

- Reading another query hook to understand TanStack Query shape → use `05_server_state.md`
- Reading another action hook to understand mutation/invalidation shape → use `08_hooks.md`

Permitted (relational reads — understanding what exists):

- Reading `features/upholstery-inventory/types.ts` for current field names and schemas ✓
- Reading `features/upholstery-inventory/api/upholstery-keys.ts` for key factory shape ✓
- Reading `features/upholstery/types.ts` for `UpholsteryPickerOptionSchema` ✓
- Reading `app/surface-registry.ts` for spread pattern ✓

### Skill selection

_(no skill applies — standard feature implementation)_

---

## Implementation plan

**Step ordering:** create all new `upholstery-category` files first (steps 1–12), then modify existing files (steps 13–20).

---

### Step 1 — `src/features/upholstery-category/types.ts` _(NEW)_

Define all shared types and Zod schemas for the category entity.

```ts
import { z } from "zod";

// Inline nested shape returned inside upholstery responses.
export const UpholsteryCategoryInlineSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
});
export type UpholsteryCategoryInline = z.infer<typeof UpholsteryCategoryInlineSchema>;

// Full category object (returned by /api/v1/upholstery-categories endpoints).
export const UpholsteryCategorySchema = z.object({
  client_id: z.string(),
  workspace_id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
  created_at: z.string(),
  created_by_id: z.string().nullable(),
  updated_at: z.string().nullable(),
  updated_by_id: z.string().nullable(),
  is_deleted: z.boolean(),
  upholstery_count: z.number().int(),
});
export type UpholsteryCategory = z.infer<typeof UpholsteryCategorySchema>;

export type ListUpholsteryCategoriesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  favorite?: boolean;
};

// Used by the creation form.
export const CreateUpholsteryCategoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  image_url: z.string().nullable(),
  favorite: z.boolean(),
});
export type CreateUpholsteryCategoryFormValues = z.infer<
  typeof CreateUpholsteryCategoryFormSchema
>;

export type CreateUpholsteryCategoryPayload = {
  name: string;
  image_url: string | null;
  favorite: boolean;
};
```

---

### Step 2 — `src/features/upholstery-category/api/upholstery-category-keys.ts` _(NEW)_

Query key factory following the same pattern as `upholsteryKeys`.

```ts
import type { ListUpholsteryCategoriesParams } from "../types";

export const upholsteryCategoryKeys = {
  all: ["upholstery-categories"] as const,
  lists: () => [...upholsteryCategoryKeys.all, "list"] as const,
  list: (params: ListUpholsteryCategoriesParams = {}) =>
    [...upholsteryCategoryKeys.lists(), params] as const,
  details: () => [...upholsteryCategoryKeys.all, "detail"] as const,
  detail: (id: string) => [...upholsteryCategoryKeys.details(), id] as const,
};
```

---

### Step 3 — `src/features/upholstery-category/api/create-upholstery-category.ts` _(NEW)_

Calls `PUT /api/v1/upholstery-categories`. Returns the created `UpholsteryCategory`.

```ts
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import {
  UpholsteryCategorySchema,
  type CreateUpholsteryCategoryPayload,
  type UpholsteryCategory,
} from "../types";

const CreateUpholsteryCategoryResponseSchema = ApiEnvelopeSchema(
  z.object({ upholstery_category: UpholsteryCategorySchema }),
).extend({ ok: z.literal(true) });

export async function createUpholsteryCategory(
  payload: CreateUpholsteryCategoryPayload,
): Promise<UpholsteryCategory> {
  const parsed = await apiClient.put(
    "/api/v1/upholstery-categories",
    CreateUpholsteryCategoryResponseSchema,
    payload,
  );
  return parsed.data.upholstery_category;
}
```

---

### Step 4 — `src/features/upholstery-category/api/list-upholstery-categories.ts` _(NEW)_

Calls `GET /api/v1/upholstery-categories`.

```ts
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import {
  UpholsteryCategorySchema,
  type ListUpholsteryCategoriesParams,
  type UpholsteryCategory,
} from "../types";

const ListUpholsteryCategoriesResponseSchema = ApiEnvelopeSchema(
  z.object({
    upholstery_categories: z.array(UpholsteryCategorySchema),
    upholstery_categories_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export type ListUpholsteryCategoriesResult = {
  items: UpholsteryCategory[];
  has_more: boolean;
};

export async function listUpholsteryCategories(
  params: ListUpholsteryCategoriesParams,
): Promise<ListUpholsteryCategoriesResult> {
  const parsed = await apiClient.get(
    "/api/v1/upholstery-categories",
    ListUpholsteryCategoriesResponseSchema,
    {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      q: params.q || undefined,
      favorite: params.favorite,
    },
  );
  return {
    items: parsed.data.upholstery_categories,
    has_more: parsed.data.upholstery_categories_pagination.has_more,
  };
}
```

---

### Step 5 — `src/features/upholstery-category/api/get-upholstery-category.ts` _(NEW)_

Calls `GET /api/v1/upholstery-categories/{client_id}`. Used to prefill the picker searchbar in edit mode.

```ts
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";
import { UpholsteryCategorySchema, type UpholsteryCategory } from "../types";

const GetUpholsteryCategoryResponseSchema = ApiEnvelopeSchema(
  z.object({ upholstery_category: UpholsteryCategorySchema }),
).extend({ ok: z.literal(true) });

export async function getUpholsteryCategory(
  id: string,
): Promise<UpholsteryCategory> {
  const parsed = await apiClient.get(
    `/api/v1/upholstery-categories/${id}`,
    GetUpholsteryCategoryResponseSchema,
  );
  return parsed.data.upholstery_category;
}
```

---

### Step 6 — `src/features/upholstery-category/api/use-list-upholstery-categories-query.ts` _(NEW)_

```ts
import { useQuery } from "@tanstack/react-query";
import { listUpholsteryCategories } from "./list-upholstery-categories";
import { upholsteryCategoryKeys } from "./upholstery-category-keys";
import type { ListUpholsteryCategoriesParams } from "../types";

const LIST_LIMIT = 50;

export function useListUpholsteryCategoriesQuery(
  params: ListUpholsteryCategoriesParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryCategoryKeys.list({ ...params, limit: LIST_LIMIT }),
    queryFn: () => listUpholsteryCategories({ ...params, limit: LIST_LIMIT }),
    enabled: options.enabled ?? true,
    placeholderData: (prev) => prev,
  });
}
```

---

### Step 7 — `src/features/upholstery-category/api/use-get-upholstery-category-query.ts` _(NEW)_

Used by `UpholsteryCategoryPickerField` to fetch a category by ID for searchbar prefill.

```ts
import { useQuery } from "@tanstack/react-query";
import { getUpholsteryCategory } from "./get-upholstery-category";
import { upholsteryCategoryKeys } from "./upholstery-category-keys";

export function useGetUpholsteryCategoryQuery(
  id: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: upholsteryCategoryKeys.detail(id ?? ""),
    queryFn: () => getUpholsteryCategory(id!),
    enabled: (options.enabled ?? true) && Boolean(id),
  });
}
```

---

### Step 8 — `src/features/upholstery-category/actions/use-create-upholstery-category.ts` _(NEW)_

Mutation hook. Invalidates `upholsteryCategoryKeys.lists()` on settle.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUpholsteryCategory } from "../api/create-upholstery-category";
import { upholsteryCategoryKeys } from "../api/upholstery-category-keys";
import type { CreateUpholsteryCategoryPayload } from "../types";

export function useCreateUpholsteryCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUpholsteryCategoryPayload) =>
      createUpholsteryCategory(payload),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: upholsteryCategoryKeys.lists(),
      });
    },
  });
}
```

---

### Step 9 — `src/features/upholstery-category/components/UpholsteryCategoryPickerField.tsx` _(NEW)_

The core picker component. Manages its own search state. Used inside the staged form step 1 of `UpholsteryInventoryCreationSlidePage`.

**Props:**
```ts
type Props = {
  value: string | null;             // currently selected category client_id
  onChange: (id: string | null, category: UpholsteryCategory | null) => void;
  prefillCategoryId?: string | null; // in edit mode: ID to fetch + prefill searchbar with
};
```

**Behavior:**

1. **Search state** — two separate state values:
   - `searchInput: string` — what is shown in the `SearchBar` component's input.
   - `activeQuery: string` — what is sent to `useListUpholsteryCategoriesQuery` as `q`.
   - `handleSearchChange(value: string)` updates **both** `searchInput` and `activeQuery`.
   - When the searchbar is cleared (empty string) `activeQuery` becomes `undefined` (falsy check in query params).

2. **Prefill logic** — avoids a duplicate list-query when populating the searchbar from a fetched category:
   - Use `useGetUpholsteryCategoryQuery(prefillCategoryId)` (enabled only when `prefillCategoryId` is non-null).
   - Use a `useRef<boolean>(false)` named `prefillApplied`.
   - In a `useEffect` that depends on `prefillQuery.data`:
     ```ts
     if (prefillQuery.data && !prefillApplied.current) {
       prefillApplied.current = true;
       setSearchInput(prefillQuery.data.name); // updates display only
       // Do NOT call setActiveQuery — the list query keeps using "".
     }
     ```
   - This means the list shows ALL categories (query is `q=undefined`) while the searchbar displays the category name. The selected card is highlighted via `value` prop.

3. **List query:**
   ```ts
   const listQuery = useListUpholsteryCategoriesQuery(
     { q: activeQuery || undefined },
   );
   ```

4. **Card rendering** — `UpholsteryCategoryCard` (local sub-component, not exported):
   - Outer div: `role="button"`, `aria-pressed={isSelected}`, onClick calls `onPress`.
   - When `isSelected`: `border-primary bg-primary text-card`
   - When not: `border-border bg-card text-foreground`
   - Left side: circular avatar — `<img className="size-10 rounded-full object-cover shrink-0" src={category.image_url} />` if `image_url` is set; otherwise a `<div className="size-10 rounded-full bg-muted shrink-0" />` placeholder.
   - Right side: flex column with `<p className="font-medium truncate">{category.name}</p>` and `<p className={cn("text-xs mt-0.5", isSelected ? "opacity-70" : "text-muted-foreground")}>{category.upholstery_count} upholstery entries</p>`.

5. **Press handler:**
   ```ts
   function handleCardPress(category: UpholsteryCategory) {
     const isSelected = value === category.client_id;
     onChange(isSelected ? null : category.client_id, isSelected ? null : category);
   }
   ```
   The parent page decides whether to auto-advance.

6. **Layout:**
   ```tsx
   <div className="flex flex-col gap-4 pt-4 px-4 pb-4">
     <SearchBar
       value={searchInput}
       onChange={handleSearchChange}
       showSortButton={false}
       showFilterButton={false}
       placeholder="Search categories…"
       isLoading={listQuery.isFetching}
     />
     <div className="flex flex-col gap-3">
       {listQuery.isPending && listQuery.data === undefined ? (
         <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
           Loading categories…
         </p>
       ) : listQuery.data?.items.length === 0 ? (
         <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
           No categories found.
         </p>
       ) : (
         (listQuery.data?.items ?? []).map((category) => (
           <UpholsteryCategoryCard
             key={category.client_id}
             category={category}
             isSelected={value === category.client_id}
             onPress={handleCardPress}
           />
         ))
       )}
     </div>
   </div>
   ```

7. **Imports** (all from within the feature or app-level):
   - `SearchBar` from `@/components/primitives` (re-exported from `@beyo/ui` — check the existing import pattern in the app).
   - `useListUpholsteryCategoriesQuery` from `../api/use-list-upholstery-categories-query`.
   - `useGetUpholsteryCategoryQuery` from `../api/use-get-upholstery-category-query`.
   - `type UpholsteryCategory` from `../types`.
   - `cn` from `@/lib/utils`.

---

### Step 10 — `src/features/upholstery-category/pages/UpholsteryCategoryCreationSlidePage.tsx` _(NEW)_

Simple single-form slide. Mirrors the structure of `UpholsteryInventoryCreationSlidePage` but only has name, image_url (with preview), and favorite fields. No staged form.

**Implementation details:**

- Imports: `zodResolver`, `Controller`, `useForm`, `useWatch` from react-hook-form; `useState`, `useEffect` from react; `ContentCard`, `FieldLabelRow`, `TextInput`, `SwitchCheckbox` from `@/components/primitives`; `useSurfaceHeader` from `@/hooks/use-surface-header`; `useSurfaceStore` from `@/providers/SurfaceProvider`; `ApiRequestError` from `@/lib/api-client`.
- Form schema: `CreateUpholsteryCategoryFormSchema` from `../types`.
- Action: `useCreateUpholsteryCategory` from `../actions/use-create-upholstery-category`.
- On mount: `header?.setTitle("New category"); header?.setActions(null)`.
- Default values: `{ name: "", image_url: null, favorite: false }`.
- Image preview: `useWatch` on `image_url`; show `<img>` when non-null (same pattern as inventory creation page — reset `isImagePreviewVisible` to `true` whenever `imageUrl` changes, set it to `false` on `img.onError`).
- Submit handler: calls `createUpholsteryCategory.mutate(payload, { onSuccess: close, onError: setSubmitError })`.
- Payload normalization: `name.trim()`, `image_url?.trim() || null`.
- Footer: same fixed footer pattern as inventory creation page — "Close & Back" button calling `header?.requestClose()` and "Create" button calling `form.handleSubmit(handleSubmit)`. Close on success: `useSurfaceStore.getState().close(UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID)`.

---

### Step 11 — `src/features/upholstery-category/surfaces.ts` _(NEW)_

```ts
import { lazyWithPreload } from "@beyo/ui";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export const UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID =
  "upholstery-category-creation-slide";

const categoryCreationSlide = lazyWithPreload(() =>
  import("./pages/UpholsteryCategoryCreationSlidePage").then((m) => ({
    default: m.UpholsteryCategoryCreationSlidePage,
  })),
);

export const preloadUpholsteryCategoryCreationSurface =
  categoryCreationSlide.preload;

export const upholsteryCategorySurfaces: SurfaceRegistrations = {
  [UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID]: {
    surface: "slide",
    component: categoryCreationSlide.Component,
  },
};
```

---

### Step 12 — `src/features/upholstery-category/index.ts` _(NEW)_

Public API for the feature.

```ts
export { UpholsteryCategoryPickerField } from "./components/UpholsteryCategoryPickerField";
export { upholsteryCategorySurfaces } from "./surfaces";
export type { UpholsteryCategory, UpholsteryCategoryInline } from "./types";
```

---

### Step 13 — Modify `src/features/upholstery/types.ts`

Add `upholstery_category` to `UpholsteryPickerOptionSchema` so the edit flow can read the current category linked to an upholstery.

**Change:** Inside `UpholsteryPickerOptionSchema`, add after the last existing field:

```ts
upholstery_category: z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
}).nullable(),
```

No other change to this file.

---

### Step 14 — Modify `src/features/upholstery-inventory/types.ts`

**Change 1:** Add `upholstery_category_id` to `CreateInventoryFormSchema`:

```ts
upholstery_category_id: z.string().nullable(),
```

Place it after `image_url` in the schema object.

**Change 2:** Add `upholstery_category_id` to `CreateInventoryPayload`:

```ts
upholstery_category_id?: string | null;
```

**Change 3:** Add `upholstery_category_id` to `EditInventoryPrefill`:

```ts
upholstery_category_id: string | null;
```

**Change 4:** Update the `defaultCreateValues()` function in the page (note: `defaultCreateValues` is defined inside `UpholsteryInventoryCreationSlidePage.tsx`, not in `types.ts`). — _(No change needed in types.ts for this.)_

---

### Step 15 — Modify `src/features/upholstery-inventory/api/create-upholstery-inventory.ts`

The `createUpholsteryInventory` function already accepts `CreateInventoryPayload`. Since we added `upholstery_category_id?: string | null` to that type, the function now passes it through to the API automatically — no code change is needed **unless** the `apiClient.put` call filters fields. Verify: the current implementation passes the entire `payload` object to `apiClient.put`. If it does, this step requires no code change. If it explicitly lists fields, add `upholstery_category_id: payload.upholstery_category_id` to the body.

**Expected: no change needed** (payload is passed as-is).

---

### Step 16 — Modify `src/features/upholstery-inventory/api/update-upholstery.ts`

Add `upholstery_category_id` to `UpdateUpholsteryPayload`:

```ts
export type UpdateUpholsteryPayload = {
  name?: string;
  code?: string | null;
  image_url?: string | null;
  favorite?: boolean;
  upholstery_category_id?: string | null; // NEW
};
```

No change to the `updateUpholstery` function body (it passes the payload object as-is).

---

### Step 17 — Modify `src/features/upholstery-inventory/actions/use-update-inventory.ts`

**Change 1:** Include `upholstery_category_id` in the `upholsteryChanged` comparison:

```ts
const upholsteryChanged =
  normalizedName !== original.name ||
  normalizedCode !== normalizeOptionalText(original.code) ||
  normalizedImageUrl !== normalizeOptionalText(original.image_url) ||
  values.favorite !== original.favorite ||
  values.upholstery_category_id !== original.upholstery_category_id; // NEW
```

**Change 2:** Pass `upholstery_category_id` in the `updateUpholstery` call:

```ts
promises.push(
  updateUpholstery(upholsteryId, {
    name: normalizedName,
    code: normalizedCode,
    image_url: normalizedImageUrl,
    favorite: values.favorite,
    upholstery_category_id: values.upholstery_category_id, // NEW
  }),
);
```

---

### Step 18 — Modify `src/features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx`

Full rework. Replace the existing single-form page with a 2-step `StagedForm`.

**Imports to add:**
- `useLayoutEffect` from `react`
- `StagedForm, StagedFormStep` from `@/components/primitives`
- `useStagedForm` from `@/hooks/use-staged-form`
- `useUpholsteryPickerOptionQuery` from `@/features/upholstery/api/use-upholstery-picker-option`
- `UpholsteryCategoryPickerField` from `@/features/upholstery-category`
- `type UpholsteryCategory` from `@/features/upholstery-category`

**`defaultCreateValues()` update:** Add `upholstery_category_id: null`.

**`EditInventoryPrefill` usage:** `editProps.prefill` now includes `upholstery_category_id`. Use it to populate the form default values.

**`isEditInventorySurfaceProps` guard:** No change needed — type narrowing is still by `mode === "edit"`.

**Upholstery query for category (edit mode only):**
```ts
const upholsteryQuery = useUpholsteryPickerOptionQuery(
  isEditMode ? editProps?.upholsteryId : null,
);
const prefillCategoryId =
  upholsteryQuery.data?.upholstery_category?.id ?? null;
```
This query is enabled only when `editProps?.upholsteryId` is set (i.e. edit mode).

**Staged form setup:**
```ts
const staged = useStagedForm({
  steps: [
    { id: "category", title: "Category" },
    { id: "details", title: "Details" },
  ],
  mode: "free",
  onSubmit: () => form.handleSubmit(handleSubmit)(),
});
```
`mode: "free"` is required so the user can navigate from step 2 back to step 1.

**Navigate to details on mount in edit mode:**
```ts
useLayoutEffect(() => {
  if (isEditMode) {
    staged.navigateTo("details");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
`useLayoutEffect` with an empty deps array runs once, synchronously before paint. `mode: "free"` must be set for `navigateTo` to work.

**Category selection handler:**
```ts
function handleCategorySelect(
  id: string | null,
  category: UpholsteryCategory | null,
): void {
  form.setValue("upholstery_category_id", id, { shouldDirty: true });
  if (id && category?.image_url) {
    // Pre-fill image_url from category only on first selection, not in edit mode
    if (!isEditMode || !form.getValues("image_url")) {
      form.setValue("image_url", category.image_url, { shouldDirty: true });
    }
  }
  if (id) {
    staged.navigateTo("details");
  }
}
```
Note: **only auto-advance when `id` is non-null** (selection, not deselection).

**`handleSubmit` function:** Keep the same logic (create vs edit). The `isUnchanged` check in edit mode must also include `upholstery_category_id`:

```ts
const isUnchanged =
  normalizedName === editProps.prefill.name &&
  normalizedCode === normalizeOptionalText(editProps.prefill.code) &&
  normalizedImageUrl === normalizeOptionalText(editProps.prefill.image_url) &&
  values.favorite === editProps.prefill.favorite &&
  values.upholstery_category_id === editProps.prefill.upholstery_category_id && // NEW
  (normalizeNonNegativeDecimalString(
    values.low_stock_threshold_meters ?? "",
  ) ?? null) ===
    (normalizeNonNegativeDecimalString(
      editProps.prefill.low_stock_threshold_meters ?? "",
    ) ?? null);
```

**Create payload:** include `upholstery_category_id: normalizeOptionalText(values.upholstery_category_id) ?? null`.
Actually `upholstery_category_id` is either a valid id string or null — no need to trim/normalize. Use `values.upholstery_category_id ?? null`.

**Footer:** Adapt for 2 steps. Replace the current fixed footer with a JSX element passed to `StagedForm`'s `footer` prop. The `StagedForm` renders the footer as a `shrink-0` element at the bottom of its flex column — do NOT use `fixed bottom-0` positioning:

```tsx
const footer = (
  <div className="bg-background px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
    <div className="flex gap-3">
      <button
        className="flex-1 rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
        type="button"
        onClick={() => {
          if (staged.isFirstStep) {
            header?.requestClose();
          } else {
            staged.back();
          }
        }}
      >
        {staged.isFirstStep ? "Close" : "← Back"}
      </button>
      <button
        className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:opacity-50"
        disabled={isPending}
        type="button"
        onClick={() => {
          if (staged.isLastStep) {
            void form.handleSubmit(handleSubmit)();
          } else {
            staged.advance();
          }
        }}
      >
        {staged.isLastStep
          ? isEditMode
            ? "Save"
            : "Create"
          : "Next →"}
      </button>
    </div>
  </div>
);
```

**Return JSX:**
```tsx
return (
  <div className="flex h-full min-h-0 flex-col bg-background">
    <StagedForm
      activeStepId={staged.activeStepId}
      direction={staged.direction}
      footer={footer}
      isAdvancing={staged.isAdvancing}
      isFirstStep={staged.isFirstStep}
      isLastStep={staged.isLastStep}
      navigationMode={staged.navigationMode}
      onAdvance={staged.advance}
      onBack={staged.back}
      onNavigate={staged.navigateTo}
      showNavigation={false}
      stepStatusMap={staged.stepStatusMap}
      steps={staged.steps}
    >
      <StagedFormStep id="category" className="p-0">
        <UpholsteryCategoryPickerField
          value={form.watch("upholstery_category_id")}
          prefillCategoryId={isEditMode ? prefillCategoryId : null}
          onChange={handleCategorySelect}
        />
      </StagedFormStep>

      <StagedFormStep id="details" className="p-0">
        <form
          className="flex flex-col gap-4 px-4 pb-4 pt-2"
          noValidate
          onSubmit={(e) => e.preventDefault()}
        >
          {/* --- Paste ALL existing form field ContentCard blocks here unchanged --- */}
          {/* Name, Code, Image URL (with preview), current_stored_amount (create only), */}
          {/* low_stock_threshold, Favorite */}

          {submitError ? (
            <p className="px-1 text-sm text-destructive">{submitError}</p>
          ) : null}
        </form>
      </StagedFormStep>
    </StagedForm>
  </div>
);
```

**Important:** Remove the outer `<div className="min-h-0 flex-1 overflow-y-auto">` wrapper — `StagedForm` manages its own scrollable container internally.

---

### Step 19 — Modify `src/features/upholstery-inventory/components/InventoryCreationFab.tsx`

Add a second action button for opening the category creation slide.

**Imports to add:**
```ts
import { FolderOpen } from "lucide-react"; // or another appropriate icon — use Layers or Tag if FolderOpen unavailable
import {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
  preloadUpholsteryCategoryCreationSurface,
} from "@/features/upholstery-category";
```

**Convert `ACTION_BUTTON` to an array:**

```ts
const ACTION_BUTTONS = [
  {
    id: "inventory",
    surfaceId: INVENTORY_CREATION_SLIDE_ID,
    icon: Spool,
    label: "New inventory",
    x: 0,
    y: -72,
  },
  {
    id: "category",
    surfaceId: UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
    icon: FolderOpen,
    label: "New category",
    x: 0,
    y: -144,
  },
] as const;
```

**Preload both surfaces:**
```ts
usePreloadSurface(preloadInventoryCreationSurface);
usePreloadSurface(preloadUpholsteryCategoryCreationSurface);
```

**Render both action buttons** by mapping over `ACTION_BUTTONS`:
```tsx
{ACTION_BUTTONS.map((btn) => (
  <motion.button
    key={btn.id}
    aria-label={btn.label}
    className={cn(
      `fixed ${FAB_POSITION_CLASS} z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md`,
      !isOpen && "pointer-events-none",
    )}
    data-testid={`inventory-creation-fab-action-${btn.id}`}
    initial={false}
    transition={FAB_TRANSITION}
    animate={
      isOpen ? { scale: 0.75, x: btn.x, y: btn.y } : { scale: 0, x: 0, y: 0 }
    }
    type="button"
    onClick={() => {
      useSurfaceStore.getState().open(btn.surfaceId);
      setIsOpen(false);
    }}
  >
    <btn.icon aria-hidden="true" className="size-5" />
  </motion.button>
))}
```

Keep the main toggle button (Plus/X) unchanged.

---

### Step 20 — Modify `src/app/surface-registry.ts`

Add the category surfaces to the registry.

**Import:**
```ts
import { upholsteryCategorySurfaces } from "@/features/upholstery-category";
```

**Spread** `...upholsteryCategorySurfaces` inside `surfaceRegistry` (place it adjacent to `...upholsteryInventorySurfaces`).

---

### Step 21 — Modify `src/features/upholstery-inventory/controllers/use-inventory-detail.controller.ts`

Update `openEdit()` to pass `upholstery_category_id` in the prefill. The `upholsteryQuery` is already available in the page component (step 18); here we use the imperative approach — `upholsteryId` is in `detail.raw.upholstery_id`, but the upholstery data including category is fetched by the creation page itself. So the controller only needs to pass `upholstery_category_id` to the prefill.

**Problem:** The controller doesn't have the upholstery category id (it's not in `UpholsteryInventoryDetailSchema`). The category prefill is handled entirely inside `UpholsteryInventoryCreationSlidePage` via `useUpholsteryPickerOptionQuery(editProps.upholsteryId)`.

**Action:** Update the `openEdit()` call in the controller to pass `upholstery_category_id: null` as a placeholder — the actual category is resolved inside the creation page via the upholstery query:

```ts
prefill: {
  name: detail.raw.upholstery_name ?? "",
  code: detail.raw.upholstery_code ?? "",
  image_url: detail.raw.image_url,
  low_stock_threshold_meters: detail.raw.low_stock_threshold_meters,
  favorite: detail.raw.favorite,
  upholstery_category_id: null, // resolved inside the creation page
} satisfies InventoryCreationSurfaceProps["prefill"],
```

> **Why `null` here?** `UpholsteryInventoryDetailSchema` does not include `upholstery_category_id`. The creation page fetches it via `useUpholsteryPickerOptionQuery(upholsteryId)`. The `prefillCategoryId` passed to `UpholsteryCategoryPickerField` comes from `upholsteryQuery.data?.upholstery_category?.id`. The form's default value for `upholstery_category_id` also starts as `null` in edit mode and is NOT pre-set from prefill — it is a live value from the query. This is acceptable because the picker is on step 1 and the user opens step 2 by default; they only see the category if they navigate back to step 1, at which point the upholstery query has already resolved.

**Alternative (if the above feels wrong):** Extend `UpholsteryInventoryDetailSchema` with `upholstery_category_id: z.string().nullable()` and have the backend return it (confirm with backend). This is cleaner but requires a backend handoff clarification. For now, use the `null` approach.

---

## Risks and mitigations

- **Risk:** `useLayoutEffect` navigate-to on mount might not work if `staged.navigateTo` is stale on first render.
  **Mitigation:** `mode: "free"` is set; `navigateTo` dispatches `setActiveStepIndex` which is a state setter — it will always be stable. The empty dep array is intentional and should be annotated with `// eslint-disable-next-line react-hooks/exhaustive-deps`.

- **Risk:** Preloading `preloadUpholsteryCategoryCreationSurface` in the FAB causes extra bundle loading.
  **Mitigation:** `lazyWithPreload` defers the bundle load until `preload()` is called, which happens only when the FAB component mounts. Acceptable.

- **Risk:** `UpholsteryPickerOptionSchema` is used in multiple places — adding a nullable field may break existing parse sites.
  **Mitigation:** Zod passthrough is NOT used in the list schema; adding an optional nullable field with `.nullable()` is backwards-compatible as long as the backend sends either a valid object or `null`.

- **Risk:** In edit mode, `prefillCategoryId` inside `UpholsteryCategoryPickerField` is the result of an async query and may be `null` briefly on first render.
  **Mitigation:** `useGetUpholsteryCategoryQuery` is enabled only when `prefillCategoryId` is non-null. The prefill effect fires when the query resolves. No search is triggered during the loading window.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Manual smoke test — create flow: tap FAB → "New category", fill name, submit; verify category appears in picker on next "New inventory" open.
- Manual smoke test — create inventory: tap FAB → "New inventory", step 1 shows category list, select a category, auto-advance to step 2, image_url pre-filled, submit.
- Manual smoke test — edit flow: open inventory detail, tap Edit, form opens on step 2, tap Back, step 1 shows the correct category highlighted and searchbar filled with category name, no extra list fetch is triggered for the search.
- Manual smoke test — edit without category: inventory with no category, open edit, step 1 shows empty list (or full list), no selection highlighted.

---

## Review log

_(none yet)_

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
