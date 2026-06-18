# PLAN_upholstery_inventory_creation_followup_20260618

## Metadata

- Plan ID: `PLAN_upholstery_inventory_creation_followup_20260618`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-18T17:30:00Z`
- Last updated at (UTC): `2026-06-18T18:41:52Z`
- Related issue/ticket: n/a
- Source review: post-implementation drift/gap analysis of `PLAN_upholstery_inventory_creation_20260618` + backend change (list endpoint now returns `current_amount_in_need_meters`) + backend handoff `HANDOFF_TO_FRONTEND_upholstery_update_endpoints_20260618`

## Goal and intent

- Goal: (A) Correct three code-quality issues in the creation slide. (B) Surface "available" amount (stored − need) as the primary value on the list card and detail page. (C) Reuse the creation slide as an edit form — opened from the detail footer's Edit button — routing changed fields to the correct PATCH endpoint(s).
- Business/user intent: The 409 conflict message must reliably reach the user. Form entry performance must match other creation forms. The available quantity is the operationally meaningful number for a manager. Editing an upholstery without leaving the detail slide keeps the workflow tight.
- Non-goals: No staged form / multi-step flow for editing. No inline editing on the detail page itself. No changes to the stored-amount editor flow. No changes to ordering or pending-upholstery features. No support for editing `current_stored_amount_meters` via this form (that field is not updatable by either PATCH endpoint — use the dedicated stored-amount editor).

## Scope

- In scope:
  - `features/upholstery-inventory/lib/decimal.ts` — `subtractMeters` utility (step 4).
  - `features/upholstery-inventory/types.ts` — schema additions, view-model additions, transformer updates, `EditInventoryPrefill` type (steps 5, 8).
  - `features/upholstery-inventory/components/InventoryListCard.tsx` — available as primary value (step 6).
  - `features/upholstery-inventory/components/InventoryQuantityOverview.tsx` — badge pills (step 7).
  - `features/upholstery-inventory/api/update-upholstery.ts` — new PATCH upholstery fields (step 9).
  - `features/upholstery-inventory/api/update-upholstery-inventory-fields.ts` — new PATCH inventory planning fields (step 10).
  - `features/upholstery-inventory/actions/use-update-inventory.ts` — new split mutation hook (step 11).
  - `features/upholstery-inventory/surfaces.ts` — `InventoryCreationSurfaceProps` type (step 12).
  - `features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx` — code-quality corrections + edit mode (steps 1–3, 13).
  - `features/upholstery-inventory/controllers/use-inventory-detail.controller.ts` — `openEdit()` (step 14).
  - `features/upholstery-inventory/components/InventoryDetailFooter.tsx` — wire Edit button (step 15).
  - `features/upholstery-inventory/pages/UpholsteryInventoryDetailSlidePage.tsx` — pass `onEdit` to footer (step 16).
- Out of scope:
  - Workers app. Any file outside `features/upholstery-inventory/`. Routes, FAB, ordering features.
- Assumptions:
  - The list endpoint returns `current_amount_in_need_meters` (nullable string decimal) — confirmed by user; Codex must verify the field name matches exactly before adding to schema.
  - `PATCH /api/v1/upholsteries/{client_id}` accepts `name`, `code`, `image_url`, `favorite`. `null` values are treated as no-op by the backend (confirmed in handoff). Codex should only send fields that differ from the original.
  - `PATCH /api/v1/upholstery-inventories/{client_id}` accepts `low_stock_threshold_meters` (and other planning fields not in this form). Returns `{}` — no response body to consume; invalidation drives the refresh.
  - `favorite` was missing from `UpholsteryInventoryDetailSchema` — confirmed that the backend returns it; already added to the schema (not a Codex task).
  - `useSurfaceProps()` returns `undefined` when no props were passed to `open()` — this is how create mode is detected (no props → create, props with `mode: "edit"` → edit).
  - `useSurfaceHeader()` is a thin wrapper over `useContext(SurfaceHeaderContext)` — confirmed.
  - `Controller` and `useWatch` from `react-hook-form` are available.
  - `TextInput` from `@/components/primitives` — Codex verifies whether it forwards ref. If not, omit `ref={field.ref}`.

## Clarifications required

_(none — all open questions resolved by handoff and codebase reads)_

## Acceptance criteria

1. After step 1: 409 conflict response surfaces the backend error string; network/Zod failures surface the generic "Could not create inventory. Please try again."
2. After step 2: no `form.watch()` / `form.setValue()` remain; one `useWatch` at the top for image preview; `Controller` per field.
3. After step 3: `SurfaceHeaderContext` and `useContext` not imported; `useSurfaceHeader` used.
4. After step 5: `UpholsteryInventoryPartialSchema` includes `current_amount_in_need_meters`. Both view models expose `availableDisplay`, `availableIsPositive`, `availableIsNegative`.
5. After step 6: list card shows "Available" as large primary, "Stored" + optional "Ordered" as smaller secondary; negative available shown in `text-destructive`.
6. After step 7: detail quantity overview shows green `+X m` badge on "Stored" label when positive; red `X m` badge on "In need" label when negative; no badge at zero.
7. After step 8: `UpholsteryInventoryDetailSchema` includes `favorite: z.boolean()`. `types.ts` exports `EditInventoryPrefill`.
8. After steps 9–11: two new API functions and one mutation hook exist; the mutation determines which endpoint(s) to call by comparing submitted values to the original prefill, and calls them in parallel via `Promise.all`.
9. After steps 12–16: tapping "Edit" on the inventory detail footer opens the creation slide in edit mode — title "Edit inventory", fields pre-filled, "Save" button. Submitting calls the relevant PATCH endpoint(s), closes the slide on success, and invalidates both list and detail queries. `current_stored_amount_meters` field is hidden in edit mode (not updatable via this form). If nothing changed, the slide closes without an API call.
10. `npm run typecheck` passes with zero errors after all sixteen steps.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: `onError` shape; `onSettled` for invalidation; parallel mutations via `Promise.all`.
- `architecture/08_hooks.md`: mutation hook ownership; `onError` driving local state acceptable in page component.
- `architecture/07_components.md`: `Controller` per field; `fieldState.error` for inline validation.
- `architecture/02_types.md`: view-model transformer pattern; derived display fields belong in the transformer.
- Backend handoff `HANDOFF_TO_FRONTEND_upholstery_update_endpoints_20260618`: endpoint contracts, null semantics, split routing.

### File read intent — pattern vs. relational

Permitted reads performed:

- `packages/api-client/src/api-client.ts` lines 12–22: `ApiRequestError` shape — determines step 1 guard.
- `features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx`: import list, field wiring, current `onError` — steps 1–3, 13.
- `features/upholstery-inventory/lib/decimal.ts`: `toDecimal`, `Decimal`, `metersFormatter` availability — step 4.
- `features/upholstery-inventory/types.ts`: schema fields, view-model shapes, transformers — steps 5, 8.
- `features/upholstery-inventory/components/InventoryListCard.tsx`: bottom row layout — step 6.
- `features/upholstery-inventory/components/InventoryQuantityOverview.tsx`: `Metric` component shape — step 7.
- `features/upholstery-inventory/surfaces.ts`: existing props types, `lazyWithPreload` shape — step 12.
- `features/upholstery-inventory/controllers/use-inventory-detail.controller.ts`: existing functions, `detail.raw` fields available — step 14.
- `features/upholstery-inventory/components/InventoryDetailFooter.tsx`: Edit button (currently no-op) — step 15.
- `features/upholstery-inventory/pages/UpholsteryInventoryDetailSlidePage.tsx`: how `InventoryDetailFooter` is rendered — step 16.
- `features/upholstery-inventory/api/get-upholstery-inventory.ts`: confirmed `client_id` = `UpholsteryInventoryId`, `upholstery_id` = `UpholsteryId` — step 9/10 path params.

Prohibited: no action/query hooks read for pattern reference.

### Skill selection

- Primary skill: `skills/cross_cutting/intention_planning/SKILL.md`.

## Implementation plan

**Group A (steps 1–3):** creation slide code-quality corrections — single file.
**Group B (steps 4–7):** available amount display — 4 files, apply 5 before 6 and 7.
**Group C (steps 8–16):** edit flow — apply in order; step 8 before 11 (types needed by mutation); steps 9–10 before 11; steps 11–12 before 13; steps 13–14 before 15–16.

---

### Step 1 — `UpholsteryInventoryCreationSlidePage.tsx` — fix `onError` error-message extraction

The guard `"message" in apiError && ...` is always truthy for any JS `Error`, so network failures surface raw internal strings.

**Change `import type` to a value import:**

```ts
// BEFORE
import type { ApiRequestError } from "@/lib/api-client";

