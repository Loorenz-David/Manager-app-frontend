# PLAN_image_editor_bug_fixes_20260522

## Metadata

- Plan ID: `PLAN_image_editor_bug_fixes_20260522`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T15:17:16Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Fix three bugs found in the image editor after the `PLAN_image_editor_ux_rework_20260522` implementation.
- Business/user intent: The editor must behave correctly when a user pinch-zooms (no accidental strokes), must allow tapping existing annotations to delete them, and must show the text input box as a classic image-editor text frame (visible boundary, correct size).
- Non-goals: Implementing text edit / text move (Phase 2B, blocked on missing PATCH endpoint). Adding new annotation types.

## Scope

- In scope:
  - **Bug 1** — Pinch zoom fires the active drawing tool. Fix: when a pinch gesture is active, block all canvas pointer/touch interactions synchronously via a ref flag exposed through `ImageAnnotationCanvasHandle`.
  - **Bug 2** — Tapping an existing shape or text annotation starts a new drawing action instead of opening an action sheet. Fix: implement Phase 2A in full — per-shape tap interception in Konva, `AnnotatedCanvasItem` wrapper type, delete API + hook, annotation action sheet.
  - **Bug 3** — The text input box is nearly invisible and too narrow. Fix: restyle to match a classic image-editor text frame (visible dashed border, transparent background, font size matching canvas render, dynamic width).
- Out of scope:
  - Text edit / text move (Phase 2B) — disabled stubs remain in the action sheet.
  - Any changes to the fullscreen viewer or other image feature pages.
- Assumptions:
  - `apiClient.delete(path, schema)` is the correct call signature (confirmed in `lib/api-client.ts` line 159).
  - `DELETE /api/v1/images/{image_client_id}/annotations/{annotation_client_id}` exists and returns `{ ok: true, data: { client_id: string, deleted: boolean } }` (confirmed in backend router and `delete_annotation.py`).
  - `readImageAnnotationSingleItem` already exists in `types.ts` and handles both single-item and session-data shapes.

## Clarifications required

_None — all implementation details are fully specified below._

## Acceptance criteria

1. Pinching to zoom while `draw`, `arrow`, `circle`, `rectangle`, `highlight`, or `text` is the active tool does not create any new annotation on the canvas.
2. Pinching also clears any in-progress text anchor (`textAnchor` reset to null) so no phantom text placement occurs.
3. Tapping an existing persisted annotation in the editor opens the annotation action sheet.
4. Tapping an existing session (unsaved) annotation in the editor opens the annotation action sheet.
5. Choosing "Delete" in the action sheet removes a session annotation immediately from the canvas without a network call.
6. Choosing "Delete" in the action sheet for a persisted annotation calls `DELETE /api/v1/images/{id}/annotations/{annotationId}`, applies an optimistic removal from the TanStack Query detail cache, and rolls back on error.
7. The text input box shows a clearly visible white dashed border (no fill), a font size that matches the rendered annotation size, and a width that grows with the content (minimum 200 logical px).

## Contracts and skills

### Contracts loaded

- `architecture/08_hooks.md`: optimistic update / rollback / invalidation shape for `useDeleteImageAnnotation`.
- `architecture/28_surfaces.md`: surface registration, stale-closure ref pattern for the new action sheet.
- `architecture/07_components.md`: presentational component shape for `ImageAnnotationActionsSheetPage`.

### File read intent — pattern vs. relational

Permitted relational reads only:
- `features/images/components/ZoomableEditorStage.tsx` — to see current `onPinchStart` prop shape (must add `onPinchEnd`).
- `features/images/components/ImageAnnotationCanvas.tsx` — to understand current handle type, event handler structure, and `renderAnnotation` signature.
- `features/images/pages/ImageEditorPage.tsx` — to understand current canvas/stage wiring.
- `features/images/types.ts` — exact field names, existing schemas, `readImageAnnotationSingleItem`.
- `features/images/surfaces.ts` — existing surface IDs to avoid naming conflicts.
- `features/images/api/create-image-annotation.ts` — to replicate `apiClient` call pattern for the delete function.

### Skill selection

- Primary skill: `skills/react_tanstack_mutation/SKILL.md`
- Trigger terms: `useMutation`, `onMutate`, `onError`, `onSettled`, optimistic update
- Excluded alternatives: none

## Implementation plan

### Step 1 — Add `AnnotatedCanvasItem` type and `DeleteImageAnnotationResponseSchema` to `types.ts`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/types.ts`

Add after the `ImageAnnotationItemData` union type (after line ~295):

