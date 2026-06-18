# PLAN_upholstery_inventory_creation_20260618

## Metadata

- Plan ID: `PLAN_upholstery_inventory_creation_20260618`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-06-18T12:30:00Z`
- Last updated at (UTC): `2026-06-18T15:56:45Z`
- Related issue/ticket: n/a
- Intention plan: `docs/architecture/under_construction/upholstery_inventory_creation.md`

## Goal and intent

- Goal: Add a creation flow to the upholstery inventory page — a FAB that expands to one sub-button, opening a slide-page form with six fields, an absolute two-button footer, and post-submit invalidation of the inventory list.
- Business/user intent: Allow managers to create new upholstery inventory records directly from the inventory list page without leaving the section. The FAB follows the established task-creation pattern so the interaction is consistent. The form is a single-step page (no staged steps) with independent ContentCard fields, mirroring the task creation field style.
- Non-goals: No staged form / multi-step flow. No image upload via camera or file picker — only a URL field with a preview. No form validation pop-ups — inline error only on submit. No editing of existing inventories via this flow. No changes to any feature outside `features/upholstery-inventory/` and `pages/upholstery-inventory/`.

## Scope

- In scope:
  - `features/upholstery-inventory/` — new API function, action hook, creation slide page, FAB component; `types.ts` and `surfaces.ts` additions; `index.ts` export.
  - `pages/upholstery-inventory/UpholsteryInventoryPage.tsx` — add FAB alongside route entry.
  - The creation surface is registered automatically via the existing `upholsteryInventorySurfaces` spread in `app/surface-registry.ts` (no change to that file).
- Out of scope:
  - Any other feature or page.
  - `app/surface-registry.ts` — already uses `...upholsteryInventorySurfaces`, no change needed.
  - Workers app.
- Assumptions:
  - `apiClient.put(path, schema, body)` exists at the same signature as `apiClient.patch` (confirmed in `api-client.ts`). Codex must verify the method name before writing step 2.
  - The backend endpoint is `PUT /api/v1/upholsteries` (not `POST /api/v1/upholstery-inventories`). This atomically creates **both** an upholstery record and its linked inventory row. The response contains a nested `upholstery` object; the response body is not consumed by the frontend (passthrough schema pattern).
  - `invalidateAfterInventoryMutation(queryClient)` (without `inventoryId`) is sufficient post-create; it already invalidates `upholsteryInventoryKeys.lists()` and `upholsteryKeys.pickerLists()`, which covers all pre-loaded filter queries and the upholstery picker.
  - `BoxPicker` option objects accept an `Icon` field (Lucide component) rendered when `showIcon` is not `false`. Codex must verify the exact option type from `@beyo/ui`'s TypeScript exports before writing the option array.
  - `useSurfaceHeader().setTitle(...)` sets the slide surface title; `useSurfaceHeader().requestClose()` closes the slide (same pattern as `StoredAmountSheetPage`).
  - The FAB uses the same `fixed z-40 bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4` position as `TaskCreationFab`. Verify visual placement during manual validation.

## Clarifications required

- [x] ~~Provide the backend handoff for the creation endpoint.~~ **Resolved** — handoff at `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_create_upholstery_contract_20260618.md`. Key findings:
  - Method: `PUT` (not `POST`)
  - Path: `/api/v1/upholsteries` (not `/api/v1/upholstery-inventories`)
  - This atomically creates an upholstery + its linked inventory row.
  - Only `name` is required; `code` is optional (but if provided must be unique).
  - `current_stored_amount_meters` must be `>= 0` if provided; `low_stock_threshold_meters` must be `> 0` if provided.
  - 409 Conflict returned when name or code is already taken in the workspace — error message in `data.error` field.
  - All field names match the assumed payload names.
  - Plan updates to steps 1, 2, 5 have been applied below.

## Acceptance criteria

1. Tapping the "+" FAB on the inventory page expands it (main button becomes "X", scales to 0.7) and reveals one sub-button (Spool icon, label "New inventory") positioned straight up at `y=-72`. Tapping the sub-button closes the FAB menu and opens the creation slide. Tapping the "X" closes the FAB without navigating.
2. The creation slide page is titled "New inventory" (via `useSurfaceHeader().setTitle`). It contains six independent `ContentCard` groups matching the field list, in scroll order: name/code card, image_url card (with preview), stored-amount card, low-stock-threshold card, favorite card.
3. The image preview below the `image_url` input appears when the field is non-empty and hides via `onError` when the URL is not a valid image.
4. An absolute footer (`fixed bottom-0 left-0 right-0 z-20`) contains two buttons: "Close & Back" (`requestClose`) and "Create" (submit). The scrollable area has bottom padding large enough that the last form field can scroll fully into view above the footer.
5. Submitting a valid form (name and code non-empty) calls the API, closes the slide on success, and invalidates `upholsteryInventoryKeys.lists()` so the inventory list re-fetches the active filter.
6. The "Create" button is disabled while `createInventory.isPending`; no duplicate submission is possible.
7. A failed submission shows an inline error message ("Could not create inventory. Please try again.") below the last ContentCard; the slide stays open.
8. Only `name` is required; `code` is optional. Attempting to submit with an empty name shows a per-field inline error and blocks the API call. A 409 conflict (duplicate name or code) surfaces the backend's error string inline below the form.
9. `low_stock_threshold_meters` must be `> 0` if non-empty; the form validates this client-side before submitting.

## Contracts and skills

### Contracts loaded

- `architecture/05_server_state.md`: `useMutation` shape, `onSuccess` / `onError` semantics, `invalidateQueries` after mutation.
- `architecture/08_hooks.md`: mutation hook ownership, `use-` prefix, one mutation per file.
- `architecture/07_components.md`: `ContentCard` as layout wrapper; `FieldLabelRow` for field label row.
- `architecture/02_types.md`: Zod schema + `z.infer<>` pattern for form values; payload type separate from view-model.
- Backend handoff: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_route_create_upholstery_contract_20260618.md` — method `PUT`, path `/api/v1/upholsteries`, request/response contract, 409 conflict behavior.