// AFTER
import { ApiRequestError } from "@/lib/api-client";
```

**Replace the `onError` body:**

```ts
// BEFORE
onError: (error) => {
  const apiError = error as ApiRequestError | Error;
  setSubmitError(
    "message" in apiError &&
      typeof apiError.message === "string" &&
      apiError.message.length > 0
      ? apiError.message
      : "Could not create inventory. Please try again.",
  );
},

// AFTER
onError: (error) => {
  setSubmitError(
    error instanceof ApiRequestError
      ? error.message
      : "Could not create inventory. Please try again.",
  );
},
```

---

### Step 2 — `UpholsteryInventoryCreationSlidePage.tsx` — replace `form.watch()` + `form.setValue()` with `Controller`

**Imports:**

```ts
// BEFORE
import { useForm, type FieldErrors } from "react-hook-form";

// AFTER
import { Controller, useForm, useWatch } from "react-hook-form";
```

**Remove `getFieldError` helper** and all five `const *Error` variables.

**Replace top-level imageUrl watch:**

```ts
// BEFORE
const imageUrl = form.watch("image_url");

// AFTER
const imageUrl = useWatch({ control: form.control, name: "image_url" });
```

**Replace each field with `Controller`.** Pattern for all five `TextInput` fields:

```tsx
<Controller
  name="<fieldName>"
  control={form.control}
  render={({ field, fieldState }) => (
    <>
      <TextInput
        ref={field.ref}
        id="<id>"
        invalid={Boolean(fieldState.error)}
        value={field.value ?? ""}
        wrapperClassName="bg-card"
        onChange={(event) => field.onChange(event.target.value)}
        onBlur={field.onBlur}
      />
      {fieldState.error ? (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      ) : null}
    </>
  )}
