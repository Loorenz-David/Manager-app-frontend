# PLAN_task_pages_to_package_20260703

## Metadata

- Status: `archived`
- Last updated at (UTC): `2026-07-03T17:57:30Z`

## Goal

Move 9 managers-app task page components into `@beyo/tasks`, together with the supporting controller, provider, and new API/action hook needed by them. After this plan the managers app imports everything via `@beyo/tasks` and all local page files are deleted.

## Pages being moved

| File | Notes |
|---|---|
| `ItemQuantitySheetPage.tsx` | uses `useUpdateItem` (already in `@beyo/tasks`) |
| `ItemUpholsteryAmountSheetPage.tsx` | needs new `setItemUpholsteryAmount` API + hook |
| `PinNotificationsSlidePage.tsx` | needs pin controller/provider moved first |
| `PinTaskStepStatesSheetPage.tsx` | standalone; only needs `@beyo/ui` primitives |
| `TaskActionsSheetPage.tsx` | dead stub (not wired in surfaces); move as-is |
| `TaskDetailMenuSheetPage.tsx` | opens pin notifications + delete task |
| `TaskEditSlidePage.tsx` | stub |
| `TaskFilterSheetPage.tsx` | stub |
| `TaskFlowRecordDetailSheetPage.tsx` | stub |

## Key decisions

### D1 — `useSurface()` replaced with `useSurfaceStore.getState()`
All pages/controllers that use `useSurface()` for imperative opens/closes must switch to `useSurfaceStore.getState().open/close/closeTop()` from `@beyo/ui`. Never use reactive `useSurface()` inside event handlers (defeats `useCallback` memoization and couples to context). This is consistent with the existing pattern in `use-task-detail.flow.ts` and the `handleOpenUnreadViewer` fix.

### D2 — `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID` + `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID` move to `@beyo/tasks`
Both pin surfaces are currently defined locally in managers app `surfaces.ts`. Since the pages for both open in the task detail context and are moving to `@beyo/tasks`, their IDs and prop types move to `packages/tasks/src/surface-ids.ts`. The managers app imports them from `@beyo/tasks` like all other task surface IDs.

### D3 — `pendingSeatUpholsteryKeys` invalidation dropped from package hook
`useSetItemUpholsteryAmount` in `@beyo/tasks` invalidates `taskKeys.detail`, `taskKeys.lists`, `upholsteryKeys.pickerLists`, and `itemUpholsteryKeys.byItem`. It does NOT invalidate `pendingSeatUpholsteryKeys` — that is managers-app-specific inventory state. Socket events handle re-fetching pending seat data.

### D4 — `MANAGER_TASK_PIN_STATES` constants renamed in package
The `MANAGER_` prefix was an app-level convention. In the package:
- `MANAGER_TASK_PIN_STATES` → `TASK_PIN_STATES`
- `MANAGER_UPHOLSTERY_PIN_STATES` → `UPHOLSTERY_PIN_STATES`
- `MANAGER_TASK_STEP_PIN_STATES` → `TASK_STEP_PIN_STATES`

### D5 — `useUpdateItem` app-local stale duplicate deleted
`apps/.../features/items/actions/use-update-item.ts` is functionally identical to `packages/tasks/src/actions/use-update-item.ts`. After `ItemQuantitySheetPage` moves to the package, verify no other managers-app file imports it, then delete.

### D6 — `useSetUpholsteryQuantity` superseded, delete after move
`apps/.../features/items/actions/use-set-upholstery-quantity.ts` is superseded by the new package `useSetItemUpholsteryAmount`. Verify no other consumers before deleting.

### D7 — `@beyo/lib` provides `cn`
`PinNotificationsSlidePage` uses `cn` for conditional classes. Replace `@/lib/utils` import with `cn` from `@beyo/lib`.

### D8 — All primitives already in `@beyo/ui`
`BoxPicker`, `NumberInput`, `ConfirmActionButton`, `FloatingKeyboardBar`, `HorizontalScrollArea`, `ImagePlaceholder`, `StatePill`, `ContentCard` are all in `packages/ui/src/index.ts`. Replace `@/components/primitives` → `@beyo/ui`.

---

## File operations

### §1 — New API file: `set-item-upholstery-amount.ts`

**Create** `packages/tasks/src/api/set-item-upholstery-amount.ts`:

```ts
import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

const SetItemUpholsteryAmountInputSchema = z.object({
  itemUpholsteryId: z.string(),
  amount_meters: z.number(),
});

export type SetItemUpholsteryAmountInput = z.infer<
  typeof SetItemUpholsteryAmountInputSchema
>;

const SetItemUpholsteryAmountResponseSchema = ApiEnvelopeSchema(
  z.object({}),
).extend({ ok: z.literal(true) });

export async function setItemUpholsteryAmount(
  input: SetItemUpholsteryAmountInput,
) {
  const { itemUpholsteryId, ...body } =
    SetItemUpholsteryAmountInputSchema.parse(input);
  return apiClient.post(
    `/api/v1/item-upholsteries/${itemUpholsteryId}/update-quantity`,
    SetItemUpholsteryAmountResponseSchema,
    body,
  );
}
```

### §2 — New action hook: `use-set-item-upholstery-amount.ts`

**Create** `packages/tasks/src/actions/use-set-item-upholstery-amount.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { upholsteryKeys } from "@beyo/upholstery";

import { setItemUpholsteryAmount } from "../api/set-item-upholstery-amount";
import { itemUpholsteryKeys } from "../api/item-upholstery-keys";
import { taskKeys } from "../api/task-keys";

export function useSetItemUpholsteryAmount(
  taskId: string,
  itemId: string | null = null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setItemUpholsteryAmount,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: upholsteryKeys.pickerLists(),
      });
      if (itemId) {
        void queryClient.invalidateQueries({
          queryKey: itemUpholsteryKeys.byItem(itemId),
        });
      }
    },
  });
}
```