```ts
export type AnnotatedCanvasItem = {
  data: ImageAnnotationItemData;
  annotationClientId: string | null;
  source: 'persisted' | 'session';
};
```

Add after `CreateImageAnnotationResponseSchema` (after line ~199):

```ts
export const DeleteImageAnnotationResponseSchema = ApiEnvelopeSchema(
  z.object({
    client_id: z.string(),
    deleted: z.boolean(),
  }),
).extend({ ok: z.literal(true) });
export type DeleteImageAnnotationResponse = z.infer<typeof DeleteImageAnnotationResponseSchema>;

export type DeleteImageAnnotationInput = {
  image_client_id: string;
  annotation_client_id: string;
};
```

---

### Step 2 — Add delete annotation API function

New file: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/api/delete-image-annotation.ts`

```ts
import { apiClient } from '@/lib/api-client';
import { DeleteImageAnnotationResponseSchema } from '../types';

export async function deleteImageAnnotation(
  imageClientId: string,
  annotationClientId: string,
): Promise<void> {
  await apiClient.delete(
    `/api/v1/images/${imageClientId}/annotations/${annotationClientId}`,
    DeleteImageAnnotationResponseSchema,
  );
}
```

---

### Step 3 — Add `useDeleteImageAnnotation` hook

New file: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/actions/use-delete-image-annotation.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { imageKeys } from '../api/image-keys';
import { deleteImageAnnotation } from '../api/delete-image-annotation';
import type { DeleteImageAnnotationInput, Image } from '../types';

export function useDeleteImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ image_client_id, annotation_client_id }: DeleteImageAnnotationInput) =>
      deleteImageAnnotation(image_client_id, annotation_client_id),
    onMutate: async ({ image_client_id, annotation_client_id }) => {
      await queryClient.cancelQueries({ queryKey: imageKeys.detail(image_client_id) });
      const previous = queryClient.getQueryData<Image>(imageKeys.detail(image_client_id));
      queryClient.setQueryData<Image>(imageKeys.detail(image_client_id), (old) => {
        if (!old) return old;
        return {
          ...old,
          image_annotations: (old.image_annotations ?? []).filter(
            (a) => a.client_id !== annotation_client_id,
          ),
          image_annotation:
            old.image_annotation?.client_id === annotation_client_id
              ? null
              : old.image_annotation,
        };
      });
      return { previous, imageClientId: image_client_id };
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
      void queryClient.invalidateQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });
    },
  });

  return {
    deleteAnnotationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
```

---

### Step 4 — Register the annotation actions surface

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/surfaces.ts`

Add the surface ID and prop type (import `AnnotatedCanvasItem` from `./types`):

```ts
export const IMAGE_ANNOTATION_ACTIONS_SURFACE_ID = 'image-annotation-actions';

export type ImageAnnotationActionsSurfaceProps = {
  item: AnnotatedCanvasItem;
  onDelete: () => void;
};
```

Add lazy loader function:

```ts
function loadImageAnnotationActionsSheetPage() {
  return import('@/features/images/pages/ImageAnnotationActionsSheetPage').then((module) => ({
    default: module.ImageAnnotationActionsSheetPage,
  }));
}
```

Add to `imageSurfaces` registration object:

```ts
[IMAGE_ANNOTATION_ACTIONS_SURFACE_ID]: {
  surface: 'sheet',
  component: lazy(loadImageAnnotationActionsSheetPage),
},
```

---

### Step 5 — Create `ImageAnnotationActionsSheetPage`

New file: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageAnnotationActionsSheetPage.tsx`

```tsx
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { IMAGE_ANNOTATION_ACTIONS_SURFACE_ID } from '../surfaces';
import type { ImageAnnotationActionsSurfaceProps } from '../surfaces';

export function ImageAnnotationActionsSheetPage(): React.JSX.Element {
  const { item, onDelete } = useSurfaceProps<ImageAnnotationActionsSurfaceProps>();
  const isText = item.data.tool === 'text';

  function handleDelete(): void {
    onDelete();
    useSurfaceStore.getState().close(IMAGE_ANNOTATION_ACTIONS_SURFACE_ID);
  }

  return (
    <div className="flex flex-col px-4 pb-6 pt-2">
      <button
        className="flex h-14 w-full items-center px-2 text-left text-base text-destructive"
        data-testid="annotation-action-delete"
        type="button"
        onClick={handleDelete}
      >
        {isText ? 'Delete text' : 'Delete shape'}
      </button>

      {isText ? (
        <>
          <button
            className="flex h-14 w-full cursor-not-allowed items-center px-2 text-left text-base text-muted-foreground/40"
            disabled
            type="button"
          >
            Edit text
            <span className="ml-auto text-xs">Coming soon</span>
          </button>
          <button
            className="flex h-14 w-full cursor-not-allowed items-center px-2 text-left text-base text-muted-foreground/40"
            disabled
            type="button"
          >
            Move text
            <span className="ml-auto text-xs">Coming soon</span>
          </button>
        </>
      ) : null}
    </div>
  );
}
```