/>
```

For `image_url`: `field.onChange(event.target.value || null)` (empty string → null).
For `current_stored_amount_meters` and `low_stock_threshold_meters`: same null coerce; add `inputMode="decimal"` and `placeholder="0.000"`.

**Favorite (`SwitchCheckbox`):**

```tsx
<Controller
  name="favorite"
  control={form.control}
  render={({ field }) => (
    <SwitchCheckbox
      checked={field.value}
      onChange={(event) => field.onChange(event.target.checked)}
    />
  )}
/>
```

---

### Step 3 — `UpholsteryInventoryCreationSlidePage.tsx` — use `useSurfaceHeader()` hook

```ts
// BEFORE
import { useContext, useEffect, useState } from "react";
import { SurfaceHeaderContext, useSurfaceStore } from "@/providers/SurfaceProvider";
const header = useContext(SurfaceHeaderContext);

// AFTER
import { useEffect, useState } from "react";
import { useSurfaceStore } from "@/providers/SurfaceProvider";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
const header = useSurfaceHeader();
```

---

### Step 4 — `lib/decimal.ts` — add `subtractMeters` utility

```ts
// Add at end of file:
export function subtractMeters(
  a: string | null,
  b: string | null,
): { display: string; isPositive: boolean; isNegative: boolean } {
  const decA = toDecimal(a) ?? new Decimal(0);
  const decB = toDecimal(b) ?? new Decimal(0);
  const result = decA.minus(decB);
  const display = `${metersFormatter.format(
    Number(result.toDecimalPlaces(3).toFixed(3)),
  )} m`;
  return {
    display,
    isPositive: result.greaterThan(0),
    isNegative: result.isNegative(),
  };
}
```

`Decimal` and `metersFormatter` are already in scope — no new imports.

---

### Step 5 — `types.ts` — available fields in schemas and view models

**5a — Add `current_amount_in_need_meters` to `UpholsteryInventoryPartialSchema`:**

```ts
// BEFORE (last two fields)
  current_amount_ordered_meters: nullableDecimal,
  updated_at: nullableDate,