### §3 — Move + update pin notifications controller

**Create** `packages/tasks/src/controllers/use-pin-notifications.controller.ts`.

Changes from managers-app original:
- `import { useSurface } from "@/hooks/use-surface"` → remove; use `useSurfaceStore` from `@beyo/ui` instead
- `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID` → from `"../surface-ids"`
- `@beyo/notifications` imports stay as-is
- `useItemUpholsteryQuery` stays as `@beyo/tasks` (already was)
- `surface.close(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID)` in `submit()` → `useSurfaceStore.getState().close(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID)`
- `const surface = useSurface()` hook call → remove entirely
- `MANAGER_TASK_PIN_STATES` → export as `TASK_PIN_STATES`
- `MANAGER_UPHOLSTERY_PIN_STATES` → export as `UPHOLSTERY_PIN_STATES`
- `MANAGER_TASK_STEP_PIN_STATES` → export as `TASK_STEP_PIN_STATES`

Full file:

```ts
import { useEffect, useMemo, useState } from "react";

import {
  parseConditionsToStates,
  usePinsByMajorQuery,
  useSavePins,
  type DesiredPinSelection,
  type NotificationPinDto,
} from "@beyo/notifications";
import { useItemUpholsteryQuery } from "../api/use-item-upholstery-query";
import { useSurfaceStore } from "@beyo/ui";

import { PIN_NOTIFICATIONS_SLIDE_SURFACE_ID } from "../surface-ids";

export const UPHOLSTERY_PIN_STATES = [
  { value: "ordered", label: "Ordered" },
  { value: "available", label: "Available" },
  { value: "in_use", label: "In use" },
] as const;

export const TASK_STEP_PIN_STATES = [
  { value: "pending", label: "Pending" },
  { value: "working", label: "Working" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
] as const;

export const TASK_PIN_STATES = [
  { value: "assigned", label: "Assigned" },
  { value: "working", label: "Working" },
  { value: "ready", label: "Ready" },
  { value: "resolved", label: "Resolved" },
] as const;

type SelectionMap = Record<string, string[]>;

function selectionKey(entityType: string, entityClientId: string): string {
  return `${entityType}:${entityClientId}`;
}

function buildInitialSelections(pins: NotificationPinDto[]): SelectionMap {
  return pins.reduce<SelectionMap>((acc, pin) => {
    acc[selectionKey(pin.entity_type, pin.entity_client_id)] =
      parseConditionsToStates(pin.conditions);
    return acc;
  }, {});
}

export function usePinNotificationsController({
  taskId,
  itemId,
}: {
  taskId: string;
  itemId: string | null | undefined;
}) {
  const pinsQuery = usePinsByMajorQuery(taskId);
  const upholsteryQuery = useItemUpholsteryQuery(itemId);
  const savePins = useSavePins();
  const [selections, setSelections] = useState<SelectionMap>({});
  const [hydratedTaskId, setHydratedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (pinsQuery.data && hydratedTaskId !== taskId) {
      setSelections(buildInitialSelections(pinsQuery.data.pins));
      setHydratedTaskId(taskId);
    }
  }, [hydratedTaskId, pinsQuery.data, taskId]);

  const upholsteryEntry = upholsteryQuery.data?.upholstery[0] ?? null;

  const desiredSelections = useMemo<DesiredPinSelection[]>(() => {
    return Object.entries(selections)
      .map(([key, states]) => {
        const [entityType, entityClientId] = key.split(":");
        if (
          entityType !== "task" &&
          entityType !== "task_step" &&
          entityType !== "item_upholstery"
        ) {
          return null;
        }
        return {
          entity_type: entityType,
          entity_client_id: entityClientId,
          states,
        } satisfies DesiredPinSelection;
      })
      .filter((entry): entry is DesiredPinSelection => entry !== null);
  }, [selections]);

  function getStates(entityType: string, entityClientId: string): string[] {
    return selections[selectionKey(entityType, entityClientId)] ?? [];
  }

  function setStates(
    entityType: "task" | "task_step" | "item_upholstery",
    entityClientId: string,
    states: string[],
  ) {
    setSelections((current) => {
      const next = { ...current };
      const key = selectionKey(entityType, entityClientId);
      if (states.length === 0) {
        delete next[key];
        return next;
      }
      next[key] = states;
      return next;
    });
  }

  async function submit() {
    await savePins.savePinsAsync({
      major_client_entity_id: taskId,
      existingPins: pinsQuery.data?.pins ?? [],
      desiredSelections,
    });
    useSurfaceStore.getState().close(PIN_NOTIFICATIONS_SLIDE_SURFACE_ID);
  }

  return {
    taskId,
    itemId,
    pins: pinsQuery.data?.pins ?? [],
    isHydrating: pinsQuery.isLoading,
    isUpholsteryPending: upholsteryQuery.isLoading,
    isUpholsteryError: upholsteryQuery.isError,
    upholsteryEntry,
    saveError: savePins.error,
    isSaving: savePins.isPending,
    getStates,
    setStates,
    submit,
  };
}

export type PinNotificationsController = ReturnType<
  typeof usePinNotificationsController
>;
```

### §4 — Move + update pin notifications provider

**Create** `packages/tasks/src/providers/PinNotificationsProvider.tsx`.

Changes: import from `../controllers/use-pin-notifications.controller` instead of managers app path. No other changes.

