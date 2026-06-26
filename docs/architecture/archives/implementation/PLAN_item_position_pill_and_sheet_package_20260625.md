# PLAN_item_position_pill_and_sheet_package_20260625

## Metadata

- Plan ID: `PLAN_item_position_pill_and_sheet_package_20260625`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T18:03:08Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Move the item position pill trigger and the position-edit sheet page into the `@beyo/items` package so both the workers app and the managers app consume them from a shared location.
- Business/user intent: Workers need the position pill to appear on seat items even when position is absent (showing "−"), with a tap that opens a sheet to edit the position. Managers already have this on their detail page; both apps should share the same sheet page and pill component.
- Non-goals: Changing the managers `TaskBodyCategoryRow` visual style (train icon, "Wagon :" label). Migrating any other item fields. Adding optimistic-update logic inside the package.

## Scope

- In scope:
  - New `packages/items/src/surface-ids.ts` — shared surface ID + surface props type + openers type
  - New `packages/items/src/api/update-item.ts` — raw PATCH API function moved from managers app
  - New `packages/items/src/components/ItemPositionPill.tsx` — clickable position pill (seat-aware, shows "−" when no position)
  - New `packages/items/src/pages/ItemPositionSheetPage.tsx` — self-contained sheet UI (reads surface props, manages local numeric state, calls `onSave`)
  - Package barrel and peer-dep updates
  - Workers app: new `use-update-item` action, surface registration, controller `openPositionSheet`, `TaskStepItemDetailsSection` updated
  - Managers app: `openPositionSheet` moved to controller (passes `initialPosition` + `onSave`), sheet surface loader updated to package, local `ItemPositionSheetPage.tsx` and `update-item.ts` deleted, `use-update-item.ts` updated to import from package

- Out of scope:
  - Updating `TaskBodyCategoryRow.tsx` visual (train icon, "Wagon :" — stays in `@beyo/tasks`)
  - Any other item field package migration
  - Playwright spec (no new surface structure, interaction pattern already tested elsewhere)

- Assumptions:
  - `@beyo/items` already has `@beyo/api-client`, `@beyo/ui`, `react` as peer deps (confirmed in `packages/items/package.json`)
  - Both apps already declare `@beyo/items: "*"` as a dependency (confirmed in workers `package.json`)
  - `useSurfaceProps<T>()` returns `Partial<T>` — sheet page must guard on `onSave` before enabling the save button
  - Workers app section-steps cache key for invalidation: `taskStepKeys.sectionListsBySection(workingSectionId)` plus `workerWorkingSectionKeys.mine()`
  - The managers app's `useUpdateItem` action keeps its optimistic update logic (snapshots `TaskDetailRaw`); it stays app-local, only the raw API function moves to the package

## Clarifications required

None — all context confirmed from implementation files.

## Acceptance criteria

1. Workers `TaskStepItemDetailsSection` always renders the position row when `isSeatCategory` is true, showing "−" when `item_position` is null.
2. Tapping the position pill on the worker detail page opens the `ItemPositionSheetPage` sheet; saving a valid integer updates the item's position and the steps list refreshes.
3. The same `ItemPositionSheetPage` from `@beyo/items` is registered and used in the managers app instead of the former local page; behavior (edit + save) is unchanged.
4. Local file `apps/managers-app/.../pages/tasks/ItemPositionSheetPage.tsx` is deleted.
5. Local file `apps/managers-app/.../features/items/api/update-item.ts` is deleted.
6. Both apps pass `npm run typecheck` with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: layer dependency rules
- `architecture/04_api_client.md`: raw API function shape (`apiClient.patch`)
- `architecture/08_hooks.md`: mutation action hook pattern (cache snapshot, invalidation, no optimistic in package)
- `architecture/15_feature_structure.md`: package `src/` layout conventions
- `architecture/28_surfaces.md`: surface type registration
- `architecture/30_dynamic_loading.md`: `lazyWithPreload` for sheet page in surface registration
- `architecture/35_shared_packages.md`: §13 `surfaceOpeners` pattern, §9 migration cycle, §3 package.json template, §6 consuming apps

### Local extensions loaded