// AFTER
  current_amount_ordered_meters: nullableDecimal,
  current_amount_in_need_meters: nullableDecimal,
  updated_at: nullableDate,
```

**5b — Add `subtractMeters` to the decimal import:**

```ts
// BEFORE
import { formatMeters, isPositive } from "./lib/decimal";

// AFTER
import { formatMeters, isPositive, subtractMeters } from "./lib/decimal";
```

**5c — Add `availableDisplay / availableIsPositive / availableIsNegative` to `InventoryListCardViewModel`:**

```ts
export type InventoryListCardViewModel = {
  inventoryId: UpholsteryInventoryId;
  name: string;
  code: string;
  imageUrl: string | null;
  availableDisplay: string;
  availableIsPositive: boolean;
  availableIsNegative: boolean;
  storedDisplay: string;
  orderedDisplay: string | null;
  condition: InventoryConditionPresentation;
};
```

**5d — Same three fields on `InventoryDetailViewModel`:**

```ts
export type InventoryDetailViewModel = {
  inventoryId: UpholsteryInventoryId;
  name: string;
  code: string;
  imageUrl: string | null;
  availableDisplay: string;
  availableIsPositive: boolean;
  availableIsNegative: boolean;
  storedDisplay: string;
  orderedDisplay: string;
  inNeedDisplay: string;
  inUseDisplay: string;
  totalUsedDisplay: string;
  condition: InventoryConditionPresentation;
  raw: UpholsteryInventoryDetail;
};
```

**5e — Update `toInventoryListCardViewModel`:**

```ts
export function toInventoryListCardViewModel(item: UpholsteryInventoryPartial): InventoryListCardViewModel {
  const available = subtractMeters(
    item.current_stored_amount_meters,
    item.current_amount_in_need_meters,
  );
  return {
    ...                           // existing fields unchanged
    availableDisplay: available.display,
    availableIsPositive: available.isPositive,
    availableIsNegative: available.isNegative,
  };
}
```

**5f — Update `toInventoryDetailViewModel`:**

```ts
export function toInventoryDetailViewModel(item: UpholsteryInventoryDetail): InventoryDetailViewModel {
  const available = subtractMeters(
    item.current_stored_amount_meters,
    item.current_amount_in_need_meters,
  );
  return {
    ...                           // existing fields unchanged
    availableDisplay: available.display,
    availableIsPositive: available.isPositive,
    availableIsNegative: available.isNegative,
  };
}
```

---

### Step 6 — `InventoryListCard.tsx` — available as primary value

Replace the bottom row:

```tsx
// BEFORE
<div className="mt-auto flex items-end gap-4 pt-3">
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground">Stored</span>
    <span className="text-lg font-semibold text-foreground">{card.storedDisplay}</span>
  </div>
  {card.orderedDisplay ? (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-muted-foreground">Ordered</span>
      <span className="text-base font-semibold text-foreground">{card.orderedDisplay}</span>
    </div>
  ) : null}
</div>

// AFTER
<div className="mt-auto flex items-end gap-3 pt-3">
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground">Available</span>
    <span
      className={`text-lg font-semibold ${
        card.availableIsNegative ? "text-destructive" : "text-foreground"
      }`}
    >
      {card.availableDisplay}
    </span>
  </div>
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground">Stored</span>
    <span className="text-sm font-medium text-foreground/60">{card.storedDisplay}</span>
  </div>
  {card.orderedDisplay ? (
    <div className="flex flex-col">
      <span className="text-xs font-medium text-muted-foreground">Ordered</span>
      <span className="text-sm font-medium text-foreground/60">{card.orderedDisplay}</span>
    </div>
  ) : null}
</div>
```

---

### Step 7 — `InventoryQuantityOverview.tsx` — badge pills on stored / in-need metrics

**7a — Add `cn` import:**

```ts
import { cn } from "@/lib/utils";
```

**7b — Extend `Metric` with optional `badge` prop:**

```tsx
function Metric({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: { text: string; positive: boolean };
}): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {badge ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold leading-tight",
              badge.positive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}
