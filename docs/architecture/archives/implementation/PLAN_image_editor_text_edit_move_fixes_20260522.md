# PLAN_image_editor_text_edit_move_fixes_20260522

## Metadata

- Plan ID: `PLAN_image_editor_text_edit_move_fixes_20260522`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T15:17:16Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Fix two bugs in the text edit and text move flows added during the `PLAN_image_editor_bug_fixes_20260522` implementation.
- Business/user intent: Editing an existing text annotation must feel like editing in-place (not spawning a second floating label), and moving text must be a true drag interaction with a visible bounding box — not a broken tap-to-reposition that doesn't follow the finger.
- Non-goals: Adding new annotation tools, changing the PATCH backend contract, altering delete or non-text shape flows.

## Scope

- In scope:
  - **Bug 1** — Edit text opens a second text input overlaid on the still-visible original Konva text, making two copies appear. Fix: hide the source annotation from the Konva canvas while its input overlay is active.
  - **Bug 2** — Move text does not drag, has no visual bounding box, and the Done button does not commit the move. Fix: replace the `pendingTextMoveItem` tap-to-reposition approach with a `textMoveState` + draggable HTML overlay that tracks real pointer deltas, accounts for CSS zoom from `ZoomableEditorStage`, and is committed or cancelled by Done / Close.
- Out of scope: Any changes outside `ImageEditorPage.tsx`. No new files, no surface or type changes.
- Assumptions:
  - `applyTextItemUpdate` is already correct and handles both session and persisted cases (confirmed reading the file — session maps `sessionItems`, persisted calls `updateAnnotation`).
  - `canvasRef.current?.setInteractionEnabled(false/true)` already works (implemented in the previous plan).
  - `ZoomableEditorStage` applies a CSS `transform: translate/scale` on its inner div; pointer events give `clientX/Y` in screen (visual) coordinates; `getBoundingClientRect()` on any element inside the transform also returns visual coordinates. Both facts mean that computing normalised canvas coords via `(e.clientX - rect.left) / rect.width` using the canvas container's `getBoundingClientRect()` automatically accounts for the current zoom level — no additional scale math is needed.

## Clarifications required

_None — all implementation details are fully specified below._

## Acceptance criteria

1. Tapping "Edit text" on an existing annotation hides the original Konva text and shows only the input box positioned precisely over where the text was. No visual doubling.
2. The pre-filled input contains the existing text and the cursor is placed at the end.
3. Committing (Enter / blur-with-value) updates the annotation text; discarding (Escape / blur-with-empty) leaves the original text unchanged.
4. Tapping "Move text" shows a draggable bounding box (dashed white border) containing the annotation's text, positioned where the text currently lives.
5. Dragging the box repositions it in real time. The text follows the finger at the correct visual position even while the canvas is zoomed.
6. Tapping Done while in move mode commits the new position (calls `applyTextItemUpdate`) before the normal save/close flow runs.
7. Tapping Close while in move mode cancels the move and returns to normal editing — it does NOT close the editor. A subsequent Close then behaves normally.
8. A pinch gesture while in move mode cancels the drag (box disappears) and re-enables canvas interaction after the pinch ends.

## Contracts and skills

### Contracts loaded

- `architecture/28_surfaces.md`: ref-backed callback pattern — `textMoveStateRef.current` is read inside `commitMove` to avoid stale closure.
- `architecture/07_components.md`: the draggable overlay is a plain HTML element inside `ImageEditorPage`, not a new component (it is not reused elsewhere and is tightly coupled to page state).

### File read intent — pattern vs. relational

Permitted relational reads already done:
- `features/images/pages/ImageEditorPage.tsx` — full read, all state/handler/JSX understood.
- `features/images/actions/use-update-image-annotation.ts` — confirmed `updateAnnotation` (fire-and-forget mutate) signature.
- `features/images/surfaces.ts` — confirmed no changes needed.
- `features/images/components/ZoomableEditorStage.tsx` — confirmed CSS transform approach, `setPointerCapture` usage.

## Implementation plan

All changes are in one file: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageEditorPage.tsx`

---

### Step 1 — Bug 1: hide source annotation while its input overlay is active

**Problem**: `allCanvasItems` always includes the `activeTextTarget` item. Konva renders it as a `KonvaText` at the same position as the `<input>` overlay, causing a visual double.

**Fix**: derive `visibleCanvasItems` by filtering out the item being actively edited, then pass `visibleCanvasItems` to `<ImageAnnotationCanvas>` instead of `allCanvasItems`.

After the `allCanvasItems` derivation (line ~164), add:

```ts
const editingOrMovingItem = activeTextTarget ?? textMoveState?.item ?? null;
const visibleCanvasItems = editingOrMovingItem
  ? allCanvasItems.filter((item) => item !== editingOrMovingItem)
  : allCanvasItems;