- `architecture/28_surfaces_local.md`: active surface type set (`slide`, `sheet`, `modal` — `drawer` excluded)
- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` path (`@beyo/ui/src/lib/lazy-with-preload` via `@beyo/ui`)

### File read intent — pattern vs. relational

Permitted reads already done:
- `packages/items/src/index.ts` — established current public exports
- `packages/items/src/types.ts` — established existing type shapes
- `packages/items/package.json` — established existing peer deps
- `apps/managers-app/.../features/items/api/update-item.ts` — understood API call shape to replicate in package
- `apps/managers-app/.../pages/tasks/ItemPositionSheetPage.tsx` — understood current sheet behavior to replicate in package
- `apps/managers-app/.../features/tasks/flows/use-task-detail.flow.ts` — understood `openPositionSheet` placement
- `apps/managers-app/.../features/tasks/controllers/use-task-detail.controller.ts` — understood where to add method
- `apps/workers-app/.../features/task_steps/controllers/use-task-step-detail.controller.ts` — understood controller structure and existing action hooks
- `apps/workers-app/.../features/task_steps/surface-ids.ts` — understood existing surface IDs
- `apps/workers-app/.../features/task_steps/surfaces.ts` — understood surface registration pattern

Prohibited (pattern reads — contracts already cover these):
- Reading another action hook for mutation structure → `08_hooks.md`
- Reading another sheet page for `useSurfaceProps` usage → `28_surfaces.md`
- Reading another package's barrel for export ordering → `15_feature_structure.md`

### Skill selection

- Primary skill: `architecture/35_shared_packages.md §13` (`surfaceOpeners` injection pattern)

---

## Domain schemas consulted

- `packages/items/src/types.ts`: `ItemDetailsFieldsSchema`, `ItemLookupResult` — `item_position` is `string | null`
- `apps/managers-app/.../features/items/types.ts`: `UpdateItemInput.item_position` is `string | null` (nullable PATCH field), `id` is branded `ItemId` (string at runtime)
- `apps/workers-app/.../features/task_steps/types.ts` (via controller): `TaskStep.item.item_position` is `string | null`, `TaskStep.item.client_id` is the item ID used for mutation

## Selected contracts output

Domain schemas consulted:
- `packages/items/src/types.ts`: existing types confirmed — `item_position: string | null`, no `UpdateItemInput` present yet
- `apps/managers-app/.../features/items/types.ts`: `UpdateItemInput` has `id: string`, `item_position?: string | null` (and many other optional patch fields)

Selected contracts:
- `architecture/04_api_client.md`: API function with response schema validation
- `architecture/08_hooks.md`: mutation hook pattern (invalidate in `onSettled`, rollback in `onError` for app-local hook)
- `architecture/28_surfaces.md`: sheet surface type
- `architecture/30_dynamic_loading.md`: `lazyWithPreload` for lazy surface registration
- `architecture/35_shared_packages.md`: package boundary rules, `surfaceOpeners` §13, migration cycle §9

Added from guide:
- `architecture/28_surfaces_local.md`: trigger "sheet" — confirms sheet is valid surface type, `drawer` excluded
- `architecture/30_dynamic_loading_local.md`: trigger "lazyWithPreload" — confirms utility path via `@beyo/ui`

Excluded contracts:
- `architecture/09_forms.md`: no RHF form — sheet uses controlled `useState`, not `useForm`
- `architecture/24_dto.md`: no new DTO/view model layer — position is a plain string
- `architecture/23_providers.md`: no new provider — pill reads from existing context; sheet is standalone
- `architecture/17_testing.md`: no new unit test scope added
- `architecture/34_runtime_validation.md`: no new Playwright spec

---

## Implementation plan

### Step 1 — Add `UpdateItemInput` type to `packages/items/src/types.ts`

Add below the existing `ItemDetailsFieldsSchema` export (do NOT touch existing exports):

```ts
export type UpdateItemInput = {
  id: string;
  article_number?: string | null;
  sku?: string | null;
  item_category_id?: string | null;
  quantity?: number;
  designer?: string | null;
  height_in_cm?: number | null;
  width_in_cm?: number | null;
  depth_in_cm?: number | null;
  item_value_minor?: number | null;
  item_cost_minor?: number | null;
  item_currency?: ItemCurrency;
  item_position?: string | null;
  external_url?: string | null;
};
```

### Step 2 — Create `packages/items/src/api/update-item.ts`

New file. Mirror the managers app's `update-item.ts` exactly but replace all `@/` alias imports with package-relative paths and use `@beyo/api-client` imports.

```ts
import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import type { UpdateItemInput } from "../types";