```

**7c — Add positive badge to the "Stored" button label:**

```tsx
// BEFORE
<span className="text-xs font-medium text-muted-foreground">Stored</span>

// AFTER
<div className="flex items-center gap-1.5">
  <span className="text-xs font-medium text-muted-foreground">Stored</span>
  {detail.availableIsPositive ? (
    <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-semibold leading-tight text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
      +{detail.availableDisplay}
    </span>
  ) : null}
</div>
```

**7d — Pass negative badge to the "In need" Metric:**

```tsx
// BEFORE
<Metric label="In need" value={detail.inNeedDisplay} />

// AFTER
<Metric
  label="In need"
  value={detail.inNeedDisplay}
  badge={
    detail.availableIsNegative
      ? { text: detail.availableDisplay, positive: false }
      : undefined
  }
/>
```

---

### Step 8 — `types.ts` — add `favorite` to detail schema and `EditInventoryPrefill` type

**8a — Add `favorite` to `UpholsteryInventoryDetailSchema`** (the field is in the partial schema but was omitted from the detail schema):

```ts
// Add alongside image_url in UpholsteryInventoryDetailSchema:
  image_url: z.string().nullable(),
  favorite: z.boolean(),            // ← add
  inventory_condition: InventoryConditionSchema,
```

**8b — Add `EditInventoryPrefill` type** (add after `CreateInventoryPayload`):

```ts
export type EditInventoryPrefill = {
  name: string;
  code: string;
  image_url: string | null;
  low_stock_threshold_meters: string | null;
  favorite: boolean;
};
```

---

### Step 9 — `api/update-upholstery.ts` — PATCH upholstery fields

Create new file:

```ts
import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import type { UpholsteryId } from "@/types/common";

export type UpdateUpholsteryPayload = {
  name?: string;
  code?: string | null;
  image_url?: string | null;
  favorite?: boolean;
};

const UpdateUpholsteryResponseSchema = z.object({}).passthrough();

export async function updateUpholstery(
  upholsteryId: UpholsteryId,
  payload: UpdateUpholsteryPayload,
): Promise<void> {
  await apiClient.patch(
    `/api/v1/upholsteries/${upholsteryId}`,
    UpdateUpholsteryResponseSchema,
    payload,
  );
}
```

All payload fields are optional — only changed fields are sent (determined by the mutation hook in step 11).

---

### Step 10 — `api/update-upholstery-inventory-fields.ts` — PATCH inventory planning fields

Create new file:

```ts
import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import type { UpholsteryInventoryId } from "@/types/common";

export type UpdateUpholsteryInventoryFieldsPayload = {
  low_stock_threshold_meters?: string | null;
};

const UpdateInventoryFieldsResponseSchema = z.object({}).passthrough();

