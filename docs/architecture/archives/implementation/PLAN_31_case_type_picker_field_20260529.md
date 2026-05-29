# PLAN_31_case_type_picker_field_20260529

## Metadata

- Plan ID: `PLAN_31_case_type_picker_field_20260529`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T12:09:59Z`
- Related issue/ticket: `-`
- Intention plan: `docs/architecture/under_construction/intention/case_creation.md`
- Predecessor plan: `PLAN_30_case_creation_form_core_20260529` (form shell + submit button already wired)

## Goal and intent

- Goal: Add the case type selector to the case creation form. A trigger button in the form opens a bottom-sheet picker where the user selects a case type from a 2-column `BoxPicker` grid. On selection the sheet closes, the trigger renders the selected case type (image + name + description), and `case_type_id` + `type_label` are included in the submit payload. The picker sheet and the case types query are hot-loaded the moment the case creation slide mounts, so they are ready before the user taps the trigger.
- Business/user intent: Workers need to categorise a case at creation time. The `type_label` field is auto-populated from the selected case type's name. The `case_type_id` is included in the payload so the backend can link the canonical type. Both fields may be absent (case creation without a type remains valid).
- Non-goals: Free-text "Other" type-label input field — deferred. Participant fields — separate plan. Post-creation navigation — deferred. Playwright E2E spec — deferred until more fields exist.

## Scope

- In scope:
  - `packages/cases/src/types.ts` — add `CaseTypeId`, `CaseTypeSelectedDisplay`, `CaseTypeSchema`, `CaseType`, `ListCaseTypesParams`; add `case_type_id` to `CaseCreationFormSchema`
  - `packages/cases/src/surface-ids.ts` — update `CaseCreationSlideSurfaceProps` with `entityTypes?`; add `CASE_TYPE_PICKER_SHEET_SURFACE_ID` and `CaseTypePickerSheetSurfaceProps`
  - `packages/cases/src/api/case-type-keys.ts` — NEW: query key factory
  - `packages/cases/src/api/list-case-types.ts` — NEW: `listCaseTypes` API function
  - `packages/cases/src/api/use-list-case-types.ts` — NEW: `useListCaseTypesQuery` hook
  - `packages/cases/src/lib/case-type-view-model.ts` — NEW: `toCaseTypePickerOption` DTO transform
  - `packages/cases/src/providers/CaseCreationFormProvider.tsx` — UPDATE: add `entityTypes` prop, `selectedCaseType` + `setSelectedCaseType` to context
  - `packages/cases/src/components/CaseTypePickerSheetContent.tsx` — NEW: query + `BoxPicker` sheet UI
  - `packages/cases/src/components/CaseTypePickerRouteEntry.tsx` — NEW: sheet route entry (sets title, renders content)
  - `packages/cases/src/components/CaseTypePickerTriggerField.tsx` — NEW: form trigger button (empty / selected states)
  - `packages/cases/src/components/CaseCreationFormContent.tsx` — UPDATE: prefetch query on mount; render trigger field; call `setSelectedCaseType(null)` on form reset
  - `packages/cases/src/components/CaseCreationRouteEntry.tsx` — UPDATE: read `entityTypes` from surface props, pass to provider
  - `packages/cases/src/index.ts` — UPDATE: export all new public symbols
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseTypePickerSheetPage.tsx` — NEW: thin app-level page wrapper
  - `apps/workers-app/ManagerBeyo-app-workers/src/features/cases/surfaces.ts` — UPDATE: register picker sheet with `lazyWithPreload`, export `preloadCaseTypePickerSheetSurface`
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx` — UPDATE: call `usePreloadSurface(preloadCaseTypePickerSheetSurface)` on mount
- Out of scope:
  - Free-text "Other" type-label input — deferred
  - `entity_type` filtering in the workers-app controller (`handleOpenCaseCreation`) — deferred; controller currently passes empty props, picker will show all case types
  - Participant + select-all fields — separate plan
  - Playwright spec — deferred
- Assumptions:
  - PLAN_30 is complete: `CaseCreationFormContent` renders, submit button works, `CaseCreationRouteEntry` mounts in the slide surface.
  - `@beyo/ui` exports `BoxPickerOptionType` and `BoxPicker` via `export * from "./components/primitives/box-picker"` — confirmed.
  - `usePreloadSurface` is exported from `@beyo/hooks` — confirmed at `packages/hooks/src/use-preload-surface.ts`.
  - `useSurface` is exported from `@beyo/hooks` — confirmed in `use-task-step-detail.controller.ts` usage.
  - Sheets do not URL-serialize props; function props in `CaseTypePickerSheetSurfaceProps.onSelect` are safe.

## Clarifications required

_(none blocking — backend endpoint fully documented; design agreed with user)_

## Acceptance criteria

1. `npm run typecheck` from `frontend/` passes with zero errors.
2. `npm run build` for the workers app succeeds.
3. Opening the case creation slide triggers a network fetch for the `CaseTypePickerSheetPage` JS chunk (code preload fires immediately on slide mount).
4. `GET /api/v1/case-types` is called on form mount — before the user taps the trigger — and its response is cached.
5. Tapping the trigger opens a bottom sheet with a 2-column grid of case type boxes (image + label, square shape).
6. The previously selected option is shown as selected when reopening the picker.
7. Selecting a case type closes the sheet; the trigger now shows: image (or fallback icon) on the left, name on the right, description below name truncated to 2 lines.
8. Network tab after submit shows `case_type_id` and `type_label` in the `POST /api/v1/cases` payload when a type is selected.
9. Submitting without selecting a type omits both `case_type_id` and `type_label` from the payload (undefined fields are not serialized).
10. After a successful submit the trigger returns to the empty state ("Select case type").

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md` + `01_architecture_local.md`: monorepo; `route-entry.tsx` pattern; package boundary rules
- `architecture/02_types.md`: Zod schema authoring; input vs response schema separation; branded types
- `architecture/04_api_client.md` + `04_api_client_local.md`: `apiClient.get` usage; `ApiEnvelopeSchema`; error shape (flat `error` string)
- `architecture/05_server_state.md`: `useQuery`, `queryClient.prefetchQuery`; query key factory; stale-while-revalidate defaults
- `architecture/07_components.md`: component patterns; no feature-level cross-imports; package-utility hooks (`useSurface`, `useSurfaceHeader`, `useFormContext`) permitted in components
- `architecture/08_hooks.md`: query hook shape; data-only; `select` for transforms
- `architecture/09_forms.md`: `useFormContext`, `setValue`, `Controller`; field must register with form
- `architecture/13_errors.md`: graceful loading/error states in UI; no toast for query errors in lists
- `architecture/15_feature_structure.md`: folder layout inside shared package (`api/`, `lib/`, `components/`, `providers/`)
- `architecture/23_providers.md`: provider + context shell; `createContext` + guard hook; props passed through provider
- `architecture/24_dto.md`: DTO transform in `lib/` — pure function from raw API type to view model
- `architecture/28_surfaces.md` + `28_surfaces_local.md`: surface types (`slide`, `sheet`, `modal`); sheet has no path; `useSurfaceHeader().requestClose()` closes current surface
- `architecture/30_dynamic_loading.md` + `30_dynamic_loading_local.md`: `lazyWithPreload` from `@beyo/ui`; `preload` export pattern; `usePreloadSurface` from `@beyo/hooks` fires on mount
- `architecture/35_shared_packages.md`: peer deps only; barrel export public API; no `@/` alias inside packages