const UpdateItemResponseSchema = z
  .object({ ok: z.literal(true) })
  .passthrough();

export async function updateItem(input: UpdateItemInput): Promise<void> {
  const { id, ...body } = input;
  await apiClient.patch(`/api/v1/items/${id}`, UpdateItemResponseSchema, body);
}
```

Note: The response schema uses `.passthrough()` rather than the full envelope — adjust to match `ApiEnvelopeSchema` if `apiClient.patch` requires the full envelope shape. Check `apps/managers-app/.../features/items/api/update-item.ts` for the exact `UpdateItemResponseSchema` used there and replicate it using imports from `@beyo/api-client` or `@beyo/lib` (whichever exports `ApiEnvelopeSchema`).

### Step 3 — Create `packages/items/src/surface-ids.ts`

```ts
export const ITEM_POSITION_SHEET_SURFACE_ID = "item-position-sheet";

export type ItemPositionSheetSurfaceProps = {
  itemId: string;
  initialPosition: string | null;
  onSave: (position: string | null) => void;
};

export type ItemPositionSurfaceOpeners = {
  openItemPositionSheet?: (props: ItemPositionSheetSurfaceProps) => void;
};
```

### Step 4 — Create `packages/items/src/components/ItemPositionPill.tsx`

Renders a position pill for seat items. When `onPress` is provided the pill is a `<button>`. Shows "−" when `position` is null/empty and `isSeat` is true. Renders nothing when not seat and no position.

```tsx
import { InfoPill } from "@beyo/ui";

type ItemPositionPillProps = {
  position: string | null;
  isSeat: boolean;
  onPress?: () => void;
};

export function ItemPositionPill({
  position,
  isSeat,
  onPress,
}: ItemPositionPillProps): React.JSX.Element | null {
  const label = position?.trim() || (isSeat ? "−" : null);

  if (!label) {
    return null;
  }

  if (onPress) {
    return (
      <button
        type="button"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
        data-testid="item-position-pill"
        onClick={onPress}
      >
        <InfoPill>
          <span className="text-sm">{label}</span>
        </InfoPill>
      </button>
    );
  }

  return (
    <InfoPill data-testid="item-position-pill">
      <span className="text-sm">{label}</span>
    </InfoPill>
  );
}
```

### Step 5 — Create `packages/items/src/pages/ItemPositionSheetPage.tsx`

Self-contained sheet UI. Reads `initialPosition` and `onSave` from surface props. Manages a controlled `position` state. No mutation logic — the app-provided `onSave` callback owns the mutation.

```tsx
import { useEffect, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { TextInput } from "@beyo/ui";
import type { ItemPositionSheetSurfaceProps } from "../surface-ids";

function parsePosition(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

export function ItemPositionSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { initialPosition = null, onSave } =
    useSurfaceProps<ItemPositionSheetSurfaceProps>();

  const [position, setPosition] = useState<number | null>(
    parsePosition(initialPosition),
  );

  useEffect(() => {
    header?.setTitle("Edit position");
    header?.setActions(null);
  }, [header]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Position</span>
        <TextInput
          data-testid="item-position-input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={position ?? ""}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "") {
              setPosition(null);
              return;
            }
            if (!/^\d+$/.test(next)) return;
            const parsed = Number.parseInt(next, 10);
            if (!Number.isNaN(parsed)) setPosition(parsed);
          }}
        />
      </div>
      <button
        data-testid="item-position-save-button"
        type="button"
        className="rounded-2xl bg-foreground px-4 py-3.5 text-md font-medium text-background disabled:opacity-50"
        disabled={!onSave}
        onClick={() => {
          if (!onSave) return;
          header?.requestClose();
          onSave(position != null ? String(position) : null);
        }}
      >
        Save position
      </button>
    </div>
  );
}
```

### Step 6 — Update `packages/items/package.json`

Add `"@beyo/hooks": "*"` to `peerDependencies` (required by `ItemPositionSheetPage` which uses `useSurfaceHeader` and `useSurfaceProps`).

### Step 7 — Update `packages/items/src/index.ts`

Append the following exports (do NOT remove or reorder existing exports):

```ts
export { ITEM_POSITION_SHEET_SURFACE_ID } from "./surface-ids";
export type { ItemPositionSheetSurfaceProps, ItemPositionSurfaceOpeners } from "./surface-ids";
export { updateItem } from "./api/update-item";
export type { UpdateItemInput } from "./types";
export { ItemPositionPill } from "./components/ItemPositionPill";
export { ItemPositionSheetPage } from "./pages/ItemPositionSheetPage";
```

---

### Step 8 — Workers app: create `features/items/actions/use-update-item.ts`

Path: `apps/workers-app/ManagerBeyo-app-workers/src/features/items/actions/use-update-item.ts`

Workers-specific mutation. Uses `updateItem` from `@beyo/items`. Invalidates the section steps list (where the position value appears) on settle.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateItem } from "@beyo/items";
import type { WorkingSectionId } from "@beyo/lib";
import { taskStepKeys } from "@/features/task_steps/api/task-step-keys";
import { workerWorkingSectionKeys } from "@/features/working_sections/api/working-section-keys";

export function useUpdateItem(workingSectionId: WorkingSectionId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateItem,
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: taskStepKeys.sectionListsBySection(workingSectionId),
      });
      void queryClient.invalidateQueries({
        queryKey: workerWorkingSectionKeys.mine(),
      });
    },
  });
}
```