export async function updateUpholsteryInventoryFields(
  inventoryId: UpholsteryInventoryId,
  payload: UpdateUpholsteryInventoryFieldsPayload,
): Promise<void> {
  await apiClient.patch(
    `/api/v1/upholstery-inventories/${inventoryId}`,
    UpdateInventoryFieldsResponseSchema,
    payload,
  );
}
```

Response is a bare `{}` — confirmed by user. No envelope wrapper.

---

### Step 11 — `actions/use-update-inventory.ts` — split mutation hook

Create new file:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { normalizeNonNegativeDecimalString } from "../lib/decimal";
import { invalidateAfterInventoryMutation } from "../lib/invalidate-inventory";
import type { CreateInventoryFormValues, EditInventoryPrefill } from "../types";
import { updateUpholstery } from "../api/update-upholstery";
import { updateUpholsteryInventoryFields } from "../api/update-upholstery-inventory-fields";
import type { UpholsteryId } from "@/types/common";
import type { UpholsteryInventoryId } from "@/types/common";

export type UpdateInventoryInput = {
  upholsteryId: UpholsteryId;
  inventoryId: UpholsteryInventoryId;
  values: CreateInventoryFormValues;
  original: EditInventoryPrefill;
};

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      upholsteryId,
      inventoryId,
      values,
      original,
    }: UpdateInventoryInput): Promise<void> => {
      const promises: Promise<void>[] = [];

      // — Upholstery fields: name, code, image_url, favorite —
      const normalizedName = values.name.trim();
      const normalizedCode = values.code.trim() || null;
      const normalizedImageUrl = values.image_url?.trim() || null;

      const upholsteryChanged =
        normalizedName !== original.name ||
        normalizedCode !== original.code ||
        normalizedImageUrl !== original.image_url ||
        values.favorite !== original.favorite;

      if (upholsteryChanged) {
        promises.push(
          updateUpholstery(upholsteryId, {
            name: normalizedName,
            code: normalizedCode,
            image_url: normalizedImageUrl,
            favorite: values.favorite,
          }),
        );
      }

      // — Inventory fields: low_stock_threshold_meters —
      const normalizedThreshold = values.low_stock_threshold_meters
        ? (normalizeNonNegativeDecimalString(values.low_stock_threshold_meters) ?? null)
        : null;
      const normalizedOriginalThreshold = original.low_stock_threshold_meters
        ? (normalizeNonNegativeDecimalString(original.low_stock_threshold_meters) ?? null)
        : null;

      const inventoryChanged = normalizedThreshold !== normalizedOriginalThreshold;

      if (inventoryChanged) {
        promises.push(
          updateUpholsteryInventoryFields(inventoryId, {
            low_stock_threshold_meters: normalizedThreshold,
          }),
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    },
    onSettled: (_data, _error, variables) => {
      invalidateAfterInventoryMutation(queryClient, {
        inventoryId: variables.inventoryId,
      });
    },
  });
}
```

`onSettled` (not `onSuccess`) ensures invalidation happens even on partial failure. Passing `{ inventoryId }` to `invalidateAfterInventoryMutation` additionally invalidates the specific detail query so the detail page refetches immediately after edit.

---

### Step 12 — `surfaces.ts` — add `InventoryCreationSurfaceProps` type

Add after the existing `StoredAmountSurfaceProps` type:

```ts
import type { UpholsteryId } from "@/types/common";
import type { EditInventoryPrefill } from "./types";

export type InventoryCreationSurfaceProps = {
  mode: "edit";
  upholsteryId: UpholsteryId;
  inventoryId: UpholsteryInventoryId;
  prefill: EditInventoryPrefill;
};
```

No change to `upholsteryInventorySurfaces` — the surface registration is unchanged. The type is used by the slide page (step 13) and the controller (step 14) only.

---

### Step 13 — `UpholsteryInventoryCreationSlidePage.tsx` — edit mode support

This step extends the file already corrected in steps 1–3. Apply after those steps.

**New imports to add:**

```ts
import { useSurfaceProps } from "@/hooks/use-surface-props";
import { useUpdateInventory } from "../actions/use-update-inventory";
import type { InventoryCreationSurfaceProps } from "../surfaces";
```

**Add props read and mode detection** at the top of the component body (after existing hook calls):

```ts
const props = useSurfaceProps<InventoryCreationSurfaceProps>();
const isEditMode = props?.mode === "edit";
```

**Add the update mutation** alongside the existing create mutation:

```ts
const createInventory = useCreateInventory();
const updateInventory = useUpdateInventory();
```

**Update `useEffect` title** to branch on mode:

```ts
useEffect(() => {
  header?.setTitle(isEditMode ? "Edit inventory" : "New inventory");
  header?.setActions(null);
}, [header, isEditMode]);
```

**Update `useForm` defaultValues** to prefill from props in edit mode:

```ts
const form = useForm<CreateInventoryFormValues>({
  resolver: zodResolver(CreateInventoryFormSchema),
  defaultValues: isEditMode && props?.prefill
    ? {
        name: props.prefill.name,
        code: props.prefill.code,
        image_url: props.prefill.image_url,
        current_stored_amount_meters: null,   // not updatable — field hidden in edit mode
        low_stock_threshold_meters: props.prefill.low_stock_threshold_meters,
        favorite: props.prefill.favorite,
      }
    : {
        name: "",
        code: "",
        image_url: null,
        current_stored_amount_meters: null,
        low_stock_threshold_meters: null,
        favorite: false,
      },
});
```

**Replace `handleSubmit`** to branch on mode:

```ts
function handleSubmit(values: CreateInventoryFormValues): void {
  setSubmitError(null);

  if (isEditMode && props) {
    // — nothing changed: skip API, just close —
    const nameUnchanged = values.name.trim() === props.prefill.name;
    const codeUnchanged = (values.code.trim() || null) === props.prefill.code;
    const imageUnchanged = (values.image_url?.trim() || null) === props.prefill.image_url;
    const favoriteUnchanged = values.favorite === props.prefill.favorite;
    const thresholdUnchanged =
      (values.low_stock_threshold_meters ?? null) ===
      (props.prefill.low_stock_threshold_meters ?? null);

    if (nameUnchanged && codeUnchanged && imageUnchanged && favoriteUnchanged && thresholdUnchanged) {
      useSurfaceStore.getState().close(INVENTORY_CREATION_SLIDE_ID);
      return;
    }

    updateInventory.mutate(
      {
        upholsteryId: props.upholsteryId,
        inventoryId: props.inventoryId,
        values,
        original: props.prefill,
      },
      {
        onSuccess: () => {
          useSurfaceStore.getState().close(INVENTORY_CREATION_SLIDE_ID);
        },
        onError: (error) => {
          setSubmitError(
            error instanceof ApiRequestError
              ? error.message
              : "Could not save changes. Please try again.",
          );
        },
      },
    );
    return;
  }

  // — create mode —
  const payload = {
    name: values.name.trim(),
    code: values.code.trim() || null,
    image_url: values.image_url?.trim() || null,
    current_stored_amount_meters:
      normalizeNonNegativeDecimalString(values.current_stored_amount_meters ?? "") ?? null,
    low_stock_threshold_meters: values.low_stock_threshold_meters
      ? (normalizeNonNegativeDecimalString(values.low_stock_threshold_meters) ?? null)
      : null,
    favorite: values.favorite,
  };

  createInventory.mutate(payload, {
    onSuccess: () => {
      useSurfaceStore.getState().close(INVENTORY_CREATION_SLIDE_ID);
    },
    onError: (error) => {
      setSubmitError(
        error instanceof ApiRequestError
          ? error.message
          : "Could not create inventory. Please try again.",
      );
    },
  });
}
```

**Hide the "Stored amount" ContentCard in edit mode** — it is not updatable via either PATCH endpoint:

```tsx
{/* Card 3: stored amount — create mode only */}
{!isEditMode ? (
  <ContentCard>
    {/* ... current_stored_amount_meters field ... */}
  </ContentCard>
) : null}
```

**Update the `isPending` check and submit button label:**

```tsx
<button
  className="..."
  disabled={isEditMode ? updateInventory.isPending : createInventory.isPending}
  type="button"
  onClick={form.handleSubmit(handleSubmit)}
>
  {isEditMode ? "Save" : "Create"}
</button>
```

---

### Step 14 — `controllers/use-inventory-detail.controller.ts` — add `openEdit()`

Add after `openDetailActions`:

```ts
import {
  INVENTORY_CREATION_SLIDE_ID,
  INVENTORY_DETAIL_ACTIONS_SHEET_ID,
  STORED_AMOUNT_SHEET_ID,
  type InventoryCreationSurfaceProps,
  type InventoryDetailActionsSurfaceProps,
  type StoredAmountSurfaceProps,
} from "../surfaces";

function openEdit(): void {
  if (!detail) return;
  useSurfaceStore.getState().open(INVENTORY_CREATION_SLIDE_ID, {
    mode: "edit",
    upholsteryId: detail.raw.upholstery_id,
    inventoryId: detail.raw.client_id,
    prefill: {
      name: detail.raw.upholstery_name ?? "",
      code: detail.raw.upholstery_code ?? "",
      image_url: detail.raw.image_url,
      low_stock_threshold_meters: detail.raw.low_stock_threshold_meters,
      favorite: detail.raw.favorite,
    },
  } satisfies InventoryCreationSurfaceProps);
}
```

Add `openEdit` to the return object:

```ts
return {
  inventoryId,
  detail,
  isPending: query.isPending,
  isError: query.isError,
  refetch,
  openStoredAmountEditor,
  openDetailActions,
  openEdit,              // ← add
};
```