### File read intent — pattern vs. relational

All reads performed (relational — understanding what exists):

- `features/task-creation/components/TaskCreationFab.tsx`: exact FAB motion pattern — `ACTION_BUTTONS` array, `x`/`y` offsets, `motion.button` variants, `FAB_POSITION_CLASS`, preload call pattern.
- `features/task-creation/surfaces.ts`: `lazyWithPreload` export pattern, `preload*` export naming, surface registration shape.
- `pages/tasks/TasksPage.tsx`: how the FAB is placed as sibling of route entry inside a fragment.
- `pages/task-creation/InternalTaskSlidePage.tsx`: `useSurfaceHeader().setTitle()` inside `useEffect`, slide page shell.
- `features/task-creation/components/InternalFormContent.tsx`: `ContentCard` per field group, `useForm`+`zodResolver`, `Controller` for complex fields, `useWatch` for derived display.
- `features/upholstery-inventory/pages/StoredAmountSheetPage.tsx`: decimal input pattern (`inputMode="decimal"`, `normalizeNonNegativeDecimalString`), `useSurfaceHeader()`, `FloatingKeyboardBar` (NOT used here — multi-field form scrolls naturally).
- `features/upholstery-inventory/components/InventoryDetailFooter.tsx`: `fixed bottom-0` absolute footer pattern, button class names, `requestClose()` usage.
- `features/upholstery-inventory/api/delete-upholstery-inventory.ts`: `ApiEnvelopeSchema(z.object({}).passthrough())` pattern for no-body-needed responses.
- `features/upholstery-inventory/api/set-stored-amount.ts`: `apiClient.patch` signature, same passthrough schema.
- `features/upholstery-inventory/lib/invalidate-inventory.ts`: `invalidateAfterInventoryMutation` — already invalidates `upholsteryInventoryKeys.lists()` which covers all filter queries.
- `features/upholstery-inventory/surfaces.ts`: existing surface registration pattern (`lazyWithPreload`, `SurfaceRegistrations` export).
- `features/upholstery-inventory/index.ts`: current public API exports.
- `pages/upholstery-inventory/UpholsteryInventoryPage.tsx`: current page shell (single div, no FAB).
- `app/surface-registry.ts`: confirmed `...upholsteryInventorySurfaces` is already spread — no change needed.
- `features/upholstery/components/UpholsteryPickerHeader.tsx`: `BoxPicker mode="single"` single-option toggle pattern.

### Skill selection

- Primary skill: `skills/cross_cutting/intention_planning/SKILL.md` (new feature implementation plan).

## Implementation plan

