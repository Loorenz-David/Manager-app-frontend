# PLAN_note_images_section_below_composer_20260626

## Metadata

- Plan ID: `PLAN_note_images_section_below_composer_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T00:00:00Z`
- Last updated at (UTC): `2026-06-26T13:46:03Z`

## Goal and intent

- Goal: In the three task creation forms (Internal, PreOrder, Return), move the note `ImagePreviewGrid` out of the shared images `ContentCard` and place it below the `TaskNoteComposer`. Suppress the "add picture" button in the note grid (camera is the entry point via the composer). Hide the note images section entirely when there are no note images. Also: include the authenticated user's ID in `users_read_list` of the note payload on submit.
- Non-goals: Changing item image behavior, upload flow, or any backend schema.

## Scope

- In scope:
  1. Add `hideAddButton?: boolean` prop to `ImagePreviewGrid` — suppresses `ImageAddPictureButton` when `true`.
  2. New `TaskNoteImagesSection` component in `@beyo/task-notes` — reads note images from context, returns `null` when no images, renders a label + `ImagePreviewGrid` with `hideAddButton`.
  3. Export `TaskNoteImagesSection` from `packages/task-notes/src/index.ts`.
  4. In `InternalFormContent`, `PreOrderFormContent`, and `ReturnFormContent`:
     - Remove the standalone note `<ImagePreviewGrid>` from the shared images `ContentCard`.
     - Add `<TaskNoteImagesSection />` inside the composer `ContentCard`, directly after the `TaskNoteComposer` `Controller`.
  5. In `TaskNoteComposer`: move the camera button from the left of the editor to the right (same side as the check button) — both buttons share the right slot, toggling on `isEditorFocused`.
  6. In `TaskNoteComposer`: set the `Check` icon color to `var(--color-card)` via `text-card`.
  7. Add `@beyo/auth` to `@beyo/task-creation` `peerDependencies`.
  8. In `TaskCreationFormProvider`: read `user.id` from `useAuthStore` and expose as `currentUserClientId` via context.
  9. In `normalize-task-form-payload.ts`: add `currentUserClientId` to `BaseIds`; pass it to `buildNotePayload`; set `users_read_list: [currentUserClientId]`.
  10. In `InternalFormContent`, `PreOrderFormContent`, and `ReturnFormContent`: destructure `currentUserClientId` from `useTaskCreationFormContext()` and pass it in the `ids` object to the normalize functions.
- Out of scope: Item images behavior, upload flow, any backend schema change.

## Acceptance criteria

1. `ImagePreviewGrid` accepts a `hideAddButton` prop; when `true`, `ImageAddPictureButton` is not rendered.
2. `TaskNoteImagesSection` returns `null` when `!isPending && images.length === 0`.
3. When note images exist, `TaskNoteImagesSection` renders a `"Note images"` label above the grid.
4. The note images grid in `TaskNoteImagesSection` never shows `ImageAddPictureButton`.
5. In all three form contents, the shared images `ContentCard` contains only the item `ImagePreviewGrid` (inside its `EntityImagesProvider`). No note `ImagePreviewGrid` is inside that card.
6. `TaskNoteImagesSection` is rendered inside the composer `ContentCard`, after the `TaskNoteComposer` Controller.
7. In `TaskNoteComposer`, when the editor is not focused the camera button renders to the RIGHT of the editor div (not the left). When focused, the check button occupies the same right slot. Both buttons are rendered after the `<div className="relative min-w-0 flex-1 ...">` editor wrapper in the flex row.
8. The `Check` icon inside the done button has `className` that includes `text-card` (resolved to `color: var(--color-card)`).
9. `@beyo/auth` appears in `packages/task-creation/package.json` under `peerDependencies`.
10. `TaskCreationFormContextValue` has a `currentUserClientId: string` field; `TaskCreationFormProvider` reads it from `useAuthStore(selectUser)?.id` and provides it via context.
11. `BaseIds` in `normalize-task-form-payload.ts` has a `currentUserClientId: string` field; `buildNotePayload` puts it in `users_read_list`; `normalizeInternalFormPayload` and `normalizeReturnFormPayload` pass `ids.currentUserClientId` through.
12. In all three form contents, `currentUserClientId` is destructured from `useTaskCreationFormContext()` and included in the `ids` object passed to the normalize function.
13. `npm run typecheck` passes with zero errors.