```ts
import { createContext, useContext } from "react";

import {
  usePinNotificationsController,
  type PinNotificationsController,
} from "../controllers/use-pin-notifications.controller";

const PinNotificationsContext =
  createContext<PinNotificationsController | null>(null);

export function PinNotificationsProvider({
  taskId,
  itemId,
  children,
}: {
  taskId: string;
  itemId: string | null | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  const controller = usePinNotificationsController({ taskId, itemId });

  return (
    <PinNotificationsContext.Provider value={controller}>
      {children}
    </PinNotificationsContext.Provider>
  );
}

export function usePinNotificationsContext(): PinNotificationsController {
  const context = useContext(PinNotificationsContext);

  if (!context) {
    throw new Error(
      "usePinNotificationsContext must be used within PinNotificationsProvider",
    );
  }

  return context;
}
```

### §5 — Update `surface-ids.ts`

**Modify** `packages/tasks/src/surface-ids.ts`.

Add after the existing surface IDs:

```ts
export const PIN_NOTIFICATIONS_SLIDE_SURFACE_ID = "task-pin-notifications-slide";
export const PIN_TASK_STEP_STATES_SHEET_SURFACE_ID = "task-pin-step-states-sheet";
```

Add after the existing prop types:

```ts
export type PinNotificationsSlideSurfaceProps = {
  taskId: string;
  itemId?: string | null;
};

export type PinTaskStepStatesSheetSurfaceProps = {
  stepId: string;
  label: string;
  imageUrl?: string | null;
  currentState: string;
  selectedStates: string[];
  onApply: (states: string[]) => void;
};
```

### §6 — Move `ItemQuantitySheetPage`

**Create** `packages/tasks/src/pages/ItemQuantitySheetPage.tsx`.

Import changes:
- `useSurfaceHeader`, `useSurfaceProps` → from `@beyo/hooks`
- `NumberInput` → from `@beyo/ui`
- `useUpdateItem` → from `../actions/use-update-item`
- `useGetTaskQuery` → from `../api/use-get-task-query`
- `useItemUpholsteryQuery` → from `../api/use-item-upholstery-query`
- `ITEM_QUANTITY_SHEET_SURFACE_ID`, `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID` → from `../surface-ids`
- `ItemQuantitySurfaceProps` → from `../surface-ids`
- `useSurfaceStore` → from `@beyo/ui`
- Remove `@/providers/SurfaceProvider` import

Full file:

```tsx
import { useEffect, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { NumberInput, useSurfaceStore } from "@beyo/ui";

import { useGetTaskQuery } from "../api/use-get-task-query";
import { useItemUpholsteryQuery } from "../api/use-item-upholstery-query";
import { useUpdateItem } from "../actions/use-update-item";
import {
  ITEM_QUANTITY_SHEET_SURFACE_ID,
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  type ItemQuantitySurfaceProps,
} from "../surface-ids";

export function ItemQuantitySheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemId, prefill } =
    useSurfaceProps<ItemQuantitySurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const updateItem = useUpdateItem(taskId ?? "");
  const item = taskQuery.data?.item;
  const upholsteryQuery = useItemUpholsteryQuery(itemId);
  const firstUpholstery = upholsteryQuery.data?.upholstery?.[0] ?? null;
  const [quantity, setQuantity] = useState(
    prefill?.quantity ?? item?.quantity ?? 0,
  );

  useEffect(() => {
    header?.setTitle("Edit quantity");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (prefill) return;
    setQuantity(item?.quantity ?? 0);
  }, [item?.quantity, prefill]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Quantity</span>
        <NumberInput
          min={0}
          step={1}
          value={quantity}
          onValueChange={(value) => setQuantity(value ?? 0)}
        />
      </div>
      <button
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        disabled={updateItem.isPending || !item || !itemId}
        onClick={() => {
          if (!item || !itemId) return;
          const quantityHasChanged = (item.quantity ?? 0) !== quantity;
          header?.requestClose();
          updateItem.mutate(
            { id: itemId as never, quantity },
            {
              onSuccess: () => {
                if (!quantityHasChanged || !firstUpholstery) return;
                window.setTimeout(() => {
                  useSurfaceStore
                    .getState()
                    .open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
                      taskId: taskId ?? "",
                      itemUpholsteryId: firstUpholstery.client_id,
                      showQuantityChangedWarning: true,
                    });
                }, 380);
              },
              onError: () => {
                useSurfaceStore
                  .getState()
                  .open(ITEM_QUANTITY_SHEET_SURFACE_ID, {
                    taskId: taskId ?? "",
                    itemId,
                    prefill: { quantity },
                  });
              },
            },
          );
        }}
      >
        Save quantity
      </button>
    </div>
  );
}
```

### §7 — Move `ItemUpholsteryAmountSheetPage`

**Create** `packages/tasks/src/pages/ItemUpholsteryAmountSheetPage.tsx`.

Import changes:
- `useSurfaceHeader`, `useSurfaceProps` → from `@beyo/hooks`
- `FloatingKeyboardBar`, `NumberInput`, `useSurfaceStore` → from `@beyo/ui`
- `useItemUpholsteryQuery`, `UpholsteryRequirementEntry` → from `../api/use-item-upholstery-query` / `../types`
- `useGetTaskQuery` → from `../api/use-get-task-query`
- `useSetUpholsteryQuantity` (app-local) → `useSetItemUpholsteryAmount` from `../actions/use-set-item-upholstery-amount`
- `ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID`, `ItemUpholsteryAmountSurfaceProps` → from `../surface-ids`
- Remove `@/providers/SurfaceProvider` import

Full file:

```tsx
import { useEffect, useMemo, useState } from "react";

import { AlertTriangle } from "lucide-react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { FloatingKeyboardBar, NumberInput, useSurfaceStore } from "@beyo/ui";

import { useGetTaskQuery } from "../api/use-get-task-query";
import { useItemUpholsteryQuery } from "../api/use-item-upholstery-query";
import { useSetItemUpholsteryAmount } from "../actions/use-set-item-upholstery-amount";
import {
  ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID,
  type ItemUpholsteryAmountSurfaceProps,
} from "../surface-ids";
import type { UpholsteryRequirementEntry } from "../types";

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

type MultiplierFactor = 0.25 | 0.5;

function getComputedAmount(
  quantity: number | null | undefined,
  factor: MultiplierFactor,
): number {
  return roundToFourDecimals((quantity ?? 0) * factor);
}

export function ItemUpholsteryAmountSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemUpholsteryId, prefill, showQuantityChangedWarning } =
    useSurfaceProps<ItemUpholsteryAmountSurfaceProps>();
  const taskQuery = useGetTaskQuery(taskId ?? "");
  const itemId = taskQuery.data?.item?.client_id ?? null;
  const upholsteryQuery = useItemUpholsteryQuery(itemId);
  const setAmount = useSetItemUpholsteryAmount(taskId ?? "", itemId);

  const requirementsById = useMemo(() => {
    const entries = upholsteryQuery.data?.requirements ?? [];
    return new Map<string, UpholsteryRequirementEntry>(
      entries.map((entry) => [entry.client_id, entry]),
    );
  }, [upholsteryQuery.data?.requirements]);

  const upholstery = useMemo(() => {
    const entry =
      (upholsteryQuery.data?.upholstery ?? []).find(
        (candidate) => candidate.client_id === itemUpholsteryId,
      ) ?? null;

    if (!entry) return null;

    return {
      ...entry,
      activeRequirement: entry.active_requirement_id
        ? (requirementsById.get(entry.active_requirement_id) ?? null)
        : null,
    };
  }, [requirementsById, upholsteryQuery.data?.upholstery, itemUpholsteryId]);

  const resolvedAmount =
    upholstery?.activeRequirement?.amount_meters ??
    upholstery?.amount_meters ??
    null;
  const [amountMeters, setAmountMeters] = useState<number | null>(
    prefill?.amountMeters ?? resolvedAmount,
  );
  const [selectedFactor, setSelectedFactor] = useState<MultiplierFactor | null>(
    null,
  );
  const quantity = taskQuery.data?.item?.quantity ?? 0;

  useEffect(() => {
    header?.setTitle("Edit upholstery amount");
    header?.setActions(null);
  }, [header]);

  useEffect(() => {
    if (prefill) return;
    setAmountMeters(
      upholstery?.activeRequirement?.amount_meters ??
        upholstery?.amount_meters ??
        null,
    );
  }, [
    prefill,
    upholstery?.activeRequirement?.amount_meters,
    upholstery?.amount_meters,
  ]);

  useEffect(() => {
    if (selectedFactor === null) return;
    setAmountMeters(getComputedAmount(quantity, selectedFactor));
  }, [quantity, selectedFactor]);

  function applyMultiplier(factor: MultiplierFactor): void {
    setSelectedFactor(factor);
    setAmountMeters(getComputedAmount(quantity, factor));
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <FloatingKeyboardBar
        renderControls={({ inputRef, preventFocusSteal }) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Amount <span className="font-normal">(optional)</span>
            </label>
            <NumberInput
              ref={inputRef}
              allowDecimal
              min={0}
              placeholder="e.g. 2.5"
              step={0.25}
              unitLabel="m"
              value={amountMeters}
              onValueChange={(next) => {
                setSelectedFactor(null);
                setAmountMeters(next ?? null);
              }}
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onMouseDown={preventFocusSteal}
                className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
                onClick={() => applyMultiplier(0.25)}
              >
                × 0.25
              </button>
              <button
                type="button"
                onMouseDown={preventFocusSteal}
                className="inline-flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
                onClick={() => applyMultiplier(0.5)}
              >
                × 0.5
              </button>
            </div>
          </div>
        )}
      />
      {showQuantityChangedWarning ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-amber-900">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm leading-snug" data-testid="item-upholstery-amount-quantity-warning">
            Quantity changed. Review the upholstery amount so it stays coherent
            with the new quantity.
          </p>
        </div>
      ) : null}
      <button
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        disabled={setAmount.isPending || !upholstery}
        onClick={() => {
          if (!upholstery) return;
          header?.requestClose();
          setAmount.mutate(
            {
              itemUpholsteryId: upholstery.client_id,
              amount_meters: amountMeters ?? 0,
            },
            {
              onError: () => {
                useSurfaceStore
                  .getState()
                  .open(ITEM_UPHOLSTERY_AMOUNT_SHEET_SURFACE_ID, {
                    taskId: taskId ?? "",
                    itemUpholsteryId: upholstery.client_id,
                    prefill: { amountMeters },
                  });
              },
            },
          );
        }}
      >
        Save amount
      </button>
    </div>
  );
}
```

### §8 — Move `PinNotificationsSlidePage`

**Create** `packages/tasks/src/pages/PinNotificationsSlidePage.tsx`.

Import changes:
- `cn` → from `@beyo/lib`
- `useSurface` → remove; use `useSurfaceStore.getState()` (D1)
- `useSurfaceHeader`, `useSurfaceProps` → from `@beyo/hooks`
- All primitives (`BoxPicker`, `ContentCard`, `HorizontalScrollArea`, `ImagePlaceholder`, `StatePill`) → from `@beyo/ui`
- `humanizeStepState`, `STEP_STATE_VARIANT`, `useTaskStepsByTaskQuery`, `TaskStepRich` → from `@beyo/tasks` but we're INSIDE the package now — use relative imports: `../lib/step-state-variants`, `../api/use-task-steps-by-task-query`, `../types`
- `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID`, `PinNotificationsSlideSurfaceProps`, `PinTaskStepStatesSheetSurfaceProps` → from `../surface-ids`
- `PinNotificationsProvider`, `usePinNotificationsContext` → from `../providers/PinNotificationsProvider`
- `MANAGER_TASK_PIN_STATES` → `TASK_PIN_STATES`, `MANAGER_UPHOLSTERY_PIN_STATES` → `UPHOLSTERY_PIN_STATES` from `../controllers/use-pin-notifications.controller`