---

### Step 6 — Update `ImageAnnotationCanvas` for interaction lock and annotation tap

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/components/ImageAnnotationCanvas.tsx`

#### 6a — Update `ImageAnnotationCanvasHandle`

```ts
export type ImageAnnotationCanvasHandle = {
  reset: () => void;
  setInteractionEnabled: (enabled: boolean) => void;
};
```

#### 6b — Add `isInteractionEnabledRef` inside the component

```ts
const isInteractionEnabledRef = useRef(true);
```

#### 6c — Expose via `useImperativeHandle`

```ts
useImperativeHandle(
  ref,
  () => ({
    reset: resetDraft,
    setInteractionEnabled: (enabled: boolean) => {
      isInteractionEnabledRef.current = enabled;
      if (!enabled) {
        resetDraft();
      }
    },
  }),
  [],
);
```

#### 6d — Guard all event handlers

At the very top of `handlePointerStart`, `handlePointerMove`, and `handlePointerEnd` add:

```ts
if (!isInteractionEnabledRef.current) {
  return;
}
```

#### 6e — Update props type: `annotations` becomes `AnnotatedCanvasItem[]`, add `onAnnotationTap`

```ts
import type { AnnotatedCanvasItem, ... } from '../types';

type ImageAnnotationCanvasProps = {
  width: number;
  height: number;
  activeTool: ImageAnnotationTool;
  annotations: AnnotatedCanvasItem[];
  onAnnotationComplete: (item: ImageAnnotationItemData) => void;
  onAnnotationTap?: (item: AnnotatedCanvasItem) => void;
  onTextPlacementRequest: (point: Point) => void;
};
```

#### 6f — Update `renderAnnotation` to accept an optional `onTap`

Change signature:

```ts
function renderAnnotation(
  annotation: ImageAnnotationItemData,
  width: number,
  height: number,
  key: string,
  onTap?: () => void,
): React.JSX.Element | null {
```

Add tap interception props to **every** Konva shape in `renderAnnotation`. These props must only be added when `onTap` is defined:

```ts
const tapProps = onTap
  ? {
      onMouseDown: (e: KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; },
      onTouchStart: (e: KonvaEventObject<TouchEvent>) => { e.cancelBubble = true; },
      onClick: onTap,
      onTap: onTap,
    }
  : {};
```

Spread `{...tapProps}` onto the `<Line>`, `<Arrow>`, `<Ellipse>`, `<Rect>` (rectangle), `<KonvaText>`, and `<Rect>` (highlight) elements inside the switch. Example for `draw`:

```tsx
case 'draw':
  return (
    <Line
      key={key}
      {...tapProps}
      lineCap="round"
      lineJoin="round"
      points={annotation.points.map(...)}
      stroke={annotation.color}
      strokeWidth={annotation.strokeWidth}
      tension={0.2}
      hitStrokeWidth={tapProps ? 20 : undefined}
    />
  );
```

> **Note on `hitStrokeWidth`**: Konva hit detection on thin lines is pixel-perfect, making thin strokes hard to tap. Setting `hitStrokeWidth={20}` on `draw` and `arrow` shapes (only when `onTap` is provided) gives a comfortable tap target without changing visual appearance.

#### 6g — Update the annotations rendering loop

The `annotations.map(...)` call currently passes `(annotation, index)`. Change to read from `AnnotatedCanvasItem`:

```tsx
{annotations.map((annotatedItem, index) =>
  renderAnnotation(
    annotatedItem.data,
    width,
    height,
    `annotation-${index}`,
    onAnnotationTap ? () => onAnnotationTap(annotatedItem) : undefined,
  ),
)}
```

The draft preview shapes (drawn from `startPoint`/`currentPoint`) and the in-progress draw line do **not** receive `onTap` — they are never passed to `renderAnnotation` with a tap callback.

---

### Step 7 — Update `ZoomableEditorStage` to expose `onPinchEnd`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/components/ZoomableEditorStage.tsx`

#### 7a — Add `onPinchEnd` to props type

```ts
type ZoomableEditorStageProps = {
  children: ReactNode;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
};
```

Destructure `onPinchEnd` in the component function signature.

#### 7b — Call `onPinchEnd` when the last pinch pointer lifts

In `handlePointerUp`, the existing code already transitions `isPinchingRef.current = false` when `activePointersRef.current.size < 2`. Add the callback call immediately after setting the flag:

```ts
isPinchingRef.current = false;
pinchStartRef.current = null;
onPinchEnd?.();   // ← add this line
```

---

### Step 8 — Update `ImageEditorPage` to wire all three fixes

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageEditorPage.tsx`

#### 8a — Add imports

```ts
import { useDeleteImageAnnotation } from '../actions/use-delete-image-annotation';
import {
  IMAGE_ANNOTATION_ACTIONS_SURFACE_ID,
  IMAGE_ANNOTATION_TOOL_PICKER_SURFACE_ID,
  IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID,
  IMAGE_EDITOR_SURFACE_ID,
  type ImageAnnotationActionsSurfaceProps,
  type ImageAnnotationToolPickerSurfaceProps,
  type ImageEditorDiscardChangesSurfaceProps,
} from '../surfaces';
import {
  buildImageAnnotationPayload,
  readImageAnnotationSingleItem,
  toImageAnnotationViewModel,
  type AnnotatedCanvasItem,
  type Image,
  type ImageAnnotationItemData,
  type ImageAnnotationTool,
  type TextAnnotationData,
} from '../types';
```

#### 8b — Add the delete hook next to `useCreateImageAnnotation`

```ts
const { deleteAnnotationAsync } = useDeleteImageAnnotation();
```

#### 8c — Build `AnnotatedCanvasItem[]` instead of raw `ImageAnnotationItemData[]`

Replace the current `persistedItems` + `allItems` derivation:

```ts
// Replace:
const persistedItems = (currentImage?.annotations ?? []).flatMap((annotation) => {
  const item = readImageAnnotationSingleItem(annotation);
  return item ? [item] : [];
});
const allItems = [...persistedItems, ...sessionItems];

// With:
const persistedCanvasItems: AnnotatedCanvasItem[] = (currentImage?.annotations ?? []).flatMap(
  (annotation) => {
    const item = readImageAnnotationSingleItem(annotation);
    return item
      ? [{ data: item, annotationClientId: annotation.clientId, source: 'persisted' as const }]
      : [];
  },
);
const sessionCanvasItems: AnnotatedCanvasItem[] = sessionItems.map((item) => ({
  data: item,
  annotationClientId: null,
  source: 'session' as const,
}));
const allCanvasItems: AnnotatedCanvasItem[] = [...persistedCanvasItems, ...sessionCanvasItems];
```

`sessionItems` state stays as `ImageAnnotationItemData[]` — only the derived canvas list changes.

#### 8d — Add ref-backed delete handler

```ts
const handleDeleteAnnotationRef = useRef<((item: AnnotatedCanvasItem) => void) | null>(null);

const handleDeleteAnnotation = useCallback(
  (item: AnnotatedCanvasItem) => {
    if (item.source === 'session') {
      setSessionItems((current) => current.filter((s) => s !== item.data));
      return;
    }
    if (item.annotationClientId && currentImage) {
      void deleteAnnotationAsync({
        image_client_id: currentImage.clientId,
        annotation_client_id: item.annotationClientId,
      });
    }
  },
  [currentImage, deleteAnnotationAsync],
);

handleDeleteAnnotationRef.current = handleDeleteAnnotation;
```

#### 8e — Add `handleAnnotationTap`

```ts
const handleAnnotationTap = useCallback(
  (item: AnnotatedCanvasItem) => {
    surface.open(IMAGE_ANNOTATION_ACTIONS_SURFACE_ID, {
      item,
      onDelete: () => handleDeleteAnnotationRef.current?.(item),
    } satisfies ImageAnnotationActionsSurfaceProps);
  },
  [surface],
);
```

#### 8f — Fix 1: update `ZoomableEditorStage` props in JSX

```tsx
<ZoomableEditorStage
  onPinchStart={() => {
    canvasRef.current?.reset();
    canvasRef.current?.setInteractionEnabled(false);
    resetTextDraft();
  }}
  onPinchEnd={() => {
    canvasRef.current?.setInteractionEnabled(true);
  }}
>
```

#### 8g — Fix 2: update `ImageAnnotationCanvas` props in JSX

```tsx
<ImageAnnotationCanvas
  ref={canvasRef}
  activeTool={activeTool}
  annotations={allCanvasItems}
  height={canvasBox.height}
  onAnnotationComplete={(item) => setSessionItems((current) => [...current, item])}
  onAnnotationTap={handleAnnotationTap}
  onTextPlacementRequest={(point) => {
    setTextAnchor(point);
    setTextValue('');
  }}
  width={canvasBox.width}
/>
```

#### 8h — Fix 3: restyle the text input

Replace the existing `<input>` element with the following. The key changes are:
- `border-2 border-dashed border-white` — visible bounding box (classic image editor style)
- `bg-transparent` — no fill, image shows through
- `fontSize` set to `DEFAULT_TEXT_SIZE * canvasBox.height` to match the rendered canvas text size
- Dynamic `width` grows with the value; `minWidth: 200` ensures a usable minimum
- Remove `rounded-md` — sharp corners match the frame aesthetic

```tsx
{textAnchor ? (
  <input
    ref={textInputRef}
    className="absolute border-2 border-dashed border-white bg-transparent px-2 py-1 text-white outline-none"
    data-testid="annotation-text-input"
    style={{
      left: `${textAnchor.x * canvasBox.width}px`,
      top: `${textAnchor.y * canvasBox.height}px`,
      fontSize: `${DEFAULT_TEXT_SIZE * canvasBox.height}px`,
      minWidth: 200,
      width: `${Math.max(200, textValue.length * DEFAULT_TEXT_SIZE * canvasBox.height * 0.62 + 32)}px`,
    }}
    type="text"
    value={textValue}
    onBlur={() => {
      if (textValue.trim()) {
        commitText(textValue);
        return;
      }
      resetTextDraft();
    }}
    onChange={(event) => setTextValue(event.target.value)}
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitText(textValue);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        resetTextDraft();
      }
    }}
  />
) : null}
```

> **Width calculation note**: `0.62` is an approximation of the average character width as a fraction of `em` (typical for a sans-serif font). This gives a reasonable grow-as-you-type effect. A more precise approach would use a hidden `<span>` mirror, but this is sufficient for a mobile text overlay tool.

---

## Risks and mitigations

- Risk: `e.cancelBubble = true` on `onMouseDown`/`onTouchStart` blocks drawing strokes that begin on a shape. Users cannot start a new draw stroke from a point that is already covered by an existing annotation.
  Mitigation: This is intentional and standard image-editor behavior. If needed in the future, a "move to back" feature or a separate "draw-through" mode can be added. Document this clearly in component comments.

- Risk: `setPointerCapture` in `ZoomableEditorStage` blocks pointer events to the canvas, but Konva uses touch events. If a device fires only touch events (no pointer events), the `isInteractionEnabledRef` guard in `ImageAnnotationCanvas` is the only protection for Bug 1.
  Mitigation: The ref flag approach is synchronous and does not depend on event type — it guards `handlePointerStart`, `handlePointerMove`, and `handlePointerEnd` regardless of whether the event originated from mouse, pointer, or touch. This is the correct and sufficient fix.

- Risk: Text input width formula (`0.62 * em`) is an approximation and may be inaccurate for certain characters (e.g., wide CJK characters, narrow punctuation).
  Mitigation: `minWidth: 200` ensures a usable minimum. If overflow is a concern, the input can be replaced with a `contenteditable` div in a future iteration.

- Risk: The `onDelete` callback passed to `ImageAnnotationActionsSheetPage` is frozen at surface open time (stale closure). If `currentImage` changes between when the sheet opens and when the user taps delete, `handleDeleteAnnotationRef.current` would capture the old value.
  Mitigation: The ref assignment `handleDeleteAnnotationRef.current = handleDeleteAnnotation` at render level ensures the ref always holds the latest closure. The `onDelete: () => handleDeleteAnnotationRef.current?.(item)` pattern correctly defers execution to the live ref at tap time.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `apps/managers-app/ManagerBeyo-app-managers`
- `npm run test -- --grep "ImageAnnotationCanvas"`: existing canvas tests still pass
- Manual: open editor with an image, select `draw` tool, pinch-zoom — no stroke appears on release
- Manual: open editor with a text tool active, begin to place text anchor, use second finger to pinch — text anchor resets, no text is placed
- Manual: open editor on an image that has persisted annotations, tap any shape/text — annotation action sheet appears
- Manual: tap "Delete shape/text" in action sheet — annotation disappears from canvas immediately; query refetches in background
- Manual: tap an unsaved (session) annotation — same action sheet; delete removes it from canvas without a network call
- Manual: place a text annotation — input border is clearly white and dashed; font size is large and matches the rendered text on the canvas; input grows wider as text is typed

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