---

## Implementation plan

### Step 1 — Add `hideAddButton` prop to `ImagePreviewGrid`

**File:** `packages/images/src/components/ImagePreviewGrid.tsx`

**Two exact changes:**

#### 1a. Add `hideAddButton` to the props type (line 10–13)

Before:
```ts
type ImagePreviewGridProps = {
  maxImages?: number;
  testId?: string;
};
```

After:
```ts
type ImagePreviewGridProps = {
  hideAddButton?: boolean;
  maxImages?: number;
  testId?: string;
};
```

#### 1b. Destructure the new prop and gate `showAddPictureButton` with it (lines 15–24)

Before:
```ts
export function ImagePreviewGrid({
  maxImages = DEFAULT_MAX_VISIBLE_IMAGES,
  testId = 'image-preview-grid',
}: ImagePreviewGridProps): React.JSX.Element {
  const { deleteImage, images, isPending, openViewer, reorderImages } = useEntityImagesContext();
  const [isEditMode, setIsEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleImages = images.slice(0, maxImages);
  const overflowCount = Math.max(images.length - visibleImages.length, 0);
  const showAddPictureButton = !isEditMode && visibleImages.length < maxImages;
```

After:
```ts
export function ImagePreviewGrid({
  hideAddButton = false,
  maxImages = DEFAULT_MAX_VISIBLE_IMAGES,
  testId = 'image-preview-grid',
}: ImagePreviewGridProps): React.JSX.Element {
  const { deleteImage, images, isPending, openViewer, reorderImages } = useEntityImagesContext();
  const [isEditMode, setIsEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleImages = images.slice(0, maxImages);
  const overflowCount = Math.max(images.length - visibleImages.length, 0);
  const showAddPictureButton = !hideAddButton && !isEditMode && visibleImages.length < maxImages;
```

No other changes to `ImagePreviewGrid.tsx`. The rest of the component (skeleton, grid, edit mode done button) remains untouched.

---

### Step 2 — Create `TaskNoteImagesSection` component

**File:** `packages/task-notes/src/components/TaskNoteImagesSection.tsx` *(NEW)*

```tsx
import { ImagePreviewGrid, useEntityImagesContext } from "@beyo/images";

type TaskNoteImagesSectionProps = {
  testId?: string;
};

export function TaskNoteImagesSection({
  testId = "note-images-section",
}: TaskNoteImagesSectionProps): React.JSX.Element | null {
  const { images, isPending } = useEntityImagesContext();

  if (!isPending && images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">Note images</p>
      <ImagePreviewGrid
        hideAddButton
        maxImages={3}
        testId={`${testId}-grid`}
      />
    </div>
  );
}
```

**Notes for Codex:**
- `useEntityImagesContext()` reads from the nearest ancestor `EntityImagesProvider`. In all three form contents, the nearest provider is the outer `EntityImagesProvider(entityType="note")` — correct.
- `!isPending && images.length === 0` guards both the fully-loaded-empty case and avoids flickering away during uploads (while `isPending` is `true`, the section stays visible so the uploading skeleton tiles are shown).
- `hideAddButton` is passed without a value — JSX boolean shorthand, equivalent to `hideAddButton={true}`.
- No `React` import is needed — the file uses JSX transform (`react-jsx`), matching the rest of the package.

---

### Step 3 — Export `TaskNoteImagesSection` from `@beyo/task-notes`

**File:** `packages/task-notes/src/index.ts`

Before:
```ts
export type {
  TaskNoteComposerValue,
  TaskNoteContentBlock,
  TaskNoteInlinePayload,
} from "./types";
export {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
} from "./lib/task-note-serialization";
export { TaskNoteComposer } from "./components/TaskNoteComposer";
```

