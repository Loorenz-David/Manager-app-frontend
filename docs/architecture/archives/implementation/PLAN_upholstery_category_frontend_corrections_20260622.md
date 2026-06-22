# PLAN_upholstery_category_frontend_corrections_20260622

## Metadata

- Plan ID: `PLAN_upholstery_category_frontend_corrections_20260622`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-22T13:30:00Z`
- Last updated at (UTC): `2026-06-22T10:29:11Z`
- Related issue/ticket: `SUMMARY_PLAN_upholstery_category_frontend_20260622`
- Intention plan: _(none — direct correction of review findings)_

> All `src/` paths are relative to
> `apps/managers-app/ManagerBeyo-app-managers/src/`

> **Parent plan:** `docs/architecture/archives/implementation/PLAN_upholstery_category_frontend_20260622.md`
> **Review source:** post-implementation code review performed on 2026-06-22.

---

## Goal and intent

- **Goal:** Fix 6 issues found in the post-implementation review of `PLAN_upholstery_category_frontend_20260622`. No new features, no refactors beyond the exact corrections listed.
- **Business/user intent:** Prevent data loss (image_url overwrite), remove invisible-but-wrong code, close a public-API gap, and fix two visible UI defects (spurious sort/filter buttons, brief category-step flash on edit open).
- **Non-goals:** Eliminating the double `useUpholsteryPickerOptionQuery` call (harmless — TanStack Query deduplicates it). Redesigning the staged form beyond what the corrections require.

---

## Scope

- **In scope:** 4 files modified, 0 new files.
- **Out of scope:** Any feature changes, new API calls, new UI beyond what is described below.
- **Assumptions:** The existing implementation from `PLAN_upholstery_category_frontend_20260622` is the baseline; all other files are untouched.

---

## Clarifications required

_(none — all corrections are unambiguous)_

---

## Acceptance criteria

1. `SearchBar` in `UpholsteryCategoryPickerField` shows **no** sort or filter buttons.
2. Selecting a category in **edit mode** does **not** overwrite a non-empty `image_url` the user already has set.
3. Opening the edit form navigates directly to the details step with **no visible flash** of the category step.
4. `UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID` and `preloadUpholsteryCategoryCreationSurface` are importable from `@/features/upholstery-category` (the public index).
5. `InventoryCreationFab` imports the category surface constants from the feature's public index, not from the internal `/surfaces.ts` path.
6. `submitError` is only rendered inside the **details** step, not in the category step.
7. The self-preload call `usePreloadSurface(preloadInventoryCreationSurface)` is absent from `UpholsteryInventoryCreationSlidePage`.
8. The `ContentCard` + `FieldLabelRow` wrapper is removed from the category step; `UpholsteryCategoryPickerField` renders directly into the step.
9. `npm run typecheck`: zero TypeScript errors.

---

## Contracts and skills

### File read intent — pattern vs. relational

Permitted reads before editing (relational — confirming what exists):

- Reading the 4 files listed in the implementation plan to verify exact line content before making targeted edits.

Prohibited:

- Reading other files to understand patterns (the corrections are point changes; no new patterns needed).

---

## Implementation plan

**4 files to modify. Apply in order.**

---

### Step 1 — `src/features/upholstery-category/index.ts`

**Why:** `InventoryCreationFab` currently imports `UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID` and `preloadUpholsteryCategoryCreationSurface` directly from the internal file `@/features/upholstery-category/surfaces`. External consumers must go through the feature's public index.

**Change:** Add two re-exports to the existing `index.ts`:

```ts
export {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
  preloadUpholsteryCategoryCreationSurface,
  upholsteryCategorySurfaces,
} from "./surfaces";
export { UpholsteryCategoryPickerField } from "./components/UpholsteryCategoryPickerField";
export type { UpholsteryCategory, UpholsteryCategoryInline } from "./types";
```

The full file after the change:

```ts
export {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
  preloadUpholsteryCategoryCreationSurface,
  upholsteryCategorySurfaces,
} from "./surfaces";
export { UpholsteryCategoryPickerField } from "./components/UpholsteryCategoryPickerField";
export type { UpholsteryCategory, UpholsteryCategoryInline } from "./types";
```

---

### Step 2 — `src/features/upholstery-category/components/UpholsteryCategoryPickerField.tsx`

**Why:** `SearchBar` defaults to `showSortButton={true}` and `showFilterButton={true}`. The plan requires both buttons hidden in the category picker.

**Change:** On the `SearchBar` element (currently lines 109-114), add `showSortButton={false}` and `showFilterButton={false}`:

```tsx
<SearchBar
  isLoading={listQuery.isFetching}
  placeholder="Search categories..."
  showFilterButton={false}
  showSortButton={false}
  value={searchInput}
  onChange={handleSearchChange}