Note: verify the exact import path for `workerWorkingSectionKeys` — check `apps/workers-app/.../features/working_sections/api/working-section-keys.ts`. Also confirm `taskStepKeys.sectionListsBySection` exists; if the key name differs, look in `apps/workers-app/.../features/task_steps/api/task-step-keys.ts`.

### Step 9 — Workers app: register position sheet surface in `features/task_steps/surfaces.ts`

Path: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/surfaces.ts`

Add the position sheet to the surface registration map.

Add import at the top:
```ts
import { ITEM_POSITION_SHEET_SURFACE_ID, ItemPositionSheetPage } from "@beyo/items";
```

Add a lazy loader function:
```ts
function loadItemPositionSheetPage() {
  return import("@beyo/items").then((module) => ({
    default: module.ItemPositionSheetPage,
  }));
}
```

Add `lazyWithPreload` instance:
```ts
const itemPositionSheet = lazyWithPreload(loadItemPositionSheetPage);
```

Add to the `SurfaceRegistrations` export map:
```ts
[ITEM_POSITION_SHEET_SURFACE_ID]: {
  surface: "sheet",
  component: itemPositionSheet.Component,
},
```

### Step 10 — Workers app: update `use-task-step-detail.controller.ts`

Path: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/controllers/use-task-step-detail.controller.ts`

Three changes:

**A. Import `useUpdateItem` action and package types:**
```ts
import { ITEM_POSITION_SHEET_SURFACE_ID, type ItemPositionSheetSurfaceProps } from "@beyo/items";
import { useUpdateItem } from "@/features/items/actions/use-update-item";
```

**B. Instantiate `useUpdateItem` inside `useTaskStepDetailController`:**
```ts
const updateItem = useUpdateItem(resolvedWorkingSectionId);
```
Place this after `const { open: openSurface } = useSurface();`.

**C. Add `openPositionSheet` to the returned object:**

Inside `useTaskStepDetailController`, add:
```ts
const openPositionSheet = useCallback(() => {
  const itemId = step?.item?.client_id;
  if (!itemId) return;

  openSurface(ITEM_POSITION_SHEET_SURFACE_ID, {
    itemId,
    initialPosition: step.item?.item_position ?? null,
    onSave: (position) => {
      updateItem.mutate({ id: itemId, item_position: position });
    },
  } satisfies ItemPositionSheetSurfaceProps);
}, [step, openSurface, updateItem]);
```

Update the `return` object and the `TaskStepDetailController` type declaration to include:
```ts
openPositionSheet: () => void;
```

Add `openPositionSheet` to the returned controller object.

Note: add `openPositionSheet` to the dependency arrays or keep as stable reference via `useCallback` dependencies on `[step, openSurface, updateItem]`.

### Step 11 — Workers app: update `TaskStepItemDetailsSection.tsx`

Path: `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepItemDetailsSection.tsx`

Three changes:

**A. Import `ItemPositionPill`:**
```ts
import { ItemPositionPill } from "@beyo/items";
```

**B. Read `openPositionSheet` from context:**
```ts
const {
  step,
  itemCategory,
  isItemCategoryPending,
  isItemCategoryError,
  isSeatCategory,
  workingSectionId,
  issuesSurfaceOpeners,
  openPositionSheet,
} = useTaskStepDetailContext();
```