### Local extensions loaded

- `01_architecture_local.md`: `route-entry.tsx` is the package's surface entry point — sets surface header and wires provider
- `04_api_client_local.md`: backend error shape is flat `error: string`; no field-level errors
- `28_surfaces_local.md`: active surface types are `slide | sheet | modal` (no `drawer`); sheets have no URI path; props are in-memory and support function values

### File read intent — pattern vs. relational

Prohibited (pattern reads — contracts above already cover these):
- Reading another query hook to understand `useQuery` shape → `05_server_state.md`
- Reading another DTO file to understand view model transformer shape → `24_dto.md`
- Reading another sheet component to understand route entry structure → `01_architecture_local.md`
- Reading another form field to understand `useFormContext` + `setValue` → `09_forms.md`
- Reading another provider to understand context shell → `23_providers.md`

Permitted (relational reads — understanding what exists):
- `packages/cases/src/types.ts` — existing schema to extend ✓ (read)
- `packages/cases/src/surface-ids.ts` — existing surface IDs and prop types ✓ (read)
- `packages/cases/src/api/case-keys.ts` — query key factory pattern for this domain ✓ (read)
- `packages/cases/src/api/list-cases.ts` — existing API function shape for this domain ✓ (read)
- `packages/cases/src/providers/CaseCreationFormProvider.tsx` — existing provider to extend ✓ (read)
- `packages/cases/src/components/CaseCreationFormContent.tsx` — existing form content to extend ✓ (read)
- `packages/cases/src/components/CaseCreationRouteEntry.tsx` — existing route entry to extend ✓ (read)
- `packages/ui/src/components/primitives/box-picker/box-picker.types.ts` — `BoxPickerOptionType` shape ✓ (read)
- `packages/hooks/src/use-preload-surface.ts` — preload hook signature ✓ (read)
- `apps/workers-app/.../features/cases/surfaces.ts` — existing surface registrations to extend ✓ (read)
- `apps/workers-app/.../pages/cases/CaseCreationSlidePage.tsx` — current page to update ✓ (read)

### Skill selection