/>
```

No other changes to this file.

---

### Step 3 — `src/features/upholstery-inventory/components/InventoryCreationFab.tsx`

**Why:** The import of `UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID` and `preloadUpholsteryCategoryCreationSurface` bypasses the feature's public index by pointing directly at the internal `/surfaces.ts` file.

**Change:** Replace the two-line internal import with a single import from the public index:

Before:
```ts
import {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
  preloadUpholsteryCategoryCreationSurface,
} from "@/features/upholstery-category/surfaces";
```

After:
```ts
import {
  UPHOLSTERY_CATEGORY_CREATION_SLIDE_ID,
  preloadUpholsteryCategoryCreationSurface,
} from "@/features/upholstery-category";
```

No other changes to this file.

---

### Step 4 — `src/features/upholstery-inventory/pages/UpholsteryInventoryCreationSlidePage.tsx`

Four independent point changes to this file. Apply all four.

---

#### 4a — Remove the self-preload call

**Why:** `usePreloadSurface(preloadInventoryCreationSurface)` preloads this very component from within itself. Since the component is already loaded when this runs, it is a no-op and dead code.

**Change:** Delete the import of `preloadInventoryCreationSurface` and the `usePreloadSurface` call.

Remove from imports (the `surfaces` import line):
```ts
import {
  INVENTORY_CREATION_SLIDE_ID,
  preloadInventoryCreationSurface,       // ← remove this line
  type InventoryCreationSurfaceProps,
} from "../surfaces";
```

After removal:
```ts
import {
  INVENTORY_CREATION_SLIDE_ID,
  type InventoryCreationSurfaceProps,
} from "../surfaces";
```

Remove the call inside the component body:
```ts
usePreloadSurface(preloadInventoryCreationSurface);  // ← delete this line
```

If `usePreloadSurface` is no longer used anywhere else in this file after this deletion, remove its import too:
```ts
import { usePreloadSurface } from "@/hooks/use-preload-surface";  // ← delete if unused
```

---

#### 4b — Replace `useEffect` with `useLayoutEffect` for edit-mode navigation

**Why:** `useEffect` fires after paint. On edit mode open, the user briefly sees the category step before navigation to details. `useLayoutEffect` fires before paint, eliminating the flash.

**Change:** Replace the navigation effect (currently lines 162-166):

Before:
```ts
useEffect(() => {
  if (isEditMode && staged.activeStepId !== "details") {
    staged.setStepStatus("category", "completed");
    staged.navigateTo("details");
  }
}, [isEditMode, staged]);
```

After:
```ts
// eslint-disable-next-line react-hooks/exhaustive-deps
useLayoutEffect(() => {
  if (isEditMode) {
    staged.setStepStatus("category", "completed");
    staged.navigateTo("details");
  }
}, []);
```

**Notes:**
- Empty deps array is intentional. `isEditMode` is derived from surface props which are fixed for the entire lifetime of this component instance. Running this once on mount is sufficient and correct.
- The guard `staged.activeStepId !== "details"` is removed — it is no longer needed because the effect runs only once on mount, at which point `activeStepId` is always `"category"` (initial state).
- Add `useLayoutEffect` to the React import. Remove `useEffect` from the React import **only if** it is no longer used by any other effect in the file after this change. (Check: there is still `useEffect` on the image preview reset and on the category prefill — keep `useEffect` in the import.)

---

#### 4c — Guard `image_url` overwrite in edit mode

**Why:** `handleCategoryChange` unconditionally calls `form.setValue("image_url", category.image_url)` even in edit mode, which overwrites a custom `image_url` the user already has stored.

**Rule:** Only auto-fill `image_url` from the selected category when: (a) we are in create mode, OR (b) we are in edit mode AND `image_url` is currently empty.

**Change:** Replace `handleCategoryChange` (currently lines 181-194):

Before:
```ts
function handleCategoryChange(
  categoryId: string | null,
  category: {
    image_url: string | null;
  } | null,
): void {
  form.setValue("upholstery_category_id", categoryId, { shouldDirty: true });

  if (category) {
    form.setValue("image_url", category.image_url, { shouldDirty: true });
    staged.setStepStatus("category", "completed");
    staged.navigateTo("details");
  }
}
```

After:
```ts
function handleCategoryChange(
  categoryId: string | null,
  category: {
    image_url: string | null;
  } | null,
): void {
  form.setValue("upholstery_category_id", categoryId, { shouldDirty: true });

  if (category) {
    if (!isEditMode || !form.getValues("image_url")) {
      form.setValue("image_url", category.image_url, { shouldDirty: true });
    }
    staged.setStepStatus("category", "completed");
    staged.navigateTo("details");
  }
}
```

---

#### 4d — Remove `submitError` from the category step and remove `ContentCard` wrapper

**Why (submitError):** `submitError` is set only by the create/update mutations, which are triggered from the details step. Rendering it in the category step is unreachable in practice and adds visual noise.

**Why (ContentCard):** `UpholsteryCategoryPickerField` already handles its own `px-4 pt-4 pb-4` layout. Wrapping it in a `ContentCard` creates double padding and changes the intended full-width picker design from the original plan.

**Change:** Replace the entire category `StagedFormStep` block.

Before:
```tsx
<StagedFormStep id="category" className="px-0">
  <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
    <ContentCard>
      <div className="flex flex-col gap-0">
        <div className="px-4 pt-4">
          <FieldLabelRow label="Category" optional />
        </div>
        <UpholsteryCategoryPickerField
          prefillCategoryId={
            isEditMode
              ? upholsteryQuery.data?.upholstery_category?.id ??
                editProps?.prefill.upholstery_category_id
              : null
          }
          value={selectedCategoryId}
          onChange={handleCategoryChange}
        />
      </div>
    </ContentCard>

    {submitError ? (
      <p className="px-1 text-sm text-destructive">{submitError}</p>
    ) : null}
  </div>