After:
```ts
export type {
  TaskNoteComposerValue,
  TaskNoteContentBlock,
  TaskNoteInlinePayload,
} from "./types";
export {
  hasMeaningfulNoteContent,
  toTaskNoteContentBlocks,
} from "./lib/task-note-serialization";
export { TaskNoteComposer } from "./components/TaskNoteComposer";
export { TaskNoteImagesSection } from "./components/TaskNoteImagesSection";
```

---

### Step 4 — Update `InternalFormContent`

**File:** `packages/task-creation/src/components/InternalFormContent.tsx`

**Three exact changes:**

#### 4a. Add `TaskNoteImagesSection` to the `@beyo/task-notes` import (line 31)

Before:
```ts
import { TaskNoteComposer } from "@beyo/task-notes";
```

After:
```ts
import { TaskNoteComposer, TaskNoteImagesSection } from "@beyo/task-notes";
```

#### 4b. Remove the note `ImagePreviewGrid` from the shared images `ContentCard` (lines 376–392)

Before:
```tsx
                <ContentCard data-testid="internal-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="internal-form-images-grid"
                    />
                  </EntityImagesProvider>
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="internal-form-note-images-grid"
                  />
                </ContentCard>
```

After:
```tsx
                <ContentCard data-testid="internal-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="internal-form-images-grid"
                    />
                  </EntityImagesProvider>
                </ContentCard>
```

#### 4c. Add `TaskNoteImagesSection` after the `TaskNoteComposer` Controller in the composer `ContentCard` (lines 393–410)

Before:
```tsx
                <ContentCard>
                  <TaskReadyByDateField
                    onOpenCalendarSinglePicker={(props) =>
                      surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
                    }
                  />
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="internal-form-note-composer"
                      />
                    )}
                  />
                </ContentCard>
```

After:
```tsx
                <ContentCard>
                  <TaskReadyByDateField
                    onOpenCalendarSinglePicker={(props) =>
                      surface.open(CALENDAR_SINGLE_PICKER_SURFACE_ID, props)
                    }
                  />
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="internal-form-note-composer"
                      />
                    )}
                  />
                  <TaskNoteImagesSection />
                </ContentCard>
```

The `ImagePreviewGrid` import from `@beyo/images` (line 8) remains — it is still used for the item grid. Do not remove it.

---

### Step 5 — Update `PreOrderFormContent`

**File:** `packages/task-creation/src/components/PreOrderFormContent.tsx`

**Three exact changes:**

#### 5a. Add `TaskNoteImagesSection` to the `@beyo/task-notes` import (line 39)

Before:
```ts
import { TaskNoteComposer } from "@beyo/task-notes";
```

After:
```ts
import { TaskNoteComposer, TaskNoteImagesSection } from "@beyo/task-notes";
```

#### 5b. Remove the note `ImagePreviewGrid` from the shared images `ContentCard`

Locate the `ContentCard` with `data-testid="pre-order-form-images-section"` (around line 427). It currently contains the item `EntityImagesProvider` block and a bare note `ImagePreviewGrid` below it.

Before:
```tsx
                <ContentCard data-testid="pre-order-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="pre-order-form-images-grid"
                    />
                  </EntityImagesProvider>
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="pre-order-form-note-images-grid"
                  />
                </ContentCard>
```

After:
```tsx
                <ContentCard data-testid="pre-order-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="pre-order-form-images-grid"
                    />
                  </EntityImagesProvider>
                </ContentCard>
```

#### 5c. Add `TaskNoteImagesSection` after the `TaskNoteComposer` Controller in the composer `ContentCard`

Locate the `ContentCard` that contains the `note_content` Controller (around line 444). It currently has only the Controller.

Before:
```tsx
                <ContentCard>
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="pre-order-form-note-composer"
                      />
                    )}
                  />
                </ContentCard>
```

After:
```tsx
                <ContentCard>
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="pre-order-form-note-composer"
                      />
                    )}
                  />
                  <TaskNoteImagesSection />
                </ContentCard>
```

The `ImagePreviewGrid` import from `@beyo/images` remains — it is still used for the item grid.

---