- Primary skill: none — new feature layer within existing package
- Trigger terms: `useQuery`, `zodResolver`, `BoxPicker`, `lazyWithPreload`, `usePreloadSurface`, `useSurface`
- Excluded: `09_forms.md` StagedForm — single-step form; `08_hooks.md` optimistic update — read-only query, no mutation

## Domain schemas consulted

- `packages/cases/src/types.ts`:
  - `CreateCaseInputSchema` already includes `case_type_id?: string` and `type_label?: string` — the form schema needs `case_type_id` added to match
  - `CaseDetailBaseSchema` models `case_type: CaseTypeSnapshotSchema` — note `CaseTypeSnapshotSchema` has `name`, `image_url`, `image` fields; the new `CaseTypeSchema` is a richer standalone entity
  - `CASE_LINK_ENTITY_TYPE = ["task", "customer"]` — referenced for `entity_type` values; case types additionally support `"item"` per the endpoint spec
- `packages/ui/src/components/primitives/box-picker/box-picker.types.ts`:
  - `BoxPickerOptionType<Value>` = `{ value: Value; label: string; icon?; image?: string | null; imageClassName?; description?; disabled?; testId? }`
  - `BoxPicker` accepts `mode`, `value`, `onValueChange`, `options`, `layout?`, `visualVariant?`, `columns?`, etc.
- `packages/lib/src/client-id.ts`:
  - `CaseTypeId` does NOT exist in `@beyo/lib` — must be defined locally in `types.ts`

## Selected contracts summary

```
Core:       01, 01_local, 02, 04, 04_local, 05, 07, 08, 13, 15, 23, 35
Goal:       09_forms (useFormContext, setValue), 24_dto (DTO transform), 28+28_local (sheet surface), 30+30_local (lazyWithPreload, usePreloadSurface)
Excluded:   09_forms StagedForm, 08_hooks optimistic, 17_testing, 21_realtime, 12_auth, 19_permissions
```

## Implementation plan

Build order: Types → Surface IDs → Query keys → API → Query hook → DTO → Provider update → Sheet content → Sheet route entry → Trigger field → Form content update → Route entry update → Public API → App page → App surfaces → App creation slide update.

---

### Step 1 — Expand types (`packages/cases/src/types.ts`)

**Add** the following after the existing `CASE_LINK_ROLE` constant and before `CaseUserSnapshotSchema`:

```ts
// CaseType entity
export type CaseTypeId = string & { readonly _brand: "CaseTypeId" };

export const CaseTypeSchema = z.object({
  client_id: z.string().transform((v) => v as CaseTypeId),
  name: z.string(),
  image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  entity_type: z.string().nullable().optional(),
});
export type CaseType = z.infer<typeof CaseTypeSchema>;

export type ListCaseTypesParams = {
  limit?: number;
  offset?: number;
  q?: string;
  entity_type?: string; // comma-separated, e.g. "item,task"
};

// Display-only snapshot stored in CaseCreationFormProvider after picker selection.
// Not submitted — only imageUrl is display-only; clientId and name go into form state.
export type CaseTypeSelectedDisplay = {
  clientId: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
};
```

**Edit** `CaseCreationFormSchema` to add `case_type_id`:

```ts
export const CaseCreationFormSchema = z.object({
  case_type_id: z.string().min(1).optional(), // ADD — populated from picker selection
  type_label: z.string().trim().min(1).max(128).optional(),
  participants: z.array(z.string()).optional(),
  selected_all: z.boolean().optional(),
  skip_participants: z.array(z.string()).optional(),
});
export type CaseCreationFormValues = z.infer<typeof CaseCreationFormSchema>;
```

`case_type_id` is optional — the user may submit without selecting a type. When selected via picker, both `case_type_id` and `type_label` are set together.

---

### Step 2 — Surface IDs (`packages/cases/src/surface-ids.ts`)

**Add** the new sheet surface ID at the top constant block:

```ts
export const CASE_TYPE_PICKER_SHEET_SURFACE_ID = "case-type-picker-sheet";
```

**Add** the surface openers map type, then **update** `CaseCreationSlideSurfaceProps`:

```ts
// All individual openers are optional so the provider can safely default to {}
// and fields degrade gracefully (trigger is inert) if an opener is absent.
// Add new picker openers here as new fields are introduced.
export type CaseCreationSurfaceOpeners = {
  openCaseTypePicker?: (props: CaseTypePickerSheetSurfaceProps) => void;
};

export type CaseCreationSlideSurfaceProps = {
  entityTypes?: string[];
  surfaceOpeners: CaseCreationSurfaceOpeners; // required — TypeScript enforces wiring at every call site
};
```

`surfaceOpeners` is required at the type level so TypeScript catches any call site that forgets to wire the pickers. Individual openers inside the map are optional so adding a new field to the form never breaks existing call sites — they just don't wire the new opener yet, and the new trigger is inert until they do. `useSurfaceProps` returns `Partial<T>`, so the provider falls back to `{}` at runtime.