Steps 1–3 build the data layer (types → API → mutation). Steps 4 wires the surface. Steps 5–6 implement the UI (slide page + FAB). Steps 7–8 wire the FAB into the app.

---

### Step 1 — `features/upholstery-inventory/types.ts` — add form schema and payload type

Add at the end of the file (after the existing view-model types):

```ts
import { z } from "zod";

export const CreateInventoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string(),                          // optional — empty string maps to null in payload
  image_url: z.string().nullable(),
  current_stored_amount_meters: z.string().nullable(),
  low_stock_threshold_meters: z.string().nullable().refine(
    (val) => {
      if (!val) return true;
      const n = parseFloat(val.replace(",", "."));
      return !isNaN(n) && n > 0;
    },
    { message: "Low stock threshold must be greater than 0" },
  ),
  favorite: z.boolean(),
});

export type CreateInventoryFormValues = z.infer<typeof CreateInventoryFormSchema>;

export type CreateInventoryPayload = {
  name: string;
  code: string | null;                       // null when field left empty
  image_url: string | null;
  current_stored_amount_meters: string | null;
  low_stock_threshold_meters: string | null;
  favorite: boolean;
};
```

- `code` is optional (backend validates uniqueness but does not require it). The form accepts free text; empty string → `null` in the payload.
- `low_stock_threshold_meters` requires `> 0` if provided (backend returns 422 otherwise). The Zod refinement enforces this client-side before submit.
- `image_url` intentionally skips URL format validation — the preview's `onError` handles invalid URLs at display time.
- All field names confirmed against the backend handoff.

---

### Step 2 — `features/upholstery-inventory/api/create-upholstery-inventory.ts` — PUT API function

Create new file:

```ts
import { z } from "zod";

import { apiClient } from "@/lib/api-client";
import { ApiEnvelopeSchema } from "@/types/api";

import type { CreateInventoryPayload } from "../types";

const CreateInventoryResponseSchema = ApiEnvelopeSchema(
  z.object({}).passthrough(),
).extend({ ok: z.literal(true) });

export async function createUpholsteryInventory(
  payload: CreateInventoryPayload,
): Promise<void> {
  await apiClient.put(
    "/api/v1/upholsteries",
    CreateInventoryResponseSchema,
    payload,
  );
}
```

- Method: `PUT` (confirmed by backend handoff — the endpoint uses PUT not POST).
- Path: `/api/v1/upholsteries` — atomically creates an upholstery + its linked inventory row.
- Follows the passthrough-schema pattern: response body is validated but not consumed; the list refetch via invalidation provides fresh data.
- **Codex must verify `apiClient.put` exists** in `packages/api-client/src/api-client.ts` with the same `(path, schema, body)` signature as `apiClient.patch`. If only `apiClient.post` exists, use that instead and note the discrepancy.

---

### Step 3 — `features/upholstery-inventory/actions/use-create-inventory.ts` — mutation hook

Create new file:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUpholsteryInventory } from "../api/create-upholstery-inventory";
import { invalidateAfterInventoryMutation } from "../lib/invalidate-inventory";
import type { CreateInventoryPayload } from "../types";

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateInventoryPayload) =>
      createUpholsteryInventory(payload),
    onSettled: () => {
      invalidateAfterInventoryMutation(queryClient);
    },
  });
}
```

`onSettled` (not `onSuccess`) fires invalidation so a failed attempt still refetches — the list state cannot diverge from the server after a create attempt. The slide page closes on success only (in the page's `onSuccess` callback, not here).

---

### Step 4 — `features/upholstery-inventory/surfaces.ts` — add creation slide surface

Add alongside the existing four surfaces:

```ts
export const INVENTORY_CREATION_SLIDE_ID = "upholstery-inventory-creation-slide";

// No SurfaceProps type needed — no props passed to the creation slide.

const creationSlide = lazyWithPreload(() =>
  import("./pages/UpholsteryInventoryCreationSlidePage").then((module) => ({
    default: module.UpholsteryInventoryCreationSlidePage,
  })),
);