**C. Update position rendering logic:**

Change `shouldRenderDetails` to always be true for seat items:
```ts
const shouldRenderDetails =
  hasPosition || isSeatCategory || shouldRenderQuantity || hasCategory;
```
(Note: `shouldRenderQuantity = isSeatCategory` already, so this simplifies to `hasPosition || isSeatCategory || hasCategory`. Either form is fine.)

Replace the position block (lines 90–97 in the current file):
```tsx
{/* OLD — only rendered when hasPosition */}
{hasPosition ? (
  <div className="flex shrink-0 flex-col gap-1">
    <EyebrowLabel>Position</EyebrowLabel>
    <InfoPill>
      <span className="text-sm">{step.item.item_position}</span>
    </InfoPill>
  </div>
) : null}
```

Replace with:
```tsx
{(isSeatCategory || hasPosition) ? (
  <div className="flex shrink-0 flex-col gap-1">
    <EyebrowLabel>Position</EyebrowLabel>
    <ItemPositionPill
      data-testid="task-step-item-position-pill"
      position={step.item.item_position}
      isSeat={isSeatCategory}
      onPress={isSeatCategory ? openPositionSheet : undefined}
    />
  </div>
) : null}
```

Note: `ItemPositionPill` does not forward `data-testid` unless the component is updated to accept it (check its implementation). If not, remove the `data-testid` prop or add `data-testid` forwarding to the component. The pill is visible for non-seat items too if they happen to have a position (read-only, no `onPress`).

---

### Step 12 — Managers app: add `openPositionSheet` to `use-task-detail.controller.ts`

Path: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/controllers/use-task-detail.controller.ts`

The current `openPositionSheet` lives in `use-task-detail.flow.ts`. Move it here (to the controller) because it needs access to `taskQuery.data?.item?.item_position` (for `initialPosition`) and `updateItem` (for `onSave`).

Add imports:
```ts
import { ITEM_POSITION_SHEET_SURFACE_ID, type ItemPositionSheetSurfaceProps } from "@beyo/items";
```

The controller already has `updateItem` and `itemId` in scope. Add a local `openSurface` call inside the controller using the flow's existing `useSurface`... but wait, the flow owns `useSurface`. Either:
- Import `useSurface` in the controller directly, OR
- Pass `openPositionSheet` down through the flow as a parameter

Best approach: import `useSurface` from `@beyo/hooks` directly in the controller (same as the workers controller pattern). The controller already spreads `...flow`, so `openPositionSheet` in the flow must be removed to avoid a name collision.

Add to `use-task-detail.controller.ts`:
```ts
import { useSurface } from "@beyo/hooks";

// inside useTaskDetailController:
const { open: openSurface } = useSurface();

// add openPositionSheet:
function openPositionSheet(): void {
  if (!itemId) return;
  const initialPosition = taskQuery.data?.item?.item_position ?? null;
  openSurface(ITEM_POSITION_SHEET_SURFACE_ID, {
    itemId,
    initialPosition,
    onSave: (position) => {
      updateItem.mutate({
        id: itemId as never,
        item_position: position,
      });
    },
  } satisfies ItemPositionSheetSurfaceProps);
}
```

Add `openPositionSheet` to the returned controller object.

### Step 13 — Managers app: remove `openPositionSheet` from `use-task-detail.flow.ts`

Path: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/flows/use-task-detail.flow.ts`

Remove the `openPositionSheet` key and the `ITEM_POSITION_SHEET_SURFACE_ID` import (it will no longer be used here). Keep all other surface openers intact. The controller's `...flow` spread will no longer include `openPositionSheet` since it's now defined in the controller itself.

### Step 14 — Managers app: update `features/tasks/surfaces.ts` loader

Path: `apps/managers-app/ManagerBeyo-app-managers/src/features/tasks/surfaces.ts`

Replace the loader function for the position sheet:
```ts
// OLD
function loadItemPositionSheetPage() {
  return import("@/pages/tasks/ItemPositionSheetPage").then((module) => ({
    default: module.ItemPositionSheetPage,
  }));
}

// NEW — loads from package
function loadItemPositionSheetPage() {
  return import("@beyo/items").then((module) => ({
    default: module.ItemPositionSheetPage,
  }));
}
```