**Add** picker sheet surface props. Import `CaseTypeSelectedDisplay` from `./types`:

```ts
import type { CaseId, CaseTypeSelectedDisplay } from "./types";

export type CaseTypePickerSheetSurfaceProps = {
  entityTypes?: string[];
  onSelect: (selection: CaseTypeSelectedDisplay) => void;
};
```

`onSelect` is a function — safe because sheets do not URL-serialize props (in-memory only).

---

### Step 3 — Query key factory (`packages/cases/src/api/case-type-keys.ts`) NEW

```ts
import type { ListCaseTypesParams } from "../types";

export const caseTypeKeys = {
  all: ["case-types"] as const,
  lists: () => [...caseTypeKeys.all, "list"] as const,
  list: (params: ListCaseTypesParams = {}) =>
    [...caseTypeKeys.lists(), params] as const,
};
```

Parallel to `caseKeys` in `case-keys.ts`. Root key is `"case-types"` (different from `"cases"`).

---

### Step 4 — API function (`packages/cases/src/api/list-case-types.ts`) NEW

```ts
import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { CaseTypeSchema, type CaseType, type ListCaseTypesParams } from "../types";

const ListCaseTypesResponseSchema = ApiEnvelopeSchema(
  z.object({
    case_types: z.array(CaseTypeSchema),
    case_types_pagination: z.object({
      has_more: z.boolean(),
      limit: z.number().int(),
      offset: z.number().int(),
    }),
  }),
).extend({ ok: z.literal(true) });

export async function listCaseTypes(
  params: ListCaseTypesParams = {},
): Promise<CaseType[]> {
  const queryParams: Record<string, string | number> = {};

  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.q) queryParams.q = params.q;
  if (params.entity_type) queryParams.entity_type = params.entity_type;

  const parsed = await apiClient.get(
    "/api/v1/case-types",
    ListCaseTypesResponseSchema,
    queryParams,
  );
  return parsed.data.case_types;
}
```

Mirrors the shape of `list-cases.ts` — `apiClient.get` with query params, returns the data array.

---

### Step 5 — Query hook (`packages/cases/src/api/use-list-case-types.ts`) NEW

```ts
import { useQuery } from "@tanstack/react-query";

import type { ListCaseTypesParams } from "../types";
import { caseTypeKeys } from "./case-type-keys";
import { listCaseTypes } from "./list-case-types";

export function useListCaseTypesQuery(params: ListCaseTypesParams = {}) {
  return useQuery({
    queryKey: caseTypeKeys.list(params),
    queryFn: () => listCaseTypes(params),
  });
}
```

No `select` transform here — the DTO transform runs in the component layer (`CaseTypePickerSheetContent`) where the view model is actually consumed. This keeps the query cache as the raw API type.

---

### Step 6 — DTO transform (`packages/cases/src/lib/case-type-view-model.ts`) NEW

```ts
import type { BoxPickerOptionType } from "@beyo/ui";

import type { CaseType, CaseTypeSelectedDisplay } from "../types";

export function toCaseTypePickerOption(
  caseType: CaseType,
): BoxPickerOptionType<string> {
  return {
    value: caseType.client_id as string,
    label: caseType.name,
    image: caseType.image_url ?? undefined,
    description: caseType.description ?? undefined,
    testId: `case-type-option-${caseType.client_id}`,
  };
}

export function toCaseTypeSelectedDisplay(
  caseType: CaseType,
): CaseTypeSelectedDisplay {
  return {
    clientId: caseType.client_id as string,
    name: caseType.name,
    imageUrl: caseType.image_url ?? null,
    description: caseType.description ?? null,
  };
}
```

Pure functions — no hooks, no side effects. Both are used in `CaseTypePickerSheetContent` on selection.

---

### Step 7 — Update form provider (`packages/cases/src/providers/CaseCreationFormProvider.tsx`)

**Full replacement** of the file. Changes: add `entityTypes` prop; add `selectedCaseType` / `setSelectedCaseType` to state and context.

