# PLAN_image_editor_ux_rework_20260522

## Metadata

- Plan ID: `PLAN_image_editor_ux_rework_20260522`
- Status: `archived`
- Owner agent: `claude-sonnet-4-6`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T12:44:24Z`
- Related issue/ticket: `—`
- Intention plan: _(provided inline in conversation by user)_

---

## Goal and intent

- **Goal:** Redesign `ImageEditorPage` UX to match a focused full-screen mobile editing mode — bottom control bar, tool picker as a bottom sheet, unsaved-changes confirmation as a bottom sheet, undo, and optimistic annotation visibility in the full-page viewer.
- **Business/user intent:** The current top-bar editor is awkward on mobile. Modern annotation editors (Markup, Skitch) place controls at the bottom so the thumb can reach them; they show a warning before discarding work; saved annotations should appear instantly in the viewer without a refetch delay.
- **Non-goals:** Backend API changes, camera feature changes, image list/grid UX, adding new annotation tool types, changing the normalized coordinate system used by the canvas.

---

## Scope

### In scope

- Move close/done/undo/tool-field from the top header to a bottom control bar.
- Extract `ImageAnnotationTool` type alias from the existing `Exclude<ImageAnnotationType, 'measurement'>` pattern.
- Export the `TOOLS` array from `ImageAnnotationToolbar` so the new bottom control field and the sheet can share it.
- New `ImageEditorBottomControls` component (pure presentational, no surface logic).
- New `ImageAnnotationToolPickerSheetPage` — sheet surface for selecting a tool.
- New `ImageEditorDiscardChangesSheetPage` — sheet surface for confirming editor close with unsaved changes.
- Session-only undo (remove latest `sessionItems` entry).
- Text draft commit integrated into save and close flows.
- Optimistic annotation update in `useCreateImageAnnotation` (detail cache patch on `onMutate`, rollback on `onError`).
- Safe-area padding, touch target sizes, dark styling.

### Out of scope

- Changing `ImageAnnotationCanvas` drawing logic or normalized coordinate system.
- Changing the backend annotation API.
- Multiple undo levels or undo of persisted annotations.
- Color picker for annotation tools.

### Assumptions

- `surface.closeTop()` removes only the topmost surface from the stack. Calling it from inside the discard sheet would close the sheet, not the editor. Explicit ID-based `useSurfaceStore.getState().close(id)` is available and preferable for multi-close flows.
- `setActiveTool` from `useState` is a stable reference (React guarantee) — safe to pass as frozen surface prop.
- The detail query (`imageKeys.detail(clientId)`) stores a plain `Image` object (not the API envelope) because `fetchImage` returns `Image` directly.
- The `BottomSheetSurface` is already in the registry and supports any sheet page component.

---

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/images/types.ts` | Add `export type ImageAnnotationTool = Exclude<ImageAnnotationType, 'measurement'>` |
| `features/images/components/ImageAnnotationToolbar.tsx` | Use `ImageAnnotationTool`; change `const TOOLS` to `export const TOOLS` |
| `features/images/components/ImageAnnotationCanvas.tsx` | Update `activeTool` prop type to `ImageAnnotationTool` |
| `features/images/actions/use-create-image-annotation.ts` | Add `onMutate` optimistic cache update and `onError` rollback |
| `features/images/surfaces.ts` | Add two new sheet surface IDs, two surface prop types, two lazy loaders, register both in `imageSurfaces` |
| `features/images/pages/ImageEditorPage.tsx` | Major rework: remove top header bar, add bottom controls, open tool picker + discard sheets, undo, text draft handling in all flows |

### New files to create

| Path (relative to `src/`) |
|---|
| `features/images/components/ImageEditorBottomControls.tsx` |
| `features/images/pages/ImageAnnotationToolPickerSheetPage.tsx` |
| `features/images/pages/ImageEditorDiscardChangesSheetPage.tsx` |

---

## Clarifications required

_(none — all decisions resolved below)_

---

## Acceptance criteria

1. Close button is at bottom-left; done button at bottom-right; tool field at bottom-center.
2. The old top control bar (X / toolbar / check row) is removed from the editor.
3. Tapping done saves annotations + closes editor; annotations appear instantly in the fullscreen viewer without a loading state.
4. Tapping close with no unsaved changes closes the editor immediately.
5. Tapping close with unsaved changes opens a bottom sheet with "Close anyway" and "Save" actions.
6. "Close anyway" discards session annotations and closes both the sheet and the editor.
7. "Save" from the sheet behaves identically to the done button.
8. Tapping the tool field opens the tool picker bottom sheet.
9. Selecting a tool from the sheet closes the sheet and updates the active tool.
10. The undo button removes the latest session annotation; disabled when `sessionItems` is empty.
11. Text annotation drafts are handled consistently across done / close / undo (see edge cases below).
12. `npm run typecheck` passes with zero errors.

---

## Contracts and skills

### Contracts loaded (document-only protocol)

- `08_hooks.md`: mutation owns its optimistic update — `onMutate` snapshot, `onError` rollback, `onSettled` invalidation.
- `28_surfaces.md` + `28_surfaces_local.md`: surface type `'sheet'` maps to `BottomSheetSurface`; props are frozen objects; always-current callbacks use the ref-wrapping pattern.
- `15_feature_structure.md`: pages import from `../controllers`, `../components`, `../types`, `../surfaces`; they do not import from other pages.
- `07_components.md`: `ImageEditorBottomControls` is a pure feature component — receives all data + callbacks as props, does not call any hook.

### File read intent

| File | Read reason |
|---|---|
| `features/images/types.ts` | Establish exact type names (relational) |
| `features/images/surfaces.ts` | Establish surface ID constants + registration pattern (relational) |
| `features/images/actions/use-create-image-annotation.ts` | Establish current mutation shape before adding optimistic update (relational) |
| `features/images/api/fetch-image.ts` | Confirm detail cache stores `Image` not envelope (relational) |
| `features/images/api/image-keys.ts` | Confirm key shape for cache update (relational) |
| `features/images/pages/ImageEditorPage.tsx` | Understand current state model before rework (relational) |
| `features/images/components/ImageAnnotationToolbar.tsx` | Confirm `TOOLS` array shape + existing prop types (relational) |
| `features/images/components/ImageAnnotationCanvas.tsx` | Confirm `activeTool` prop type location (relational) |
| `providers/SurfaceProvider.tsx` | Confirm `closeTop` vs `close(id)` semantics (relational) |
| `hooks/use-surface.ts` | Confirm `surface.close(id)` is available (relational) |

---

## Implementation plan

### Step 1 — `types.ts`: add `ImageAnnotationTool`

After the `ImageAnnotationType` type declaration (line ~42), add:

```ts
export type ImageAnnotationTool = Exclude<ImageAnnotationType, 'measurement'>;
```

This is a pure type alias — no runtime change.

---

### Step 2 — `surfaces.ts`: register new sheet surfaces and surface prop types

**2a. Add surface ID constants** (after `IMAGE_EDITOR_SURFACE_ID`):

```ts
export const IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID = 'image-annotation-tool-picker';
export const IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID = 'image-editor-discard-changes';
```

**2b. Add surface prop types** (after the existing surface ID constants, before the lazy loaders):

```ts
import type { ImageAnnotationTool } from './types';

export type ImageAnnotationToolPickerSurfaceProps = {
  activeTool: ImageAnnotationTool;
  onSelect: (tool: ImageAnnotationTool) => void;
};

export type ImageEditorDiscardChangesSurfaceProps = {
  onDiscardAndClose: () => void;
  onSaveAndClose: () => void;
};
```

**2c. Add lazy loader functions** (alongside the existing loaders):

```ts
function loadImageAnnotationToolPickerSheetPage() {
  return import('@/features/images/pages/ImageAnnotationToolPickerSheetPage').then((module) => ({
    default: module.ImageAnnotationToolPickerSheetPage,
  }));
}

function loadImageEditorDiscardChangesSheetPage() {
  return import('@/features/images/pages/ImageEditorDiscardChangesSheetPage').then((module) => ({
    default: module.ImageEditorDiscardChangesSheetPage,
  }));
}
```

**2d. Register in `imageSurfaces`**:

