# PLAN_task_creation_package_abstraction_20260624

## Metadata

- Plan ID: `PLAN_task_creation_package_abstraction_20260624`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-24T00:00:00Z`
- Last updated at (UTC): `2026-06-24T10:34:10Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/abstraction_of_tasks.txt`

## Goal and intent

- **Goal:** Create a self-contained `@beyo/task-creation` package that bundles all form content components, form field components, types, provider, API hooks, picker surfaces, and slide pages needed for task creation — then wire the `InternalFormContent` into the workers-app via the existing "+ New Internal Task" button in `WoodWorkerHomeView`.
- **Business/user intent:** Workers need to be able to create internal tasks from their home screen without being redirected to the manager app. The package abstraction is the prerequisite.
- **Non-goals:**
  - The manager app will NOT consume the new package yet (it keeps `@/features/task-creation` unchanged).
  - No changes to the Return or Pre-Order flow in the workers-app (package includes them, but workers-app only wires the Internal surface).
  - This plan does not refactor the manager app in any way.

## Scope

- **In scope:**
  - New package `packages/task-creation/` (all files listed below)
  - Workers-app: `surface-registry.ts` and `WoodWorkerHomeView.tsx` (2 files)
- **Out of scope:**
  - Any changes to manager-app source files
  - Moving manager-app features to packages (manager keeps its own implementations in parallel)
  - E2E Playwright tests (can be added in a follow-up)
- **Assumptions:**
  - All `@beyo/ui`, `@beyo/hooks`, `@beyo/lib`, `@beyo/api-client`, `@beyo/scanner`, `@beyo/images` peer packages are already available.
  - Workers-app already has a SurfaceProvider that accepts `SurfaceRegistrations` (confirmed in `src/providers/SurfaceProvider.tsx`).
  - The workers-app authentication flow and API client are already configured (the package's `apiClient` will use the same cookie-based auth as other package API calls).

## Clarifications required

- [ ] Should `InternalFormContent` in the package support the full upholstery seat flow (upholstery picker + amount field)? — The picker surface is bundled as a basic browse-by-category slide. Confirm this is acceptable for workers-app v1 or if the upholstery picker should be disabled/hidden.
- [ ] Worker assignment in `InternalFormContent`: should the working-section assignment step show all available sections or only those assigned to the logged-in worker? — The package's `useWorkingSectionPickerFlow` fetches all sections. Confirm this is correct for workers-app context.

## Acceptance criteria

1. `npm run typecheck` (or equivalent for the monorepo) passes with zero errors across the new package and both apps.
2. Workers-app: tapping "+ New Internal Task" opens the internal task creation slide with all 3 steps (Item, Assignment, Task).
3. Workers-app: filling out all required fields and submitting the form creates a task (verified by network request returning 200 with `ok: true`).
4. Manager-app: all existing task-creation flows continue to work exactly as before (no regressions).
5. Package: `@beyo/task-creation/src/index.ts` exports all public-facing identifiers needed for workers-app integration.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo package/app boundary rules
- `architecture/02_types.md`: Zod schema conventions
- `architecture/04_api_client.md`: `apiClient` usage, `ApiEnvelopeSchema` from `@beyo/lib`
- `architecture/05_server_state.md`: query hook patterns
- `architecture/08_hooks.md`: mutation/action hook patterns, cache invalidation
- `architecture/09_forms.md`: `useForm`, `zodResolver`, `FormProvider`, field wiring
- `architecture/10_pages.md`: slide page shell pattern, `SurfaceHeaderContext`
- `architecture/13_errors.md`: error propagation
- `architecture/15_feature_structure.md`: layer ordering within the package
- `architecture/16_feature_workflow.md`: build order (types → keys → API → actions → flows → components → pages → surfaces → index)
- `architecture/23_providers.md`: context shell pattern
- `architecture/24_dto.md`: view model transformers
- `architecture/28_surfaces.md`: surface types and `SurfaceRegistrations`
- `architecture/30_dynamic_loading.md`: `lazyWithPreload` pattern for surface lazy loading
- `architecture/35_shared_packages.md §13`: surface opener injection for pickers that cross package boundaries

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface types are `slide`, `sheet`, `modal` — `drawer` excluded.
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` utility path is `@beyo/ui`, `usePreloadSurface` hook is `@beyo/hooks`.

### File read intent — pattern vs. relational

Permitted reads:
- `packages/task-creation/src/types.ts` — to verify actual field names and Zod schemas once written
- `packages/item-issues/src/api/create-item-issues.ts` — to confirm `ApiEnvelopeSchema` usage pattern from `@beyo/lib`
- `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts` — existing structure to merge into
- `apps/workers-app/ManagerBeyo-app-workers/src/features/home/components/variants/WoodWorkerHomeView.tsx` — button wiring point

### Skill selection

- Primary skill: `skills/codex` — full file writing, multi-file coordination
- Trigger terms: `new package`, `form abstraction`, `task creation`

---

## Domain schemas consulted

- `apps/managers-app/.../features/task-creation/types.ts` → `InternalFormSchema`, `ReturnFormSchema`, `PreOrderFormSchema`, field structures: `item`, `item_upholstery`, `item_issues`, `customer`, `return_source`, `fulfillment_method`, `working_section_assignments`, `ready_by_at`, `additional_details`
- `apps/managers-app/.../features/items/types.ts` → `ItemDetailsFieldsSchema`, `ItemIssuesFieldsSchema`, `ItemUpholsteryFieldsSchema`, `ItemCategoryPickerOptionSchema`, `ItemLookupResultSchema`, `ITEM_CURRENCY`, `ITEM_POSITION`
- `apps/managers-app/.../features/tasks/types.ts` → `TaskAdditionalDetailsFieldsSchema`, `TASK_FULFILLMENT_METHOD`, `TASK_RETURN_SOURCE`
- `apps/managers-app/.../features/customers/types.ts` → `CustomerFieldsSchema`
- `apps/managers-app/.../features/working-sections/types.ts` → `WorkingSectionPickerFieldsSchema`, `WorkingSectionAssignment`, `WorkingSectionOption`, `WorkingSectionMember`, `WorkingSectionItemCategory`