In `PinTaskStepPicker`, replace `surface.open(PIN_TASK_STEP_STATES_SHEET_SURFACE_ID, ...)` with `useSurfaceStore.getState().open(...)`. No `useSurface()` hook needed.

Full file:

```tsx
import { useEffect } from "react";

import { Pin } from "lucide-react";
import { cn } from "@beyo/lib";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  BoxPicker,
  ContentCard,
  HorizontalScrollArea,
  ImagePlaceholder,
  StatePill,
  useSurfaceStore,
} from "@beyo/ui";

import { humanizeStepState, STEP_STATE_VARIANT } from "../lib/step-state-variants";
import { useTaskStepsByTaskQuery } from "../api/use-task-steps-by-task-query";
import type { TaskStepRich } from "../types";
import {
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
  type PinNotificationsSlideSurfaceProps,
  type PinTaskStepStatesSheetSurfaceProps,
} from "../surface-ids";
import {
  PinNotificationsProvider,
  usePinNotificationsContext,
} from "../providers/PinNotificationsProvider";
import {
  TASK_PIN_STATES,
  UPHOLSTERY_PIN_STATES,
} from "../controllers/use-pin-notifications.controller";

function TaskStepBox({
  step,
  selectedStates,
  onOpen,
}: {
  step: TaskStepRich;
  selectedStates: string[];
  onOpen: () => void;
}): React.JSX.Element {
  const selected = selectedStates.length > 0;
  const label = step.working_section_name_snapshot ?? "Working section";

  return (
    <button
      type="button"
      className={cn(
        "flex min-h-44 w-36 shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition",
        selected
          ? "border-primary bg-primary text-card"
          : "border-border bg-card text-foreground",
      )}
      data-testid={`pin-task-step-box-${step.client_id}`}
      onClick={onOpen}
    >
      <div className="aspect-square overflow-hidden">
        <ImagePlaceholder iconClassName="size-6 text-muted-foreground/60" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium">{label}</p>
        <StatePill
          className="self-start"
          label={humanizeStepState(step.state)}
          variant={STEP_STATE_VARIANT[step.state]}
        />
        {selected ? (
          <p className="text-xs font-medium">
            {selectedStates.length} state{selectedStates.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function PinTaskStepPicker(): React.JSX.Element {
  const controller = usePinNotificationsContext();
  const stepsQuery = useTaskStepsByTaskQuery(controller.taskId);

  if (stepsQuery.isLoading) {
    return (
      <HorizontalScrollArea className="pb-1">
        <div className="flex gap-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-44 w-36 shrink-0 animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </HorizontalScrollArea>
    );
  }

  if (stepsQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        Task steps could not be loaded.
      </p>
    );
  }

  const steps = stepsQuery.data ?? [];

  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No task steps found.</p>
    );
  }

  return (
    <HorizontalScrollArea className="pb-1" data-testid="pin-task-step-picker">
      <div className="flex gap-3">
        {steps.map((step) => {
          const states = controller.getStates("task_step", step.client_id);
          const label = step.working_section_name_snapshot ?? "Working section";

          return (
            <TaskStepBox
              key={step.client_id}
              selectedStates={states}
              step={step}
              onOpen={() => {
                useSurfaceStore.getState().open(
                  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
                  {
                    stepId: step.client_id,
                    label,
                    imageUrl: null,
                    currentState: step.state,
                    selectedStates: states,
                    onApply: (nextStates: string[]) => {
                      controller.setStates(
                        "task_step",
                        step.client_id,
                        nextStates,
                      );
                    },
                  } satisfies PinTaskStepStatesSheetSurfaceProps,
                );
              }}
            />
          );
        })}
      </div>
    </HorizontalScrollArea>
  );
}

function PinNotificationsForm(): React.JSX.Element {
  const controller = usePinNotificationsContext();
  const upholsteryEntry = controller.upholsteryEntry;
  const upholsteryStates = upholsteryEntry
    ? controller.getStates("item_upholstery", upholsteryEntry.client_id)
    : [];
  const taskStates = controller.getStates("task", controller.taskId);

  return (
    <div
      className="flex min-h-full flex-col gap-4 bg-background pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-4"
      data-testid="pin-notifications-slide"
    >
      <ContentCard data-testid="pin-notifications-card">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3" data-testid="pin-notifications-task-card">
            <div className="flex items-center gap-2">
              <Pin className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Task</h2>
            </div>
            <BoxPicker
              mode="multiple"
              columns={2}
              options={TASK_PIN_STATES.map((option) => ({
                ...option,
                testId: `pin-task-state-${option.value}`,
              }))}
              showDescription={false}
              value={taskStates}
              data-testid="pin-task-state-picker"
              onValueChange={(states) => {
                controller.setStates("task", controller.taskId, states);
              }}
            />
          </div>

          {controller.isUpholsteryPending ||
          controller.isUpholsteryError ||
          upholsteryEntry ? (
            <div
              className="flex flex-col gap-3"
              data-testid="pin-notifications-upholstery-card"
            >
              <div className="flex items-center gap-2">
                <Pin className="size-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Item upholstery
                </h2>
              </div>
              {controller.isUpholsteryPending ? (
                <div className="h-20 animate-pulse rounded-xl bg-muted" />
              ) : controller.isUpholsteryError ? (
                <p className="text-sm text-destructive">
                  Upholstery could not be loaded.
                </p>
              ) : upholsteryEntry ? (
                <BoxPicker
                  mode="multiple"
                  columns={2}
                  options={UPHOLSTERY_PIN_STATES.map((option) => ({
                    ...option,
                    testId: `pin-upholstery-state-${option.value}`,
                  }))}
                  showDescription={false}
                  value={upholsteryStates}
                  data-testid="pin-upholstery-state-picker"
                  onValueChange={(states) => {
                    controller.setStates(
                      "item_upholstery",
                      upholsteryEntry.client_id,
                      states,
                    );
                  }}
                />
              ) : null}
            </div>
          ) : null}

          <div
            className="flex flex-col gap-3"
            data-testid="pin-notifications-task-steps-card"
          >
            <div className="flex items-center gap-2">
              <Pin className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Task steps
              </h2>
            </div>
            <PinTaskStepPicker />
          </div>
        </div>
      </ContentCard>

      {controller.saveError ? (
        <p className="text-sm text-destructive">
          {controller.saveError.message}
        </p>
      ) : null}

      <div className="mt-auto px-4">
        <button
          type="button"
          className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card disabled:opacity-50"
          data-testid="pin-notifications-submit"
          disabled={controller.isSaving || controller.isHydrating}
          onClick={() => void controller.submit()}
        >
          {controller.isSaving ? "Saving..." : "Save pins"}
        </button>
      </div>
    </div>
  );
}

export function PinNotificationsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<PinNotificationsSlideSurfaceProps>();
  const taskId = props.taskId ?? "";

  useEffect(() => {
    header?.setTitle("Pin notifications");
    header?.setActions(null);
  }, [header]);

  return (
    <PinNotificationsProvider itemId={props.itemId ?? null} taskId={taskId}>
      <PinNotificationsForm />
    </PinNotificationsProvider>
  );
}
```