### Step 6 — Update `ReturnFormContent`

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx`

**Three exact changes — same pattern as Step 5:**

#### 6a. Add `TaskNoteImagesSection` to the `@beyo/task-notes` import (line 36)

Before:
```ts
import { TaskNoteComposer } from "@beyo/task-notes";
```

After:
```ts
import { TaskNoteComposer, TaskNoteImagesSection } from "@beyo/task-notes";
```

#### 6b. Remove the note `ImagePreviewGrid` from the shared images `ContentCard`

Locate the `ContentCard` with `data-testid="return-form-images-section"` (around line 437). Same before/after pattern as Step 5b, with `testId="return-form-images-grid"` and `testId="return-form-note-images-grid"`.

Before:
```tsx
                <ContentCard data-testid="return-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="return-form-images-grid"
                    />
                  </EntityImagesProvider>
                  <ImagePreviewGrid
                    maxImages={3}
                    testId="return-form-note-images-grid"
                  />
                </ContentCard>
```

After:
```tsx
                <ContentCard data-testid="return-form-images-section">
                  <EntityImagesProvider
                    entityClientId={itemClientId}
                    captureFlow="camera-to-editor"
                    deleteMode="hard-delete"
                    entityType="item"
                  >
                    <ImagePreviewGrid
                      maxImages={6}
                      testId="return-form-images-grid"
                    />
                  </EntityImagesProvider>
                </ContentCard>
```

#### 6c. Add `TaskNoteImagesSection` after the `TaskNoteComposer` Controller in the composer `ContentCard`

Locate the `ContentCard` that contains the `note_content` Controller (around line 454). Same before/after pattern as Step 5c, with `testId="return-form-note-composer"`.

Before:
```tsx
                <ContentCard>
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="return-form-note-composer"
                      />
                    )}
                  />
                </ContentCard>
```

After:
```tsx
                <ContentCard>
                  <Controller
                    control={form.control}
                    name="note_content"
                    render={({ field }) => (
                      <TaskNoteComposer
                        onChange={field.onChange}
                        placeholder="Add a note…"
                        testId="return-form-note-composer"
                      />
                    )}
                  />
                  <TaskNoteImagesSection />
                </ContentCard>
```

The `ImagePreviewGrid` import from `@beyo/images` (line 12, `import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images"`) remains — it is still used for the item grid.

---

### Step 7 — Move camera button to the right and set Check icon color in `TaskNoteComposer`

**File:** `packages/task-notes/src/components/TaskNoteComposer.tsx`

**Two exact changes in this file:**

#### 7a. Move the camera button from before the editor div to after it (lines 193–258)

Currently the flex row inside the composer card has this order:
1. camera button (conditional on `!isEditorFocused`) — LEFT
2. editor div (`flex-1`) — MIDDLE
3. check button (conditional on `isEditorFocused`) — RIGHT

The camera button must move to AFTER the editor div so both action buttons share the right slot.

Before:
```tsx
        <div className="flex items-end gap-2">
          {!isEditorFocused ? (
            <button
              aria-label="Take picture"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              data-testid="task-note-composer-camera-button"
              disabled={disabled}
              onClick={() => {
                blurActiveComposerElement();
                openCamera();
              }}
              onFocus={() => {
                void preloadImageCameraSurface();
              }}
              onPointerEnter={() => {
                void preloadImageCameraSurface();
              }}
              onTouchStart={() => {
                void preloadImageCameraSurface();
              }}
              type="button"
            >
              <Camera aria-hidden="true" className="size-5" />
            </button>
          ) : null}

          <div className="relative min-w-0 flex-1 rounded-[1.35rem] bg-card">
            <Suspense
              fallback={
                <div className="min-h-16 px-3 py-2 text-base text-muted-foreground">
                  Loading composer...
                </div>
              }
            >
              <LazyCaseComposerEditor
                className="min-h-16"
                content={initialContent ?? EMPTY_CONTENT}
                disabled={disabled}
                onBlur={handleEditorBlur}
                onChange={({ content, plainText }) => {
                  onChange({ content, plainText });
                }}
                onFocus={handleEditorFocus}
                onToolbarActionsReady={handleToolbarActionsReady}
                onToolbarStateChange={setToolbarState}
                placeholder={placeholder}
              />
            </Suspense>
          </div>

          {isEditorFocused ? (
            <button
              aria-label="Done"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              data-testid="task-note-composer-done-button"
              disabled={disabled}
              onClick={() => {
                blurActiveComposerElement();
                onCheckDone?.();
              }}
              type="button"
            >
              <Check aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </div>
```