## Selected contracts

- `01_architecture.md`: boundary rule — packages import from `@beyo/*` peer packages only, never from app internals
- `05_server_state.md`: query hook structure for `fetchItemCategoriesPicker`, `fetchWorkingSectionsPicker`, `fetchUpholsteryPickerOption`
- `08_hooks.md`: `useCreateTask` action hook — optimistic insert omitted for simplicity in package v1; invalidate affected query keys on settle
- `09_forms.md`: `useForm` + `zodResolver` + `FormProvider` wiring in form content components
- `28_surfaces.md` + local: slide surfaces for 3 creation pages + 4 picker sub-surfaces bundled into `taskCreationSurfaces`
- `30_dynamic_loading.md` + local: `lazyWithPreload` from `@beyo/ui` for all surface lazy components
- `35_shared_packages.md §13`: upholstery picker injection — `ItemUpholsteryField` in package accepts `onOpenPicker` and `selectedLabel`/`selectedImageUrl` props; `InternalFormContent` includes a built-in surface opener via `useSurface`

---

## Package dependency graph (new package)

```
@beyo/task-creation
  peerDependencies:
    @beyo/api-client   — apiClient
    @beyo/hooks        — useSurface, useStagedForm, usePreloadSurface, useSurfaceHeader, useSurfaceProps
    @beyo/lib          — generateClientId, cn, ApiEnvelopeSchema, tabVariants, transitions
    @beyo/ui           — StagedForm, StagedFormStep, StagedFormNavigation, ContentCard,
                         FieldLabelRow, FieldErrorPill, WorkingSectionShortcutBar,
                         useScrollVisibilityContext, SurfaceHeaderContext, useSurfaceStore,
                         lazyWithPreload, usePrefetchOnCondition, BoxPicker, BoxSlidePicker,
                         NumberInput, TextInput, TextArea, ImagePlaceholder, StatePill,
                         DateFieldTrigger, formatDateDisplay, preloadCalendarSinglePickerSurface,
                         preloadCalendarRangePickerSurface, PhoneInput, SurfaceRegistrations
    @beyo/scanner      — SCANNER_SESSION_ID, SCANNER_SLIDE_SURFACE_ID, useCameraPrewarm,
                         ScannerSlideSurfaceProps, ScanFormat, ScannerSlideRouteEntry
    @beyo/images       — EntityImagesProvider, ImagePreviewGrid
    @tanstack/react-query
    react
    react-hook-form
    @hookform/resolvers/zod
    zod
    framer-motion
    lucide-react
    class-variance-authority
    zustand
```

---

## Implementation plan

Build order follows `16_feature_workflow.md`: Types → API Keys → API Functions → Query Hooks → Action Hook → Stores → Flows → Provider → Form Field Components → Form Content Components → Pages → Surfaces → index.ts → Workers-app wiring.

### Step 1 — Package scaffold

**File:** `packages/task-creation/package.json`

```json
{
  "name": "@beyo/task-creation",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "@beyo/api-client": "*",
    "@beyo/hooks": "*",
    "@beyo/images": "*",
    "@beyo/lib": "*",
    "@beyo/scanner": "*",
    "@beyo/ui": "*",
    "@hookform/resolvers": ">=3.0.0",
    "@tanstack/react-query": ">=5.0.0",
    "class-variance-authority": ">=0.7.0",
    "framer-motion": ">=12.0.0",
    "lucide-react": ">=1.0.0",
    "react": ">=19.0.0",
    "react-hook-form": ">=7.0.0",
    "zod": ">=4.0.0",
    "zustand": ">=5.0.0"
  }
}
```

Register in the monorepo workspace config (wherever `packages/item-issues` is listed — typically `pnpm-workspace.yaml` or root `package.json#workspaces`).

---

### Step 2 — Types

**File:** `packages/task-creation/src/types.ts`

Port directly from `apps/managers-app/.../features/task-creation/types.ts`, replacing all `@/features/*` imports with inline Zod definitions (copy the schema shapes verbatim). All domain field schemas are owned by this file:

```
CustomerFieldsSchema           (z.object: display_name, customer_type, primary_email, primary_phone_number, address)
ItemDetailsFieldsSchema        (z.object: designer, article_number, sku, quantity, item_position, item_currency, item_category_id, major_category)
ItemIssuesFieldsSchema         (z.object: item_issues array of {issue_id, issue_severity_id})
ItemUpholsteryFieldsSchema     (z.object: upholstery_client_id, upholstery_amount_meters)
WorkingSectionPickerFieldsSchema (z.object: working_section_assignments array of {working_section_id, assigned_worker_id})
TaskAdditionalDetailsFieldsSchema (z.object: additional_details string)
TASK_FULFILLMENT_METHOD        as const array
TASK_RETURN_SOURCE             as const array
ITEM_CURRENCY                  as const array
ITEM_POSITION                  as const array (derived from items types)

ReturnFormSchema               (same as manager-app)
PreOrderFormSchema = ReturnFormSchema
InternalFormSchema             (same as manager-app, with superRefine)

Export types:
  ReturnFormValues, PreOrderFormValues, InternalFormValues
  TASK_CREATION_FORM_TYPE, TaskCreationFormType
  WorkingSectionAssignment      (type: {working_section_id: string, assigned_worker_id: string | null})
  WorkingSectionMember          (type: {client_id, username, profile_picture})
  WorkingSectionOption          (type: picker option with sections + item_categories + members)
  WorkingSectionPickerOption    (type: same as WorkingSectionOption)
  ItemCategoryPickerOption      (type: {client_id, name, major_category, image_url, ...})
  ItemLookupResult              (type: fields from lookup API)
  ItemUpholsteryRequirementState as const (for statepill variant on upholstery field)
  UpholsteryPickerOption        (type: {client_id, name, code, image_url, amount_meters})
  DateOnlySchema                (re-export z.string().regex for YYYY-MM-DD)
```