```

In the JSX, change the canvas `annotations` prop:

```tsx
// Before:
annotations={allCanvasItems}
// After:
annotations={visibleCanvasItems}
```

`textMoveState` does not exist yet — it is added in Step 2. Wire it once both steps are complete.

---

### Step 2 — Bug 2: replace pendingTextMoveItem with a drag-based textMoveState

#### 2a — New types (file-local, no export needed)

Add after the `CanvasBox` type definition:

```ts
type TextMoveState = {
  item: AnnotatedCanvasItem & { data: TextAnnotationData };
  currentX: number;
  currentY: number;
};
```

#### 2b — Replace pendingTextMoveItem state with textMoveState

Remove:
```ts
const [pendingTextMoveItem, setPendingTextMoveItem] = useState<AnnotatedCanvasItem | null>(null);
```

Add:
```ts
const [textMoveState, setTextMoveState] = useState<TextMoveState | null>(null);
const textMoveStateRef = useRef<TextMoveState | null>(null);
textMoveStateRef.current = textMoveState;
```

#### 2c — Add drag-tracking refs

Add next to the other refs (near `canvasRef`, `textInputRef`, etc.):

```ts
const canvasBoxRef = useRef<HTMLDivElement | null>(null);
const movePointerIdRef = useRef<number | null>(null);
const moveDragStartRef = useRef<{
  normX: number;
  normY: number;
  textStartX: number;
  textStartY: number;
} | null>(null);
```

`canvasBoxRef` attaches to the `div.absolute` canvasBox container so that `getBoundingClientRect()` returns the canvas area's visual rect (accounting for CSS zoom). This gives correct normalised coordinates for the drag calculation.

#### 2d — Add commitMove callback

Add after `applyTextItemUpdate`:

```ts
const commitMove = useCallback(() => {
  const state = textMoveStateRef.current;

  if (!state) {
    return;
  }

  applyTextItemUpdate(state.item, {
    ...state.item.data,
    x: state.currentX,
    y: state.currentY,
  });
  canvasRef.current?.setInteractionEnabled(true);
  setTextMoveState(null);
  movePointerIdRef.current = null;
  moveDragStartRef.current = null;
}, [applyTextItemUpdate]);
```

`textMoveStateRef.current` is read at call time — avoids stale closure when called from `handleSaveAndClose`.

#### 2e — Add cancelMove callback

```ts
const cancelMove = useCallback(() => {
  canvasRef.current?.setInteractionEnabled(true);
  setTextMoveState(null);
  movePointerIdRef.current = null;
  moveDragStartRef.current = null;
}, []);
```

#### 2f — Update handleMoveText

Replace the current implementation entirely:

```ts
const handleMoveText = useCallback(
  (item: AnnotatedCanvasItem) => {
    if (!isTextCanvasItem(item)) {
      return;
    }

    resetTextDraft();
    canvasRef.current?.setInteractionEnabled(false);
    setTextMoveState({ item, currentX: item.data.x, currentY: item.data.y });
  },
  [resetTextDraft],
);
```

Key differences from the old version:
- Does **not** call `setActiveTool('text')` — there is no longer any need to switch tools; canvas interaction is disabled for the duration of the drag.
- Does **not** set `pendingTextMoveItem` — that state is gone.
- Explicitly disables canvas so no accidental drawing can start while the drag overlay is visible.

#### 2g — Update handleSaveAndClose to commit any pending move first

At the very top of the `handleSaveAndClose` callback body, before the `finalSessionItems` derivation, add:

```ts
const moveState = textMoveStateRef.current;