After:
```tsx
        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1 rounded-[1.35rem] bg-card">
            <Suspense
              fallback={
                <div className="min-h-16 px-3 py-2 text-base text-muted-foreground">
                  Loading composer...
                </div>
              }
            >
              <LazyCaseComposerEditor
                className="min-h-16"
                content={initialContent ?? EMPTY_CONTENT}
                disabled={disabled}
                onBlur={handleEditorBlur}
                onChange={({ content, plainText }) => {
                  onChange({ content, plainText });
                }}
                onFocus={handleEditorFocus}
                onToolbarActionsReady={handleToolbarActionsReady}
                onToolbarStateChange={setToolbarState}
                placeholder={placeholder}
              />
            </Suspense>
          </div>

          {!isEditorFocused ? (
            <button
              aria-label="Take picture"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              data-testid="task-note-composer-camera-button"
              disabled={disabled}
              onClick={() => {
                blurActiveComposerElement();
                openCamera();
              }}
              onFocus={() => {
                void preloadImageCameraSurface();
              }}
              onPointerEnter={() => {
                void preloadImageCameraSurface();
              }}
              onTouchStart={() => {
                void preloadImageCameraSurface();
              }}
              type="button"
            >
              <Camera aria-hidden="true" className="size-5" />
            </button>
          ) : null}

          {isEditorFocused ? (
            <button
              aria-label="Done"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
              data-testid="task-note-composer-done-button"
              disabled={disabled}
              onClick={() => {
                blurActiveComposerElement();
                onCheckDone?.();
              }}
              type="button"
            >
              <Check aria-hidden="true" className="size-5 text-card" />
            </button>
          ) : null}
        </div>
```

**Notes for Codex:**
- The only structural change is that the camera button block moves from before the `<div className="relative min-w-0 flex-1 ...">` to after it. The camera button's content and props are identical to the previous plan.
- `text-card` is applied to the `<Check>` icon (not the button). In Tailwind, `text-card` resolves to `color: var(--color-card)`, which gives the checkmark the card background color — visually correct against the `bg-primary` button.
- `text-primary-foreground` remains on the button element itself (for any other inherited text). Only the icon gets `text-card`.

---

### Step 8 — Add `@beyo/auth` to `@beyo/task-creation` peer dependencies

**File:** `packages/task-creation/package.json`

The `peerDependencies` block currently lists many `@beyo/*` packages. Add `@beyo/auth` in alphabetical order.

Before (excerpt from `peerDependencies`):
```json
    "@beyo/customers": "*",
    "@beyo/hooks": "*",
```

After:
```json
    "@beyo/auth": "*",
    "@beyo/customers": "*",
    "@beyo/hooks": "*",
```

---

### Step 9 — Expose `currentUserClientId` from `TaskCreationFormProvider`

**File:** `packages/task-creation/src/providers/TaskCreationFormProvider.tsx`

**Three exact changes:**

#### 9a. Add `useAuthStore` and `selectUser` import (after the existing imports)

Before:
```ts
import { createContext, useContext, useState, type ReactNode } from "react";

import { generateClientId } from "@beyo/lib";
```

After:
```ts
import { createContext, useContext, useState, type ReactNode } from "react";

import { useAuthStore, selectUser } from "@beyo/auth";
import { generateClientId } from "@beyo/lib";
```

#### 9b. Add `currentUserClientId: string` to `TaskCreationFormContextValue`

Before:
```ts
type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
  regenerateIds: () => void;
};
```

After:
```ts
type TaskCreationFormContextValue = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
  currentUserClientId: string;
  regenerateIds: () => void;
};
```

#### 9c. Read the auth store and include `currentUserClientId` in the context value