export const preloadInventoryCreationSurface = creationSlide.preload;
```

Add to the `upholsteryInventorySurfaces` export:

```ts
export const upholsteryInventorySurfaces: SurfaceRegistrations = {
  [INVENTORY_DETAIL_SLIDE_ID]: { surface: "slide", component: detailSlide.Component },
  [STORED_AMOUNT_SHEET_ID]: { surface: "sheet", component: storedAmountSheet.Component },
  [INVENTORY_CARD_ACTIONS_SHEET_ID]: { surface: "sheet", component: cardActionsSheet.Component },
  [INVENTORY_DETAIL_ACTIONS_SHEET_ID]: { surface: "sheet", component: detailActionsSheet.Component },
  [INVENTORY_CREATION_SLIDE_ID]: { surface: "slide", component: creationSlide.Component },  // ← add
};
```

The new surface auto-registers in `surface-registry.ts` via the existing `...upholsteryInventorySurfaces` spread — no change to that file.

---

### Step 5 — `features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx` — form slide page

Create new file. This is a single-step form (no `StagedForm`). Fields use `react-hook-form` with `zodResolver`. The page manages its own submit error state.

```tsx
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Heart } from "lucide-react";

import { ContentCard, FieldLabelRow } from "@/components/primitives";
import { BoxPicker } from "@/components/primitives";
import { useSurfaceHeader } from "@/hooks/use-surface-header";

import { useCreateInventory } from "../actions/use-create-inventory";
import { normalizeNonNegativeDecimalString } from "../lib/decimal";
import { INVENTORY_CREATION_SLIDE_ID } from "../surfaces";
import {
  CreateInventoryFormSchema,
  type CreateInventoryFormValues,
} from "../types";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

const FAVORITE_OPTIONS = [
  {
    value: "yes" as const,
    label: "Favorite",
    Icon: Heart,
  },
];

export function UpholsteryInventoryCreationSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const createInventory = useCreateInventory();
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    header?.setTitle("New inventory");
    header?.setActions(null);
  }, [header]);

  const form = useForm<CreateInventoryFormValues>({
    resolver: zodResolver(CreateInventoryFormSchema),
    defaultValues: {
      name: "",
      code: "",
      image_url: null,
      current_stored_amount_meters: null,
      low_stock_threshold_meters: null,
      favorite: false,
    },
  });

  const imageUrl = useWatch({ control: form.control, name: "image_url" });

  function handleSubmit(values: CreateInventoryFormValues): void {
    setSubmitError(null);

    const payload = {
      name: values.name,
      code: values.code.trim() || null,           // empty string → null (code is optional)
      image_url: values.image_url || null,
      current_stored_amount_meters:
        normalizeNonNegativeDecimalString(values.current_stored_amount_meters ?? "") ?? null,
      low_stock_threshold_meters:
        values.low_stock_threshold_meters
          ? (normalizeNonNegativeDecimalString(values.low_stock_threshold_meters) ?? null)
          : null,
      favorite: values.favorite,
    };

    createInventory.mutate(payload, {
      onSuccess: () => {
        useSurfaceStore.getState().close(INVENTORY_CREATION_SLIDE_ID);
      },
      onError: (error) => {
        // Surface the backend's conflict message (409) when available;
        // fall back to a generic message for other errors.
        // The exact error shape depends on apiClient's error type —
        // Codex should read the error type definition and extract the
        // `error` field from the response body if available.
        const backendMessage =
          (error as { response?: { data?: { error?: string } } })
            ?.response?.data?.error ?? null;
        setSubmitError(
          backendMessage ?? "Could not create inventory. Please try again.",
        );
      },
    });
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Scrollable form area — bottom padding accounts for the fixed footer */}
      <div className="overflow-y-auto flex-1 pb-[calc(var(--safe-bottom,0px)+5.5rem)]">
        <form
          className="flex flex-col gap-4 px-4 py-4"
          noValidate
          onSubmit={form.handleSubmit(handleSubmit)}
        >

          {/* Card 1: identity */}
          <ContentCard>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <FieldLabelRow label="Name" />
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-md text-foreground placeholder:text-muted-foreground outline-none"
                        placeholder="e.g. Velvet Ocean Blue"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                      {fieldState.error ? (
                        <p className="text-sm text-destructive">
                          {fieldState.error.message}
                        </p>
                      ) : null}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <FieldLabelRow label="Code" description="Optional — must be unique in workspace" />
                <Controller
                  name="code"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-md text-foreground placeholder:text-muted-foreground outline-none"
                        placeholder="e.g. VEL-OB-001"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                      {fieldState.error ? (
                        <p className="text-sm text-destructive">
                          {fieldState.error.message}
                        </p>
                      ) : null}
                    </>
                  )}
                />
              </div>
            </div>
          </ContentCard>

          {/* Card 2: image URL + preview */}
          <ContentCard>
            <div className="flex flex-col gap-1.5">
              <FieldLabelRow label="Image URL" />
              <Controller
                name="image_url"
                control={form.control}
                render={({ field }) => (
                  <input
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-md text-foreground placeholder:text-muted-foreground outline-none"
                    inputMode="url"
                    placeholder="https://..."
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {imageUrl ? (
                <img
                  alt="Preview"
                  className="mt-2 w-full rounded-xl object-cover"
                  src={imageUrl}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = "";
                  }}
                />
              ) : null}
            </div>
          </ContentCard>

          {/* Card 3: stored amount */}
          <ContentCard>
            <div className="flex flex-col gap-1.5">
              <FieldLabelRow label="Stored amount" />
              <Controller
                name="current_stored_amount_meters"
                control={form.control}
                render={({ field }) => (
                  <div className="flex items-center rounded-2xl border border-border bg-card px-4 py-3">
                    <input
                      className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-foreground outline-none"
                      inputMode="decimal"
                      placeholder="0.000"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      onBlur={field.onBlur}
                    />
                    <span className="ml-3 shrink-0 text-sm text-muted-foreground">m</span>
                  </div>
                )}
              />
            </div>
          </ContentCard>

          {/* Card 4: low stock threshold */}
          <ContentCard>
            <div className="flex flex-col gap-1.5">
              <FieldLabelRow label="Low stock threshold" description="Must be > 0 if set" />
              <Controller
                name="low_stock_threshold_meters"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <div className="flex items-center rounded-2xl border border-border bg-card px-4 py-3">
                      <input
                        className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-foreground outline-none"
                        inputMode="decimal"
                        placeholder="0.000"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        onBlur={field.onBlur}
                      />
                      <span className="ml-3 shrink-0 text-sm text-muted-foreground">m</span>
                    </div>
                    {fieldState.error ? (
                      <p className="text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </>
                )}
              />
            </div>
          </ContentCard>

          {/* Card 5: favorite toggle */}
          <ContentCard>
            <div className="flex flex-col gap-1.5">
              <FieldLabelRow label="Favorite" />
              <Controller
                name="favorite"
                control={form.control}
                render={({ field }) => (
                  <BoxPicker
                    className="flex flex-row gap-2"
                    layout="stack"
                    mode="single"
                    options={FAVORITE_OPTIONS}
                    showDescription={false}
                    size="sm"
                    value={field.value ? "yes" : undefined}
                    visualVariant="pill"
                    selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
                    unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
                    onValueChange={(v) => field.onChange(v === "yes")}
                  />
                )}
              />
            </div>
          </ContentCard>

          {/* Submit error */}
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
        </form>
      </div>

      {/* Absolute footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="flex gap-3 bg-background px-4 pb-[calc(var(--safe-bottom,0px)+1rem)] pt-3 shadow-[0_-1px_0_0_var(--color-border)]">
          <button
            className="flex-1 rounded-2xl border border-between-border bg-card px-4 py-3.5 text-md font-medium text-primary shadow-sm"
            type="button"
            onClick={() => header?.requestClose()}
          >
            Close & Back
          </button>
          <button
            className="flex-1 rounded-2xl bg-primary px-4 py-3.5 text-md font-semibold text-card shadow-sm disabled:opacity-50"
            disabled={createInventory.isPending}
            type="submit"
            form=""
            onClick={() => form.handleSubmit(handleSubmit)()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Note for Codex:** The "Create" button uses `onClick={() => form.handleSubmit(handleSubmit)()}` (programmatic submit via click, not `type="submit"` on the button itself) because the `<form>` is not a direct ancestor of the footer's fixed element in the DOM. Alternatively, if wrapping the entire page content in the `<form>` element is possible, use `type="submit"` directly and remove the `form=""` attribute override.

**Note for Codex:** Verify `BoxPicker`'s option type (from `@beyo/ui`) supports an `Icon` field before using `FAVORITE_OPTIONS`. If icon-per-option is not supported, replace with a simpler toggle approach (e.g., a pressable pill `<button>` with a Heart icon and a border highlight when `field.value === true`).

---

### Step 6 — `features/upholstery-inventory/components/UpholsteryInventoryCreationFab.tsx` — FAB component

Create new file. One sub-button (Spool icon). Modelled directly on `TaskCreationFab.tsx`:

```tsx
import { motion } from "framer-motion";
import { Plus, Spool, X } from "lucide-react";
import { useState } from "react";

import { usePreloadSurface } from "@/hooks/use-preload-surface";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

import {
  INVENTORY_CREATION_SLIDE_ID,
  preloadInventoryCreationSurface,
} from "../surfaces";

const FAB_TRANSITION = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as const,
};

const FAB_POSITION_CLASS =
  "bottom-[calc(var(--safe-bottom,0px)+0.75rem)] right-4";

const ACTION_BUTTONS = [
  {
    id: "create_inventory",
    surfaceId: INVENTORY_CREATION_SLIDE_ID,
    Icon: Spool,
    label: "New inventory",
    x: 0,
    y: -72,
  },
] as const;

export function UpholsteryInventoryCreationFab(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  usePreloadSurface(preloadInventoryCreationSurface);

  function handleActionPress(surfaceId: string): void {
    useSurfaceStore.getState().open(surfaceId);
    setIsOpen(false);
  }

  return (
    <>
      {ACTION_BUTTONS.map((action, index) => (
        <motion.button
          key={action.id}
          aria-label={action.label}
          className={`fixed ${FAB_POSITION_CLASS} z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md${!isOpen ? " pointer-events-none" : ""}`}
          data-testid={`inventory-creation-fab-action-${action.id}`}
          initial={false}
          transition={{
            ...FAB_TRANSITION,
            delay: isOpen
              ? index * 0.03
              : (ACTION_BUTTONS.length - 1 - index) * 0.03,
          }}
          animate={
            isOpen
              ? { scale: 0.75, x: action.x, y: action.y }
              : { scale: 0, x: 0, y: 0 }
          }
          type="button"
          onClick={() => handleActionPress(action.surfaceId)}
        >
          <action.Icon aria-hidden="true" className="size-5" />
        </motion.button>
      ))}

      <motion.button
        aria-label={
          isOpen ? "Close inventory creation menu" : "Open inventory creation menu"
        }
        className={`fixed ${FAB_POSITION_CLASS} z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md`}
        data-testid="inventory-creation-fab"
        initial={false}
        transition={FAB_TRANSITION}
        animate={{ scale: isOpen ? 0.7 : 1 }}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Plus aria-hidden="true" className="size-5" />
        )}
      </motion.button>
    </>
  );
}
```

Pattern follows `TaskCreationFab` exactly. The single sub-button at `x: 0, y: -72` positions it straight up from the main button.

**Note for Codex:** `Spool` must be importable from `lucide-react`. If it is not available in the installed version, substitute with `Archive` or `Package` and flag it in the PR.

---

### Step 7 — `features/upholstery-inventory/index.ts` — export FAB

Add `UpholsteryInventoryCreationFab` to the public API:

```ts
// before
export { UpholsteryInventoryRouteEntry } from "./route-entry";
export { upholsteryInventorySurfaces } from "./surfaces";

// after
export { UpholsteryInventoryRouteEntry } from "./route-entry";
export { upholsteryInventorySurfaces } from "./surfaces";
export { UpholsteryInventoryCreationFab } from "./components/UpholsteryInventoryCreationFab";
```

---

### Step 8 — `pages/upholstery-inventory/UpholsteryInventoryPage.tsx` — render FAB alongside route entry

Wrap existing content in a fragment and add the FAB:

```tsx
import { lazy, Suspense } from "react";

import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { UpholsteryInventoryCreationFab } from "@/features/upholstery-inventory";

const UpholsteryInventoryRouteEntry = lazy(() =>
  import("@/features/upholstery-inventory").then((module) => ({
    default: module.UpholsteryInventoryRouteEntry,
  })),
);

export function UpholsteryInventoryPage(): React.JSX.Element {
  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <Suspense fallback={<PageSkeleton />}>
          <UpholsteryInventoryRouteEntry />
        </Suspense>
      </div>
      <UpholsteryInventoryCreationFab />
    </>
  );
}
```

Pattern mirrors `TasksPage.tsx` exactly.

---

## Risks and mitigations

- Risk: Backend field names differ from the assumed payload (e.g., `upholstery_name` instead of `name`). The API call silently sends wrong fields and the server returns a validation error.
  Mitigation: Clarification #1 must be resolved before Codex runs. The `CreateInventoryPayload` type in step 1 is the single source of truth — update it after the handoff is available.

- Risk: `Spool` icon is not exported by the installed version of `lucide-react`.
  Mitigation: Codex checks `import { Spool } from "lucide-react"` compiles without error. If it fails, substitute `Archive`.

- Risk: `BoxPicker` option type does not accept an `Icon` field, causing a TypeScript error in the creation slide page.
  Mitigation: Codex reads `BoxPicker`'s exported option type from `@beyo/ui` before finalising step 5. If icons are unsupported per-option, replace the FAVORITE_OPTIONS + BoxPicker block with a simple pressable pill `<button>` that toggles a border highlight (`border-blue-400 bg-blue-100` when `field.value === true`).

- Risk: The "Create" submit button sits inside a `fixed` footer, which is outside the `<form>` DOM tree, so `type="submit"` does not trigger `onSubmit`. The plan uses `onClick={() => form.handleSubmit(handleSubmit)()}` as a workaround.
  Mitigation: Alternative — wrap the entire page content (scrollable area + fixed footer) inside the `<form>` element; then `type="submit"` works natively. If Codex restructures the layout to keep the form wrapping the button, remove the programmatic submit and use native `type="submit"`.

- Risk: FAB overlaps the bottom tab bar on the inventory page (which is in the More-tab section).
  Mitigation: Verify visually during manual testing. If the FAB sits behind or over the tab bar at an incorrect height, adjust `FAB_POSITION_CLASS` to add the tab bar height offset (e.g., `bottom-[calc(var(--safe-bottom,0px)+4.5rem)]`). The task creation FAB uses the same class and works on the tasks tab — confirm if the More-tab section has the same layout.

- Risk: `invalidateAfterInventoryMutation` in `onSettled` causes the three pre-loaded filter queries to reload even on failed creation.
  Mitigation: Acceptable. Refetching on error is harmless — it ensures the list is consistent with server state. The user never sees the create slide reload the list since the slide is only closed on success.

- Risk: The 409 conflict error message extraction in `onError` uses a speculative cast (`error?.response?.data?.error`) that may not match the actual error shape returned by `apiClient.put`.
  Mitigation: Codex reads the `apiClient` error type definition before implementing `onError`. If the error is typed differently (e.g., a custom `ApiError` class with a `.message` field), use that shape. The fallback message ("Could not create inventory. Please try again.") is always safe.

- Risk: `FieldLabelRow` may not accept a `description` prop; the prop is used in steps 5 for code and low-stock fields.
  Mitigation: Codex checks the `FieldLabelRow` type definition from `@/components/primitives`. If `description` is not supported, render the secondary text as a sibling `<span className="text-xs text-muted-foreground">` below the label row instead.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 8 modified/created files.
- Manual — FAB expand: tap "+" on inventory list page; sub-button animates to `y=-72`; main button shows "X" scaled to 0.7.
- Manual — FAB collapse: tap "X" or tap outside; sub-button collapses back into main button; main button shows "+" scaled to 1.
- Manual — open creation slide: tap sub-button; slide page opens with title "New inventory"; scroll to confirm all six field cards render.
- Manual — image preview: type a valid image URL in the image_url field; preview renders below input. Type an invalid URL; preview hides via `onError`.
- Manual — form validation: tap "Create" with empty name; inline error "Name is required" appears under name field; API not called.
- Manual — successful create: fill all required fields; tap "Create"; slide closes; inventory list refetches and shows the new record.
- Manual — failed create: block network; fill form; tap "Create"; "Could not create inventory. Please try again." appears; slide stays open; button re-enables.
- Manual — footer scroll: on a short device, fill all fields; confirm the favorite card (last) can scroll fully above the footer.

## Review log

- `2026-06-18` `claude-sonnet-4-6`: Plan authored from TaskCreationFab + InternalFormContent + InventoryDetailFooter patterns. One open clarification (backend API contract) blocks steps 1–3.
- `2026-06-18` `claude-sonnet-4-6`: Backend handoff resolved. Key corrections: method is `PUT` (not POST), path is `/api/v1/upholsteries` (creates upholstery + inventory atomically, not `/api/v1/upholstery-inventories`), `code` is optional (not required), `low_stock_threshold_meters` must be `> 0`, 409 conflicts surface backend message. Steps 1, 2, 5 updated.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved` → ready for Codex immediately (clarification resolved).
- Transition owner: `David` / `claude-sonnet-4-6`