if (moveState) {
  applyTextItemUpdate(moveState.item, {
    ...moveState.item.data,
    x: moveState.currentX,
    y: moveState.currentY,
  });
  canvasRef.current?.setInteractionEnabled(true);
  setTextMoveState(null);
}
```

Also remove `pendingTextMoveItem` from the dependency array (it no longer exists). No new deps are introduced — `applyTextItemUpdate` is already in deps, and `setTextMoveState` is a stable setter.

#### 2h — Update handleClose to cancel move instead of closing the editor

Replace:
```ts
const handleClose = useCallback(() => {
  if (!hasUnsavedChanges) {
    closeEditor();
    return;
  }
  // ...opens discard sheet
}, [closeEditor, hasUnsavedChanges, surface]);
```

With:
```ts
const handleClose = useCallback(() => {
  if (textMoveStateRef.current) {
    cancelMove();
    return;
  }

  if (!hasUnsavedChanges) {
    closeEditor();
    return;
  }

  surface.open(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID, {
    onDiscardAndClose: () => {
      useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
      closeEditor();
    },
    onSaveAndClose: () => void handleSaveAndCloseRef.current(),
  } satisfies ImageEditorDiscardChangesSurfaceProps);
}, [cancelMove, closeEditor, hasUnsavedChanges, surface]);
```

Pressing Close while dragging cancels the move and returns to normal editing. The editor stays open. A second Close press then follows normal flow (check unsaved changes / open discard sheet).

#### 2i — Update ZoomableEditorStage onPinchStart and onPinchEnd in JSX

`onPinchStart`: replace `setPendingTextMoveItem(null)` with `cancelMove()`:

```tsx
onPinchStart={() => {
  canvasRef.current?.reset();
  canvasRef.current?.setInteractionEnabled(false);
  resetTextDraft();
  cancelMove();
}}
```

`onPinchEnd`: only re-enable canvas interaction if not in move mode:

```tsx
onPinchEnd={() => {
  if (!textMoveStateRef.current) {
    canvasRef.current?.setInteractionEnabled(true);
  }
}}
```

Without this guard, a pinch during a drag would re-enable canvas on finger-lift even though `textMoveState` is still set.

#### 2j — Simplify onTextPlacementRequest

Remove the `pendingTextMoveItem` branch entirely. The handler reverts to the simple original form:

```tsx
onTextPlacementRequest={(point) => {
  setActiveTextTarget(null);
  setTextAnchor(point);
  setTextValue('');
}}
```

#### 2k — Attach canvasBoxRef to the canvasBox container div

The `div.absolute` that wraps `<ImageAnnotationCanvas>` currently has no ref. Add `ref={canvasBoxRef}`:

```tsx
<div
  ref={canvasBoxRef}
  className="absolute"
  style={{
    left: canvasBox.left,
    top: canvasBox.top,
    width: canvasBox.width,
    height: canvasBox.height,
  }}
>
```

This ref is needed by the drag overlay's pointer handlers to convert screen coordinates to normalised canvas coordinates via `getBoundingClientRect()`.

#### 2l — Add the draggable text move overlay to JSX

Place this after the `{textAnchor ? <input ... /> : null}` block, still inside the canvasBox `div`:

```tsx
{textMoveState ? (
  <div
    className="absolute touch-none select-none"
    style={{
      left: `${textMoveState.currentX * canvasBox.width}px`,
      top: `${textMoveState.currentY * canvasBox.height}px`,
      cursor: 'grab',
      zIndex: 10,
    }}
    onPointerDown={(e) => {
      if (movePointerIdRef.current !== null) {
        return;
      }

      const canvasEl = canvasBoxRef.current;

      if (!canvasEl) {
        return;
      }

      movePointerIdRef.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);

      const rect = canvasEl.getBoundingClientRect();
      moveDragStartRef.current = {
        normX: (e.clientX - rect.left) / rect.width,
        normY: (e.clientY - rect.top) / rect.height,
        textStartX: textMoveState.currentX,
        textStartY: textMoveState.currentY,
      };
    }}
    onPointerMove={(e) => {
      if (e.pointerId !== movePointerIdRef.current || !moveDragStartRef.current) {
        return;
      }

      const canvasEl = canvasBoxRef.current;

      if (!canvasEl) {
        return;
      }

      const rect = canvasEl.getBoundingClientRect();
      const currentNormX = (e.clientX - rect.left) / rect.width;
      const currentNormY = (e.clientY - rect.top) / rect.height;
      const newX = moveDragStartRef.current.textStartX + (currentNormX - moveDragStartRef.current.normX);
      const newY = moveDragStartRef.current.textStartY + (currentNormY - moveDragStartRef.current.normY);

      setTextMoveState((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          currentX: Math.max(0, Math.min(1, newX)),
          currentY: Math.max(0, Math.min(1, newY)),
        };
      });
    }}
    onPointerUp={(e) => {
      if (e.pointerId === movePointerIdRef.current) {
        movePointerIdRef.current = null;
        moveDragStartRef.current = null;
      }
    }}
    onPointerCancel={(e) => {
      if (e.pointerId === movePointerIdRef.current) {
        movePointerIdRef.current = null;
        moveDragStartRef.current = null;
      }
    }}
  >
    <div
      className="border-2 border-dashed border-white px-2 py-1 text-white"
      style={{ fontSize: `${textMoveState.item.data.fontSize * canvasBox.height}px` }}
    >
      {textMoveState.item.data.text}
    </div>
  </div>
) : null}
```

**How the coordinate math works**:

`canvasBoxRef.current.getBoundingClientRect()` returns the canvas container's visual rect after CSS transform is applied. `e.clientX/Y` is also in visual (screen) coordinates. Dividing the difference by `rect.width/height` gives a value in the same normalised [0,1] space as all annotation coordinates — zoom level is automatically factored in because both the pointer position and the container rect are in the same visual frame.

On `pointerDown`, the grab offset is recorded (`normX/Y` relative to the canvas origin). On `pointerMove`, the delta from the grab point is added to the text's starting normalised position (`textStartX/Y`). This means the text never jumps — the user's finger always stays at the same relative point on the text regardless of where on the text box they grabbed.

`setPointerCapture` ensures all subsequent `pointermove` events are delivered to the overlay div even if the finger moves outside it.

---

### Step 3 — Wire visibleCanvasItems (completing Step 1 with textMoveState now in scope)

The `editingOrMovingItem` derivation from Step 1 uses `textMoveState?.item`. Since `textMoveState` is now declared (Step 2b), the final form is:

```ts
const editingOrMovingItem = activeTextTarget ?? textMoveState?.item ?? null;
const visibleCanvasItems = editingOrMovingItem
  ? allCanvasItems.filter((item) => item !== editingOrMovingItem)
  : allCanvasItems;
