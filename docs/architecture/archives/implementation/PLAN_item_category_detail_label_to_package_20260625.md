# PLAN_item_category_detail_label_to_package_20260625

## Metadata

- Plan ID: `PLAN_item_category_detail_label_to_package_20260625`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-25T00:00:00Z`
- Last updated at (UTC): `2026-06-25T21:30:58Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- Goal: Create a self-contained `ItemCategoryDetailLabel` component in `@beyo/item-categories` that fetches its own data internally and renders the category image + name label. Wire it into `TaskBodyCategoryRow` in `@beyo/tasks`. Remove all item category prop-threading from `TaskDetailSlidePage`. Remove local duplicate API, flow, store, page, and field files from the managers app's items feature — replacing them with imports from `@beyo/item-categories`, which already contains all of these.
- Business/user intent: The `TaskBodyCategoryRow` currently relies on the consuming page to fetch and pass category data as props. The managers app also duplicates the category picker API, flow, store, and picker page that already exist in `@beyo/item-categories`. After this change: (1) placing `TaskBodyCategoryRow` in any surface requires zero category wiring from the host; (2) the managers app has a single source of truth for all item category logic — the package.
- Non-goals: Do not add a picker interaction to `ItemCategoryDetailLabel`. Do not touch the workers app. Do not fix the pre-existing §13 violation in the package's `ItemCategorySelectionField` (it calls `useSurfaceStore.getState().open()` directly — out of scope here).

## Scope

- In scope:
  - New `ItemCategoryDetailLabel` component in `packages/item-categories/src/components/`
  - Export from `packages/item-categories/src/index.ts`
  - `packages/tasks/package.json` — add `@beyo/item-categories` peer dep
  - `packages/tasks/src/components/detail/TaskBodyCategoryRow.tsx` — remove `itemCategoryOptions` + `isCategoryLoading` props; render `<ItemCategoryDetailLabel>` instead
  - `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` — remove `useItemCategoryPickerFlow` call and the two props it fed to `<TaskBodyCategoryRow>`
  - `apps/managers-app/.../package.json` — add `@beyo/item-categories: "*"` to dependencies
  - `apps/managers-app/.../src/index.css` — add `@source "../../../../packages/item-categories/src"`
  - **Delete** the following local duplicates from `apps/managers-app/.../features/items/`:
    - `api/fetch-item-categories-picker.ts`
    - `api/item-category-picker-keys.ts`
    - `api/use-item-categories-picker.ts`
    - `flows/use-item-category-picker.flow.ts`
    - `store/item-category-selection.store.ts`
    - `pages/ItemCategoryPickerSheetPage.tsx`
    - `components/fields/ItemCategorySelectionField.tsx`
    - `components/fields/ItemCategorySelectionField.test.tsx`
  - **Update** `apps/managers-app/.../features/items/surfaces.ts` — replace local picker page registration with the package's `itemCategoryPickerSurfaces`; re-export `preloadItemCategoryPickerSurface` from `@beyo/item-categories`
  - **Update** `apps/managers-app/.../features/items/index.ts` — remove exports of deleted files; re-export `ItemCategorySelectionField`, `useItemCategoryPickerFlow`, `useItemCategorySelectionStore` from `@beyo/item-categories`

- Out of scope:
  - Workers app — no `TaskDetailSlidePage` equivalent today
  - Fixing the §13 surface store violation inside the package's `ItemCategorySelectionField`