Before:
```ts
export function TaskCreationFormProvider({
  children,
}: TaskCreationFormProviderProps): React.JSX.Element {
  const [taskClientId, setTaskClientId] = useState(() =>
    generateClientId("ExecutionTask"),
  );
  const [itemClientId, setItemClientId] = useState(() =>
    generateClientId("Item"),
  );
  const [customerClientId, setCustomerClientId] = useState(() =>
    generateClientId("Customer"),
  );
  const [noteClientId, setNoteClientId] = useState(() =>
    generateClientId("TaskNote"),
  );

  function regenerateIds(): void {
    setTaskClientId(generateClientId("ExecutionTask"));
    setItemClientId(generateClientId("Item"));
    setCustomerClientId(generateClientId("Customer"));
    setNoteClientId(generateClientId("TaskNote"));
  }

  return (
    <TaskCreationFormContext.Provider
      value={{
        taskClientId,
        itemClientId,
        customerClientId,
        noteClientId,
        regenerateIds,
      }}
    >
      {children}
    </TaskCreationFormContext.Provider>
  );
}
```

After:
```ts
export function TaskCreationFormProvider({
  children,
}: TaskCreationFormProviderProps): React.JSX.Element {
  const user = useAuthStore(selectUser);
  const currentUserClientId = String(user?.id ?? "");

  const [taskClientId, setTaskClientId] = useState(() =>
    generateClientId("ExecutionTask"),
  );
  const [itemClientId, setItemClientId] = useState(() =>
    generateClientId("Item"),
  );
  const [customerClientId, setCustomerClientId] = useState(() =>
    generateClientId("Customer"),
  );
  const [noteClientId, setNoteClientId] = useState(() =>
    generateClientId("TaskNote"),
  );

  function regenerateIds(): void {
    setTaskClientId(generateClientId("ExecutionTask"));
    setItemClientId(generateClientId("Item"));
    setCustomerClientId(generateClientId("Customer"));
    setNoteClientId(generateClientId("TaskNote"));
  }

  return (
    <TaskCreationFormContext.Provider
      value={{
        taskClientId,
        itemClientId,
        customerClientId,
        noteClientId,
        currentUserClientId,
        regenerateIds,
      }}
    >
      {children}
    </TaskCreationFormContext.Provider>
  );
}
```

**Notes for Codex:**
- `String(user?.id ?? "")` coerces the branded `UserId` type to a plain `string`. If `UserId` is already structurally `string`, this is a no-op cast at runtime. The explicit `String()` keeps TypeScript happy across both cases.
- `currentUserClientId` will be `""` when the provider mounts before the auth store is populated (e.g. during app boot), but the task creation forms are only accessible to authenticated users, so this edge case cannot occur in practice.
- `useAuthStore` subscribes to the store — if the user changes (e.g. refresh token swap), `currentUserClientId` updates automatically.

---

### Step 10 — Thread `currentUserClientId` through `BaseIds` and `buildNotePayload`

**File:** `packages/task-creation/src/lib/normalize-task-form-payload.ts`

**Three exact changes:**

#### 10a. Add `currentUserClientId` to the `BaseIds` type (lines 13–18)

Before:
```ts
type BaseIds = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
};
```

After:
```ts
type BaseIds = {
  taskClientId: string;
  itemClientId: string;
  customerClientId: string;
  noteClientId: string;
  currentUserClientId: string;
};
```

#### 10b. Add `currentUserClientId` parameter to `buildNotePayload` and use it in `users_read_list` (lines 121–136)

Before:
```ts
function buildNotePayload(
  noteContent: TaskNoteComposerValue | null | undefined,
  noteClientId: string,
) {
  if (!hasMeaningfulNoteContent(noteContent) || !noteContent) {
    return undefined;
  }

  return {
    client_id: noteClientId,
    note_type: "user_note" as const,
    content: toTaskNoteContentBlocks(noteContent.content),
    plain_text: noteContent.plainText,
    users_read_list: [] as string[],
  };
}
```