```

Pass to canvas: `annotations={visibleCanvasItems}`.

The canvas will not render:
- The text annotation being edited (replaced visually by the `<input>` overlay)
- The text annotation being moved (replaced visually by the draggable `<div>` overlay)

---

## Risks and mitigations

- Risk: `getBoundingClientRect()` is called on every `pointermove` event, which forces a layout read. On low-end devices with many rapid events this could cause jank.
  Mitigation: `getBoundingClientRect()` on a simple `div` is extremely cheap (sub-microsecond). The DOM paint pipeline is the bottleneck, not this read. If needed in the future, cache the rect in `moveDragStartRef` and only re-read on the next `pointerDown`.

- Risk: If `cancelMove` is called from `onPinchStart` and the user was mid-drag (pointer captured on overlay), the overlay disappears but the captured pointer ID is still tracked by the browser. Subsequent `pointermove` events for that ID will fire on the overlay (which no longer exists in the DOM) — the events will be silently dropped.
  Mitigation: `cancelMove` sets `movePointerIdRef.current = null`. Even if a stale `pointermove` fires, the guard `if (e.pointerId !== movePointerIdRef.current)` at the top of `onPointerMove` will reject it immediately.

- Risk: `textMoveState.item` holds a reference to the `AnnotatedCanvasItem` object built during the render that opened the action sheet. If the image query refetches while the drag is in progress, `persistedCanvasItems` rebuilds and the old item reference is no longer in `allCanvasItems`. This means `visibleCanvasItems` filtering by `item !==` reference equality would fail to hide the text — both the Konva text and the drag overlay would show.
  Mitigation: Filter by `annotationClientId` for persisted items and by `data` object identity for session items:

  ```ts
  const editingOrMovingItem = activeTextTarget ?? textMoveState?.item ?? null;
  const visibleCanvasItems = editingOrMovingItem
    ? allCanvasItems.filter((item) => {
        if (editingOrMovingItem.source === 'persisted' && editingOrMovingItem.annotationClientId) {
          return item.annotationClientId !== editingOrMovingItem.annotationClientId;
        }
        return item !== editingOrMovingItem;
      })
    : allCanvasItems;
  ```

  Use this form instead of the simple reference equality form.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `apps/managers-app/ManagerBeyo-app-managers`
- Manual — Edit text: tap a persisted text annotation → "Edit text" → input appears at the text position, pre-filled, no duplicate text visible on canvas → type to change → commit → updated text renders on canvas
- Manual — Edit text (cancel): same flow → Escape or blur-empty → original text reappears unchanged
- Manual — Move text: tap a text annotation → "Move text" → dashed bounding box appears at the text position with correct font size → drag it → box follows finger smoothly → tap Done → text annotation moves to new position → editor closes
- Manual — Move text (cancel): "Move text" → drag slightly → tap Close → box disappears, original text is back in place → editor is still open
- Manual — Move while zoomed: pinch to 3× zoom first, then tap text, "Move text", drag → text follows correctly (no coordinate offset), Done commits the right position
- Manual — Pinch during move: enter move mode, begin drag with one finger, add second finger → drag box disappears, move is cancelled, pinch zoom works normally, canvas interaction restored after pinch ends

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