`ITEM_POSITION_SHEET_SURFACE_ID` should now be imported from `@beyo/items` instead of defined locally. Remove the local definition. Update the import:
```ts
import {
  ITEM_POSITION_SHEET_SURFACE_ID,
  // other surface IDs from package...
} from "@beyo/items";
```

Keep the `lazyWithPreload` instance and surface registration entry unchanged (same surface type `"sheet"`).

### Step 15 — Managers app: update `features/items/actions/use-update-item.ts` import

Path: `apps/managers-app/ManagerBeyo-app-managers/src/features/items/actions/use-update-item.ts`

Change the import of the raw `updateItem` function from the local `../api/update-item` to the package:
```ts
// OLD
import { updateItem } from '../api/update-item';

// NEW
import { updateItem } from '@beyo/items';
```

No other changes — the optimistic update logic remains app-local (snapshots `TaskDetailRaw`, rollbacks on error).

### Step 16 — Delete local managers files

Delete the following files (now covered by the package):
1. `apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/update-item.ts`
2. `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/ItemPositionSheetPage.tsx`

Verify no other file in the managers app imports from either path before deleting (run `grep -r "features/items/api/update-item" src/` and `grep -r "ItemPositionSheetPage" src/` from the managers app root).

### Step 17 — Remove local `ITEM_POSITION_SHEET_SURFACE_ID` from managers `surfaces.ts`

The constant `ITEM_POSITION_SHEET_SURFACE_ID = "item-position-sheet"` is currently defined in `apps/managers-app/.../features/tasks/surfaces.ts`. After Step 14 it should be imported from `@beyo/items`. Remove the local `const` declaration.

Similarly, remove `ItemPositionSurfaceProps` local type definition if it exists (was defined locally, now from package).

### Step 18 — Verify `@source` directive for `@beyo/items` in workers app CSS

Path: `apps/workers-app/ManagerBeyo-app-workers/src/index.css`

Check whether an `@source "../../../../packages/items/src"` directive exists. If not, add it (the new `ItemPositionPill.tsx` uses Tailwind class names via `className` props and wraps `InfoPill`).

---

## Risks and mitigations

- Risk: `useSurfaceProps<T>()` returns `Partial<T>`, so `onSave` will be `undefined` if the sheet is opened without it (e.g., from an older surface registration).
  Mitigation: The `ItemPositionSheetPage` disables the save button when `!onSave`. No crash possible.

- Risk: `ApiEnvelopeSchema` import path may differ in packages — the package's `update-item.ts` must import it from `@beyo/lib` or `@beyo/api-client`, not from `@/types/api`.
  Mitigation: Check `packages/items/src/api/fetch-item-lookup.ts` for the existing pattern used within this package for the response schema. Mirror it exactly.

- Risk: `ITEM_POSITION_SHEET_SURFACE_ID` value `"item-position-sheet"` is hardcoded as a string in the managers app's existing surface registrations. Changing the source (from local to package) must preserve the same string value to avoid surface ID mismatches at runtime.
  Mitigation: The package defines the same string `"item-position-sheet"`. Confirm string equality before deleting the local constant.

- Risk: Adding `useSurface` to the managers controller creates a second `useSurface` call alongside the flow's existing call.
  Mitigation: One `useSurface` call per component is fine. Alternatively, extract the `open` function from the flow's return value and pass it into `openPositionSheet` — but that adds coupling. The clean solution is to call `useSurface()` in the controller directly, matching the workers app pattern.

- Risk: Workers app `features/items/actions/` directory does not exist yet.
  Mitigation: Create `features/items/` and `features/items/actions/` directories as part of Step 8.

## Validation plan

- `npm run typecheck` from `frontend/packages/items/` — zero errors
- `npm run typecheck` from `apps/workers-app/ManagerBeyo-app-workers/` — zero errors
- `npm run typecheck` from `apps/managers-app/ManagerBeyo-app-managers/` — zero errors
- Manual runtime check (workers app): open a task step detail page for a seat item with no position → position row shows "−" → tap → position sheet opens → enter value → save → row updates
- Manual runtime check (managers app): open a task detail page for a seat item → tap position button in `TaskBodyCategoryRow` → same `ItemPositionSheetPage` appears → save → position updates

## Review log

- `2026-06-25` Claude: initial plan authored from code reading session

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: David