---

### Step 3 — Query keys

**Files:**
- `packages/task-creation/src/api/item-category-picker-keys.ts` → port from `@/features/items/api/item-category-picker-keys.ts`; keep same shape, remove `ListItemCategoriesPickerParams` app import (inline type)
- `packages/task-creation/src/api/working-section-keys.ts` → port from `@/features/working-sections/api/working-section-keys.ts`
- `packages/task-creation/src/api/upholstery-picker-keys.ts` → new; keys for upholstery picker queries: `all`, `lists()`, `list(params)`, `option(clientId)`

---

### Step 4 — API functions

**Files (port from manager-app, replacing `@/lib/api-client` with `@beyo/api-client` and `@/types/api.ApiEnvelopeSchema` with `ApiEnvelopeSchema` from `@beyo/lib`):**

- `packages/task-creation/src/api/create-task.ts`
  - `POST /api/v1/tasks`, returns `{client_id, task_scalar_id}`
  - Uses `ApiEnvelopeSchema` + `apiClient.put`

- `packages/task-creation/src/api/fetch-item-categories-picker.ts`
  - Port from `@/features/items/api/fetch-item-categories-picker.ts`
  - Returns `{itemCategories: ItemCategoryPickerOption[], itemCategoriesPagination}`
  - Uses `ItemCategoryPickerOptionSchema` from `../types`

- `packages/task-creation/src/api/fetch-working-sections-picker.ts`
  - Port from `@/features/working-sections/api/fetch-working-sections-picker.ts`
  - Returns `{workingSections: WorkingSectionPickerOption[]}`

- `packages/task-creation/src/api/fetch-upholstery-picker.ts`
  - Port from `@/features/upholstery/api/fetch-upholstery-picker.ts`
  - `GET /api/v1/upholstery/picker` with optional `{category_id?, search?, ...}` params
  - Returns `{upholsteries: UpholsteryPickerOption[], ...pagination}`

- `packages/task-creation/src/api/fetch-upholstery-picker-option.ts`
  - Port from `@/features/upholstery/api/fetch-upholstery-picker-option.ts`
  - `GET /api/v1/upholstery/{client_id}/picker-option`
  - Returns `UpholsteryPickerOption | null`

- `packages/task-creation/src/api/fetch-item-lookup.ts` (needed by ItemIdentityField)
  - Port from `@/features/items/api/fetch-item-lookup.ts`
  - `GET /api/v1/items/lookup?article_number=...&sku=...`
  - Returns `{items: ItemLookupResult[]}`

- `packages/task-creation/src/api/item-lookup-keys.ts`
  - Query keys for item lookup

- `packages/task-creation/src/api/phone-country-keys.ts`
  - Query keys for phone country picker

- `packages/task-creation/src/api/fetch-phone-countries.ts`
  - Port from `@/features/phone-input` API (fetch country list for phone prefix selector)

---

### Step 5 — Query hooks

**Files:**

- `packages/task-creation/src/api/use-item-categories-picker-query.ts`
  - `useItemCategoriesPickerQuery(params?, options?)` — wraps `fetchItemCategoriesPicker`

- `packages/task-creation/src/api/use-working-sections-picker-query.ts`
  - `useWorkingSectionsPickerQuery(options?)` — wraps `fetchWorkingSectionsPicker`

- `packages/task-creation/src/api/use-upholstery-picker-option-query.ts`
  - `useUpholsteryPickerOptionQuery(clientId, options?)` — wraps `fetchUpholsteryPickerOption`

- `packages/task-creation/src/api/use-item-lookup-query.ts`
  - `useItemLookupQuery(params, options?)` — debounce handled at call site

- `packages/task-creation/src/api/use-phone-countries-query.ts`
  - `usePhoneCountriesQuery(options?)` — fetches country list for phone prefix selector

---

### Step 6 — Action hook

**File:** `packages/task-creation/src/api/use-create-task.ts`

Port `useCreateTask` from `apps/managers-app/.../features/tasks/actions/use-create-task.ts` with these differences:

- **No optimistic update** for the manager-app's task list infinite queries (those are manager-specific).
- On `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['tasks'] })` — broad invalidation sufficient for workers-app. Later, worker-specific keys can be passed in via config if needed.
- On `onError`: no rollback needed (no optimistic insert).
- Return `mutation` directly; expose `mutateAsync`.

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

---

### Step 7 — Zustand stores

**Files:**

- `packages/task-creation/src/store/item-category-selection.store.ts`
  - Port exactly from manager-app: `create<ItemCategorySelectionState>()` with `options`, `setOptions`, `clear`
  - Depends on `ItemCategoryPickerOption` from `../types`

- `packages/task-creation/src/store/working-section-selection.store.ts`
  - Port exactly from manager-app: `create<WorkingSectionSelectionState>()` with `options`, `setOptions`, `clear`
  - Depends on `WorkingSectionOption` from `../types`

---

### Step 8 — Flows

**Files:**

- `packages/task-creation/src/flows/use-item-category-picker.flow.ts`
  - Port from manager-app `useItemCategoryPickerFlow`
  - Imports: `useItemCategoriesPickerQuery` (step 5), `useItemCategorySelectionStore` (step 7)
  - Returns: `{ options: ItemCategoryPickerOption[], byMajorCategory: Record<string, ItemCategoryPickerOption[]>, isPending: boolean }`