```tsx
import { createContext, useContext, useState } from "react";

import { generateClientId } from "@beyo/lib";
import type { CaseId } from "@beyo/lib";

import type { CaseTypeSelectedDisplay } from "../types";

type CaseCreationFormContextValue = {
  caseClientId: CaseId;
  regenerateId: () => void;
  entityTypes?: string[];
  selectedCaseType: CaseTypeSelectedDisplay | null;
  setSelectedCaseType: (ct: CaseTypeSelectedDisplay | null) => void;
  surfaceOpeners: CaseCreationSurfaceOpeners;
};

const CaseCreationFormContext =
  createContext<CaseCreationFormContextValue | null>(null);

export function CaseCreationFormProvider({
  children,
  entityTypes,
  surfaceOpeners,
}: {
  children: React.ReactNode;
  entityTypes?: string[];
  surfaceOpeners?: CaseCreationSurfaceOpeners;
}): React.JSX.Element {
  const [caseClientId, setCaseClientId] = useState<CaseId>(
    () => generateClientId("Case") as CaseId,
  );
  const [selectedCaseType, setSelectedCaseType] =
    useState<CaseTypeSelectedDisplay | null>(null);

  function regenerateId(): void {
    setCaseClientId(generateClientId("Case") as CaseId);
  }

  return (
    <CaseCreationFormContext.Provider
      value={{
        caseClientId,
        regenerateId,
        entityTypes,
        selectedCaseType,
        setSelectedCaseType,
        surfaceOpeners: surfaceOpeners ?? {},
      }}
    >
      {children}
    </CaseCreationFormContext.Provider>
  );
}

export function useCaseCreationFormContext(): CaseCreationFormContextValue {
  const ctx = useContext(CaseCreationFormContext);

  if (!ctx) {
    throw new Error(
      "useCaseCreationFormContext must be used inside CaseCreationFormProvider",
    );
  }

  return ctx;
}
```

---

### Step 8 — Sheet content component (`packages/cases/src/components/CaseTypePickerSheetContent.tsx`) NEW

```tsx
import { Tag } from "lucide-react";
import { BoxPicker } from "@beyo/ui";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { useListCaseTypesQuery } from "../api/use-list-case-types";
import {
  toCaseTypePickerOption,
  toCaseTypeSelectedDisplay,
} from "../lib/case-type-view-model";
import type { CaseTypePickerSheetSurfaceProps } from "../surface-ids";

export function CaseTypePickerSheetContent(): React.JSX.Element {
  const surfaceHeader = useSurfaceHeader();
  const { entityTypes, onSelect } =
    useSurfaceProps<CaseTypePickerSheetSurfaceProps>();

  const listParams = {
    entity_type: entityTypes?.join(","),
    limit: 50,
  };

  const { data: caseTypes, isPending, isError } = useListCaseTypesQuery(listParams);

  const options = (caseTypes ?? []).map(toCaseTypePickerOption);

  function handleValueChange(value: string): void {
    const caseType = (caseTypes ?? []).find((ct) => (ct.client_id as string) === value);
    if (!caseType) return;

    onSelect?.(toCaseTypeSelectedDisplay(caseType));
    surfaceHeader?.requestClose();
  }

  if (isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (isError || options.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2">
        <Tag className="size-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {isError ? "Could not load case types." : "No case types available."}
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <BoxPicker
        mode="single"
        value={null}
        onValueChange={handleValueChange}
        options={options}
        layout="grid"
        visualVariant="default"
        columns={2}
        showIcon
        showLabel
        showDescription={false}
        data-testid="case-type-picker-grid"
      />
    </div>
  );
}
```

Notes:
- `value={null}` — the picker sheet has no pre-selection state itself; selected state is tracked in the provider. If the user re-opens the picker after a selection, the previously selected box should appear selected. To support this, read the current `case_type_id` from the form via `useFormContext` and pass it as `value`. See note below.
- `onSelect` from surface props may be `undefined` if the sheet is opened without props (defensive `?.`).
- `showDescription={false}` — descriptions are shown in the trigger field, not in the 2-column grid boxes (which are square and compact).

**Pre-selection support:** To highlight the already-selected option when the sheet re-opens, `CaseTypePickerSheetContent` should read the current selection. Pass `currentCaseTypeId` in `CaseTypePickerSheetSurfaceProps`:

Update Step 2's `CaseTypePickerSheetSurfaceProps` to include:
```ts
export type CaseTypePickerSheetSurfaceProps = {
  entityTypes?: string[];
  currentCaseTypeId?: string | null;
  onSelect: (selection: CaseTypeSelectedDisplay) => void;
};
```

And use it in the component:
```tsx
const { entityTypes, currentCaseTypeId, onSelect } =
  useSurfaceProps<CaseTypePickerSheetSurfaceProps>();
// ...
<BoxPicker
  mode="single"
  value={currentCaseTypeId ?? null}
  onValueChange={handleValueChange}
  // ...
/>
```

---

### Step 9 — Sheet route entry (`packages/cases/src/components/CaseTypePickerRouteEntry.tsx`) NEW

```tsx
import { useEffect } from "react";
import { useSurfaceHeader } from "@beyo/hooks";

import { CaseTypePickerSheetContent } from "./CaseTypePickerSheetContent";

export function CaseTypePickerRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Select case type");
  }, [header]);

  return <CaseTypePickerSheetContent />;
}
```

Thin route entry — no provider needed for this sheet (all data comes from query + surface props).

---