### §9 — Move `PinTaskStepStatesSheetPage`

**Create** `packages/tasks/src/pages/PinTaskStepStatesSheetPage.tsx`.

Import changes:
- `useSurfaceHeader`, `useSurfaceProps` → from `@beyo/hooks`
- `useSurface` → remove; `closeTop` → `useSurfaceStore.getState().closeTop()` (D1)
- `BoxPicker`, `ImagePlaceholder` → from `@beyo/ui`
- `PinTaskStepStatesSheetSurfaceProps` → from `../surface-ids`

Full file:

```tsx
import { useEffect, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, ImagePlaceholder, useSurfaceStore } from "@beyo/ui";

import type { PinTaskStepStatesSheetSurfaceProps } from "../surface-ids";

export function PinTaskStepStatesSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const props = useSurfaceProps<PinTaskStepStatesSheetSurfaceProps>();
  const [selectedStates, setSelectedStates] = useState<string[]>(
    props.selectedStates ?? [],
  );

  useEffect(() => {
    header?.setTitle("Step states");
    header?.setActions(null);
  }, [header]);

  function apply() {
    props.onApply?.(selectedStates);
    useSurfaceStore.getState().closeTop();
  }

  return (
    <div
      className="flex flex-col gap-5 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="pin-task-step-states-sheet"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-lg">
          {props.imageUrl ? (
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              src={props.imageUrl}
            />
          ) : (
            <ImagePlaceholder iconClassName="size-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {props.label ?? "Task step"}
          </p>
          <p className="text-xs text-muted-foreground">
            Current: {(props.currentState ?? "pending").replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <BoxPicker
        mode="multiple"
        columns={2}
        options={[
          { value: "pending", label: "Pending" },
          { value: "working", label: "Working" },
          { value: "paused", label: "Paused" },
          { value: "completed", label: "Completed" },
        ]}
        showDescription={false}
        value={selectedStates}
        data-testid="pin-task-step-state-picker"
        onValueChange={setSelectedStates}
      />

      <button
        type="button"
        className="min-h-12 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card disabled:opacity-50"
        data-testid="pin-task-step-states-apply"
        onClick={apply}
      >
        Apply
      </button>
    </div>
  );
}
```

### §10 — Move `TaskDetailMenuSheetPage`

**Create** `packages/tasks/src/pages/TaskDetailMenuSheetPage.tsx`.

Import changes:
- `useSurfaceHeader`, `useSurfaceProps` → from `@beyo/hooks`
- `useSurface` → remove; all `surface.open/close` → `useSurfaceStore.getState()` (D1)
- `ConfirmActionButton` → from `@beyo/ui`
- All surface IDs and types → from `../surface-ids`
- `useDeleteTask` → from `../actions/use-delete-task`

Full file:

```tsx
import { useEffect } from "react";

import { Pin, Trash2 } from "lucide-react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { ConfirmActionButton, useSurfaceStore } from "@beyo/ui";

import { useDeleteTask } from "../actions/use-delete-task";
import {
  TASK_ACTIONS_SHEET_SURFACE_ID,
  TASK_DETAIL_SURFACE_ID,
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  type PinNotificationsSlideSurfaceProps,
  type TaskActionsSurfaceProps,
} from "../surface-ids";

export function TaskDetailMenuSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId, itemId } = useSurfaceProps<TaskActionsSurfaceProps>();
  const deleteTask = useDeleteTask();

  useEffect(() => {
    header?.setTitle("Task actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground"
        data-testid="task-actions-pin-notifications"
        disabled={!taskId}
        onClick={() => {
          if (!taskId) return;
          useSurfaceStore.getState().open(
            PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
            {
              taskId,
              itemId: itemId ?? null,
            } satisfies PinNotificationsSlideSurfaceProps,
          );
        }}
      >
        <Pin className="size-4" />
        Pin notifications
      </button>
      <ConfirmActionButton
        backgroundColor="var(--color-card)"
        borderColor="var(--color-border)"
        className="w-full font-semibold py-3.5 text-left"
        confirmLabel="Tap again to delete"
        confirmTextColor="white"
        data-testid="task-delete-button"
        fillColor="var(--color-destructive)"
        icon={<Trash2 className="size-4 shrink-0" />}
        label="Delete task"
        textColor="var(--color-primary)"
        onConfirm={() => {
          if (!taskId) return;
          deleteTask.mutate(taskId, {
            onSuccess: () => {
              useSurfaceStore.getState().close(TASK_ACTIONS_SHEET_SURFACE_ID);
              useSurfaceStore.getState().close(TASK_DETAIL_SURFACE_ID);
            },
          });
        }}
      />
    </div>
  );
}
```

### §11 — Move stub pages

**Create** each stub with only package imports:

**`packages/tasks/src/pages/TaskActionsSheetPage.tsx`**:
```tsx
import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import type { TaskActionsSurfaceProps } from "../surface-ids";

export function TaskActionsSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskActionsSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Actions");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Actions coming soon</p>
      <p className="text-xs text-border">{taskId}</p>
    </div>
  );
}
```

**`packages/tasks/src/pages/TaskEditSlidePage.tsx`**:
```tsx
import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import type { TaskEditSurfaceProps } from "../surface-ids";

export function TaskEditSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { taskId } = useSurfaceProps<TaskEditSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Edit task");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex h-full items-center justify-center p-6 text-muted-foreground">
      <div className="text-center">
        <p className="text-base font-medium">Full task edit mode is not implemented yet.</p>
        <p className="mt-2 text-xs text-border">{taskId}</p>
      </div>
    </div>
  );
}
```

**`packages/tasks/src/pages/TaskFilterSheetPage.tsx`**:
```tsx
import { useEffect } from "react";

import { useSurfaceHeader } from "@beyo/hooks";

export function TaskFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();

  useEffect(() => {
    header?.setTitle("Filters");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Filters coming soon</p>
    </div>
  );
}
```

**`packages/tasks/src/pages/TaskFlowRecordDetailSheetPage.tsx`**:
```tsx
import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import type { TaskFlowRecordDetailSurfaceProps } from "../surface-ids";

export function TaskFlowRecordDetailSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { flowRecordId } = useSurfaceProps<TaskFlowRecordDetailSurfaceProps>();

  useEffect(() => {
    header?.setTitle("Flow record");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-2 p-6 text-muted-foreground">
      <p className="text-sm">Flow record details coming soon.</p>
      <p className="text-xs text-border">{flowRecordId}</p>
    </div>
  );
}
```

### §12 — Update `packages/tasks/src/index.ts`

Add the following exports (append at the end of the existing file):

**New API/action exports:**
```ts
export { setItemUpholsteryAmount } from "./api/set-item-upholstery-amount";
export type { SetItemUpholsteryAmountInput } from "./api/set-item-upholstery-amount";
export { useSetItemUpholsteryAmount } from "./actions/use-set-item-upholstery-amount";
```

**New controller/provider exports:**
```ts
export {
  usePinNotificationsController,
  type PinNotificationsController,
  TASK_PIN_STATES,
  UPHOLSTERY_PIN_STATES,
  TASK_STEP_PIN_STATES,
} from "./controllers/use-pin-notifications.controller";
export {
  PinNotificationsProvider,
  usePinNotificationsContext,
} from "./providers/PinNotificationsProvider";
```

**New surface ID exports (add to existing surface-ids export block):**
```ts
export {
  PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
  PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
} from "./surface-ids";
export type {
  PinNotificationsSlideSurfaceProps,
  PinTaskStepStatesSheetSurfaceProps,
} from "./surface-ids";
```

**New loader factories:**
```ts
export function loadItemQuantitySheetPage() {
  return import("./pages/ItemQuantitySheetPage").then((m) => ({
    default: m.ItemQuantitySheetPage,
  }));
}
export function loadItemUpholsteryAmountSheetPage() {
  return import("./pages/ItemUpholsteryAmountSheetPage").then((m) => ({
    default: m.ItemUpholsteryAmountSheetPage,
  }));
}
export function loadPinNotificationsSlidePage() {
  return import("./pages/PinNotificationsSlidePage").then((m) => ({
    default: m.PinNotificationsSlidePage,
  }));
}
export function loadPinTaskStepStatesSheetPage() {
  return import("./pages/PinTaskStepStatesSheetPage").then((m) => ({
    default: m.PinTaskStepStatesSheetPage,
  }));
}
export function loadTaskActionsSheetPage() {
  return import("./pages/TaskActionsSheetPage").then((m) => ({
    default: m.TaskActionsSheetPage,
  }));
}
export function loadTaskDetailMenuSheetPage() {
  return import("./pages/TaskDetailMenuSheetPage").then((m) => ({
    default: m.TaskDetailMenuSheetPage,
  }));
}
export function loadTaskEditSlidePage() {
  return import("./pages/TaskEditSlidePage").then((m) => ({
    default: m.TaskEditSlidePage,
  }));
}
export function loadTaskFilterSheetPage() {
  return import("./pages/TaskFilterSheetPage").then((m) => ({
    default: m.TaskFilterSheetPage,
  }));
}
export function loadTaskFlowRecordDetailSheetPage() {
  return import("./pages/TaskFlowRecordDetailSheetPage").then((m) => ({
    default: m.TaskFlowRecordDetailSheetPage,
  }));
}
```