</StagedFormStep>
```

After:
```tsx
<StagedFormStep id="category" className="p-0">
  <UpholsteryCategoryPickerField
    prefillCategoryId={
      isEditMode
        ? upholsteryQuery.data?.upholstery_category?.id ??
          editProps?.prefill.upholstery_category_id
        : null
    }
    value={selectedCategoryId}
    onChange={handleCategoryChange}
  />
</StagedFormStep>
```

**After this change, verify** that `ContentCard` and `FieldLabelRow` are still used elsewhere in the file (they are — in the details step). Do not remove their imports.

---

## Risks and mitigations

- **Risk:** Empty-deps `useLayoutEffect` silences the exhaustive-deps lint rule. Add the `eslint-disable-next-line` comment on the line immediately before the `useLayoutEffect` call, not inside the callback.
  **Mitigation:** Already specified in step 4b.

- **Risk:** After removing the `ContentCard` wrapper from the category step, the `UpholsteryCategoryPickerField`'s internal `pt-4` may clash with the `StagedFormTimeline` offset (`pt-14` on the scroll container). The top padding of the picker's content (`pt-4`) adds to the timeline's offset; the result is normal extra whitespace, not a visual overlap.
  **Mitigation:** No change needed — the timeline is `absolute` and the scroll container's `pt-14` provides the clearance.

- **Risk:** After fixing the import in `InventoryCreationFab` (step 3), TypeScript must resolve the re-exported names from `index.ts`. If `index.ts` edit in step 1 is skipped, the FAB will break.
  **Mitigation:** Steps 1 and 3 are coupled — apply step 1 first.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Manual smoke — category picker: open "New inventory" → step 1 shows `SearchBar` **without** sort/filter icon buttons.
- Manual smoke — create flow: select category → `image_url` is pre-filled from category → advance to details step.
- Manual smoke — edit flow: open edit → opens directly on details step **without flash** → navigate back to step 1 → correct category highlighted → tap category → does **not** overwrite existing `image_url` (because `image_url` is non-empty in edit mode).
- Manual smoke — edit flow (empty image_url): open edit for upholstery with no image → navigate to step 1 → select different category → `image_url` **is** filled from the new category's image.
- Manual smoke — submit error: fill details with invalid data if possible; confirm error banner appears only in details step, not in category step.

---

## Review log

_(none yet)_

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `david`