- Assumptions:
  - `useItemCategoriesQuery` (used by `useItemCategoryByIdFlow`) and `useItemCategoriesPickerQuery` (used by `useItemCategoryPickerFlow`) both call `GET /api/v1/item-categories`. TanStack Query deduplicates them.
  - `item_category_id` in `TaskDetailRaw` is `string | null` (not the branded `ItemCategoryId`). A safe inline cast is used inside the new component.
  - The managers app's local `ItemCategorySelectionField` is functionally identical to the package's version — same JSX, same flow, same picker. The only differences are the import paths (`@/` aliases vs. package-relative). The package version is a safe drop-in replacement.
  - The local flow returns `{ isLoading }` but the package flow returns `{ isPending }`. Since the local `ItemCategorySelectionField` is deleted (replaced by the package's component which already uses `isPending`), this discrepancy is resolved automatically.

## Clarifications required

_None — all design decisions are resolved above._

## Acceptance criteria

1. `TaskBodyCategoryRow` no longer declares `itemCategoryOptions` or `isCategoryLoading` props.
2. `TaskDetailSlidePage` no longer imports or calls `useItemCategoryPickerFlow` for category display.
3. Opening the task detail slide in the managers app still shows the category image and name label (verified manually).
4. The item category picker in task creation / item edit forms still works (verified manually).
5. `npm run typecheck` passes with zero errors in the managers app, `@beyo/tasks`, and `@beyo/item-categories`.
6. No `@/` alias imports exist inside `packages/item-categories/src/` or `packages/tasks/src/`.
7. The following files no longer exist in `apps/managers-app/.../features/items/`:
   - `api/fetch-item-categories-picker.ts`
   - `api/item-category-picker-keys.ts`
   - `api/use-item-categories-picker.ts`
   - `flows/use-item-category-picker.flow.ts`
   - `store/item-category-selection.store.ts`
   - `pages/ItemCategoryPickerSheetPage.tsx`
   - `components/fields/ItemCategorySelectionField.tsx`
   - `components/fields/ItemCategorySelectionField.test.tsx`

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: primary contract — §13 (surfaceOpeners pattern), §6 (consuming app wiring), §4 (peerDependencies), §8 (package structure)
- `architecture/05_server_state.md`: confirms TanStack Query deduplication behaviour (single fetch for same query key)
- `architecture/07_components.md`: component prop shape and rendering contract
- `architecture/15_feature_structure.md`: layer boundaries — components import from package internals via relative paths only

### Local extensions loaded

- None required for this plan.

### File read intent — pattern vs. relational

Permitted reads performed:
- `packages/item-categories/src/flows/use-item-category-by-id.ts` — to confirm the hook signature and return shape
- `packages/item-categories/src/types.ts` — to confirm `ItemCategoryId` brand and `ItemCategoryViewModel` shape
- `packages/item-categories/src/index.ts` — to confirm what is already exported (and where to append)
- `packages/tasks/src/components/detail/TaskBodyCategoryRow.tsx` — to understand current props and render logic being replaced
- `packages/tasks/package.json` — to confirm missing `@beyo/item-categories` peer dep
- `apps/managers-app/.../pages/tasks/TaskDetailSlidePage.tsx` — to locate the `useItemCategoryPickerFlow` call and prop threading
- `apps/managers-app/.../package.json` — to confirm `@beyo/item-categories` is not yet in app dependencies
- `apps/managers-app/.../src/index.css` — to confirm `@source "../../../../packages/item-categories/src"` is not yet present

### Skill selection

- Primary skill: none (small, bounded change — no dedicated skill needed)

## Implementation plan

### Step 1 — Create `ItemCategoryDetailLabel` in `@beyo/item-categories`

**File:** `packages/item-categories/src/components/ItemCategoryDetailLabel.tsx` _(new)_

```tsx
import { ImagePlaceholder, SectionLabel } from "@beyo/ui";

import { useItemCategoryByIdFlow } from "../flows/use-item-category-by-id";
import type { ItemCategoryId } from "../types";

type ItemCategoryDetailLabelProps = {
  categoryId: string | null | undefined;
  fallbackSnapshot?: string | null;
};

export function ItemCategoryDetailLabel({
  categoryId,
  fallbackSnapshot,
}: ItemCategoryDetailLabelProps): React.JSX.Element | null {
  const { category, isPending } = useItemCategoryByIdFlow(
    categoryId as ItemCategoryId | null | undefined,
  );

  const label =
    category?.name ??
    fallbackSnapshot ??
    (isPending && categoryId ? "Loading…" : null);

  if (!label && !category) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {category ? (
        category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt=""
            aria-hidden="true"
            className="size-4 rounded-sm object-contain"
          />
        ) : (
          <div className="size-4 shrink-0 overflow-hidden rounded-sm">
            <ImagePlaceholder
              className="bg-transparent"
              iconClassName="size-4"
            />
          </div>
        )
      ) : null}
      <SectionLabel tone="muted">{label ?? "—"}</SectionLabel>
    </div>
  );
}
```

**Notes:**
- Uses `useItemCategoryByIdFlow` (already exported from `@beyo/item-categories`) — no new API calls needed.
- `categoryId` is accepted as `string | null | undefined` (matching the raw task type) and cast to `ItemCategoryId` internally — safe because the value originates from the API response that was already Zod-validated at the query boundary.
- Returns `null` when there is no label and no resolved category (prevents an empty row gap).

---

### Step 2 — Export `ItemCategoryDetailLabel` from `@beyo/item-categories`

**File:** `packages/item-categories/src/index.ts` _(modified)_

Append after the existing `ItemCategorySelectionField` export line:

```ts
export { ItemCategoryDetailLabel } from "./components/ItemCategoryDetailLabel";
```

---

### Step 3 — Add `@beyo/item-categories` peer dep to `@beyo/tasks`

**File:** `packages/tasks/package.json` _(modified)_

Add to `peerDependencies` (alphabetical order, after `@beyo/api-client`):

```json
"@beyo/item-categories": "*",
```

Result after change:
```json
"peerDependencies": {
  "@beyo/api-client": "*",
  "@beyo/hooks": "*",
  "@beyo/images": "*",
  "@beyo/item-categories": "*",
  "@beyo/lib": "*",
  "@beyo/ui": "*",
  "@beyo/working-sections": "*",
  ...
}
```

---

### Step 4 — Refactor `TaskBodyCategoryRow` to use `ItemCategoryDetailLabel`

**File:** `packages/tasks/src/components/detail/TaskBodyCategoryRow.tsx` _(modified)_

Replace the entire file with:

```tsx
import { ItemCategoryDetailLabel } from "@beyo/item-categories";
import { ItemPositionPill } from "@beyo/items";

import type { TaskDetailRaw } from "../../types";

type TaskBodyCategoryRowProps = {
  taskDetail: TaskDetailRaw | null;
  onOpenPosition: () => void;
};

export function TaskBodyCategoryRow({
  taskDetail,
  onOpenPosition,
}: TaskBodyCategoryRowProps): React.JSX.Element | null {
  if (!taskDetail?.item) {
    return null;
  }

  const { item } = taskDetail;
  const isSeatItem =
    item.item_major_category_snapshot?.toLowerCase() === "seat";

  if (
    !item.item_category_id &&
    !item.item_category_snapshot &&
    !item.item_position &&
    !isSeatItem
  ) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-0.5">
      <ItemCategoryDetailLabel
        categoryId={item.item_category_id}
        fallbackSnapshot={item.item_category_snapshot}
      />
      {isSeatItem ? (
        <button
          data-testid="task-body-position-button"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          type="button"
          onClick={onOpenPosition}
        >
          <ItemPositionPill position={item.item_position} isSeat={isSeatItem} />
        </button>
      ) : null}
    </div>
  );
}
```

**What changed:**
- Removed `ItemCategoryOption` local type.
- Removed `isCategoryLoading` and `itemCategoryOptions` props.
- Removed local `category`, `categoryLabel` derivation logic (moved into `ItemCategoryDetailLabel`).
- Early-return condition now checks `!item.item_category_id && !item.item_category_snapshot` instead of the derived `!categoryLabel` (functionally equivalent — if both id and snapshot are null, the label would have been null anyway after loading).
- Category image + label rendering block replaced by `<ItemCategoryDetailLabel>`.

---

### Step 5 — Remove flow call and prop threading from `TaskDetailSlidePage`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/pages/tasks/TaskDetailSlidePage.tsx` _(modified)_

**Remove** import (line 19):
```ts
import { ItemUpholsteryField, useItemCategoryPickerFlow } from "@/features/items";
```
Replace with:
```ts
import { ItemUpholsteryField } from "@/features/items";
```

**Remove** the flow hook call (currently line 59):
```ts
const itemCategoryFlow = useItemCategoryPickerFlow();
```

**Remove** the two props from `<TaskBodyCategoryRow>` (currently lines 126–127):
```tsx
isCategoryLoading={itemCategoryFlow.isLoading}
itemCategoryOptions={itemCategoryFlow.options}
```

After removal, `<TaskBodyCategoryRow>` is:
```tsx
<TaskBodyCategoryRow
  onOpenPosition={controller.openPositionSheet}
  taskDetail={controller.taskDetail}
/>
```

---

### Step 6 — Add `@beyo/item-categories` to managers app dependencies

**File:** `apps/managers-app/ManagerBeyo-app-managers/package.json` _(modified)_

Add to `dependencies` (after `@beyo/hooks`, alphabetical):

```json
"@beyo/item-categories": "*",
```

---

### Step 7 — Register Tailwind source for `@beyo/item-categories`

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/index.css` _(modified)_

Add after the existing `@source "../../../../packages/tasks/src"` line:

```css
@source "../../../../packages/item-categories/src";
```

---

### Step 8 — Delete local duplicate files from managers app items feature

**Delete** these 8 files — all have identical counterparts in `@beyo/item-categories`:

```
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/fetch-item-categories-picker.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/item-category-picker-keys.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/api/use-item-categories-picker.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/flows/use-item-category-picker.flow.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/store/item-category-selection.store.ts
apps/managers-app/ManagerBeyo-app-managers/src/features/items/pages/ItemCategoryPickerSheetPage.tsx
apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemCategorySelectionField.tsx
apps/managers-app/ManagerBeyo-app-managers/src/features/items/components/fields/ItemCategorySelectionField.test.tsx
```

**Why `ItemCategorySelectionField.tsx` can be deleted:** The package's `ItemCategorySelectionField` (already exported from `@beyo/item-categories`) is functionally identical — same JSX structure, same picker interaction, same form field names. Only import paths differ (`@/` aliases vs. package-relative). The package version is the canonical implementation.

**Why `ItemCategorySelectionField.test.tsx` can be deleted:** It mocks `@/features/items/flows/use-item-category-picker.flow` which will no longer exist. The test would need to be rewritten to mock `@beyo/item-categories` instead — that is deferred as a separate task.

---

### Step 9 — Update `features/items/surfaces.ts` to use package's surfaces

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/items/surfaces.ts` _(modified)_

Replace the entire file with:

```ts
import { lazyWithPreload } from "@beyo/ui";
import { SCANNER_SLIDE_SURFACE_ID } from "@beyo/scanner";
import {
  itemCategoryPickerSurfaces,
  preloadItemCategoryPickerSurface,
} from "@beyo/item-categories";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export { preloadItemCategoryPickerSurface };

function loadScannerSlidePage() {
  return import("@beyo/scanner").then((module) => ({
    default: module.ScannerSlideRouteEntry,
  }));
}

const scannerSlide = lazyWithPreload(loadScannerSlidePage);

export const preloadScannerSlideSurface = scannerSlide.preload;

export const itemSurfaces: SurfaceRegistrations = {
  ...itemCategoryPickerSurfaces,
  [SCANNER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: scannerSlide.Component,
  },
};
```

**What changed:** The local `loadItemCategoryPickerSheetPage` factory and its `lazyWithPreload` wrapper are removed. `itemCategoryPickerSurfaces` (from the package) provides the same surface registration entry under the same surface ID (`"item-category-picker"`). The scanner surface is unchanged. `preloadItemCategoryPickerSurface` is now re-exported from the package directly.

**Why `app/surface-registry.ts` requires no change:** It imports `{ itemSurfaces }` from `@/features/items` — this export still exists after the update above.

---

### Step 10 — Update `features/items/index.ts` to re-export from package

**File:** `apps/managers-app/ManagerBeyo-app-managers/src/features/items/index.ts` _(modified)_

Remove the three lines that export deleted symbols:
```ts
// REMOVE these lines:
export { useItemCategoryPickerFlow } from './flows/use-item-category-picker.flow';
export { useItemCategorySelectionStore } from './store/item-category-selection.store';
export { ItemCategorySelectionField } from './components/fields/ItemCategorySelectionField';
```

Add re-exports from `@beyo/item-categories` in their place:
```ts
export {
  ItemCategorySelectionField,
  useItemCategoryPickerFlow,
  useItemCategorySelectionStore,
} from "@beyo/item-categories";
```

**Why re-export instead of deleting:** External consumers (`features/testing_forms/components/TestingFormsContent.tsx`, any task creation forms) import these via `@/features/items`. Re-exporting from the package preserves the import path for all consumers — no changes needed elsewhere in the app.

---

### Step 11 — Run `npm install` from `frontend/`

```bash
cd /Users/davidloorenz/Desktop/Developer/BeyoApps_2025/ManagerBeyo-app/frontend
npm install
```

This re-links workspace symlinks so `node_modules/@beyo/item-categories` resolves correctly for all consumers.

## Risks and mitigations

- Risk: TanStack Query key mismatch — `useItemCategoriesQuery` and `useItemCategoriesPickerQuery` may use different query keys and make two separate network requests on the task detail page.
  Mitigation: Both calls are to the same endpoint. If the keys differ, they share the same response data and the second resolves from cache immediately (no UX impact). Verify with network tab during manual testing.

- Risk: Branded `ItemCategoryId` cast — casting `string` to `ItemCategoryId` without runtime validation.
  Mitigation: The cast is safe because `item_category_id` originates from the Zod-validated `TaskDetailRaw` API response where the field is declared as `z.string().nullable()`. The brand is a compile-time marker with no runtime behaviour.

- Risk: `@beyo/items` is imported in `TaskBodyCategoryRow` but not listed in `packages/tasks/package.json` peerDeps.
  Mitigation: This is a pre-existing omission not introduced by this plan. Do not fix it here; raise it separately.

- Risk: Local flow returns `{ isLoading }` but package flow returns `{ isPending }` — any remaining local consumers of the local `useItemCategoryPickerFlow` that read `.isLoading` will break at the type level.
  Mitigation: After Step 8, the only consumers of `useItemCategoryPickerFlow` in the managers app are: (a) the deleted local `ItemCategorySelectionField.tsx` and (b) `TaskDetailSlidePage.tsx` (removed in Step 5). The package re-export in Step 10 exposes `.isPending`. TypeScript will catch any missed usage at typecheck time.

## Validation plan

- `npm run typecheck` from `frontend/apps/managers-app/ManagerBeyo-app-managers`: zero TypeScript errors
- `npm run typecheck` from `frontend/packages/tasks`: zero TypeScript errors
- `npm run typecheck` from `frontend/packages/item-categories`: zero TypeScript errors
- Manual test: open a task detail slide in the managers app — category image and name still render correctly
- Manual test: open a task for an item with no category — row is hidden (early return fires)
- Manual test: open a task for a seat item — position pill still renders alongside the category label
- Manual test: open the task creation form and interact with the item category picker — major category selection and sub-category sheet still open and select correctly (verifies the package's `ItemCategorySelectionField` + `itemCategoryPickerSurfaces` wiring)

## Review log

_(empty — awaiting Codex execution)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `user`