- `packages/task-creation/src/flows/use-working-section-picker.flow.ts`
  - Port from manager-app `useWorkingSectionPickerFlow`
  - Imports: `useWorkingSectionsPickerQuery` (step 5), `useWorkingSectionSelectionStore` (step 7)
  - Returns: `{ options: WorkingSectionPickerOption[], isLoading: boolean }`

---

### Step 9 — Provider

**File:** `packages/task-creation/src/providers/TaskCreationFormProvider.tsx`

Port directly from manager-app, replacing `generateClientId` import from `@/lib/...` with `@beyo/lib`. No other changes.

---

### Step 10 — Lib utilities

**Files:**

- `packages/task-creation/src/lib/normalize-task-form-payload.ts`
  - Port from manager-app. Replace types with `../types` imports.
  - Exports: `normalizeInternalFormPayload`, `normalizeReturnFormPayload`

- `packages/task-creation/src/lib/item-lookup-prefill.ts`
  - Port from manager-app. Replace `itemCategoryPickerKeys` import with `../api/item-category-picker-keys` (package level).
  - Exports: `selectPurchaseApiLookupResult`, `selectInternalLookupResult`, `findCachedItemCategoryOption`, `createLookupResultSignature`, `buildCreateImagesFromUrlBatch`

- `packages/task-creation/src/lib/prefetch-task-creation-form-data.ts`
  - Port from manager-app. Replace deep API imports with package-level paths.

- `packages/task-creation/src/lib/working-section-shortcuts.ts`
  - Port `DEFAULT_WORKING_SECTION_SHORTCUTS`, `resolveWorkingSectionShortcutsByMajorCategory`, `WorkingSectionShortcutConfig`, `WorkingSectionShortcutCandidate` from `@/features/working-sections/constants/working-section-shortcuts`.

- `packages/task-creation/src/lib/quick-select-options.ts`
  - Port `TASK_READY_BY_QUICK_SELECT_OPTIONS` from manager-app task fields helper.

---

### Step 11 — Surface IDs

**File:** `packages/task-creation/src/surface-ids.ts`

```ts
// Task creation surfaces
export const TASK_CREATION_RETURN_SURFACE_ID = "task-creation-return-slide";
export const TASK_CREATION_PRE_ORDER_SURFACE_ID = "task-creation-pre-order-slide";
export const TASK_CREATION_INTERNAL_SURFACE_ID = "task-creation-internal-slide";

// Picker sub-surfaces (bundled in taskCreationSurfaces)
export const TC_ITEM_CATEGORY_PICKER_SURFACE_ID = "tc-item-category-picker";
export const TC_WORKING_SECTION_WORKER_PICKER_SURFACE_ID = "tc-working-section-worker-picker";
export const TC_UPHOLSTERY_PICKER_SURFACE_ID = "tc-upholstery-picker";
export const TC_PHONE_COUNTRY_PICKER_SURFACE_ID = "tc-phone-country-picker";
// Scanner: reuse @beyo/scanner's SCANNER_SLIDE_SURFACE_ID (already registered in workers-app)

// Surface prop types
export type ItemCategoryPickerSurfaceProps = { ... };
export type WorkingSectionWorkerPickerSurfaceProps = { ... };
export type UpholsteryPickerSurfaceProps = { ... };
export type PhoneCountryPickerSurfaceProps = { ... };
```

> **Note on scanner surface:** The workers-app's task step surfaces already register the scanner slide (via `@beyo/scanner`). The package's `InternalFormContent` calls `surface.open(SCANNER_SLIDE_SURFACE_ID, ...)` from `@beyo/scanner`. No duplicate registration needed — the workers-app must ensure `SCANNER_SLIDE_SURFACE_ID` is registered; instruct this in the integration step.

---

### Step 12 — Form field components

All form field components import only from `@beyo/*` peer packages and `../types`, `../flows/*`, `../surface-ids`. No app-level imports allowed.

#### Items fields — `packages/task-creation/src/components/fields/items/`

**`ItemCategorySelectionField.tsx`**
- Port from `apps/managers-app/.../features/items/components/fields/ItemCategorySelectionField.tsx`
- Replace `@/components/primitives` → `@beyo/ui` (`BoxPicker`, `ImagePlaceholder`)
- Replace `@/features/items/flows/use-item-category-picker.flow` → `../../../flows/use-item-category-picker.flow`
- Replace `@/hooks/use-preload-surface` → `@beyo/hooks`
- Replace `@/providers/SurfaceProvider` → `@beyo/ui` (`useSurfaceStore`)
- Replace picker surface ID → `TC_ITEM_CATEGORY_PICKER_SURFACE_ID` from `../../../surface-ids`
- Replace `preloadItemCategoryPickerSurface` reference → import from `../../../surfaces` (defined in step 13)

**`ItemIdentityField.tsx`**
- Port from manager-app
- Replace all `@/components/primitives` → `@beyo/ui` (`BoxSlidePicker`, `FieldErrorPill`, `TextInput`)
- Replace `@/features/items/api/use-item-lookup-query` → `../../../api/use-item-lookup-query`
- Replace `@/hooks/use-debounce` → include a local `useDebounce` in `packages/task-creation/src/lib/use-debounce.ts`
- Replace `@/lib/animation` → `@beyo/lib` (`transitions`)
- Types from `../../../types`