### Step 10 — Trigger field component (`packages/cases/src/components/CaseTypePickerTriggerField.tsx`) NEW

```tsx
import { ChevronRight, Tag } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import type { CaseCreationFormValues } from "../types";

export function CaseTypePickerTriggerField(): React.JSX.Element {
  const { selectedCaseType, setSelectedCaseType, entityTypes, surfaceOpeners } =
    useCaseCreationFormContext();
  const form = useFormContext<CaseCreationFormValues>();
  const currentCaseTypeId = useWatch({ control: form.control, name: "case_type_id" });

  function handlePress(): void {
    surfaceOpeners.openCaseTypePicker?.({
      entityTypes,
      currentCaseTypeId: currentCaseTypeId ?? null,
      onSelect: (selection) => {
        setSelectedCaseType(selection);
        form.setValue("case_type_id", selection.clientId, { shouldDirty: true });
        form.setValue("type_label", selection.name, { shouldDirty: true });
      },
    });
  }

  return (
    <button
      type="button"
      data-testid="case-type-picker-trigger"
      className="flex w-full items-center gap-3 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-left shadow-sm"
      onClick={handlePress}
    >
      {selectedCaseType ? (
        <>
          {selectedCaseType.imageUrl ? (
            <img
              src={selectedCaseType.imageUrl}
              alt=""
              aria-hidden="true"
              className="size-10 shrink-0 rounded-lg object-contain"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Tag className="size-5 text-muted-foreground" aria-hidden="true" />
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {selectedCaseType.name}
            </span>
            {selectedCaseType.description ? (
              <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                {selectedCaseType.description}
              </span>
            ) : null}
          </span>
        </>
      ) : (
        <span className="flex-1 text-sm text-muted-foreground">
          Select case type
        </span>
      )}

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}
```

Notes:
- `useWatch` (not `form.watch`) subscribes only to `case_type_id` changes — avoids re-rendering the trigger on every other field change.
- `{ shouldDirty: true }` on `setValue` ensures form state tracks the field as touched.
- `openCaseTypePicker` is a plain function from provider context — the trigger field has zero knowledge of the surface system. The workers app controller (Step 17) is the only place that calls `openSurface` for this interaction.
- The `onSelect` callback captures `setSelectedCaseType` and `form.setValue` from the closure. Both are stable references, safe to capture.

---

### Step 11 — Update form content (`packages/cases/src/components/CaseCreationFormContent.tsx`)

Three changes: add prefetch on mount, render the trigger field, clear `selectedCaseType` on success reset.

```tsx
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import type { CaseId } from "@beyo/lib";

import { useCreateCase } from "../actions/use-create-case";
import { caseTypeKeys } from "../api/case-type-keys";
import { listCaseTypes } from "../api/list-case-types";
import { useCaseCreationFormContext } from "../providers/CaseCreationFormProvider";
import { CaseCreationFormSchema, type CaseCreationFormValues } from "../types";
import { CaseTypePickerTriggerField } from "./CaseTypePickerTriggerField";

export function CaseCreationFormContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { caseClientId, regenerateId, entityTypes, setSelectedCaseType } =
    useCaseCreationFormContext();
  const { createCaseAsync, isPending } = useCreateCase();

  // Prefetch case types so the picker sheet data is ready before the user taps the trigger.
  useEffect(() => {
    const params = { entity_type: entityTypes?.join(","), limit: 50 };
    void queryClient.prefetchQuery({
      queryKey: caseTypeKeys.list(params),
      queryFn: () => listCaseTypes(params),
    });
    // entityTypes is stable from surface props — run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const form = useForm<CaseCreationFormValues>({
    resolver: zodResolver(CaseCreationFormSchema),
    defaultValues: {
      case_type_id: undefined,
      type_label: undefined,
      participants: undefined,
      selected_all: undefined,
      skip_participants: undefined,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await createCaseAsync({
        client_id: caseClientId as CaseId,
        ...values,
      });
      form.reset();
      setSelectedCaseType(null); // clear trigger display state
      regenerateId();
    } catch {
      // Error toast is handled by useCreateCase onError
    }
  });

  return (
    <FormProvider {...form}>
      <form
        className="flex h-full flex-col"
        data-testid="case-creation-form"
        noValidate
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <CaseTypePickerTriggerField />
        </div>

        <div className="shrink-0 border-t border-border/60 px-4 pb-[calc(var(--safe-bottom,0)+1rem)] pt-3">
          <button
            type="button"
            disabled={isPending}
            data-testid="case-creation-submit"
            className="flex w-full items-center justify-center rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-50"
            onClick={() => void handleSubmit()}
          >
            {isPending ? "Creating…" : "Create case"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
```

---

### Step 12 — Update route entry (`packages/cases/src/components/CaseCreationRouteEntry.tsx`)

Read `entityTypes` and `openCaseTypePicker` from surface props and pass to the provider:

```tsx
import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { CaseCreationFormProvider } from "../providers/CaseCreationFormProvider";
import type { CaseCreationSlideSurfaceProps } from "../surface-ids";
import { CaseCreationFormContent } from "./CaseCreationFormContent";

export function CaseCreationRouteEntry(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { entityTypes, surfaceOpeners } =
    useSurfaceProps<CaseCreationSlideSurfaceProps>();

  useEffect(() => {
    header?.setTitle("New case");
  }, [header]);

  return (
    <CaseCreationFormProvider
      entityTypes={entityTypes}
      surfaceOpeners={surfaceOpeners}
    >
      <CaseCreationFormContent />
    </CaseCreationFormProvider>
  );
}
```

`useSurfaceProps` returns `Partial<T>` — `openCaseTypePicker` may be `undefined` at runtime (e.g., during hot-reload or if the caller omits it). The provider falls back to a no-op (`() => {}`), so the trigger button remains tapable but does nothing — a safe degraded state rather than a crash.

---

### Step 13 — Update public API (`packages/cases/src/index.ts`)

Add the following exports (keep all existing exports untouched):

```ts
// Types
export type { CaseTypeId, CaseType, CaseTypeSelectedDisplay, ListCaseTypesParams } from "./types";

// Query hook
export { useListCaseTypesQuery } from "./api/use-list-case-types";

// Surface
export { CASE_TYPE_PICKER_SHEET_SURFACE_ID } from "./surface-ids";
export type {
  CaseTypePickerSheetSurfaceProps,
  CaseCreationSurfaceOpeners,       // exported so app controllers can type-check their surfaceOpeners object
} from "./surface-ids";

// Components (route entries only — internal field component not exported)
export { CaseTypePickerRouteEntry } from "./components/CaseTypePickerRouteEntry";
```

`CaseTypePickerTriggerField` is intentionally NOT exported — it is tightly coupled to `CaseCreationFormProvider` context and has no standalone use case outside this form.

---

### Step 14 — App: picker sheet page (`apps/workers-app/.../pages/cases/CaseTypePickerSheetPage.tsx`) NEW

```tsx
import { CaseTypePickerRouteEntry } from "@beyo/cases";

export function CaseTypePickerSheetPage(): React.JSX.Element {
  return <CaseTypePickerRouteEntry />;
}
```

Thin wrapper — identical pattern to `CaseCreationSlidePage`.

---

### Step 15 — App: surfaces registration (`apps/workers-app/.../features/cases/surfaces.ts`)

Add after the existing `loadCaseCreationSlidePage` function and before the `lazyWithPreload` calls:

```ts
import {
  CASE_CONVERSATION_SURFACE_ID,
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  CASE_MESSAGE_ACTIONS_SHEET_SURFACE_ID,
  type CaseConversationSurfaceProps,
} from "@beyo/cases";

// ... existing loaders ...

function loadCaseTypePickerSheetPage() {
  return import("@/pages/cases/CaseTypePickerSheetPage").then((module) => ({
    default: module.CaseTypePickerSheetPage,
  }));
}

// ... existing lazyWithPreload calls ...
const caseTypePickerSheet = lazyWithPreload(loadCaseTypePickerSheetPage);

export const preloadCaseCreationSlideSurface = caseCreationSlide.preload;
export const preloadCaseTypePickerSheetSurface = caseTypePickerSheet.preload;

export const caseSurfaces: SurfaceRegistrations = {
  // ... existing registrations ...
  [CASE_TYPE_PICKER_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: caseTypePickerSheet.Component,
  },
};
```

The `preloadCaseTypePickerSheetSurface` export is consumed in Step 16.

---

### Step 17 — App: wire picker opener in controller (`apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts`)

Update `handleOpenCaseCreation` to pass both `entityTypes` and `openCaseTypePicker`:

```ts
import { useSurface } from "@beyo/hooks";
import {
  CASE_CREATION_SLIDE_SURFACE_ID,
  CASE_TYPE_PICKER_SHEET_SURFACE_ID,
  type CaseCreationSurfaceOpeners,
} from "@beyo/cases";

// inside useTaskStepDetailController:
const { open: openSurface } = useSurface();

const handleOpenCaseCreation = useCallback(() => {
  const surfaceOpeners: CaseCreationSurfaceOpeners = {
    openCaseTypePicker: (props) =>
      openSurface(CASE_TYPE_PICKER_SHEET_SURFACE_ID, props),
    // add openParticipantPicker here when that field is introduced (PLAN_32)
  };

  openSurface(CASE_CREATION_SLIDE_SURFACE_ID, {
    entityTypes: ["task"],
    surfaceOpeners,
  });
}, [openSurface]);
```

This is the **only** place in the codebase that calls `openSurface` for the picker sheet. The surface-opening responsibility stays in the app controller layer, consistent with every other surface open in the workers app.

