# PLAN_task_creation_form_dependencies_to_packages_20260624

## Metadata

- Plan ID: `PLAN_task_creation_form_dependencies_to_packages_20260624`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-24T00:00:00Z`
- Last updated at (UTC): `2026-06-24T10:18:47Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/abstraction_of_tasks.txt`
- Prerequisite of: `PLAN_task_creation_package_abstraction_20260624` (Plan B — task-creation form package)

## Goal and intent

- **Goal:** Extract all form field components and their support layers (API, stores, flows, surfaces, types) that are currently owned by manager-app features into their proper `@beyo/*` packages. After this plan completes, every dependency that `@beyo/task-creation` will need is importable from a package — no app-level imports needed.
- **Business/user intent:** The task-creation forms need to work in any app (workers, future apps). Package-level form fields are also independently reusable beyond task creation (e.g. customer fields in a customer-edit flow, working-section picker in a scheduling flow).
- **Non-goals:**
  - The manager-app does NOT change its existing code. It keeps all its feature implementations in parallel.
  - `@beyo/task-creation` (Plan B) is NOT built here — only its dependencies.
  - No Playwright tests in this plan (added after Plan B is running).

## Scope

- **In scope:** 9 packages created or extended (listed below), ~70 new files total.
- **Out of scope:** Wiring any app to use the new package exports; runtime testing; removing anything from manager-app.
- **Assumptions:**
  - All existing packages (`@beyo/ui`, `@beyo/hooks`, `@beyo/lib`, `@beyo/api-client`, `@beyo/scanner`, `@beyo/images`, `@beyo/item-categories`, `@beyo/upholstery`, `@beyo/tasks`, `@beyo/item-issues`) are already in the monorepo workspace.
  - New packages are added to the monorepo workspace config.

## Clarifications required

*(none — all decisions resolved during analysis)*

## Acceptance criteria

1. `npm run typecheck` passes with zero errors across all modified/new packages.
2. Each package's `src/index.ts` exports only what is listed in this plan; no accidental re-export of app-internal types.
3. Manager-app continues to build and typecheck without changes — it keeps its own implementations.
4. No package imports from an app path (`@/features/...`, `@/hooks/...`, etc.).

## Contracts and skills

### Contracts loaded

- `01_architecture.md`: package boundary rules (packages → packages only)
- `02_types.md`: Zod schema conventions
- `04_api_client.md`: `apiClient`, `ApiEnvelopeSchema` from `@beyo/lib`
- `05_server_state.md`: query hook shape
- `06_client_state.md`: Zustand store shape
- `08_hooks.md`: mutation/action hook shape
- `09_forms.md`: form field component conventions (`useFormContext`, `useController`)
- `15_feature_structure.md`: layer ordering within each package
- `28_surfaces.md` + local: `SurfaceRegistrations`, `lazyWithPreload`

### Domain schemas consulted (for accurate field/type names)

- `apps/managers-app/.../features/items/types.ts` → `ItemDetailsFieldsSchema`, `ItemLookupResultSchema`, `ItemCategoryPickerOptionSchema`, `ItemUpholsteryFieldsSchema`, `ITEM_CURRENCY`, `ITEM_POSITION`
- `apps/managers-app/.../features/items/subfeatures/item_images/types.ts` → `CreateImageFromUrlInput`, `CreateImageFromUrlBatch`
- `apps/managers-app/.../features/tasks/types.ts` → `TaskAdditionalDetailsFieldsSchema`, `TASK_FULFILLMENT_METHOD`, `TASK_RETURN_SOURCE`
- `apps/managers-app/.../features/customers/types.ts` → `CustomerFieldsSchema`, `CustomerType`
- `apps/managers-app/.../features/working-sections/types.ts` → `WorkingSectionPickerFieldsSchema`, `WorkingSectionAssignment`, `WorkingSectionOption`, `WorkingSectionMember`
- `apps/managers-app/.../features/upholstery/types.ts` → `UpholsteryPickerOption`, `ItemUpholsteryRequirementState`
- `apps/managers-app/.../lib/phone/*` → phone state utils, country types

---

## Package map

| Package | Action | What is added |
|---|---|---|
| `@beyo/images` | **extend** | `useCreateImagesFromUrl`, `CreateImageFromUrlInput/Batch` types |
| `@beyo/item-issues` | **extend** | `ItemIssuesFieldsSchema`, `ItemIssueFieldEntry` |
| `@beyo/item-categories` | **extend** | `ItemCategoryPickerOption` type, picker query, store, flow, `ItemCategorySelectionField`, picker surface |
| `@beyo/items` | **new** | `ItemIdentityField`, `ItemPositionField`, `ItemQuantityField`, item lookup API, `ItemDetailsFieldsSchema` |
| `@beyo/upholstery` | **extend** | `ItemUpholsteryField`, `ItemUpholsteryAmountField`, picker API, picker surface, `UpholsteryPickerOption` |
| `@beyo/tasks` | **extend** | Task form fields, `createTask`, `useCreateTask`, task form schemas/constants |
| `@beyo/customers` | **new** | All customer form fields, `CustomerFieldsSchema` |
| `@beyo/working-sections` | **new** | `WorkingSectionPickerField`, picker API, store, flow, shortcuts, worker picker surface |
| `@beyo/phone-input` | **new** | `ManagedPhoneInput`, phone utilities, country picker surface |

---

## Implementation plan

Build order per package follows `16_feature_workflow.md`: types → API keys → API functions → query hooks → action hooks → stores → flows → components → pages → surfaces → index.ts update.

---

### Package 1: `@beyo/images` — extend

**Why here:** `useCreateImagesFromUrl` is fundamentally an image-creation action — it bulk-creates item images from external URLs. Its types (`CreateImageFromUrlInput`, `CreateImageFromUrlBatch`) already exist in the manager-app's item_images subfeature but belong in the images package.

#### New files

**`packages/images/src/api/create-images-from-url.ts`**
- Port from `apps/managers-app/.../features/items/subfeatures/item_images/api/create-images-from-url.ts`
- Replace `@/lib/api-client` → `@beyo/api-client`
- Replace `@/types/api` → `ApiEnvelopeSchema` from `@beyo/lib`
- Endpoint: `POST /api/v1/images/bulk-from-url`
- Input: `CreateImageFromUrlBatch`; output: `{created: number}`

**`packages/images/src/actions/use-create-images-from-url.ts`**
- Port from `apps/managers-app/.../features/items/subfeatures/item_images/actions/use-create-images-from-url.ts`
- Replace `@/lib/api-client` chain → package-level imports
- Returns `useMutation({ mutationFn: createImagesFromUrl })`

**Types addition to `packages/images/src/types.ts`** (or a new `src/types/create-from-url.ts`)
- Add `CreateImageFromUrlInputSchema`, `CreateImageFromUrlInput`, `CreateImageFromUrlBatchSchema`, `CreateImageFromUrlBatch`
- Note: remove the `@/types/common` import for `ItemId` — use `z.string()` inline (the package doesn't own item IDs)

#### `packages/images/src/index.ts` additions
```ts
export { useCreateImagesFromUrl } from './actions/use-create-images-from-url';
export type { CreateImageFromUrlInput, CreateImageFromUrlBatch } from './types/create-from-url';
```

---

### Package 2: `@beyo/item-issues` — extend

**Why here:** `ItemIssuesFieldsSchema` describes the shape of item issues as a form field within task creation. The item-issues package owns all issue-related schemas; this is just the form-field variant.

#### Additions to `packages/item-issues/src/types.ts`

```ts
// Form field schemas (used by task creation form schemas)
export const ItemIssueFieldEntrySchema = z.object({
  issue_id: z.string().min(1),
  issue_severity_id: z.string().optional().or(z.literal("")),
});
export type ItemIssueFieldEntry = z.infer<typeof ItemIssueFieldEntrySchema>;

export const ItemIssuesFieldsSchema = z.object({
  item_issues: z.array(ItemIssueFieldEntrySchema).default([]),
});
export type ItemIssuesFields = z.infer<typeof ItemIssuesFieldsSchema>;
```

#### `packages/item-issues/src/index.ts` additions
```ts
export { ItemIssueFieldEntrySchema, ItemIssuesFieldsSchema } from './types';
export type { ItemIssueFieldEntry, ItemIssuesFields } from './types';
```

---

### Package 3: `@beyo/item-categories` — extend

**Why here:** `ItemCategorySelectionField` is fundamentally about item categories. The package already has category queries; adding the picker field, flow, store, and picker surface creates a complete self-contained category selection unit.

#### New files

**`packages/item-categories/src/types/picker.ts`** (or add to existing `types.ts`)
- Add `ItemCategoryPickerOptionSchema`, `ItemCategoryPickerOption`
- Add `ListItemCategoriesPickerParams` type

**`packages/item-categories/src/api/item-category-picker-keys.ts`**
- Port from manager-app `@/features/items/api/item-category-picker-keys.ts`
- Keys: `all`, `lists()`, `list(params)`

**`packages/item-categories/src/api/fetch-item-categories-picker.ts`**
- Port from manager-app; replace `@/lib/api-client` → `@beyo/api-client`, `@/types/api` → `@beyo/lib`
- Returns `{itemCategories: ItemCategoryPickerOption[], itemCategoriesPagination}`

**`packages/item-categories/src/api/use-item-categories-picker-query.ts`**
- `useItemCategoriesPickerQuery(params?, options?)` wrapping the fetch function

**`packages/item-categories/src/store/item-category-selection.store.ts`**
- Port from manager-app; depends on `ItemCategoryPickerOption` from `../types/picker`
- Zustand: `{ options, setOptions, clear }`

**`packages/item-categories/src/flows/use-item-category-picker.flow.ts`**
- Port from manager-app; imports store + query hook
- Returns `{ options, byMajorCategory, isPending }`

**`packages/item-categories/src/components/ItemCategorySelectionField.tsx`**
- Port from manager-app `@/features/items/components/fields/ItemCategorySelectionField.tsx`
- Replace `@/components/primitives` → `@beyo/ui` (`BoxPicker`, `ImagePlaceholder`)
- Replace `@/hooks/*` → `@beyo/hooks`
- Replace `@/providers/SurfaceProvider` → `@beyo/ui` (`useSurfaceStore`)
- Replace picker surface ID → `ITEM_CATEGORY_PICKER_SURFACE_ID` from `../surface-ids`
- Replace `preloadItemCategoryPickerSurface` → from `../surfaces`

**`packages/item-categories/src/surface-ids.ts`**
- `ITEM_CATEGORY_PICKER_SURFACE_ID = "item-category-picker"`
- `ItemCategoryPickerSurfaceProps` type

**`packages/item-categories/src/pages/ItemCategoryPickerSheetPage.tsx`** (internal — not exported from index)
- Port from manager-app `@/features/items/pages/ItemCategoryPickerSheetPage.tsx`
- Replace `@/hooks/*` → `@beyo/hooks`
- Replace `BoxPicker` → `@beyo/ui`

**`packages/item-categories/src/surfaces.ts`**
- `itemCategoryPickerSurfaces: SurfaceRegistrations` → `{ [ITEM_CATEGORY_PICKER_SURFACE_ID]: { surface: "sheet", component: ... } }`
- `preloadItemCategoryPickerSurface`

#### `packages/item-categories/src/index.ts` additions
```ts
export type { ItemCategoryPickerOption, ListItemCategoriesPickerParams } from './types/picker';
export { ItemCategoryPickerOptionSchema } from './types/picker';
export { itemCategoryPickerKeys } from './api/item-category-picker-keys';
export { fetchItemCategoriesPicker } from './api/fetch-item-categories-picker';
export { useItemCategoriesPickerQuery } from './api/use-item-categories-picker-query';
export { useItemCategorySelectionStore } from './store/item-category-selection.store';
export { useItemCategoryPickerFlow } from './flows/use-item-category-picker.flow';
export { ItemCategorySelectionField } from './components/ItemCategorySelectionField';
export { ITEM_CATEGORY_PICKER_SURFACE_ID } from './surface-ids';
export type { ItemCategoryPickerSurfaceProps } from './surface-ids';
export { itemCategoryPickerSurfaces, preloadItemCategoryPickerSurface } from './surfaces';
```

#### `packages/item-categories/package.json` — peer dep additions
```json
"@beyo/hooks": "*",
"@beyo/lib": "*",
"@beyo/ui": "*",
"framer-motion": ">=12.0.0",
"lucide-react": ">=1.0.0",
"zustand": ">=5.0.0"
```

---

### Package 4: `@beyo/items` — new

**Why new:** The manager-app has a large `items` feature. We only need the parts used by task creation forms: identity input (article number / SKU with lookup), position, quantity, and the supporting lookup API. Item category selection goes in `@beyo/item-categories`; upholstery fields go in `@beyo/upholstery`.

#### `packages/items/package.json`
```json
{
  "name": "@beyo/items",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/hooks": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@tanstack/react-query": ">=5.0.0",
    "framer-motion": ">=12.0.0",
    "react": ">=19.0.0",
    "react-hook-form": ">=7.0.0",
    "zod": ">=4.0.0"
  }
}
```

#### New files

**`packages/items/src/types.ts`**
- `ItemDetailsFieldsSchema` (z.object: designer, article_number, sku, quantity, item_position, item_currency, item_category_id, major_category)
- `ITEM_CURRENCY`, `ITEM_POSITION` as const arrays
- `ItemLookupResultSchema`, `ItemLookupResult` (external_source, article_number, sku, item_category_id, quantity, images[], ...)
- `LookupItemsParams`

**`packages/items/src/api/item-lookup-keys.ts`**
- Keys: `all`, `lookup(params)`

**`packages/items/src/api/fetch-item-lookup.ts`**
- Port from manager-app `@/features/items/api/fetch-item-lookup.ts`
- `GET /api/v1/items/lookup` with params `{ article_number?, sku?, limit? }`
- Returns `{ items: ItemLookupResult[] }`

**`packages/items/src/api/use-item-lookup-query.ts`**
- `useItemLookupQuery(params, options?)` — debounce is handled at call site

**`packages/items/src/lib/use-debounce.ts`**
- Simple `useDebounce<T>(value: T, ms: number): T` hook

**`packages/items/src/components/fields/ItemIdentityField.tsx`**
- Port from manager-app
- Replace all `@/components/primitives` → `@beyo/ui` (`BoxSlidePicker`, `FieldErrorPill`, `TextInput`)
- Replace `@/features/items/api/use-item-lookup-query` → `../../api/use-item-lookup-query`
- Replace `@/hooks/use-debounce` → `../../lib/use-debounce`
- Replace `@/lib/animation` transitions → `@beyo/lib` (`transitions`)
- Types from `../../types`

**`packages/items/src/components/fields/ItemPositionField.tsx`**
- Port; `TextInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`packages/items/src/components/fields/ItemQuantityField.tsx`**
- Port; `NumberInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`packages/items/src/index.ts`**
```ts
export { ItemDetailsFieldsSchema, ItemLookupResultSchema, ITEM_CURRENCY, ITEM_POSITION } from './types';
export type { ItemDetailsFields, ItemLookupResult, LookupItemsParams } from './types';
export { itemLookupKeys } from './api/item-lookup-keys';
export { fetchItemLookup } from './api/fetch-item-lookup';
export { useItemLookupQuery } from './api/use-item-lookup-query';
export { ItemIdentityField } from './components/fields/ItemIdentityField';
export { ItemPositionField } from './components/fields/ItemPositionField';
export { ItemQuantityField } from './components/fields/ItemQuantityField';
```

---

### Package 5: `@beyo/upholstery` — extend

**Why here:** `ItemUpholsteryField` and `ItemUpholsteryAmountField` are form fields that deal with upholstery selection and quantity. The upholstery picker surface is the natural home for all upholstery browsing UI.

#### New files

**`packages/upholstery/src/types.ts`** (extend or create)
- `UpholsteryPickerOptionSchema`, `UpholsteryPickerOption` ({client_id, name, code, image_url, amount_meters, category_id})
- `ListUpholsteryPickerParams` ({category_id?, search?, offset?, limit?})
- `ItemUpholsteryFieldsSchema` (z.object: upholstery_client_id nullable, upholstery_amount_meters nullable)
- `ItemUpholsteryFields` type
- `ItemUpholsteryRequirementState` as const (`missing_quantity`, `available`, `needs_ordering`, `ordered`, `in_use`, `completed`, `failed`)

**`packages/upholstery/src/api/upholstery-picker-keys.ts`**
- Keys: `all`, `lists()`, `list(params)`, `option(clientId)`

**`packages/upholstery/src/api/fetch-upholstery-picker.ts`**
- `GET /api/v1/upholstery/picker` with `ListUpholsteryPickerParams`
- Returns `{upholsteries: UpholsteryPickerOption[], pagination}`

**`packages/upholstery/src/api/fetch-upholstery-picker-option.ts`**
- `GET /api/v1/upholstery/{client_id}/picker-option`
- Returns `UpholsteryPickerOption | null`

**`packages/upholstery/src/api/use-upholstery-picker-query.ts`**
- `useUpholsteryPickerQuery(params, options?)`

**`packages/upholstery/src/api/use-upholstery-picker-option-query.ts`**
- `useUpholsteryPickerOptionQuery(clientId: string | null, options?)`

**`packages/upholstery/src/components/fields/ItemUpholsteryField.tsx`**
- Port from manager-app `@/features/items/components/fields/ItemUpholsteryField.tsx`
- Replace upholstery feature imports → package-level (`../../api/*`, `../../types`)
- Replace surface ID → `UPHOLSTERY_PICKER_SLIDE_ID` from `../../surface-ids`
- Replace `@/hooks/use-surface` → `@beyo/hooks`
- Replace `StatePill`, `ImagePlaceholder`, `cn` → `@beyo/ui`, `@beyo/lib`

**`packages/upholstery/src/components/fields/ItemUpholsteryAmountField.tsx`**
- Port from manager-app `@/features/items/components/fields/ItemUpholsteryAmountField.tsx`
- Replace `NumberInput`, `FieldLabelRow`, `FieldErrorPill` → `@beyo/ui`

**`packages/upholstery/src/surface-ids.ts`**
- `UPHOLSTERY_PICKER_SLIDE_ID = "upholstery-picker"`
- `UpholsteryPickerSlideSurfaceProps` type (`currentClientId?, onSelect?`)

**`packages/upholstery/src/pages/UpholsteryPickerSlidePage.tsx`** (internal — not in index)
- Port from manager-app `@/features/upholstery/pages/UpholsteryPickerSlidePage.tsx`
- Sub-components (`UpholsteryCard`, `UpholsteryPickerHeader`, controller logic) implemented inline or as private sub-files
- Replace `@/hooks/*` → `@beyo/hooks`
- Replace `PullToRefresh`, `useScrollVisibility` → `@beyo/ui`
- Replace `@/lib/animation` → `@beyo/lib`
- Replace controller logic → inline using package-level query hook

**`packages/upholstery/src/surfaces.ts`**
- `upholsteryPickerSurfaces: SurfaceRegistrations`
- `preloadUpholsteryPickerSurface`

#### `packages/upholstery/src/index.ts` additions
```ts
export { UpholsteryPickerOptionSchema } from './types';
export type { UpholsteryPickerOption, ItemUpholsteryFields, ItemUpholsteryRequirementState } from './types';
export { ItemUpholsteryFieldsSchema } from './types';
export { upholsteryPickerKeys } from './api/upholstery-picker-keys';
export { fetchUpholsteryPicker, fetchUpholsteryPickerOption } from './api/fetch-upholstery-picker';
export { useUpholsteryPickerQuery } from './api/use-upholstery-picker-query';
export { useUpholsteryPickerOptionQuery } from './api/use-upholstery-picker-option-query';
export { ItemUpholsteryField } from './components/fields/ItemUpholsteryField';
export { ItemUpholsteryAmountField } from './components/fields/ItemUpholsteryAmountField';
export { UPHOLSTERY_PICKER_SLIDE_ID } from './surface-ids';
export { upholsteryPickerSurfaces, preloadUpholsteryPickerSurface } from './surfaces';
```

#### `packages/upholstery/package.json` — add peer deps
```json
"@beyo/api-client": "*",
"@beyo/hooks": "*",
"@beyo/lib": "*",
"@beyo/ui": "*",
"@tanstack/react-query": ">=5.0.0",
"class-variance-authority": ">=0.7.0",
"framer-motion": ">=12.0.0",
"lucide-react": ">=1.0.0",
"react": ">=19.0.0",
"react-hook-form": ">=7.0.0",
"zod": ">=4.0.0"
```

---

### Package 6: `@beyo/tasks` — extend

**Why here:** Task form fields and `useCreateTask` are fundamentally task-domain. The package already has task flow records and step queries; adding the creation-side (form fields, createTask, constants) makes it a complete task package.

#### New files

**`packages/tasks/src/api/create-task.ts`**
- Port from manager-app `@/features/tasks/api/create-task.ts`
- Replace `@/lib/api-client` → `@beyo/api-client`, `@/types/api` → `@beyo/lib`
- `PUT /api/v1/tasks`; returns `{client_id, task_scalar_id}`

**`packages/tasks/src/actions/use-create-task.ts`**
- Port simplified version (no manager-app optimistic update for task lists):
  ```ts
  export function useCreateTask() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: createTask,
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      },
    });
  }
  ```
- Apps that need deeper cache management (manager-app) continue to use their local version.

**`packages/tasks/src/types/form-fields.ts`** (new file within types)
- `TaskAdditionalDetailsFieldsSchema` (z.object: additional_details string)
- `TASK_FULFILLMENT_METHOD` as const
- `TASK_RETURN_SOURCE` as const
- `TASK_READY_BY_QUICK_SELECT_OPTIONS` — quick-select date options array
- `TaskAdditionalDetailsFields` type

**`packages/tasks/src/components/fields/TaskAdditionalDetailsField.tsx`**
- Port; `TextArea`, `FieldErrorPill` from `@beyo/ui`

**`packages/tasks/src/components/fields/TaskReadyByDateField.tsx`**
- Port from manager-app
- Replace `@/components/primitives/date` → `@beyo/ui` (`DateFieldTrigger`, `formatDateDisplay`, `preloadCalendarSinglePickerSurface`)
- Replace `@/providers/SurfaceProvider` → `@beyo/ui` (`useSurfaceStore`)
- Replace `@/hooks/use-preload-surface` → `@beyo/hooks`
- Replace quick-select options → `../types/form-fields`

**`packages/tasks/src/components/fields/TaskDeliveryDateField.tsx`**
- Port; date range variant — `preloadCalendarRangePickerSurface` from `@beyo/ui`

**`packages/tasks/src/components/fields/TaskFulfillmentMethodField.tsx`**
- Port; `BoxPicker`, `FieldLabelRow` from `@beyo/ui`, constants from `../types/form-fields`

**`packages/tasks/src/components/fields/TaskReturnSourceField.tsx`**
- Port; same pattern

#### `packages/tasks/src/index.ts` additions
```ts
export { createTask } from './api/create-task';
export { useCreateTask } from './actions/use-create-task';
export { TaskAdditionalDetailsFieldsSchema, TASK_FULFILLMENT_METHOD, TASK_RETURN_SOURCE, TASK_READY_BY_QUICK_SELECT_OPTIONS } from './types/form-fields';
export type { TaskAdditionalDetailsFields } from './types/form-fields';
export { TaskAdditionalDetailsField } from './components/fields/TaskAdditionalDetailsField';
export { TaskReadyByDateField } from './components/fields/TaskReadyByDateField';
export { TaskDeliveryDateField } from './components/fields/TaskDeliveryDateField';
export { TaskFulfillmentMethodField } from './components/fields/TaskFulfillmentMethodField';
export { TaskReturnSourceField } from './components/fields/TaskReturnSourceField';
```

#### `packages/tasks/package.json` — add peer deps
```json
"@beyo/hooks": "*",
"@beyo/ui": "*",
"class-variance-authority": ">=0.7.0",
"lucide-react": ">=1.0.0",
"react-hook-form": ">=7.0.0"
```

---

### Package 7: `@beyo/customers` — new

**Why new:** Customer form fields exist only in the manager-app. No package covers the customer domain yet.

#### `packages/customers/package.json`
```json
{
  "name": "@beyo/customers",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "peerDependencies": {
    "@beyo/hooks": "*",
    "@beyo/lib": "*",
    "@beyo/phone-input": "*",
    "@beyo/ui": "*",
    "react": ">=19.0.0",
    "react-hook-form": ">=7.0.0",
    "zod": ">=4.0.0"
  }
}
```

#### New files

**`packages/customers/src/types.ts`**
- `CUSTOMER_TYPE` as const (`individual`, `company`, ...)
- `CustomerFieldsSchema` (display_name, customer_type, primary_email, primary_phone_number, address: {street, city, postal_code, country})
- `CustomerFields`, `CustomerType` types

**`packages/customers/src/components/fields/CustomerDisplayNameField.tsx`**
- Port; `TextInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`packages/customers/src/components/fields/CustomerEmailField.tsx`**
- Port; `TextInput` from `@beyo/ui`

**`packages/customers/src/components/fields/CustomerTypeField.tsx`**
- Port; `BoxPicker`, `FieldLabelRow` from `@beyo/ui`, types from `../types`

**`packages/customers/src/components/fields/CustomerPhoneField.tsx`**
- Port from manager-app
- Replace `ManagedPhoneInput` import → `@beyo/phone-input` (`ManagedPhoneInput`)
- Replace `@/hooks/*` → `@beyo/hooks`
- `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`packages/customers/src/components/fields/CustomerAddressFieldGroup.tsx`**
- Port; `TextInput`, `FieldLabelRow`, `FieldErrorPill`, `EyebrowLabel` from `@beyo/ui`

**`packages/customers/src/index.ts`**
```ts
export { CustomerFieldsSchema, CUSTOMER_TYPE } from './types';
export type { CustomerFields, CustomerType } from './types';
export { CustomerDisplayNameField } from './components/fields/CustomerDisplayNameField';
export { CustomerEmailField } from './components/fields/CustomerEmailField';
export { CustomerTypeField } from './components/fields/CustomerTypeField';
export { CustomerPhoneField } from './components/fields/CustomerPhoneField';
export { CustomerAddressFieldGroup } from './components/fields/CustomerAddressFieldGroup';
```

---

### Package 8: `@beyo/working-sections` — new

**Why new:** Working section picker and its supporting API/flow/store/surface are completely absent from packages. This package is reusable beyond task creation (e.g. assigning workers in an admin flow).

#### `packages/working-sections/package.json`
```json
{
  "name": "@beyo/working-sections",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/hooks": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "@tanstack/react-query": ">=5.0.0",
    "react": ">=19.0.0",
    "react-hook-form": ">=7.0.0",
    "zod": ">=4.0.0",
    "zustand": ">=5.0.0"
  }
}
```

#### New files

**`packages/working-sections/src/types.ts`**
- `WorkingSectionAssignment` ({working_section_id: string, assigned_worker_id: string | null})
- `WorkingSectionMember` ({client_id, username, profile_picture})
- `WorkingSectionItemCategory` ({client_id, major_category, name})
- `WorkingSectionOption` ({client_id, name, item_categories[], members[], ...})
- `WorkingSectionPickerOption` (same as `WorkingSectionOption`)
- `WorkingSectionPickerFieldsSchema` (z.object: working_section_assignments array)
- `WorkingSectionPickerFields` type
- `WorkingSectionShortcutConfig`, `WorkingSectionShortcutCandidate` types

**`packages/working-sections/src/api/working-section-keys.ts`**
- Port from manager-app; keys: `all`, `lists()`, `list()`

**`packages/working-sections/src/api/fetch-working-sections-picker.ts`**
- Port; `GET /api/v1/working-sections/picker`; returns `{workingSections: WorkingSectionPickerOption[]}`

**`packages/working-sections/src/api/use-working-sections-picker-query.ts`**
- `useWorkingSectionsPickerQuery(options?)`

**`packages/working-sections/src/store/working-section-selection.store.ts`**
- Port from manager-app; Zustand: `{options, setOptions, clear}`

**`packages/working-sections/src/flows/use-working-section-picker.flow.ts`**
- Port; returns `{options, isLoading}`

**`packages/working-sections/src/lib/working-section-shortcuts.ts`**
- Port `DEFAULT_WORKING_SECTION_SHORTCUTS`, `resolveWorkingSectionShortcutsByMajorCategory` from manager-app `@/features/working-sections/constants/working-section-shortcuts`

**`packages/working-sections/src/components/fields/WorkingSectionPickerField.tsx`**
- Port from manager-app `@/features/working-sections/components/fields/WorkingSectionPickerField.tsx`
- Replace all `@/features/*` → package-level imports
- Replace `@/hooks/*` → `@beyo/hooks`
- Replace `@/components/primitives/*` → `@beyo/ui`
- Replace `@/providers/SurfaceProvider` → `@beyo/ui`

**`packages/working-sections/src/surface-ids.ts`**
- `WORKING_SECTION_WORKER_PICKER_SURFACE_ID = "working-section-worker-picker"`
- `WorkingSectionWorkerPickerSurfaceProps` type ({sectionName, members, currentWorkerId, onSelect})

**`packages/working-sections/src/pages/WorkingSectionWorkerPickerSheetPage.tsx`** (internal — not exported)
- Port from manager-app; replace `@/lib/utils` → `@beyo/lib`, hooks → `@beyo/hooks`

**`packages/working-sections/src/surfaces.ts`**
- `workingSectionPickerSurfaces: SurfaceRegistrations`
- `preloadWorkingSectionWorkerPickerSurface`

**`packages/working-sections/src/index.ts`**
```ts
export { WorkingSectionPickerFieldsSchema } from './types';
export type { WorkingSectionAssignment, WorkingSectionMember, WorkingSectionOption, WorkingSectionPickerOption, WorkingSectionPickerFields, WorkingSectionShortcutConfig, WorkingSectionShortcutCandidate } from './types';
export { workingSectionKeys } from './api/working-section-keys';
export { fetchWorkingSectionsPicker } from './api/fetch-working-sections-picker';
export { useWorkingSectionsPickerQuery } from './api/use-working-sections-picker-query';
export { useWorkingSectionSelectionStore } from './store/working-section-selection.store';
export { useWorkingSectionPickerFlow } from './flows/use-working-section-picker.flow';
export { DEFAULT_WORKING_SECTION_SHORTCUTS, resolveWorkingSectionShortcutsByMajorCategory } from './lib/working-section-shortcuts';
export { WorkingSectionPickerField } from './components/fields/WorkingSectionPickerField';
export { WORKING_SECTION_WORKER_PICKER_SURFACE_ID } from './surface-ids';
export type { WorkingSectionWorkerPickerSurfaceProps } from './surface-ids';
export { workingSectionPickerSurfaces, preloadWorkingSectionWorkerPickerSurface } from './surfaces';
```

---

### Package 9: `@beyo/phone-input` — new

**Why new:** `ManagedPhoneInput` has significant state logic and lib utilities (`countries`, `phone-input-state`, `storage`) that need a proper home. It's also independently reusable beyond customer forms.

#### `packages/phone-input/package.json`
```json
{
  "name": "@beyo/phone-input",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "peerDependencies": {
    "@beyo/hooks": "*",
    "@beyo/lib": "*",
    "@beyo/ui": "*",
    "react": ">=19.0.0",
    "zod": ">=4.0.0"
  }
}
```

#### New files

**`packages/phone-input/src/types.ts`**
- `CountryIso2` type (string brand)
- `ManagedPhoneInputChangeMeta` type
- `PhoneCountry` type ({iso2, dialCode, name, flag})

**`packages/phone-input/src/lib/countries.ts`**
- Port from `@/lib/phone/countries.ts` (country data + lookup functions)

**`packages/phone-input/src/lib/phone-input-state.ts`**
- Port from `@/lib/phone/phone-input-state.ts` (`resolvePhoneChange`, `resolveInitialPhoneState`)

**`packages/phone-input/src/lib/storage.ts`**
- Port from `@/lib/phone/storage.ts` (`readLastPhoneCountryIso2`, `writeLastPhoneCountryIso2`)

**`packages/phone-input/src/lib/normalize-phone.ts`**
- Port from `@/lib/phone/normalize-phone.ts`

**`packages/phone-input/src/lib/parse-e164.ts`**
- Port from `@/lib/phone/parse-e164.ts`

**`packages/phone-input/src/lib/format-phone-display.ts`**
- Port from `@/lib/phone/format-phone-display.ts`

**`packages/phone-input/src/components/ManagedPhoneInput.tsx`**
- Port from manager-app `@/features/phone-input/components/ManagedPhoneInput.tsx`
- Replace `PhoneInput` from `@/components/primitives` → `@beyo/ui`
- Replace all `@/lib/phone/*` → `../lib/*`
- Replace `@/hooks/use-preload-surface` → `@beyo/hooks`
- Replace `@/providers/SurfaceProvider` → `@beyo/ui` (`useSurfaceStore`)
- Replace `preloadPhoneCountryPickerSurface` → `../surfaces`
- Replace `CountryIso2`, `ManagedPhoneInputChangeMeta` → `../types`

**`packages/phone-input/src/surface-ids.ts`**
- `PHONE_COUNTRY_PICKER_SURFACE_ID = "phone-country-picker"`
- `PhoneCountryPickerSurfaceProps` type

**`packages/phone-input/src/pages/PhoneCountryPickerSheetPage.tsx`** (internal — not exported)
- Port from manager-app `@/features/phone-input/pages/PhoneCountryPickerSheetPage.tsx`
- Replace `@/hooks/*` → `@beyo/hooks`
- Replace `@/lib/phone/*` → `../lib/*`

**`packages/phone-input/src/surfaces.ts`**
- `phoneInputSurfaces: SurfaceRegistrations`
- `preloadPhoneCountryPickerSurface`

**`packages/phone-input/src/index.ts`**
```ts
export type { CountryIso2, ManagedPhoneInputChangeMeta, PhoneCountry } from './types';
export { ManagedPhoneInput } from './components/ManagedPhoneInput';
export { PHONE_COUNTRY_PICKER_SURFACE_ID } from './surface-ids';
export { phoneInputSurfaces, preloadPhoneCountryPickerSurface } from './surfaces';
// lib utilities (for apps that need raw phone manipulation)
export { normalizePhone } from './lib/normalize-phone';
export { parseE164 } from './lib/parse-e164';
export { formatPhoneDisplay } from './lib/format-phone-display';
```

---

## File list summary

### `@beyo/images` — 3 new files

| # | Path |
|---|------|
| 1 | `packages/images/src/api/create-images-from-url.ts` |
| 2 | `packages/images/src/actions/use-create-images-from-url.ts` |
| 3 | `packages/images/src/types/create-from-url.ts` |
| — | `packages/images/src/index.ts` (modify: add 2 exports) |

### `@beyo/item-issues` — 0 new files, 2 type additions

| — | `packages/item-issues/src/types.ts` (modify: add `ItemIssueFieldEntrySchema`, `ItemIssuesFieldsSchema`) |
| — | `packages/item-issues/src/index.ts` (modify: export both) |

### `@beyo/item-categories` — 9 new files

| # | Path |
|---|------|
| 4 | `packages/item-categories/src/types/picker.ts` |
| 5 | `packages/item-categories/src/api/item-category-picker-keys.ts` |
| 6 | `packages/item-categories/src/api/fetch-item-categories-picker.ts` |
| 7 | `packages/item-categories/src/api/use-item-categories-picker-query.ts` |
| 8 | `packages/item-categories/src/store/item-category-selection.store.ts` |
| 9 | `packages/item-categories/src/flows/use-item-category-picker.flow.ts` |
| 10 | `packages/item-categories/src/components/ItemCategorySelectionField.tsx` |
| 11 | `packages/item-categories/src/surface-ids.ts` |
| 12 | `packages/item-categories/src/pages/ItemCategoryPickerSheetPage.tsx` |
| 13 | `packages/item-categories/src/surfaces.ts` |
| — | `packages/item-categories/src/index.ts` (modify: add exports) |
| — | `packages/item-categories/package.json` (modify: add peer deps) |

### `@beyo/items` — 9 new files

| # | Path |
|---|------|
| 14 | `packages/items/package.json` |
| 15 | `packages/items/src/types.ts` |
| 16 | `packages/items/src/api/item-lookup-keys.ts` |
| 17 | `packages/items/src/api/fetch-item-lookup.ts` |
| 18 | `packages/items/src/api/use-item-lookup-query.ts` |
| 19 | `packages/items/src/lib/use-debounce.ts` |
| 20 | `packages/items/src/components/fields/ItemIdentityField.tsx` |
| 21 | `packages/items/src/components/fields/ItemPositionField.tsx` |
| 22 | `packages/items/src/components/fields/ItemQuantityField.tsx` |
| 23 | `packages/items/src/index.ts` |

### `@beyo/upholstery` — 10 new files

| # | Path |
|---|------|
| 24 | `packages/upholstery/src/types.ts` (extend) |
| 25 | `packages/upholstery/src/api/upholstery-picker-keys.ts` |
| 26 | `packages/upholstery/src/api/fetch-upholstery-picker.ts` |
| 27 | `packages/upholstery/src/api/fetch-upholstery-picker-option.ts` |
| 28 | `packages/upholstery/src/api/use-upholstery-picker-query.ts` |
| 29 | `packages/upholstery/src/api/use-upholstery-picker-option-query.ts` |
| 30 | `packages/upholstery/src/components/fields/ItemUpholsteryField.tsx` |
| 31 | `packages/upholstery/src/components/fields/ItemUpholsteryAmountField.tsx` |
| 32 | `packages/upholstery/src/surface-ids.ts` |
| 33 | `packages/upholstery/src/pages/UpholsteryPickerSlidePage.tsx` |
| 34 | `packages/upholstery/src/surfaces.ts` |
| — | `packages/upholstery/src/index.ts` (modify: add exports) |
| — | `packages/upholstery/package.json` (modify: add peer deps) |

### `@beyo/tasks` — 7 new files

| # | Path |
|---|------|
| 35 | `packages/tasks/src/api/create-task.ts` |
| 36 | `packages/tasks/src/actions/use-create-task.ts` |
| 37 | `packages/tasks/src/types/form-fields.ts` |
| 38 | `packages/tasks/src/components/fields/TaskAdditionalDetailsField.tsx` |
| 39 | `packages/tasks/src/components/fields/TaskReadyByDateField.tsx` |
| 40 | `packages/tasks/src/components/fields/TaskDeliveryDateField.tsx` |
| 41 | `packages/tasks/src/components/fields/TaskFulfillmentMethodField.tsx` |
| 42 | `packages/tasks/src/components/fields/TaskReturnSourceField.tsx` |
| — | `packages/tasks/src/index.ts` (modify: add exports) |
| — | `packages/tasks/package.json` (modify: add peer deps) |

### `@beyo/customers` — 8 new files

| # | Path |
|---|------|
| 43 | `packages/customers/package.json` |
| 44 | `packages/customers/src/types.ts` |
| 45 | `packages/customers/src/components/fields/CustomerDisplayNameField.tsx` |
| 46 | `packages/customers/src/components/fields/CustomerEmailField.tsx` |
| 47 | `packages/customers/src/components/fields/CustomerTypeField.tsx` |
| 48 | `packages/customers/src/components/fields/CustomerPhoneField.tsx` |
| 49 | `packages/customers/src/components/fields/CustomerAddressFieldGroup.tsx` |
| 50 | `packages/customers/src/index.ts` |

### `@beyo/working-sections` — 12 new files

| # | Path |
|---|------|
| 51 | `packages/working-sections/package.json` |
| 52 | `packages/working-sections/src/types.ts` |
| 53 | `packages/working-sections/src/api/working-section-keys.ts` |
| 54 | `packages/working-sections/src/api/fetch-working-sections-picker.ts` |
| 55 | `packages/working-sections/src/api/use-working-sections-picker-query.ts` |
| 56 | `packages/working-sections/src/store/working-section-selection.store.ts` |
| 57 | `packages/working-sections/src/flows/use-working-section-picker.flow.ts` |
| 58 | `packages/working-sections/src/lib/working-section-shortcuts.ts` |
| 59 | `packages/working-sections/src/components/fields/WorkingSectionPickerField.tsx` |
| 60 | `packages/working-sections/src/surface-ids.ts` |
| 61 | `packages/working-sections/src/pages/WorkingSectionWorkerPickerSheetPage.tsx` |
| 62 | `packages/working-sections/src/surfaces.ts` |
| 63 | `packages/working-sections/src/index.ts` |

### `@beyo/phone-input` — 12 new files

| # | Path |
|---|------|
| 64 | `packages/phone-input/package.json` |
| 65 | `packages/phone-input/src/types.ts` |
| 66 | `packages/phone-input/src/lib/countries.ts` |
| 67 | `packages/phone-input/src/lib/phone-input-state.ts` |
| 68 | `packages/phone-input/src/lib/storage.ts` |
| 69 | `packages/phone-input/src/lib/normalize-phone.ts` |
| 70 | `packages/phone-input/src/lib/parse-e164.ts` |
| 71 | `packages/phone-input/src/lib/format-phone-display.ts` |
| 72 | `packages/phone-input/src/components/ManagedPhoneInput.tsx` |
| 73 | `packages/phone-input/src/surface-ids.ts` |
| 74 | `packages/phone-input/src/pages/PhoneCountryPickerSheetPage.tsx` |
| 75 | `packages/phone-input/src/surfaces.ts` |
| 76 | `packages/phone-input/src/index.ts` |

**Total: 73 new files + ~10 modified (index.ts/package.json additions in existing packages). Manager app: 0 changes.**

---

## What Plan B (`@beyo/task-creation`) imports after this plan

Once this plan is complete, Plan B replaces every `@/features/*` import in form content components with:

| Was | Now |
|---|---|
| `@/features/items` (form fields) | `@beyo/items`, `@beyo/item-categories`, `@beyo/upholstery` |
| `@/features/tasks` (form fields, useCreateTask) | `@beyo/tasks` |
| `@/features/customers` | `@beyo/customers` |
| `@/features/working-sections` | `@beyo/working-sections` |
| `@/features/phone-input` | `@beyo/phone-input` (via `@beyo/customers`) |
| `@/features/items/subfeatures/item_images` | `@beyo/images` |
| `@/components/primitives` | `@beyo/ui` |
| `@/hooks/*` | `@beyo/hooks` |
| `@/lib/utils`, `@/lib/animation` | `@beyo/lib` |

Plan B then becomes ~20 files instead of ~65.

---

## Risks and mitigations

- **Risk:** `@beyo/item-categories` currently has no `@beyo/hooks` peer dep. Adding form fields requires it.
  **Mitigation:** Add to `package.json` peer deps as part of this plan.

- **Risk:** `UpholsteryPickerSlidePage` has complex sub-components. The inline implementation may need multiple private sub-files.
  **Mitigation:** Allow sub-files in `packages/upholstery/src/pages/` as private — they are not exported from `index.ts`.

- **Risk:** Phone country data (`countries.ts`) may be large. Ensure it's tree-shakeable (export named functions, not a single default object).
  **Mitigation:** Already the pattern in `@/lib/phone/countries.ts` — named exports only.

- **Risk:** `useCreateTask` in `@beyo/tasks` omits the manager-app's complex cache invalidation. The manager-app must continue using its own `useCreateTask` for now.
  **Mitigation:** No changes to manager-app. The package `useCreateTask` is designed for workers-app usage where task list cache is simple.

---

## Validation plan

- `npm run typecheck` (or `tsc --noEmit`): zero errors across all new/modified packages and both apps
- Per package: `export * from '@beyo/<package-name>'` in a throwaway file to confirm index.ts exports resolve without circular deps
- Manager-app: full build passes without any changes

---

## Review log

*(empty — awaiting first review)*

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