After:
```ts
function buildNotePayload(
  noteContent: TaskNoteComposerValue | null | undefined,
  noteClientId: string,
  currentUserClientId: string,
) {
  if (!hasMeaningfulNoteContent(noteContent) || !noteContent) {
    return undefined;
  }

  return {
    client_id: noteClientId,
    note_type: "user_note" as const,
    content: toTaskNoteContentBlocks(noteContent.content),
    plain_text: noteContent.plainText,
    users_read_list: currentUserClientId ? [currentUserClientId] : [],
  };
}
```

#### 10c. Pass `ids.currentUserClientId` to both `buildNotePayload` call sites

**In `normalizeReturnFormPayload` (line 150):**

Before:
```ts
  const notePayload = buildNotePayload(values.note_content, ids.noteClientId);
```

After:
```ts
  const notePayload = buildNotePayload(values.note_content, ids.noteClientId, ids.currentUserClientId);
```

**In `normalizeInternalFormPayload` (line 186):**

Before:
```ts
  const notePayload = buildNotePayload(values.note_content, ids.noteClientId);
```

After:
```ts
  const notePayload = buildNotePayload(values.note_content, ids.noteClientId, ids.currentUserClientId);
```

---

### Step 4d — Destructure `currentUserClientId` in `InternalFormContent` and pass it to normalize

**File:** `packages/task-creation/src/components/InternalFormContent.tsx`  
*(Apply alongside Steps 4a–4c in the same edit pass)*

**4d-i. Destructure `currentUserClientId` from `useTaskCreationFormContext()`**

Before:
```ts
  const {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    regenerateIds,
  } = useTaskCreationFormContext();
```

After:
```ts
  const {
    taskClientId,
    itemClientId,
    customerClientId,
    noteClientId,
    currentUserClientId,
    regenerateIds,
  } = useTaskCreationFormContext();
```

**4d-ii. Pass `currentUserClientId` to `normalizeInternalFormPayload`**

Before:
```ts
        const payload = normalizeInternalFormPayload(values, {
          taskClientId,
          itemClientId,
          customerClientId,
          noteClientId,
        });
```

After:
```ts
        const payload = normalizeInternalFormPayload(values, {
          taskClientId,
          itemClientId,
          customerClientId,
          noteClientId,
          currentUserClientId,
        });
```

---

### Step 5d — Destructure `currentUserClientId` in `PreOrderFormContent` and pass it to normalize

**File:** `packages/task-creation/src/components/PreOrderFormContent.tsx`  
*(Apply alongside Steps 5a–5c in the same edit pass)*

**5d-i. Destructure `currentUserClientId` from `useTaskCreationFormContext()`**

Before:
```ts
  const { taskClientId, itemClientId, customerClientId, noteClientId } =
    useTaskCreationFormContext();
```

After:
```ts
  const { taskClientId, itemClientId, customerClientId, noteClientId, currentUserClientId } =
    useTaskCreationFormContext();
```

**5d-ii. Pass `currentUserClientId` to `normalizeReturnFormPayload`**

Before:
```ts
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId },
          "pre_order",
        );
```

After:
```ts
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId, currentUserClientId },
          "pre_order",
        );
```

---

### Step 6d — Destructure `currentUserClientId` in `ReturnFormContent` and pass it to normalize

**File:** `packages/task-creation/src/components/ReturnFormContent.tsx`  
*(Apply alongside Steps 6a–6c in the same edit pass)*

**6d-i. Destructure `currentUserClientId` from `useTaskCreationFormContext()`**

Before:
```ts
  const { taskClientId, itemClientId, customerClientId, noteClientId } =
    useTaskCreationFormContext();
```

After:
```ts
  const { taskClientId, itemClientId, customerClientId, noteClientId, currentUserClientId } =
    useTaskCreationFormContext();
```

**6d-ii. Pass `currentUserClientId` to `normalizeReturnFormPayload`**

Before:
```ts
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId },
          "return",
        );
```

After:
```ts
        const payload = normalizeReturnFormPayload(
          values,
          { taskClientId, itemClientId, customerClientId, noteClientId, currentUserClientId },
          "return",
        );
```

---