**`ItemPositionField.tsx`** — trivial port; `TextInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`ItemQuantityField.tsx`** — trivial port; `NumberInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`ItemUpholsteryAmountField.tsx`** — trivial port; `NumberInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`ItemUpholsteryField.tsx`**
- Port from manager-app; replace all `@/features/upholstery/*` dependencies:
  - Replace `useUpholsteryPickerOptionQuery` → `../../../api/use-upholstery-picker-option-query`
  - Replace `UPHOLSTERY_PICKER_SLIDE_ID` → `TC_UPHOLSTERY_PICKER_SURFACE_ID`
  - Replace `upholsteryKeys` → `../../../api/upholstery-picker-keys`
  - Replace `@/hooks/use-surface` → `@beyo/hooks`
  - Replace `StatePill` and `ImagePlaceholder` → `@beyo/ui`
  - Replace `cn` → `@beyo/lib`
  - Replace `ItemUpholsteryRequirementState` → `../../../types`

#### Tasks fields — `packages/task-creation/src/components/fields/tasks/`

**`TaskAdditionalDetailsField.tsx`** — trivial port; `TextArea`, `FieldErrorPill` from `@beyo/ui`

**`TaskReadyByDateField.tsx`**
- Port from manager-app
- Replace `@/components/primitives/date` → `@beyo/ui` (`DateFieldTrigger`, `formatDateDisplay`, `preloadCalendarSinglePickerSurface`)
- Replace `@/providers/SurfaceProvider` → `@beyo/ui` (`useSurfaceStore`)
- Replace `@/hooks/use-preload-surface` → `@beyo/hooks`
- Replace `TASK_READY_BY_QUICK_SELECT_OPTIONS` → `../../../lib/quick-select-options`

**`TaskDeliveryDateField.tsx`**
- Replace `@/components/primitives/date` → `@beyo/ui` (range picker variant)

**`TaskFulfillmentMethodField.tsx`** — port; `BoxPicker`, `FieldLabelRow` from `@beyo/ui`, constants from `../../../types`

**`TaskReturnSourceField.tsx`** — port; same pattern

#### Customers fields — `packages/task-creation/src/components/fields/customers/`

**`CustomerDisplayNameField.tsx`** — port; `TextInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

**`CustomerEmailField.tsx`** — port; `TextInput` from `@beyo/ui`

**`CustomerTypeField.tsx`** — port; `BoxPicker` from `@beyo/ui`, customer type constants from `../../../types`

**`CustomerPhoneField.tsx`**
- Port from manager-app
- Replace `ManagedPhoneInput` from `@/features/phone-input` → use `PhoneInput` from `@beyo/ui` wired with `useSurface().open(TC_PHONE_COUNTRY_PICKER_SURFACE_ID, ...)`
- The package owns the phone country picker surface (step 11/13)

**`CustomerAddressFieldGroup.tsx`** — port; `TextInput`, `FieldLabelRow`, `FieldErrorPill` from `@beyo/ui`

#### Working sections field — `packages/task-creation/src/components/fields/working-sections/`

**`WorkingSectionPickerField.tsx`**
- Port from manager-app
- Replace `@/features/working-sections/flows/...` → `../../../flows/use-working-section-picker.flow`
- Replace `@/features/working-sections/surfaces` → `TC_WORKING_SECTION_WORKER_PICKER_SURFACE_ID` from `../../../surface-ids`
- Replace all `@beyo/ui` equivalents for scroll, primitives
- Replace `@/hooks/use-surface` → `@beyo/hooks`

---

### Step 13 — Picker pages and surfaces

**Pages (internal — not exported from index.ts):**

- `packages/task-creation/src/pages/ItemCategoryPickerSheetPage.tsx`
  - Port from manager-app `@/features/items/pages/ItemCategoryPickerSheetPage.tsx`
  - Replace `@/hooks/use-surface-header` → `@beyo/hooks`
  - Replace `@/hooks/use-surface-props` → `@beyo/hooks`
  - Replace `BoxPicker` → `@beyo/ui`

- `packages/task-creation/src/pages/WorkingSectionWorkerPickerSheetPage.tsx`
  - Port from `@/features/working-sections/pages/WorkingSectionWorkerPickerSheetPage.tsx`
  - Replace `@/lib/utils` → `@beyo/lib` (`cn`)
  - Replace hooks → `@beyo/hooks`
  - Prop types from `../surface-ids`

- `packages/task-creation/src/pages/UpholsteryPickerSlidePage.tsx`
  - Port from manager-app `@/features/upholstery/pages/UpholsteryPickerSlidePage.tsx`
  - Replace all `@/features/upholstery/components/*` → implement inline or as sub-components in the same file
    - `UpholsteryCard` → simple card component using `@beyo/ui` primitives (image + name + code)
    - `UpholsteryPickerHeader` → search input + category filter using `@beyo/ui` primitives
  - Replace `useUpholsteryPickerController` → implement inline using `useUpholsteryPickerQuery` / pagination
  - Replace `@/hooks/*` → `@beyo/hooks`
  - Replace `PullToRefresh`, `useScrollVisibility` → `@beyo/ui`
  - Replace `@/lib/animation` → `@beyo/lib` (`transitions`)

- `packages/task-creation/src/pages/PhoneCountryPickerSheetPage.tsx`
  - Port from manager-app `@/features/phone-input/pages/PhoneCountryPickerSheetPage.tsx`
  - Replace hooks → `@beyo/hooks`

**Surfaces file:** `packages/task-creation/src/surfaces.ts`

```ts
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import { SCANNER_SLIDE_SURFACE_ID } from "@beyo/scanner";
import {
  TASK_CREATION_INTERNAL_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
  TASK_CREATION_RETURN_SURFACE_ID,
  TC_ITEM_CATEGORY_PICKER_SURFACE_ID,
  TC_UPHOLSTERY_PICKER_SURFACE_ID,
  TC_WORKING_SECTION_WORKER_PICKER_SURFACE_ID,
  TC_PHONE_COUNTRY_PICKER_SURFACE_ID,
} from "./surface-ids";

// ── Lazy loaders ────────────────────────────────────────────
function loadInternalTaskSlidePage() { return import("./pages/InternalTaskSlidePage").then(m => ({ default: m.InternalTaskSlidePage })); }
function loadReturnTaskSlidePage() { ... }
function loadPreOrderTaskSlidePage() { ... }
function loadItemCategoryPickerSheetPage() { ... }
function loadWorkingSectionWorkerPickerSheetPage() { ... }
function loadUpholsteryPickerSlidePage() { ... }
function loadPhoneCountryPickerSheetPage() { ... }
function loadScannerSlidePage() { return import("@beyo/scanner").then(m => ({ default: m.ScannerSlideRouteEntry })); }

// ── Preload exports (used by form content components) ────────
export const preloadInternalTaskSlideSurface = ...preload;
export const preloadReturnTaskSlideSurface = ...preload;
export const preloadPreOrderTaskSlideSurface = ...preload;
export const preloadItemCategoryPickerSurface = ...preload;
export const preloadWorkingSectionWorkerPickerSurface = ...preload;
export const preloadUpholsteryPickerSurface = ...preload;

// ── Surface registrations map ────────────────────────────────
export const taskCreationSurfaces: SurfaceRegistrations = {
  [TASK_CREATION_INTERNAL_SURFACE_ID]: { surface: "slide", component: ... },
  [TASK_CREATION_RETURN_SURFACE_ID]: { surface: "slide", component: ... },
  [TASK_CREATION_PRE_ORDER_SURFACE_ID]: { surface: "slide", component: ... },
  [TC_ITEM_CATEGORY_PICKER_SURFACE_ID]: { surface: "sheet", component: ... },
  [TC_WORKING_SECTION_WORKER_PICKER_SURFACE_ID]: { surface: "sheet", component: ... },
  [TC_UPHOLSTERY_PICKER_SURFACE_ID]: { surface: "slide", component: ... },
  [TC_PHONE_COUNTRY_PICKER_SURFACE_ID]: { surface: "sheet", component: ... },
  [SCANNER_SLIDE_SURFACE_ID]: { surface: "slide", component: ... },  // scanner bundled in; remove if workers-app already registers it elsewhere
};
```

> **Important:** The scanner surface (`SCANNER_SLIDE_SURFACE_ID`) should be included in `taskCreationSurfaces` only if the workers-app does NOT already have it registered. If it's already in `taskStepSurfaces`, omit it from `taskCreationSurfaces` to avoid duplicate registration conflicts. Verify at integration time (step 17).

---

### Step 14 — Footer component

**File:** `packages/task-creation/src/components/TaskCreationAssignmentFooter.tsx`

Port from manager-app. Replace:
- `@/components/primitives` → `@beyo/ui` (`WorkingSectionShortcutBar`, `StagedFormNavigation`)
- `@/components/primitives/scroll-visibility` → `@beyo/ui` (`useScrollVisibilityContext`)
- `@/providers/SurfaceProvider` → `@beyo/ui` (`SurfaceHeaderContext`)
- `@/features/working-sections` → `../lib/working-section-shortcuts` + `../flows/use-working-section-picker.flow`
- `WorkingSectionAssignment` type → `../types`

---

### Step 15 — Form content components

**Files:**

- `packages/task-creation/src/components/InternalFormContent.tsx`
  - Port from manager-app, replacing all `@/` imports with package-relative paths and `@beyo/*` packages
  - `StagedForm`, `StagedFormStep`, `ContentCard`, `FieldLabelRow` → `@beyo/ui`
  - `preloadCalendarSinglePickerSurface` → `@beyo/ui`
  - `EntityImagesProvider`, `ImagePreviewGrid` → `@beyo/images`
  - `useCameraPrewarm`, `SCANNER_SESSION_ID`, `SCANNER_SLIDE_SURFACE_ID` → `@beyo/scanner`
  - `usePrefetchOnCondition` → `@beyo/ui`
  - `useSurface`, `useStagedForm`, `usePreloadSurface` → `@beyo/hooks`
  - All form field components → `./fields/items/*`, `./fields/tasks/*`, `./fields/working-sections/*`
  - `TaskCreationAssignmentFooter` → `./TaskCreationAssignmentFooter`
  - `useTaskCreationFormContext` → `../providers/TaskCreationFormProvider`
  - `normalizeInternalFormPayload` → `../lib/normalize-task-form-payload`
  - `prefetchTaskCreationFormData` → `../lib/prefetch-task-creation-form-data`
  - `preloadItemCategoryPickerSurface`, `preloadWorkingSectionWorkerPickerSurface`, `preloadUpholsteryPickerSurface` → `../surfaces`
  - `useCreateTask` → `../api/use-create-task`
  - `buildCreateImagesFromUrlBatch`, `createLookupResultSignature`, `findCachedItemCategoryOption`, `selectPurchaseApiLookupResult` → `../lib/item-lookup-prefill`
  - `InternalFormSchema`, `InternalFormValues` → `../types`
  - `useCreateImagesFromUrl` — this was from `@/features/items/subfeatures/item_images`. For the package: use `@beyo/images`'s mutation hook if available, or create `packages/task-creation/src/api/use-create-images-from-url.ts` (simple mutation wrapping the images API from `@beyo/images`).

- `packages/task-creation/src/components/ReturnFormContent.tsx`
  - Same approach as InternalFormContent, also adds customer fields, `preloadCalendarRangePickerSurface`, `preloadPhoneCountryPickerSurface`

- `packages/task-creation/src/components/PreOrderFormContent.tsx`
  - Same as ReturnFormContent (same schema, different task_type in submit)

---

### Step 16 — Slide pages

**Files:**

- `packages/task-creation/src/pages/InternalTaskSlidePage.tsx`
  - Port from manager-app `apps/managers-app/.../pages/task-creation/InternalTaskSlidePage.tsx`
  - Replace `@/features/task-creation` → relative imports within package
  - Replace `SurfaceHeaderContext` → `@beyo/ui`

- `packages/task-creation/src/pages/ReturnTaskSlidePage.tsx` — same

- `packages/task-creation/src/pages/PreOrderTaskSlidePage.tsx` — same

---

### Step 17 — Package public API

**File:** `packages/task-creation/src/index.ts`

Exports (for workers-app consumption):

```ts
// Surfaces (primary integration point)
export { taskCreationSurfaces } from './surfaces';
export {
  TASK_CREATION_INTERNAL_SURFACE_ID,
  TASK_CREATION_RETURN_SURFACE_ID,
  TASK_CREATION_PRE_ORDER_SURFACE_ID,
} from './surface-ids';
export { preloadInternalTaskSlideSurface } from './surfaces';

// Form schemas (if another package or app-level code needs them)
export { InternalFormSchema, ReturnFormSchema, PreOrderFormSchema } from './types';
export type { InternalFormValues, ReturnFormValues, PreOrderFormValues, TaskCreationFormType } from './types';

// Provider (if app wraps outside the slide page)
export { TaskCreationFormProvider, useTaskCreationFormContext } from './providers/TaskCreationFormProvider';

// Normalize (if other code needs to build payloads)
export { normalizeInternalFormPayload, normalizeReturnFormPayload } from './lib/normalize-task-form-payload';
```

> Do NOT export internal pages, picker pages, or form field components — those are implementation details of the package.

---

### Step 18 — Workers-app: surface registry

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts`

```ts
import type { SurfaceRegistrations } from "@beyo/ui";
import { imageSurfaces } from "@beyo/images";
import { taskCreationSurfaces } from "@beyo/task-creation";   // ADD
import { caseSurfaces } from "@/features/cases/surfaces";
import { pwaSurfaces } from "@/features/pwa";
import { taskStepSurfaces } from "@/features/task_steps/surfaces";

export const surfaceRegistry: SurfaceRegistrations = {
  ...imageSurfaces,
  ...caseSurfaces,
  ...pwaSurfaces,
  ...taskStepSurfaces,
  ...taskCreationSurfaces,   // ADD — must come last so task-creation scanner entry doesn't clobber existing one
};
```

> **Scanner conflict check:** If `taskStepSurfaces` already registers `SCANNER_SLIDE_SURFACE_ID`, remove it from `taskCreationSurfaces` in `packages/task-creation/src/surfaces.ts` before this step. Both registrations point to the same `ScannerSlideRouteEntry` so the spread order determines which wins (last wins). Prefer keeping the task-step registration and removing from `taskCreationSurfaces`.

---

### Step 19 — Workers-app: wire the button

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/home/components/variants/WoodWorkerHomeView.tsx`

```tsx
// ADD import
import { TASK_CREATION_INTERNAL_SURFACE_ID } from "@beyo/task-creation";
import { useSurfaceStore } from "@beyo/ui";   // already available via workers-app

// In WoodWorkerSectionsView, wire the button:
<button
  className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
  type="button"
  data-testid="new-internal-task-button"
  onClick={() => useSurfaceStore.getState().open(TASK_CREATION_INTERNAL_SURFACE_ID)}
>
  + New Internal Task
</button>
```

> The `useSurfaceStore` import can come from either `@beyo/ui` directly or from the workers-app's re-export at `@/providers/SurfaceProvider`. Both work — use whatever pattern is consistent with other surfaces opened in the workers-app.

---

## File list summary

### New files — `packages/task-creation/`

| # | Path | Description |
|---|------|-------------|
| 1 | `package.json` | Package manifest with peer deps |
| 2 | `src/types.ts` | All form schemas + domain types |
| 3 | `src/surface-ids.ts` | Surface ID constants + prop types |
| 4 | `src/surfaces.ts` | `taskCreationSurfaces` surface registrations + preload exports |
| 5 | `src/index.ts` | Public API exports |
| 6 | `src/providers/TaskCreationFormProvider.tsx` | Context: taskClientId, itemClientId, customerClientId |
| 7 | `src/api/create-task.ts` | POST /api/v1/tasks |
| 8 | `src/api/use-create-task.ts` | useMutation wrapper |
| 9 | `src/api/item-category-picker-keys.ts` | Query keys |
| 10 | `src/api/fetch-item-categories-picker.ts` | Picker list API |
| 11 | `src/api/use-item-categories-picker-query.ts` | useQuery hook |
| 12 | `src/api/working-section-keys.ts` | Query keys |
| 13 | `src/api/fetch-working-sections-picker.ts` | Picker list API |
| 14 | `src/api/use-working-sections-picker-query.ts` | useQuery hook |
| 15 | `src/api/upholstery-picker-keys.ts` | Query keys |
| 16 | `src/api/fetch-upholstery-picker.ts` | Browse upholstery API |
| 17 | `src/api/fetch-upholstery-picker-option.ts` | Single upholstery by ID API |
| 18 | `src/api/use-upholstery-picker-option-query.ts` | useQuery hook |
| 19 | `src/api/item-lookup-keys.ts` | Query keys |
| 20 | `src/api/fetch-item-lookup.ts` | Item lookup API |
| 21 | `src/api/use-item-lookup-query.ts` | useQuery hook |
| 22 | `src/api/phone-country-keys.ts` | Query keys |
| 23 | `src/api/fetch-phone-countries.ts` | Country list API |
| 24 | `src/api/use-phone-countries-query.ts` | useQuery hook |
| 25 | `src/api/use-create-images-from-url.ts` | useMutation for batch image URL import |
| 26 | `src/store/item-category-selection.store.ts` | Zustand store |
| 27 | `src/store/working-section-selection.store.ts` | Zustand store |
| 28 | `src/flows/use-item-category-picker.flow.ts` | Flow: query + store → options |
| 29 | `src/flows/use-working-section-picker.flow.ts` | Flow: query + store → options |
| 30 | `src/lib/normalize-task-form-payload.ts` | Payload builders |
| 31 | `src/lib/item-lookup-prefill.ts` | Lookup result helpers |
| 32 | `src/lib/prefetch-task-creation-form-data.ts` | Prefetch on mount |
| 33 | `src/lib/working-section-shortcuts.ts` | Shortcut config + resolver |
| 34 | `src/lib/quick-select-options.ts` | TASK_READY_BY_QUICK_SELECT_OPTIONS |
| 35 | `src/lib/use-debounce.ts` | Simple debounce hook (required by ItemIdentityField) |
| 36 | `src/components/fields/items/ItemCategorySelectionField.tsx` | Major category + category picker field |
| 37 | `src/components/fields/items/ItemIdentityField.tsx` | Article number / SKU tabbed input |
| 38 | `src/components/fields/items/ItemPositionField.tsx` | Position number input |
| 39 | `src/components/fields/items/ItemQuantityField.tsx` | Quantity number input |
| 40 | `src/components/fields/items/ItemUpholsteryAmountField.tsx` | Meters number input |
| 41 | `src/components/fields/items/ItemUpholsteryField.tsx` | Upholstery picker trigger |
| 42 | `src/components/fields/tasks/TaskAdditionalDetailsField.tsx` | Textarea |
| 43 | `src/components/fields/tasks/TaskReadyByDateField.tsx` | Date trigger + calendar surface |
| 44 | `src/components/fields/tasks/TaskDeliveryDateField.tsx` | Date range trigger |
| 45 | `src/components/fields/tasks/TaskFulfillmentMethodField.tsx` | Box picker |
| 46 | `src/components/fields/tasks/TaskReturnSourceField.tsx` | Box picker |
| 47 | `src/components/fields/customers/CustomerDisplayNameField.tsx` | Text input |
| 48 | `src/components/fields/customers/CustomerEmailField.tsx` | Text input |
| 49 | `src/components/fields/customers/CustomerPhoneField.tsx` | Phone input + country picker |
| 50 | `src/components/fields/customers/CustomerTypeField.tsx` | Box picker |
| 51 | `src/components/fields/customers/CustomerAddressFieldGroup.tsx` | Address sub-fields |
| 52 | `src/components/fields/working-sections/WorkingSectionPickerField.tsx` | Multi-picker |
| 53 | `src/components/TaskCreationAssignmentFooter.tsx` | Shortcut bar + staged nav |
| 54 | `src/components/InternalFormContent.tsx` | 3-step internal form |
| 55 | `src/components/ReturnFormContent.tsx` | 4-step return form |
| 56 | `src/components/PreOrderFormContent.tsx` | 4-step pre-order form |
| 57 | `src/pages/InternalTaskSlidePage.tsx` | Wraps provider + InternalFormContent |
| 58 | `src/pages/ReturnTaskSlidePage.tsx` | Wraps provider + ReturnFormContent |
| 59 | `src/pages/PreOrderTaskSlidePage.tsx` | Wraps provider + PreOrderFormContent |
| 60 | `src/pages/ItemCategoryPickerSheetPage.tsx` | Category picker (internal surface) |
| 61 | `src/pages/WorkingSectionWorkerPickerSheetPage.tsx` | Worker picker (internal surface) |
| 62 | `src/pages/UpholsteryPickerSlidePage.tsx` | Upholstery browse (internal surface) |
| 63 | `src/pages/PhoneCountryPickerSheetPage.tsx` | Phone country picker (internal surface) |

### Modified files — workers-app

| # | Path | Change |
|---|------|--------|
| 64 | `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts` | Spread `taskCreationSurfaces` |
| 65 | `apps/workers-app/ManagerBeyo-app-workers/src/features/home/components/variants/WoodWorkerHomeView.tsx` | Wire button to open `TASK_CREATION_INTERNAL_SURFACE_ID` |

**Total: 63 new files + 2 modified files. Manager app: 0 changes.**

---

## Risks and mitigations

- **Risk:** Upholstery picker in the package is a simplified re-implementation. Visual/UX differences from the manager-app picker may exist.
  **Mitigation:** Workers-app upholstery use is optional for now (seat items only). Mark as "v1 implementation" and align with manager-app picker in a follow-up.

- **Risk:** Scanner surface duplicate registration if `taskStepSurfaces` already registers `SCANNER_SLIDE_SURFACE_ID`.
  **Mitigation:** Verify at step 18 and conditionally exclude from `taskCreationSurfaces`. Document in `surfaces.ts`.

- **Risk:** `useCreateTask` in the package has no optimistic update — the workers-app task list will not show the new task until the next refetch.
  **Mitigation:** After submit success, invalidate `['tasks']` broadly. Workers-app home shows working sections (not a tasks list), so the impact is low. The task will appear in working section steps on next refresh or via realtime invalidation.

- **Risk:** `ApiEnvelopeSchema` from `@beyo/lib` — confirm the shape `{ ok, data, warnings }` matches the API responses used by this package.
  **Mitigation:** Confirmed from `@beyo/item-issues` usage pattern (`ApiEnvelopeSchema` imported from `@beyo/lib`).

- **Risk:** `useCreateImagesFromUrl` — this hook was in `@/features/items/subfeatures/item_images` in the manager app. If `@beyo/images` does not export a matching mutation, implement a simple wrapper in `src/api/use-create-images-from-url.ts` that calls the images API endpoint directly.
  **Mitigation:** Check `@beyo/images` exports. If the mutation exists there, import from the package. Otherwise implement locally in the package.

---

## Validation plan

- `npm run typecheck` (or `tsc --noEmit` across monorepo): zero TypeScript errors
- Manual: tap "+ New Internal Task" in workers-app → slide opens with 3 steps
- Manual: fill Item step (article number + category) → advance to Assignment
- Manual: fill Assignment step (select a working section) → advance to Task
- Manual: tap submit → network request to `/api/v1/tasks` returns success

---

## Review log

*(empty — awaiting first review)*

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David (review and approve before Codex execution)