---

### Step 15 — `InventoryDetailFooter.tsx` — wire the Edit button

```tsx
// BEFORE
export function InventoryDetailFooter({
  isHidden = false,
}: {
  isHidden?: boolean;
}): React.JSX.Element {
  ...
  <button className="..." type="button">
    Edit
  </button>

// AFTER
export function InventoryDetailFooter({
  isHidden = false,
  onEdit,
}: {
  isHidden?: boolean;
  onEdit?: () => void;
}): React.JSX.Element {
  ...
  <button className="..." type="button" onClick={onEdit}>
    Edit
  </button>
```

---

### Step 16 — `UpholsteryInventoryDetailSlidePage.tsx` — pass `onEdit` to footer

```tsx
// BEFORE
<InventoryDetailFooter isHidden={isHidden} />

// AFTER
<InventoryDetailFooter isHidden={isHidden} onEdit={controller.openEdit} />
```

---

## Risks and mitigations

- Risk: `current_amount_in_need_meters` field name in the list API response differs from the assumed name. Zod parse would succeed (passthrough schema) but `subtractMeters` would always receive `null`, making available equal to stored.
  Mitigation: Codex verifies the exact field name in a real API response or the backend serializer before adding to schema.

- Risk: If both PATCH calls run in parallel and one fails, `Promise.all` rejects — the slide shows an error but one endpoint already mutated. The user sees an error even though part of the edit went through.
  Mitigation: Acceptable trade-off for simplicity. `onSettled` always invalidates so the data will be consistent with server state. The user can re-submit if needed (idempotent fields).

- Risk: `TextInput` does not forward `ref`, causing a React warning.
  Mitigation: Codex checks `forwardRef` usage. If absent, omit `ref={field.ref}`.

- Risk: `import type { ApiRequestError }` → value import may not tree-shake if the barrel only re-exports the type.
  Mitigation: `src/lib/api-client.ts` re-exports from `@beyo/api-client` which exports the class value — confirmed.

- Risk: The available badge on the "Stored" stored-amount row in step 7 shows `+12.500 m` which may overflow the small pill.
  Mitigation: Verify visually. Add `max-w-[5.5rem] truncate` to the pill span if needed.

## Validation plan

- `npm run typecheck`: zero TypeScript errors after all sixteen steps.
- Manual — 409 on create: submit with duplicate name; backend error string appears inline.
- Manual — network failure on create: block network; generic fallback message appears.
- Manual — field re-render: type in name field; only name Controller subtree re-renders.
- Manual — list card available (positive): card shows "Available" as large primary; "Stored" smaller beside it.
- Manual — list card available (negative): available value shown in `text-destructive`.
- Manual — detail badge (positive): green `+X m` badge on "Stored" label.
- Manual — detail badge (negative): red `X m` badge on "In need" label.
- Manual — detail badge (zero): no badge on either label.
- Manual — edit open: tap Edit in detail footer; slide opens titled "Edit inventory" with fields pre-filled from the current inventory data; "Stored amount" field is absent.
- Manual — edit save (upholstery change only): change name; tap Save; only upholstery PATCH fires (verify via network tab); slide closes; detail refreshes with new name.
- Manual — edit save (inventory change only): change low_stock_threshold only; tap Save; only inventory PATCH fires; slide closes; detail refreshes.
- Manual — edit save (both): change name and threshold; tap Save; both PATCHes fire in parallel; slide closes.
- Manual — edit save (no change): open edit; change nothing; tap Save; no network request; slide closes.
- Manual — edit 409: submit with a name that already exists; backend error string appears inline.

## Review log

- `2026-06-18` `claude-sonnet-4-6`: Plan authored from post-implementation review. Three targeted corrections, single file.
- `2026-06-18` `claude-sonnet-4-6`: Extended with steps 4–7 — available amount display feature.
- `2026-06-18` `claude-sonnet-4-6`: Extended with steps 8–16 — edit flow via two split PATCH endpoints. `favorite` field gap in detail schema identified and corrected. Split-mutation logic routes changed fields to the correct endpoint.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` — no open clarifications; ready for Codex immediately.
- Transition owner: `David` / `claude-sonnet-4-6`