## File inventory

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `packages/images/src/components/ImagePreviewGrid.tsx` | MODIFY | Add `hideAddButton` prop; gate `showAddPictureButton` with it |
| 2 | `packages/task-notes/src/components/TaskNoteImagesSection.tsx` | CREATE | Context-aware section: null when empty, label + grid otherwise |
| 3 | `packages/task-notes/src/index.ts` | MODIFY | Export `TaskNoteImagesSection` |
| 4 | `packages/task-creation/src/components/InternalFormContent.tsx` | MODIFY | Remove note grid from images card; add `TaskNoteImagesSection` below composer; destructure + pass `currentUserClientId` |
| 5 | `packages/task-creation/src/components/PreOrderFormContent.tsx` | MODIFY | Same as Internal |
| 6 | `packages/task-creation/src/components/ReturnFormContent.tsx` | MODIFY | Same as Internal |
| 7 | `packages/task-notes/src/components/TaskNoteComposer.tsx` | MODIFY | Move camera button to right side; add `text-card` to Check icon |
| 8 | `packages/task-creation/package.json` | MODIFY | Add `@beyo/auth` to `peerDependencies` |
| 9 | `packages/task-creation/src/providers/TaskCreationFormProvider.tsx` | MODIFY | Read `useAuthStore` → expose `currentUserClientId` in context |
| 10 | `packages/task-creation/src/lib/normalize-task-form-payload.ts` | MODIFY | Add `currentUserClientId` to `BaseIds`; thread through `buildNotePayload`; populate `users_read_list` |

Total: 10 files (1 new, 9 modified).

---

## Risks and mitigations

- Risk: After Step 2 creates `TaskNoteImagesSection.tsx`, TypeScript will flag it if `@beyo/images` is not listed in `packages/task-notes/package.json`. Check that `@beyo/images` is already in the `dependencies` or `peerDependencies` of `task-notes/package.json` before applying — it should be, since `TaskNoteComposer` already imports `useEntityImagesContext` and `preloadImageCameraSurface` from `@beyo/images`.
  Mitigation: If missing, add `"@beyo/images": "*"` to `task-notes/package.json` in the same pass.

- Risk: `UserId` (the type of `user.id`) is a branded type from `@beyo/lib`. Passing it to `currentUserClientId: string` in the context value requires a coercion. `String(user?.id ?? "")` handles this at line 9c.
  Mitigation: If TypeScript still complains, use `user?.id as string ?? ""` as an alternative. Both resolve to the same value at runtime.

- Risk: `@beyo/auth` is added as a `peerDependency` (not `dependency`). The workspace apps that bundle `@beyo/task-creation` already install `@beyo/auth` themselves, so no duplicate installations occur. Source packages with `peerDependencies` rely on the app's installed version.
  Mitigation: No action needed. This matches the existing pattern for all other `@beyo/*` entries in `task-creation/package.json`.

- Risk: `isPending` in `useEntityImagesContext()` might be `true` briefly on form mount (before the initial empty query resolves), causing a skeleton flash. For task creation the note entity is always fresh (new ULID), so the initial query resolves immediately to empty. The flash would be sub-100ms and invisible in practice.
  Mitigation: No action — the behavior is acceptable. If it becomes noticeable, a future pass can switch to `images.length === 0 && !someImageIsUploading` logic.

- Risk: After removing the bare note `<ImagePreviewGrid>` from the item images `ContentCard`, if `ContentCard` requires at least one child to render non-empty, the card could become an empty container with no images (0 item images, nothing else). This is not caused by this plan — the existing item grid's `ImageAddPictureButton` fills the card. Nothing changes for item images.
  Mitigation: No action needed.

---

## Validation plan

- `npm run typecheck` from `frontend/`: zero errors
- Grep confirms `"note-images-grid"` testId no longer appears inside the images `ContentCard` in any form file
- Manual test: open Internal/PreOrder/Return task creation form to the last step → no note images section visible (returns null on mount)
- Manual test: tap camera button in note composer → take/select a photo → `TaskNoteImagesSection` appears below the composer with "Note images" label and the image tile; no "add" button is visible in that grid
- Verify payload: submit a task with a note → inspect the network request body → `notes[0].users_read_list` contains exactly the logged-in user's ID string; no empty array is sent when the user ID is available

## Review log

- `2026-06-26` initial authoring

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