```ts
[IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID]: {
  surface: 'sheet',
  component: lazy(loadImageAnnotationToolPickerSheetPage),
},
[IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID]: {
  surface: 'sheet',
  component: lazy(loadImageEditorDiscardChangesSheetPage),
},
```

---

### Step 3 — `ImageAnnotationToolbar.tsx`: use `ImageAnnotationTool` + export `TOOLS`

- Add import: `import type { ImageAnnotationTool } from '../types';`
- Change `const TOOLS` → `export const TOOLS`
- Replace every occurrence of `Exclude<ImageAnnotationType, 'measurement'>` in this file with `ImageAnnotationTool`

After:

```ts
import type { ImageAnnotationTool } from '../types';

export const TOOLS: Array<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: ImageAnnotationTool;
}> = [
  { type: 'draw', label: 'Draw', icon: PenLine },
  { type: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { type: 'circle', label: 'Circle', icon: Circle },
  { type: 'rectangle', label: 'Rectangle', icon: Square },
  { type: 'text', label: 'Text', icon: Type },
  { type: 'highlight', label: 'Highlight', icon: Highlighter },
];

type ImageAnnotationToolbarProps = {
  activeTool: ImageAnnotationTool;
  onToolChange: (tool: ImageAnnotationTool) => void;
  testId?: string;
};
```

---

### Step 4 — `ImageAnnotationCanvas.tsx`: use `ImageAnnotationTool`

- Add import: `import type { ImageAnnotationTool } from '../types';`
- Change `activeTool: 'draw' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'highlight'` in `ImageAnnotationCanvasProps` to `activeTool: ImageAnnotationTool`

No logic changes.

---

### Step 5 — `use-create-image-annotation.ts`: optimistic cache update

Goal: patch `imageKeys.detail(image_client_id)` immediately on mutation fire so the fullscreen viewer shows the new annotation without waiting for the server response.

The detail cache stores a plain `Image` object (confirmed: `fetchImage` returns `Image`, not the envelope).

Full rewrite of the hook:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createImageAnnotation } from '../api/create-image-annotation';
import { imageKeys } from '../api/image-keys';
import type { Image } from '../types';

export function useCreateImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createImageAnnotation,

    onMutate: async (input) => {
      // Cancel in-flight refetches to prevent overwriting the optimistic update
      await queryClient.cancelQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });

      // Snapshot for rollback
      const previous = queryClient.getQueryData<Image>(
        imageKeys.detail(input.image_client_id),
      );

      // Apply optimistic annotation — uses the complete merged payload sent to the API
      queryClient.setQueryData<Image>(
        imageKeys.detail(input.image_client_id),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            image_annotation: {
              client_id: `optimistic-${Date.now()}`,
              annotation_type: input.annotation_type,
              data: input.data,
              accuracy: null,
              created_at: new Date().toISOString(),
            },
          };
        },
      );

      return { previous, imageClientId: input.image_client_id };
    },

    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Image>(
          imageKeys.detail(context.imageClientId),
          context.previous,
        );
      }
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });
    },
  });

  return {
    createAnnotation: mutation.mutate,
    createAnnotationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
```

---

### Step 6 — `ImageEditorBottomControls.tsx`: new presentational component

This component owns zero state and zero surface calls. `ImageEditorPage` provides everything as props.

```ts
// src/features/images/components/ImageEditorBottomControls.tsx

import { Undo2 } from 'lucide-react';
import { TOOLS } from './ImageAnnotationToolbar';
import type { ImageAnnotationTool } from '../types';

type ImageEditorBottomControlsProps = {
  activeTool: ImageAnnotationTool;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  canUndo: boolean;
  onClose: () => void;
  onDone: () => void;
  onOpenToolPicker: () => void;
  onUndo: () => void;
};

export function ImageEditorBottomControls({
  activeTool,
  hasUnsavedChanges,
  isSaving,
  canUndo,
  onClose,
  onDone,
  onOpenToolPicker,
  onUndo,
}: ImageEditorBottomControlsProps): React.JSX.Element {
  const currentToolDef = TOOLS.find((t) => t.type === activeTool);
  const ToolIcon = currentToolDef?.icon;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 pb-[calc(var(--safe-bottom)+1rem)] pt-3"
      data-testid="image-editor-bottom-controls"
    >
      {/* Close — bottom-left */}
      <button
        aria-label="Close editor"
        className="inline-flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors duration-150 hover:bg-white/14"
        data-testid="image-editor-close-button"
        type="button"
        onClick={onClose}
      >
        {/* X icon from lucide-react */}
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </svg>
      </button>

      {/* Tool field — bottom-center */}
      <div className="flex items-center gap-2">
        {/* Undo */}
        <button
          aria-label="Undo last annotation"
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white transition-colors duration-150 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="image-editor-undo-button"
          disabled={!canUndo}
          type="button"
          onClick={onUndo}
        >
          <Undo2 className="size-4" />
        </button>

        {/* Active tool trigger */}
        <button
          aria-label={`Current tool: ${currentToolDef?.label ?? activeTool}. Tap to change.`}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 text-sm text-white transition-colors duration-150 hover:bg-white/14"
          data-testid="image-editor-tool-trigger"
          type="button"
          onClick={onOpenToolPicker}
        >
          {ToolIcon ? <ToolIcon className="size-4" /> : null}
          <span>{currentToolDef?.label ?? activeTool}</span>
        </button>
      </div>

      {/* Done — bottom-right */}
      <button
        aria-label="Save annotations"
        className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-black transition-opacity duration-150 disabled:opacity-40"
        data-testid="image-editor-done-button"
        disabled={isSaving}
        type="button"
        onClick={onDone}
      >
        {/* Check icon from lucide-react */}
        <svg
          aria-hidden="true"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>
  );
}
```

> **Note:** Inline SVGs above are used to avoid re-importing lucide icons already used in the page. The implementer may substitute `import { X, Check } from 'lucide-react'` if preferred — both approaches produce identical output. Do NOT add both inline SVG and the lucide import for the same icon.

---

### Step 7 — `ImageAnnotationToolPickerSheetPage.tsx`: new sheet page

```ts
// src/features/images/pages/ImageAnnotationToolPickerSheetPage.tsx

import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { TOOLS } from '../components/ImageAnnotationToolbar';
import type { ImageAnnotationToolPickerSurfaceProps } from '../surfaces';
import { cn } from '@/lib/utils';