`entityTypes: ["task"]` filters the picker to case types that are relevant for task-originated cases. Adjust per call-site context (e.g., `["item"]` for item-originated cases, omit for unfiltered).

---

### Step 16 — App: case creation slide page (`apps/workers-app/.../pages/cases/CaseCreationSlidePage.tsx`)

Add `usePreloadSurface` call on mount:

```tsx
import { usePreloadSurface } from "@beyo/hooks";
import { CaseCreationRouteEntry } from "@beyo/cases";

import { preloadCaseTypePickerSheetSurface } from "@/features/cases/surfaces";

export function CaseCreationSlidePage(): React.JSX.Element {
  usePreloadSurface(preloadCaseTypePickerSheetSurface);
  return <CaseCreationRouteEntry />;
}
```

`usePreloadSurface` fires on mount via a `useEffect` — the JS chunk for `CaseTypePickerSheetPage` starts loading as soon as the case creation slide mounts, before the user taps the trigger. Combined with Step 11's `prefetchQuery`, both code and data are in-flight immediately.

---

## Risks and mitigations

- Risk: `CaseCreationSlideSurfaceProps` changes from `Record<string, never>` to include `surfaceOpeners` (required in the type). The existing `handleOpenCaseCreation` passes `{}` — TypeScript will error until Step 17 is applied.
  Mitigation: Steps 2 and 17 must be applied together in the same implementation pass. `npm run typecheck` will surface the call-site error immediately. Adding future picker fields (PLAN_32+) only requires adding a new optional key to `CaseCreationSurfaceOpeners` and wiring it in the controller — the surface props type and provider signature stay unchanged.

- Risk: `onSelect` callback in sheet surface props — if the surface system ever URL-serializes sheet props, function values will be lost.
  Mitigation: Sheets (`surface: "sheet"`) use in-memory props only (no `path` function). This is confirmed by the existing `CaseMessageActionsSheetSurfaceProps.onRequestDelete` pattern. Document the assumption here.

- Risk: `caseTypeKeys.list(params)` cache key must match between the prefetch in `CaseCreationFormContent` and the query in `CaseTypePickerSheetContent`. Both must construct `params` identically.
  Mitigation: Both use `{ entity_type: entityTypes?.join(","), limit: 50 }`. The `entityTypes` value flows from the same provider context through surface props. Structural equality of the query key is maintained as long as the params object shape is consistent.

- Risk: `CaseTypePickerTriggerField` is a package component that needs to open an app-registered surface — a coupling that would require every consuming app to register `CASE_TYPE_PICKER_SHEET_SURFACE_ID` or face a silent failure.
  Mitigation: Resolved by Option A (callback injection). The trigger field calls `openCaseTypePicker` from context — a plain function with no knowledge of the surface system. The workers app controller (Step 17) provides the implementation. Apps that choose not to support the picker pass a no-op; the trigger remains visible but inert.

- Risk: `BoxPickerOptionType<string>` expects `value: string` but `CaseTypeId` is a branded type (`string & { _brand }`). Casting `caseType.client_id as string` in `toCaseTypePickerOption` loses the brand.
  Mitigation: Intentional — `BoxPickerOptionType<string>` cannot accept branded types without making `BoxPicker` generic over branded types (out of scope). The cast is safe because `CaseTypeId` is structurally identical to `string`.

- Risk: `entity_type` valid values are not firmly typed in `ListCaseTypesParams`. Passing unsupported values will cause a `400` from the backend.
  Mitigation: The `entity_type` param is a `string` in `ListCaseTypesParams` — the caller is responsible for passing valid comma-separated values. In the workers app, `entityTypes` comes from `CaseCreationSlideSurfaceProps` which is set by app code. No validation in the frontend — a `400` will propagate as an error state in the query hook.

## Validation plan

- `npm install` from `frontend/` — not needed (no new peer deps)
- `npm run typecheck` from `frontend/` — zero TypeScript errors
- `npm run build` for workers app — bundle succeeds; verify `CaseTypePickerSheetPage` chunk exists in output
- Manual smoke test:
  1. Open task detail slide → tap `MessageSquareMore` → case creation slide opens
  2. In network tab: `CaseTypePickerSheetPage` JS chunk loads immediately; `GET /api/v1/case-types` fires immediately
  3. Tap "Select case type" trigger → picker sheet opens with 2-column grid
  4. Select a case type → sheet closes → trigger shows image + name + description
  5. Tap trigger again → picker sheet opens with the previous selection highlighted
  6. Tap "Create case" → `POST /api/v1/cases` body includes `case_type_id` and `type_label`
  7. After successful creation → trigger resets to "Select case type"
  8. Create a case without selecting a type → payload has neither `case_type_id` nor `type_label`

## Review log

_(empty — awaiting first review)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