### §13 — Update `packages/tasks/package.json`

Add `@beyo/notifications` to `peerDependencies`:
```json
"@beyo/notifications": "*",
```

Also add `@beyo/lib` if not already present (used by `PinNotificationsSlidePage` for `cn`).

> Check: look for `"@beyo/lib"` in the current peerDependencies. If missing, add it.

### §14 — Update managers app `surfaces.ts`

**Replace** all local loader functions that now have package equivalents with imports from `@beyo/tasks`. **Remove** the local `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID` and `PIN_TASK_STEP_STATES_SHEET_SURFACE_ID` definitions and their prop types.

Specific changes:

1. Add to `@beyo/tasks` import:
   ```ts
   PIN_NOTIFICATIONS_SLIDE_SURFACE_ID,
   PIN_TASK_STEP_STATES_SHEET_SURFACE_ID,
   loadItemQuantitySheetPage,
   loadItemUpholsteryAmountSheetPage,
   loadPinNotificationsSlidePage,
   loadPinTaskStepStatesSheetPage,
   loadTaskDetailMenuSheetPage,
   loadTaskEditSlidePage,
   loadTaskFilterSheetPage,
   loadTaskFlowRecordDetailSheetPage,
   ```

2. Remove these local function definitions (now imported from `@beyo/tasks`):
   - `function loadTaskDetailMenuSheetPage() {...}`
   - `function loadItemQuantitySheetPage() {...}`
   - `function loadItemUpholsteryAmountSheetPage() {...}`
   - `function loadTaskFlowRecordDetailSheetPage() {...}`
   - `function loadTaskEditSlidePage() {...}`
   - `function loadPinNotificationsSlidePage() {...}`
   - `function loadPinTaskStepStatesSheetPage() {...}`
   - `function loadTaskFilterSheetPage() {...}` (if local)

3. Remove local constant definitions:
   ```ts
   // DELETE these lines:
   export const PIN_NOTIFICATIONS_SLIDE_SURFACE_ID = "task-pin-notifications-slide";
   export const PIN_TASK_STEP_STATES_SHEET_SURFACE_ID = "task-pin-step-states-sheet";
   ```
   They are now imported from `@beyo/tasks`.

4. Remove local type definitions that are now in `@beyo/tasks`:
   ```ts
   // DELETE these:
   export type PinNotificationsSlideSurfaceProps = { ... };
   export type PinTaskStepStatesSheetSurfaceProps = { ... };
   ```

5. Add re-exports for these types from `@beyo/tasks` in the existing `export type {...} from "@beyo/tasks"` block:
   ```ts
   PinNotificationsSlideSurfaceProps,
   PinTaskStepStatesSheetSurfaceProps,
   ```

6. `preloadPinNotificationsSlideSurface` and `preloadPinTaskStepStatesSheetSurface` stay in `surfaces.ts` — they're still derived from `lazyWithPreload(loadPinNotificationsSlidePage)` and `.preload`. No change needed for those.

### §15 — Delete managers app files

After verifying no other consumers exist (grep before deleting):

**Verify and delete:**
1. `apps/.../src/pages/tasks/TaskActionsSheetPage.tsx` — verify not imported elsewhere
2. `apps/.../src/pages/tasks/TaskEditSlidePage.tsx`
3. `apps/.../src/pages/tasks/TaskFilterSheetPage.tsx`
4. `apps/.../src/pages/tasks/TaskFlowRecordDetailSheetPage.tsx`
5. `apps/.../src/pages/tasks/TaskDetailMenuSheetPage.tsx`
6. `apps/.../src/pages/tasks/PinTaskStepStatesSheetPage.tsx`
7. `apps/.../src/pages/tasks/ItemQuantitySheetPage.tsx`
8. `apps/.../src/pages/tasks/ItemUpholsteryAmountSheetPage.tsx`
9. `apps/.../src/pages/tasks/PinNotificationsSlidePage.tsx`
10. `apps/.../src/features/tasks/controllers/use-pin-notifications.controller.ts`
11. `apps/.../src/features/tasks/providers/PinNotificationsProvider.tsx`
12. `apps/.../src/features/items/actions/use-update-item.ts` — stale duplicate; grep first: `grep -rn "use-update-item" src/features/items/` — delete only if no consumers beyond `ItemQuantitySheetPage` (which is now deleted)
13. `apps/.../src/features/items/actions/use-set-upholstery-quantity.ts` — superseded; grep first: `grep -rn "useSetUpholsteryQuantity\|use-set-upholstery-quantity" src/` — delete only if `ItemUpholsteryAmountSheetPage` was its only consumer

---

## File count

| Category | Count |
|---|---|
| Created in `@beyo/tasks` | 13 (2 API/action + 2 controller/provider + 9 pages) |
| Modified in `@beyo/tasks` | 3 (`surface-ids.ts`, `index.ts`, `package.json`) |
| Modified in managers app | 1 (`surfaces.ts`) |
| Deleted from managers app | 11–13 (9 pages + controller + provider + up to 2 actions) |
| **Total** | **~30** |

## Verification

After implementation:
- `npm run typecheck` must pass
- `surfaces.ts` must have no local loader functions for these 9 pages
- `packages/tasks/package.json` must include `@beyo/notifications` (and `@beyo/lib` if missing)
- All surfaces in `taskSurfaces` must still use `.Component` from `lazyWithPreload(...)` instances (Contract 30)
- `PIN_NOTIFICATIONS_SLIDE_SURFACE_ID` must appear only in `@beyo/tasks/surface-ids.ts` (not redefined in managers app)

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Summary: `docs/architecture/implemented_summaries/SUMMARY_task_pages_to_package_20260703.md`