export function ImageAnnotationToolPickerSheetPage(): React.JSX.Element {
  const { activeTool, onSelect } = useSurfaceProps<ImageAnnotationToolPickerSurfaceProps>();

  return (
    <div className="flex flex-col pb-2" data-testid="annotation-tool-picker-sheet">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = tool.type === activeTool;

        return (
          <button
            key={tool.type}
            aria-label={tool.label}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-4 px-6 py-4 text-left transition-colors duration-150',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
            data-testid={`tool-picker-${tool.type}`}
            type="button"
            onClick={() => {
              onSelect(tool.type);
              useSurfaceStore.getState().closeTop();
            }}
          >
            <Icon className="size-5 shrink-0" />
            <span className="text-base font-medium">{tool.label}</span>
            {isActive ? (
              <span className="ml-auto text-sm font-medium text-foreground" aria-hidden="true">
                Active
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
```

**Stale closure note:** `onSelect` is captured at surface open time. Because `onSelect` is `setActiveTool` (a React state setter, which is a stable reference), this is safe — the same function reference is captured whether or not the editor has re-rendered since the sheet opened.

---

### Step 8 — `ImageEditorDiscardChangesSheetPage.tsx`: new sheet page

```ts
// src/features/images/pages/ImageEditorDiscardChangesSheetPage.tsx

import { useSurfaceProps } from '@/hooks/use-surface-props';
import type { ImageEditorDiscardChangesSurfaceProps } from '../surfaces';

export function ImageEditorDiscardChangesSheetPage(): React.JSX.Element {
  const { onDiscardAndClose, onSaveAndClose } =
    useSurfaceProps<ImageEditorDiscardChangesSurfaceProps>();

  return (
    <div className="flex flex-col px-4 pb-4 pt-2" data-testid="image-editor-discard-sheet">
      <p className="mb-4 px-2 text-sm text-muted-foreground" data-testid="discard-sheet-message">
        You have unsaved annotations. If you close now, they will be lost.
      </p>

      <button
        aria-label="Save annotations and close"
        className="mb-2 flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-background text-sm font-medium transition-opacity duration-150 hover:opacity-90"
        data-testid="discard-sheet-save-button"
        type="button"
        onClick={onSaveAndClose}
      >
        Save
      </button>

      <button
        aria-label="Discard annotations and close"
        className="flex h-12 w-full items-center justify-center rounded-2xl border border-border text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10"
        data-testid="discard-sheet-discard-button"
        type="button"
        onClick={onDiscardAndClose}
      >
        Close anyway
      </button>
    </div>
  );
}
```

**Stale closure note:** Both callbacks are passed via frozen props. See the ref-wrapping pattern in Step 9 below for how `onSaveAndClose` is kept always-current.

---

### Step 9 — `ImageEditorPage.tsx`: major rework

This is the central change. Below is a complete description of every piece.

#### 9a. Imports — add / remove

Add:
```ts
import { useSurface } from '@/hooks/use-surface';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import {
  IMAGE_EDITOR_SURFACE_ID,
  IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID,
  IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID,
  type ImageAnnotationToolPickerSurfaceProps,
  type ImageEditorDiscardChangesSurfaceProps,
} from '../surfaces';
import { ImageEditorBottomControls } from '../components/ImageEditorBottomControls';
import type { ImageAnnotationTool } from '../types';
```

Remove from imports:
- `{ Check, X }` from `'lucide-react'` (these move into `ImageEditorBottomControls`)
- `{ ImageAnnotationToolbar }` from `'../components/ImageAnnotationToolbar'` (no longer directly rendered in this page)

Keep:
- All existing type imports from `'../types'`
- `useCreateImageAnnotation`, `useImageQuery`, `ImageAnnotationCanvas`
- `useSurface` is new — add it
- `useSurfaceHeader` can be removed entirely (the editor hides the header; no title or actions are set)

Actually keep `useSurfaceHeader` since the header hide call on mount still uses it.

#### 9b. State model — changes

Change:
```ts
// Before:
const [activeTool, setActiveTool] = useState<'draw' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'highlight'>('draw');

// After:
const [activeTool, setActiveTool] = useState<ImageAnnotationTool>('draw');
```

No other state changes needed. `sessionItems`, `canvasBox`, `naturalSize`, `textAnchor`, `textValue` remain unchanged.

#### 9c. Add `surface` hook

```ts
const surface = useSurface();
```

#### 9d. Derived state

Add after existing state declarations:

```ts
const hasUnsavedChanges = sessionItems.length > 0 || (textAnchor !== null && textValue.trim() !== '');
```

This drives: close button behavior, done button enabled/disabled, undo button.

#### 9e. Ref for always-current save callback

The `onSaveAndClose` prop passed to the discard sheet is a frozen closure. Use a ref so the sheet always invokes the latest version of the handler:

```ts
const handleSaveAndCloseRef = useRef<() => Promise<void>>(async () => {});
// Assigned below after handleSaveAndClose is defined
```

#### 9f. Close handler — with unsaved changes check

```ts
const closeEditor = useCallback(() => {
  useSurfaceStore.getState().close(IMAGE_EDITOR_SURFACE_ID);
}, []);

const handleClose = useCallback(() => {
  if (hasUnsavedChanges) {
    surface.open(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID, {
      onDiscardAndClose: () => {
        useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
        useSurfaceStore.getState().close(IMAGE_EDITOR_SURFACE_ID);
      },
      onSaveAndClose: () => void handleSaveAndCloseRef.current(),
    } satisfies ImageEditorDiscardChangesSurfaceProps);
    return;
  }

  closeEditor();
}, [hasUnsavedChanges, surface, closeEditor]);
```

**Why `useSurfaceStore.getState().close(id)` instead of `surface.closeTop()`:**
`onDiscardAndClose` is a frozen closure called from inside the discard sheet. At that point the discard sheet is topmost, so `closeTop()` would close the sheet — but then the editor would remain open. By using explicit IDs we close both in one operation without relying on stack order.

#### 9g. Save-and-close handler

The single shared handler used by both the done button and the discard sheet.

**Text draft edge cases:**
- Done tapped / save tapped with non-empty `textValue` + active `textAnchor`: commit text into session, then save.
- Done tapped / save tapped with empty `textValue` + active `textAnchor`: discard text draft (close input), save any existing session items.
- Close tapped with non-empty `textValue` + active `textAnchor`: `hasUnsavedChanges` is `true`, so discard confirmation appears.
- Undo tapped with active text input: cancel text draft first (clear `textAnchor`/`textValue`); do not pop session items.

```ts
const handleSaveAndClose = useCallback(async () => {
  // Commit pending text draft if it has content
  let finalSessionItems = sessionItems;
  if (textAnchor !== null && textValue.trim() !== '') {
    const textItem: TextAnnotationData = {
      tool: 'text',
      x: textAnchor.x,
      y: textAnchor.y,
      text: textValue.trim(),
      fontSize: DEFAULT_TEXT_SIZE,
      color: '#ffffff',
    };
    finalSessionItems = [...sessionItems, textItem];
  }

  // Clear any open text input immediately (optimistic UI)
  setTextAnchor(null);
  setTextValue('');

  if (!currentImage) {
    useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
    useSurfaceStore.getState().close(IMAGE_EDITOR_SURFACE_ID);
    return;
  }

  const payload = buildImageAnnotationPayload([...existingItems, ...finalSessionItems]);

  if (!payload || finalSessionItems.length === 0) {
    useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
    useSurfaceStore.getState().close(IMAGE_EDITOR_SURFACE_ID);
    return;
  }

  await createAnnotationAsync({
    image_client_id: currentImage.clientId,
    annotation_type: payload.annotationType,
    data: payload.data,
  });

  useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
  useSurfaceStore.getState().close(IMAGE_EDITOR_SURFACE_ID);
}, [createAnnotationAsync, currentImage, existingItems, sessionItems, textAnchor, textValue]);
```

**After the definition, assign the ref:**
```ts
handleSaveAndCloseRef.current = handleSaveAndClose;
```

This must be a plain assignment at the component body level (not inside a `useEffect`), so it updates synchronously every render.

#### 9h. Undo handler

```ts
const handleUndo = useCallback(() => {
  // If text input is active, cancel it — do not remove a session annotation
  if (textAnchor !== null) {
    setTextAnchor(null);
    setTextValue('');
    return;
  }

  setSessionItems((current) => current.slice(0, -1));
}, [textAnchor]);
```

#### 9i. Tool picker handler

```ts
const handleOpenToolPicker = useCallback(() => {
  surface.open(IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID, {
    activeTool,
    onSelect: setActiveTool,
  } satisfies ImageAnnotationToolPickerSurfaceProps);
}, [activeTool, surface]);
```

`setActiveTool` is stable (React guarantee) so it is safe inside a frozen surface prop.

#### 9j. Remove old `closeEditor` / `handleSave` callbacks

The old `handleSave` and `closeEditor` defined in the current `ImageEditorPage` are replaced entirely by `handleSaveAndClose`, `handleClose`, and `closeEditor` as defined above.

#### 9k. JSX — full-screen layout

Remove the existing top header row (`<div className="flex items-center justify-between ...">`).

Keep the image + canvas area (`containerRef`, `<img>`, `<ImageAnnotationCanvas>`, text input).

Add `<ImageEditorBottomControls>` at the bottom of the flex column.

```tsx
return (
  <div
    className="flex h-full min-h-full flex-col bg-black text-white"
    data-testid="image-editor-page"
  >
    {/* Image + canvas area — unchanged layout */}
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden"
      data-testid="image-editor-stage-container"
    >
      <img
        alt=""
        className="h-full w-full select-none object-contain"
        draggable={false}
        src={displayUrl}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            setNaturalSize({ width: naturalWidth, height: naturalHeight });
          }
        }}
      />

      {canvasBox ? (
        <div
          className="absolute"
          style={{
            left: canvasBox.left,
            top: canvasBox.top,
            width: canvasBox.width,
            height: canvasBox.height,
          }}
        >
          <ImageAnnotationCanvas
            activeTool={activeTool}
            annotations={allItems}
            height={canvasBox.height}
            onAnnotationComplete={(item) => setSessionItems((current) => [...current, item])}
            onTextPlacementRequest={(point) => {
              setTextAnchor(point);
              setTextValue('');
            }}
            width={canvasBox.width}
          />

          {textAnchor ? (
            <input
              ref={textInputRef}
              className="absolute min-w-32 rounded-md border border-white/20 bg-black/85 px-2 py-1 text-sm text-white outline-none"
              data-testid="annotation-text-input"
              style={{
                left: `${textAnchor.x * canvasBox.width}px`,
                top: `${textAnchor.y * canvasBox.height}px`,
              }}
              type="text"
              value={textValue}
              onBlur={() => {
                // On blur: commit if non-empty, discard if empty
                if (textValue.trim()) {
                  commitText(textValue);
                } else {
                  setTextAnchor(null);
                  setTextValue('');
                }
              }}
              onChange={(event) => setTextValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitText(textValue);
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setTextAnchor(null);
                  setTextValue('');
                }
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>

    {/* Bottom control bar */}
    <ImageEditorBottomControls
      activeTool={activeTool}
      canUndo={sessionItems.length > 0 || textAnchor !== null}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isPending}
      onClose={handleClose}
      onDone={() => void handleSaveAndClose()}
      onOpenToolPicker={handleOpenToolPicker}
      onUndo={handleUndo}
    />
  </div>
);
```

> Note: `canUndo` is `true` when there are session items to remove OR a text draft is active (undo cancels the draft first). This is slightly broader than `sessionItems.length > 0` — it matches the undo handler logic.

#### 9l. Early-return states

The "missing image" and "uploading/unavailable" early returns already exist. Update their close buttons to use `closeEditor()` instead of the old `surface.closeTop()`:

```tsx
if (!currentImage) {
  return (
    <div className="flex h-full items-center justify-center bg-black text-white" data-testid="image-editor-page">
      <button
        className="inline-flex h-11 items-center rounded-2xl border border-white/15 px-4 text-sm"
        data-testid="image-editor-close-missing"
        type="button"
        onClick={closeEditor}
      >
        Close
      </button>
    </div>
  );
}
```

---

## Edge cases

| Scenario | Behavior |
|---|---|
| Text input open, empty, user taps done | `textValue.trim() === ''` → skip commit; save existing sessionItems; close |
| Text input open, non-empty, user taps done | Commit text → include in save; close |
| Text input open, user taps close | `hasUnsavedChanges` is `true` (textAnchor + non-empty textValue) → discard sheet appears |
| Text input open, empty, user taps close | `hasUnsavedChanges` is `false` (empty draft does not count) → close immediately |
| Text input open, user taps undo | Cancel text draft (clear anchor + value); do NOT remove last session item |
| sessionItems empty + no text draft, user taps close | Close immediately; no confirmation sheet |
| Save mutation fails | `onError` in the action rolls back the detail cache; the editor is already closed at this point; a global toast/notification system (if one exists) would surface the error; if not, the next time the viewer loads, it fetches fresh data |
| Discard sheet open, user taps hardware back / swipe dismiss (vaul) | `BottomSheetSurface` calls `onClose` which calls `close(DISCARD_ID)` — only the sheet closes; editor remains open |
| Tool picker open, user taps same tool | `onSelect(tool.type)` sets `activeTool` (no-op for same value); `closeTop()` closes the picker sheet |

---

## Risks and mitigations

- **Risk:** `handleSaveAndClose` in `onSaveAndClose` frozen prop could be stale.
  **Mitigation:** `handleSaveAndCloseRef.current = handleSaveAndClose` is a render-level assignment; the frozen `() => void handleSaveAndCloseRef.current()` reads the ref at call time, never at capture time.

- **Risk:** `useSurfaceStore.getState().close(IMAGE_EDITOR_SURFACE_ID)` is called from inside a sheet that is already a child of the surface stack. Closing the editor while a sheet is still in the stack could leave an orphaned sheet.
  **Mitigation:** The `onDiscardAndClose` callback closes the discard sheet ID **first**, then the editor ID. Zustand state updates are synchronous inside `set()` calls but `close` calls are independent. React will batch the re-renders. The sheet is removed before the editor's exit animation completes — the visual result is both disappearing together.

- **Risk:** Optimistic annotation shows incorrect data if the backend normalizes annotation fields differently than the client-side payload shape.
  **Mitigation:** `onSettled` invalidates the detail query; the server response replaces the optimistic data within one round-trip. Any divergence is transient.

- **Risk:** The text `onBlur` commits a non-empty draft even if the user tapped the close button (focus shift causes blur before click handler fires).
  **Mitigation:** `onBlur` commits non-empty drafts into `sessionItems`. This means a non-empty text draft will be committed on any focus-out, which is acceptable. `hasUnsavedChanges` already treats non-empty text drafts as unsaved, so the confirmation sheet appears either way.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors. Key points: `ImageAnnotationTool` used consistently across all four files that previously used the inline union; `satisfies` checks on surface props objects.
- `npm run test -- --grep "ImageEditor"`: existing tests in `ImageAnnotationToolbar.test.tsx` and `ImageAnnotationCanvas.tsx` should pass. Update toolbar test if it checks for `const TOOLS` as non-exported.
- Manual smoke test:
  1. Open editor → confirm no top header bar, bottom controls visible.
  2. Draw an annotation → undo removes it.
  3. Tap tool trigger → picker sheet opens; select a tool → sheet closes, tool updates.
  4. Tap close with no changes → editor closes immediately.
  5. Draw an annotation → tap close → confirmation sheet appears.
  6. Tap "Close anyway" → both sheet and editor close; annotation discarded.
  7. Draw an annotation → tap "Save" from confirmation sheet → both close; annotation visible in fullscreen viewer immediately (no loading state).
  8. Tap done with session items → saves; viewer shows annotations immediately.
  9. Tap on image with text tool → text input appears; type text; press Enter → annotation committed; appears on canvas.
  10. With text input open and non-empty → tap close → confirmation sheet appears.
  11. With text input open and empty → tap close → editor closes immediately.

---

## Review log

_(empty)_

---

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: user

---

---

# Addendum — Editor Pinch-to-Zoom

**Added:** 2026-05-22

---

## Goal

Allow users to pinch-to-zoom inside the image editor so they can place annotations with more precision. The zoom applies to both the background image and the Konva canvas overlay simultaneously. Drawing tools continue to work while zoomed — annotation coordinates are still saved as normalized values relative to the original image, regardless of zoom level.

---

## Coordinate mapping — why it works without extra math

Konva's `_getContentPosition()` (confirmed in source):

```js
const rect = this.content.getBoundingClientRect();  // visual dimensions — includes CSS transforms on ancestors
return {
  left: rect.left,
  top: rect.top,
  scaleX: rect.width / this.content.clientWidth,   // visual / layout
  scaleY: rect.height / this.content.clientHeight,
};
```

Pointer position:
```js
x = (clientX - contentPosition.left) / contentPosition.scaleX;
```

When a CSS `scale(2)` is on an ancestor div:
- `rect.width` = 2 × layoutWidth (visual, via `getBoundingClientRect`)
- `clientWidth` = layoutWidth (layout, unaffected by ancestor transforms)
- `scaleX = 2`
- `x = (clientX - left) / 2` — correct layout-space coordinate

**Conclusion:** drawing on a CSS-zoomed Konva Stage automatically produces correct normalized annotation coordinates. No extra coordinate math needed in the editor page, canvas component, or annotation types.

---

## Scope

### In scope

- `ZoomableEditorStage` component: wraps the editor stage content (image + canvas overlay) in a zoom/pan surface.
- Scale range: **[1×, 4×]** with 200ms ease-out bounce-back at limits.
- Pan clamped to `(scale − 1) × containerDimension / 2` per axis.
- At scale 1×, pan always resets to origin.
- Two-finger pinch gesture activates zoom; zooms toward pinch midpoint.
- During pinch: `setPointerCapture` on both active pointers to the outer wrapper — Konva no longer receives moves, blocking accidental draw strokes while pinching.
- After pinch (back to ≤ 1 pointer): pointer capture released; Konva resumes normal drawing.
- If a draw stroke was in progress when the second finger landed: Konva's pointer-up fires on capture transfer, naturally completing/committing the stroke — acceptable UX.
- Single-finger draw works normally at any zoom level.
- Text input placement while zoomed: the `textAnchor` point is correct because Konva's coordinate mapping is zoom-aware (see above).
- The `containerRef` (used by `ResizeObserver` for `canvasBox`) remains on the **outer** container div and is unaffected by the CSS transform.

### Out of scope

- Pan with a single finger while not drawing (standard pan gesture). The zoom level acts as the pan limiter; single-finger always draws.
- Zoom reset button in the UI (the user pinches out to 1× to reset).
- Persisting zoom level between editor sessions.

---

## File manifest

### New files to create

| Path (relative to `src/`) |
|---|
| `features/images/components/ZoomableEditorStage.tsx` |

### Existing files to edit

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/images/pages/ImageEditorPage.tsx` | Wrap stage content in `ZoomableEditorStage`; add `touch-none` to outer container |

---

## Step Z1 — `ZoomableEditorStage.tsx`: new component

### Props

```ts
type ZoomableEditorStageProps = {
  children: ReactNode;
};
```

No `canvasOverlayRef` prop needed. Pinch blocking is achieved via `setPointerCapture`, not `pointer-events: none`.

### Refs

| Ref | Purpose |
|---|---|
| `outerRef` | The wrapper div — used for `setPointerCapture`, `getBoundingClientRect` |
| `transformElRef` | The inner transform div — receives `style.transform` updates |
| `scaleRef` (starts 1) | Current scale — updated every frame, never causes re-render |
| `panRef` (starts {0,0}) | Current pan — updated every frame |
| `activePointersRef` | `Map<number, {x, y}>` — tracks all active pointer positions by ID |
| `pinchStartRef` | Snapshot at pinch start: `{ dist, midX, midY, scale, panX, panY }` |
| `isPinchingRef` | `boolean` — true when 2+ fingers active |

### `applyTransform(scale, panX, panY, animate = false)`

```ts
function applyTransform(scale: number, panX: number, panY: number, animate = false): void {
  const el = transformElRef.current;
  if (!el) return;
  el.style.transition = animate ? 'transform 200ms ease-out' : 'none';
  el.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}
```

### `clampPan(scale, panX, panY) → {x, y}`

```ts
function clampPan(scale: number, px: number, py: number): { x: number; y: number } {
  const outer = outerRef.current;
  if (!outer || scale <= 1) return { x: 0, y: 0 };
  const maxX = ((scale - 1) * outer.clientWidth) / 2;
  const maxY = ((scale - 1) * outer.clientHeight) / 2;
  return {
    x: Math.min(Math.max(px, -maxX), maxX),
    y: Math.min(Math.max(py, -maxY), maxY),
  };
}
```

### Event handlers

**`handlePointerDown(e)`** — bubble phase, `onPointerDown`:

```ts
function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
  activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointersRef.current.size >= 2) {
    // Transition to pinch — capture ALL active pointers on this element
    isPinchingRef.current = true;

    for (const pointerId of activePointersRef.current.keys()) {
      try {
        outerRef.current?.setPointerCapture(pointerId);
      } catch {
        // setPointerCapture may throw if the pointer is already released
      }
    }

    const pointers = [...activePointersRef.current.values()];
    const [a, b] = pointers as [{ x: number; y: number }, { x: number; y: number }];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    pinchStartRef.current = {
      dist: dist || 1,
      midX: (a.x + b.x) / 2,
      midY: (a.y + b.y) / 2,
      scale: scaleRef.current,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
  }
}
```

**`handlePointerMove(e)`** — bubble phase, `onPointerMove`:

```ts
function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
  if (!isPinchingRef.current || !pinchStartRef.current) return;

  activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointersRef.current.size < 2) return;

  const pointers = [...activePointersRef.current.values()];
  const [a, b] = pointers as [{ x: number; y: number }, { x: number; y: number }];
  const outer = outerRef.current;
  if (!outer) return;

  const currentDist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const scaleChange = currentDist / pinchStartRef.current.dist;
  // Allow slight over/under-zoom during gesture; snap back on release
  const rawScale = pinchStartRef.current.scale * scaleChange;
  const scale = Math.min(Math.max(rawScale, 0.7), 5);

  // Zoom toward pinch midpoint (in container-local coords)
  const currentMidX = (a.x + b.x) / 2;
  const currentMidY = (a.y + b.y) / 2;
  const containerRect = outer.getBoundingClientRect();
  const localMidX = currentMidX - containerRect.left - containerRect.width / 2;
  const localMidY = currentMidY - containerRect.top - containerRect.height / 2;

  const scaleFactor = scale / pinchStartRef.current.scale;
  const rawPanX = localMidX - (localMidX - pinchStartRef.current.panX) * scaleFactor;
  const rawPanY = localMidY - (localMidY - pinchStartRef.current.panY) * scaleFactor;

  const { x: panX, y: panY } = clampPan(scale, rawPanX, rawPanY);

  scaleRef.current = scale;
  panRef.current = { x: panX, y: panY };
  applyTransform(scale, panX, panY);
}
```

**`handlePointerUp(e)`** — bubble phase, `onPointerUp` AND `onPointerCancel`:

```ts
function handlePointerUp(e: React.PointerEvent<HTMLDivElement>): void {
  activePointersRef.current.delete(e.pointerId);

  if (activePointersRef.current.size < 2 && isPinchingRef.current) {
    isPinchingRef.current = false;
    pinchStartRef.current = null;

    // Snap scale to [1, 4] with bounce-back animation
    const clampedScale = Math.min(Math.max(scaleRef.current, 1), 4);
    const { x: panX, y: panY } = clampPan(clampedScale, panRef.current.x, panRef.current.y);

    scaleRef.current = clampedScale;
    panRef.current = { x: panX, y: panY };
    applyTransform(clampedScale, panX, panY, true); // animate
  }
}
```

### JSX

```tsx
return (
  <div
    ref={outerRef}
    className="absolute inset-0 overflow-hidden"
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onPointerCancel={handlePointerUp}
  >
    <div
      ref={transformElRef}
      className="absolute inset-0"
      style={{ transformOrigin: 'center center', willChange: 'transform' }}
    >
      {children}
    </div>
  </div>
);
```

---

## Step Z2 — `ImageEditorPage.tsx`: wrap stage content

### Changes

1. Import `ZoomableEditorStage`.
2. Add `touch-none` to the outer container div so the browser does not intercept pinch events with native scroll/zoom.
3. Wrap the `<img>` and `canvasBox` in `ZoomableEditorStage`.
4. The `containerRef` stays on the **outer** container div (not inside the transform wrapper).

### Before (simplified):

```tsx
<div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
  <img ... className="h-full w-full object-contain" />
  {canvasBox ? (
    <div className="absolute" style={{ left, top, width, height }}>
      <ImageAnnotationCanvas ... />
      {textAnchor ? <input ... /> : null}
    </div>
  ) : null}
</div>
```

### After:

```tsx
<div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden touch-none">
  <ZoomableEditorStage>
    <img ... className="h-full w-full object-contain" />
    {canvasBox ? (
      <div className="absolute" style={{ left, top, width, height }}>
        <ImageAnnotationCanvas ... />
        {textAnchor ? <input ... /> : null}
      </div>
    ) : null}
  </ZoomableEditorStage>
</div>
```

The `ResizeObserver` inside `ImageEditorPage` observes `containerRef` — the outer container does not transform, so `canvasBox` measurements are unaffected.

---

## Risks and mitigations

- **Risk:** When the second finger lands mid-draw, Konva's first-finger draw stroke is incomplete. `setPointerCapture` transfers pointer ownership away from Konva, so Konva receives a `lostpointercapture` event rather than `pointerup`. The draw action may stay in a stuck state.
  **Mitigation:** The `ImageAnnotationCanvas`' `handlePointerEnd` uses `isDrawingRef.current` and `resetDraft()`. When pointer capture is lost, `pointerup` fires on the `outerRef` (not the Konva stage), so Konva does NOT call `handlePointerEnd`. On the NEXT single-touch interaction, `isDrawingRef.current` may still be true, causing a ghost draw.
  **Fix:** Add a `reset()` method to `ImageAnnotationCanvas` (via `useImperativeHandle` or a forwarded ref) that calls `resetDraft()`. `ZoomableEditorStage` calls this on its parent when pinch starts, OR: expose an `onPinchStart` callback prop on `ZoomableEditorStage` and have the editor call `imageAnnotationCanvasRef.current.reset()`.
  **Simpler alternative:** When `activePointersRef.current.size >= 2` is first detected in `handlePointerDown`, dispatch a synthetic `pointerup` event on the Konva stage's container element before calling `setPointerCapture`. This lets Konva cleanly finish its current draw stroke.

- **Risk:** `touch-none` (`touch-action: none`) on the outer container disables native scroll/pan, which is already the desired behavior (the editor should not scroll while drawing).

- **Risk:** `setPointerCapture` may fail if the pointer is already in a "captured" state by another element (e.g., Konva). Wrapped in try/catch above.

- **Risk:** `transformOrigin: center center` assumes the transform div fills the container. Since `ZoomableEditorStage` renders `absolute inset-0`, this is always true.

---

## Validation

- Pinch two fingers on an image in the editor → image zooms toward pinch midpoint.
- Lift one finger → pinch ends, scale snaps to [1, 4] with bounce animation.
- Pinch below 1× → bounces back to 1×, pan resets to 0,0.
- Pinch above 4× → bounces back to 4×.
- After pinch: draw annotation → annotation placement is correct (not offset by zoom).
- Text placement while zoomed → tap text tool → tap on zoomed image → text input appears at correct visual position → text is saved with correct normalized coordinates.
- `npm run typecheck` passes.

---

---

# Addendum — Backend Correction + Phase 1 Amendments + Phase 2

**Added:** 2026-05-22

---

## Critical backend correction — annotation data model

### What the backend actually does

**`GET /api/v1/images/{id}` and `GET /api/v1/images` (list) both return `image_annotations[]`.**

Confirmed by reading `serializers.py`:

```python
def serialize_image(image, *, include_events=False, include_annotations=False):
    annotations = getattr(image, "image_annotations", []) if include_annotations else []
    serialized = {
        ...
        "image_annotation": serialize_annotation(annotations[0]) if annotations else None,
    }
    if include_annotations:
        serialized["image_annotations"] = [serialize_annotation(a) for a in annotations]
    return serialized
```

Both `get_image` and `list_images_for_entity` call with `include_annotations=True`.

**The backend stores ONE `ImageAnnotation` DB row per individual annotation stroke/shape/text.** When a batch save is sent (with `data.items`), the backend creates one DB row per item in the items array.

**`image_annotation`** (singular) = convenience field — always the first annotation in the list.
**`image_annotations[]`** (plural) = all annotation rows, each with its own `client_id`.

### What the current frontend does wrong

The current frontend `ImageEditorPage.tsx` save behavior:

```ts
const existingItems = readImageAnnotationItems(currentImage?.annotation?.data ?? null);
const allItems = [...existingItems, ...sessionItems];
const payload = buildImageAnnotationPayload(allItems);
await createAnnotationAsync({ ...payload });
```

This sends ALL items (existing + new) in a single batch. The backend creates new DB rows for ALL items — including the ones that already exist as persisted rows. **Every save duplicates all existing annotations.**

This must be corrected. The correct save behavior:

```ts
// ONLY save new session items — existing annotations are already on the backend
const payload = buildImageAnnotationPayload(sessionItems);
await createAnnotationAsync({ ...payload });
```

### What the current frontend schema is missing

1. **`ImageSchema` lacks `image_annotations`**: The Zod schema only has `image_annotation` (singular) but the backend sends `image_annotations[]`. The array is currently silently dropped by Zod's `strict` mode or `.passthrough()` behavior depending on the schema setup.

2. **`CreateImageAnnotationResponseSchema` is wrong for batch mode**: Batch saves return `{ created_annotation_client_ids: string[] }` but the schema expects `{ client_id: string }`. This causes a Zod validation failure on every batch save, making `createAnnotationAsync` throw an error that is currently silently swallowed or unhandled.

---

## Phase 1 amendments (apply alongside the original plan above)

These amendments MUST be applied together with the original Phase 1 plan. They correct the annotation data model.

### Amendment A — `types.ts`: add `image_annotations` to `ImageSchema`

Add to `ImageSchema` (after `image_annotation`):

```ts
image_annotations: z.array(ImageAnnotationSchema).optional(),
```

Add to `ImageViewModel`:

```ts
annotations: ImageAnnotationViewModel[];
```

This replaces/supplements the existing `annotation: ImageAnnotationViewModel | null` field. Both can coexist during migration, but `annotations: []` (plural) is the ground truth for the editor. The existing `annotation` field (singular) can be kept for backward-compatible code paths that only need the first/latest.

Add a new type for annotation items that carry backend identity:

```ts
export type AnnotatedCanvasItem = {
  data: ImageAnnotationItemData;
  annotationClientId: string | null;
  source: 'persisted' | 'session';
};
```

This is used everywhere the canvas renders annotations. It replaces raw `ImageAnnotationItemData[]` as the canvas prop type.

### Amendment B — `toImageViewModel` and `toImageAnnotationViewModel`: add `annotations`

Update `toImageViewModel` in `types.ts` to populate `annotations`:

```ts
export function toImageViewModel(entityImage: EntityImage): ImageViewModel {
  return {
    ...existing fields...,
    annotation: entityImage.image.image_annotation
      ? toImageAnnotationViewModel(entityImage.image.image_annotation)
      : null,
    annotations: (entityImage.image.image_annotations ?? []).map(toImageAnnotationViewModel),
  };
}
```

Update `mergeSurfaceImage` in `ImageEditorPage.tsx` similarly.

### Amendment C — `CreateImageAnnotationResponseSchema`: fix for batch mode

Update in `types.ts`:

```ts
export const CreateImageAnnotationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string().optional(),
    created_annotation_client_ids: z.array(z.string()).optional(),
  }),
).extend({ ok: z.literal(true) });

export type CreateImageAnnotationResponse = z.infer<typeof CreateImageAnnotationResponseSchema>;
```

Update `create-image-annotation.ts` to return the raw parsed data (or just `void`) instead of `response.data.client_id` since the caller doesn't use the return value:

```ts
export async function createImageAnnotation(
  input: CreateImageAnnotationInput,
): Promise<void> {
  const parsedInput = CreateImageAnnotationInputSchema.parse(input);
  await apiClient.post(
    `/api/v1/images/${parsedInput.image_client_id}/annotations`,
    CreateImageAnnotationResponseSchema,
    parsedInput,
  );
}
```

Update `useCreateImageAnnotation` return shape to match (the `createAnnotationAsync` return type changes to `Promise<void>`).

### Amendment D — `ImageAnnotationCanvas.tsx`: accept `AnnotatedCanvasItem[]`

Change prop type:

```ts
// Before:
annotations: ImageAnnotationItemData[];

// After:
annotations: AnnotatedCanvasItem[];
onAnnotationTap?: (item: AnnotatedCanvasItem) => void;
```

In `renderAnnotation`, add a `onClick` + `onTap` handler to every Konva shape:

```ts
function renderAnnotation(
  item: AnnotatedCanvasItem,
  width: number,
  height: number,
  key: string,
  onTap?: (item: AnnotatedCanvasItem) => void,
): React.JSX.Element | null {
  const tapHandler = onTap
    ? {
        onClick: (e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true; // Prevent Stage from starting a new draw
          onTap(item);
        },
        onTap: (e: KonvaEventObject<TouchEvent>) => {
          e.cancelBubble = true;
          onTap(item);
        },
      }
    : {};

  const annotation = item.data;
  switch (annotation.tool) {
    case 'draw':
      return <Line key={key} {...tapHandler} ...existing props... />;
    // etc.
  }
}
```

The canvas renders `annotations.map((item, index) => renderAnnotation(item, width, height, key, onAnnotationTap))`.

The `draftPoints` preview shape is NOT tappable (no `onTap`).

**Change call sites:** `ImageEditorPage.tsx` must pass `AnnotatedCanvasItem[]` instead of `ImageAnnotationItemData[]`. The `sessionItems` state becomes `ImageAnnotationItemData[]` (unchanged) but is wrapped into `AnnotatedCanvasItem` objects when passed to the canvas:

```ts
// In ImageEditorPage.tsx:
const persistedCanvasItems: AnnotatedCanvasItem[] = existingAnnotations.map((annotation) => ({
  data: readImageAnnotationSingleItem(annotation),  // new helper — reads one annotation's data
  annotationClientId: annotation.clientId,
  source: 'persisted',
}));

const sessionCanvasItems: AnnotatedCanvasItem[] = sessionItems.map((item) => ({
  data: item,
  annotationClientId: null,
  source: 'session',
}));

const allCanvasItems: AnnotatedCanvasItem[] = [...persistedCanvasItems, ...sessionCanvasItems];
```

Where `existingAnnotations` comes from `currentImage.annotations` (the new plural field on `ImageViewModel`).

**Add `readImageAnnotationSingleItem` to `types.ts`**: reads a single annotation's raw data back to `ImageAnnotationItemData`.

```ts
export function readImageAnnotationSingleItem(
  annotation: ImageAnnotationViewModel,
): ImageAnnotationItemData | null {
  if (!annotation.data) return null;
  if (isImageAnnotationItemData(annotation.data)) {
    return annotation.data as ImageAnnotationItemData;
  }
  // If data is a session payload, return the first item
  if (isImageAnnotationSessionData(annotation.data as unknown)) {
    return (annotation.data as unknown as ImageAnnotationSessionData).items[0] ?? null;
  }
  return null;
}
```

And update `persistedCanvasItems` to filter nulls:

```ts
const persistedCanvasItems: AnnotatedCanvasItem[] = currentImage.annotations
  .flatMap((annotation) => {
    const item = readImageAnnotationSingleItem(annotation);
    if (!item) return [];
    return [{ data: item, annotationClientId: annotation.clientId, source: 'persisted' as const }];
  });
```

### Amendment E — `ImageEditorPage.tsx`: fix save to only send session items

Change `handleSaveAndClose` so it only sends `finalSessionItems`, not `[...existingItems, ...finalSessionItems]`:

```ts
// BEFORE (wrong):
const payload = buildImageAnnotationPayload([...existingItems, ...finalSessionItems]);

// AFTER (correct):
const payload = buildImageAnnotationPayload(finalSessionItems);
if (!payload || finalSessionItems.length === 0) {
  // No new annotations to save — close directly
  ...
}
```

The existing `existingItems` variable used for canvas rendering is no longer needed for save. Remove it from `handleSaveAndClose`.

### Amendment F — `useCreateImageAnnotation.ts`: update optimistic update

The optimistic update in Step 5 of the original plan sets `image_annotation` (singular). Update it to also optimistically prepend to `image_annotations[]`:

```ts
queryClient.setQueryData<Image>(
  imageKeys.detail(input.image_client_id),
  (old) => {
    if (!old) return old;
    const optimisticAnnotation = {
      client_id: `optimistic-${Date.now()}`,
      annotation_type: input.annotation_type,
      data: input.data,
      accuracy: null,
      created_at: new Date().toISOString(),
    };
    return {
      ...old,
      image_annotation: optimisticAnnotation,
      image_annotations: [...(old.image_annotations ?? []), optimisticAnnotation],
    };
  },
);
```

---

## Phase 2A — Annotation selection and delete

**Supported by current backend.** Can be implemented without any backend changes.

### Phase 2A scope

- Tap a rendered annotation → open annotation action bottom sheet
- Sheet for draw/arrow/circle/rectangle/highlight: "Delete annotation"
- Sheet for text: "Delete text" (edit and move are Phase 2B — blocked on PATCH endpoint)
- Delete persisted annotation: call `DELETE /api/v1/images/{image_client_id}/annotations/{annotation_client_id}` + optimistic cache removal
- Delete session annotation: remove from `sessionItems` locally — no backend call
- New API function: `delete-image-annotation.ts`
- New action hook: `use-delete-image-annotation.ts`
- New sheet page: `ImageAnnotationActionsSheetPage.tsx`
- New surface ID + registration

### Phase 2A new files to create

| Path (relative to `src/`) |
|---|
| `features/images/api/delete-image-annotation.ts` |
| `features/images/actions/use-delete-image-annotation.ts` |
| `features/images/pages/ImageAnnotationActionsSheetPage.tsx` |

### Phase 2A existing files to edit

| Path (relative to `src/`) | Change |
|---|---|
| `features/images/types.ts` | Add `DeleteImageAnnotationInput`, `DeleteImageAnnotationResponseSchema`, `DeleteImageAnnotationResponse` |
| `features/images/surfaces.ts` | Add `IMAGE_ANNOTATION_ACTIONS_SURFACE_ID`, `ImageAnnotationActionsSurfaceProps`, register sheet |
| `features/images/pages/ImageEditorPage.tsx` | Add `onAnnotationTap` handler, open action sheet, handle delete callbacks |

### Phase 2A step-by-step

#### Step P2A-1 — `types.ts`: add delete annotation types

```ts
export const DeleteImageAnnotationInputSchema = z.object({
  image_client_id: z.string(),
  annotation_client_id: z.string(),
});
export type DeleteImageAnnotationInput = z.infer<typeof DeleteImageAnnotationInputSchema>;

export const DeleteImageAnnotationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
    deleted: z.boolean(),
  }),
).extend({ ok: z.literal(true) });
export type DeleteImageAnnotationResponse = z.infer<typeof DeleteImageAnnotationResponseSchema>;
```

#### Step P2A-2 — `surfaces.ts`: add action sheet surface

```ts
export const IMAGE_ANNOTATION_ACTIONS_SURFACE_ID = 'image-annotation-actions';

export type ImageAnnotationActionsSurfaceProps = {
  item: AnnotatedCanvasItem;
  imageClientId: string;
  onDeletePersisted: (annotationClientId: string) => void;
  onDeleteSession: (item: AnnotatedCanvasItem) => void;
};
```

Register in `imageSurfaces`:

```ts
[IMAGE_ANNOTATION_ACTIONS_SURFACE_ID]: {
  surface: 'sheet',
  component: lazy(loadImageAnnotationActionsSheetPage),
},
```

**Stale closure note:** `onDeletePersisted` and `onDeleteSession` are frozen at sheet-open time. In `ImageEditorPage.tsx`, wrap them with the ref pattern:

```ts
const handleDeletePersistedRef = useRef<(id: string) => void>(() => {});
const handleDeleteSessionRef = useRef<(item: AnnotatedCanvasItem) => void>(() => {});
// ... assign after definition
```

Pass to the sheet:
```ts
onDeletePersisted: (id) => handleDeletePersistedRef.current(id),
onDeleteSession: (item) => handleDeleteSessionRef.current(item),
```

#### Step P2A-3 — `delete-image-annotation.ts`: new API function

```ts
// src/features/images/api/delete-image-annotation.ts
import { apiClient } from '@/lib/api-client';
import { DeleteImageAnnotationInputSchema, DeleteImageAnnotationResponseSchema } from '../types';
import type { DeleteImageAnnotationInput } from '../types';

export async function deleteImageAnnotation(
  input: DeleteImageAnnotationInput,
): Promise<void> {
  const parsed = DeleteImageAnnotationInputSchema.parse(input);
  await apiClient.delete(
    `/api/v1/images/${parsed.image_client_id}/annotations/${parsed.annotation_client_id}`,
    DeleteImageAnnotationResponseSchema,
  );
}
```

Note: `apiClient.delete` signature is `(path, schema, body?)`. No body needed here. The route is path-param only.

#### Step P2A-4 — `use-delete-image-annotation.ts`: new action hook

```ts
// src/features/images/actions/use-delete-image-annotation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteImageAnnotation } from '../api/delete-image-annotation';
import { imageKeys } from '../api/image-keys';
import type { Image } from '../types';

export function useDeleteImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteImageAnnotation,

    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });

      const previous = queryClient.getQueryData<Image>(
        imageKeys.detail(input.image_client_id),
      );

      // Optimistically remove annotation from detail cache
      queryClient.setQueryData<Image>(
        imageKeys.detail(input.image_client_id),
        (old) => {
          if (!old) return old;
          const filtered = (old.image_annotations ?? []).filter(
            (a) => a.client_id !== input.annotation_client_id,
          );
          return {
            ...old,
            image_annotations: filtered,
            image_annotation: filtered[0] ?? null,
          };
        },
      );

      return { previous, imageClientId: input.image_client_id };
    },

    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Image>(
          imageKeys.detail(context.imageClientId),
          context.previous,
        );
      }
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });
    },
  });

  return {
    deleteAnnotation: mutation.mutate,
    deleteAnnotationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
```

#### Step P2A-5 — `ImageAnnotationActionsSheetPage.tsx`: new sheet page

```ts
// src/features/images/pages/ImageAnnotationActionsSheetPage.tsx
import { Trash2 } from 'lucide-react';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import type { ImageAnnotationActionsSurfaceProps } from '../surfaces';

export function ImageAnnotationActionsSheetPage(): React.JSX.Element {
  const { item, onDeletePersisted, onDeleteSession } =
    useSurfaceProps<ImageAnnotationActionsSurfaceProps>();

  const isText = item.data.tool === 'text';

  function handleDelete(): void {
    useSurfaceStore.getState().closeTop();

    if (item.source === 'session') {
      onDeleteSession(item);
    } else if (item.annotationClientId) {
      onDeletePersisted(item.annotationClientId);
    }
  }

  return (
    <div className="flex flex-col pb-2 pt-2" data-testid="annotation-actions-sheet">
      {isText ? (
        // Phase 2B placeholders — disabled until PATCH endpoint exists
        <>
          <button
            className="flex items-center gap-4 px-6 py-4 text-left text-muted-foreground opacity-50"
            disabled
            data-testid="annotation-action-edit-text"
            type="button"
          >
            <span className="text-base font-medium">Edit text</span>
            <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
          </button>
          <button
            className="flex items-center gap-4 px-6 py-4 text-left text-muted-foreground opacity-50"
            disabled
            data-testid="annotation-action-move-text"
            type="button"
          >
            <span className="text-base font-medium">Change position</span>
            <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
          </button>
        </>
      ) : null}

      <button
        className="flex items-center gap-4 px-6 py-4 text-left text-destructive transition-colors duration-150 hover:bg-destructive/10"
        data-testid="annotation-action-delete"
        type="button"
        onClick={handleDelete}
      >
        <Trash2 className="size-5 shrink-0" aria-hidden="true" />
        <span className="text-base font-medium">
          {isText ? 'Delete text' : 'Delete annotation'}
        </span>
      </button>
    </div>
  );
}
```

#### Step P2A-6 — `ImageEditorPage.tsx`: add annotation tap handling

Add `useDeleteImageAnnotation` import and call.

Add deletion handlers:

```ts
const { deleteAnnotationAsync: deletePersistedAnnotation } = useDeleteImageAnnotation();

const handleDeletePersisted = useCallback(
  async (annotationClientId: string) => {
    if (!currentImage) return;
    await deletePersistedAnnotation({
      image_client_id: currentImage.clientId,
      annotation_client_id: annotationClientId,
    });
  },
  [currentImage, deletePersistedAnnotation],
);

const handleDeleteSession = useCallback((item: AnnotatedCanvasItem) => {
  setSessionItems((current) =>
    current.filter((s) => s !== item.data),
  );
}, []);
```

Assign refs:

```ts
handleDeletePersistedRef.current = handleDeletePersisted;
handleDeleteSessionRef.current = handleDeleteSession;
```

Add `onAnnotationTap` handler:

```ts
const handleAnnotationTap = useCallback(
  (item: AnnotatedCanvasItem) => {
    if (!currentImage) return;
    surface.open(IMAGE_ANNOTATION_ACTIONS_SURFACE_ID, {
      item,
      imageClientId: currentImage.clientId,
      onDeletePersisted: (id) => handleDeletePersistedRef.current(id),
      onDeleteSession: (tappedItem) => handleDeleteSessionRef.current(tappedItem),
    } satisfies ImageAnnotationActionsSurfaceProps);
  },
  [currentImage, surface],
);
```

Pass to canvas:

```tsx
<ImageAnnotationCanvas
  activeTool={activeTool}
  annotations={allCanvasItems}
  height={canvasBox.height}
  onAnnotationComplete={(item) =>
    setSessionItems((current) => [...current, item])
  }
  onAnnotationTap={handleAnnotationTap}
  onTextPlacementRequest={(point) => {
    setTextAnchor(point);
    setTextValue('');
  }}
  width={canvasBox.width}
/>
```

---

## Phase 2B — Text edit and text move

**Blocked.** Requires a backend `PATCH /api/v1/images/{image_client_id}/annotations/{annotation_client_id}` endpoint.

No such route exists in the current backend router (`/backend/app/beyo_manager/routers/api_v1/images.py` confirmed).

**Do not implement** text edit or text move as delete+recreate because it changes annotation identity and creates fragile rollback handling.

**What to do now for Phase 2B:**
- The action sheet shows "Edit text" and "Change position" as disabled buttons with "Coming soon" labels (already included in Phase 2A above).
- When the backend PATCH endpoint is added, a new plan can be written for Phase 2B.

**Suggested backend endpoint when ready:**

```
PATCH /api/v1/images/{image_client_id}/annotations/{annotation_client_id}
Body: { data: dict, annotation_type: str }
Response: { client_id: str, updated: bool }
```

---

## Revised Phase 1 file manifest

Update the Phase 1 file manifest (above) to include the Amendment files:

### Additional existing files to edit (Phase 1 amendments)

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/images/types.ts` | Add `image_annotations` to `ImageSchema`, add `annotations` to `ImageViewModel`, add `AnnotatedCanvasItem`, add `readImageAnnotationSingleItem`, fix `CreateImageAnnotationResponseSchema` for batch mode |
| `features/images/api/create-image-annotation.ts` | Change return type to `void` |
| `features/images/components/ImageAnnotationCanvas.tsx` | Accept `AnnotatedCanvasItem[]`; add `onAnnotationTap` prop; add `onClick`/`onTap` with `cancelBubble` to each rendered shape |
| `features/images/pages/ImageEditorPage.tsx` | Use `currentImage.annotations` (plural) to build `persistedCanvasItems`; wrap into `AnnotatedCanvasItem`; fix `handleSaveAndClose` to only save `sessionItems` |

### Additional existing files to edit (Phase 2A)

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/images/types.ts` | Add delete annotation types |
| `features/images/surfaces.ts` | Add `IMAGE_ANNOTATION_ACTIONS_SURFACE_ID`, props type, lazy loader, registration |
| `features/images/pages/ImageEditorPage.tsx` | Add `useDeleteImageAnnotation`, deletion handlers, `onAnnotationTap` |

---

## Revised acceptance criteria

Add to the Phase 1 acceptance criteria:

- `annotations: ImageAnnotationViewModel[]` is present on `ImageViewModel`.
- `image_annotations` (plural) is included in `ImageSchema` and parsed from the API response.
- `CreateImageAnnotationResponseSchema` accepts both `{ client_id }` and `{ created_annotation_client_ids }`.
- Save only sends `sessionItems` to the backend — existing persisted annotations are NOT re-created on each save.
- All rendered annotations on the canvas are `AnnotatedCanvasItem` objects with correct `source` and `annotationClientId`.

Add Phase 2A acceptance criteria:

- Frontend has `deleteImageAnnotation` API function at `api/delete-image-annotation.ts`.
- Frontend has `useDeleteImageAnnotation` hook at `actions/use-delete-image-annotation.ts`.
- Tapping any annotation on the canvas opens the annotation action sheet.
- Deleting a session annotation removes it from `sessionItems` immediately; no backend call made.
- Deleting a persisted annotation calls `DELETE /api/v1/images/{id}/annotations/{annotation_id}`.
- Deleted annotation disappears from the canvas immediately (optimistic).
- The annotation action sheet shows "Edit text" and "Change position" as disabled for text annotations.
- `npm run typecheck` passes.
