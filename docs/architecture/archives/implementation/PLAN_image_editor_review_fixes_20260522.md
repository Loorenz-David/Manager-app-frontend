# PLAN_image_editor_review_fixes_20260522

## Metadata

- Plan ID: `PLAN_image_editor_review_fixes_20260522`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T15:30:34Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Fix all issues found in the post-implementation code review of `PLAN_image_editor_bug_fixes_20260522` and `PLAN_image_editor_text_edit_move_fixes_20260522`.
- Business/user intent: The drag-to-move text interaction must not accumulate dangling window event listeners (which cause jank and silent multiple state updates per pointer event after repeated use); the editor must restore the user's previous tool after exiting text edit mode; the mutation hooks must be internally consistent.
- Non-goals: New features, UI changes outside what is described, changes to backend contracts.

## Scope

- In scope:
  - **Fix A** (critical) — Replace the `window.addEventListener` drag implementation in `ImageEditorPage` with `setPointerCapture` on the drag overlay div. Remove `handleWindowPointerMove`, `clearMoveDrag`, and `handleWindowPointerEnd` entirely. Simplify `cancelMove` and `commitMove` to plain ref-clearing (no listener management). Add a minimal unmount cleanup effect.
  - **Fix B** (moderate) — Add `applyTextItemUpdate` to `handleSaveAndClose` dep array.
  - **Fix C** (moderate) — `cancelMove` and `commitMove` dep arrays now become correct automatically as a result of Fix A (no more `clearMoveDrag` to list).
  - **Fix D** (minor) — Add `void` to the two `invalidateQueries` calls in `useCreateImageAnnotation.onSettled`.
  - **Fix E** (minor UX) — Restore the user's active tool when exiting text edit mode. Save the pre-edit tool in a ref inside `handleEditText`; restore it in `resetTextDraft` when exiting.
- Out of scope: Any changes to canvas, surfaces, types, or other feature files.
- Assumptions:
  - `setPointerCapture` on a React synthetic event's `currentTarget` works identically to the `setPointerCapture` call in `ZoomableEditorStage` (confirmed — same DOM API, same browser support).
  - `setActiveTool`'s setter function from `useState` is stable across renders and does not need to be in dep arrays.

## Clarifications required

_None._

## Acceptance criteria

1. Entering and exiting text move mode ten times does not accumulate window event listeners (verify in browser DevTools → Event Listeners on `window`).
2. Dragging text to a new position still works correctly after Fix A.
3. Pressing Done after a drag still commits the position.
4. Pressing Close during a drag still cancels the move and leaves the editor open.
5. A pinch gesture during a drag still cancels the drag and correctly re-enables canvas after the pinch ends.
6. `npm run typecheck` passes with zero errors.
7. After editing a text annotation that was entered while `draw` was the active tool, the user is returned to `draw` tool mode after committing the edit.
8. After cancelling a text edit (Escape or blur-empty), the user is also returned to the previous tool.

## Contracts and skills

### Contracts loaded

- `architecture/28_surfaces.md`: ref-backed stale-closure pattern — `cancelMove` and `commitMove` use refs for fresh reads, not captured state.
- `architecture/08_hooks.md`: mutation `onSettled` must consistently use `void` on `invalidateQueries` calls.

### File read intent

Permitted relational reads already done:
- `features/images/pages/ImageEditorPage.tsx` — full current state, all handlers understood.
- `features/images/actions/use-create-image-annotation.ts` — confirmed missing `void`.

## Implementation plan

All changes are in two files:
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageEditorPage.tsx`
- `apps/managers-app/ManagerBeyo-app-managers/src/features/images/actions/use-create-image-annotation.ts`

---

### Step 1 — Fix A: Remove window listener functions and simplify clearMoveDrag

Delete the three plain function declarations from the component body (currently lines 255–299):

```
function handleWindowPointerMove(event: PointerEvent): void { ... }
function clearMoveDrag(): void { ... }
function handleWindowPointerEnd(event: PointerEvent): void { ... }
```

These are replaced entirely by the pointer event handlers on the drag overlay div in Step 3.

---

### Step 2 — Fix A: Update cancelMove and commitMove

Both callbacks called `clearMoveDrag()` which no longer exists. Replace with direct ref clearing.

**`cancelMove`** — replace body entirely:

```ts
const cancelMove = useCallback(() => {
  canvasRef.current?.setInteractionEnabled(true);
  setTextMoveState(null);
  movePointerIdRef.current = null;
  moveDragStartRef.current = null;
}, []);
```

Deps: `[]`. Only uses stable setter (`setTextMoveState`) and refs. Correct with zero deps.

**`commitMove`** — replace body entirely:

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

Deps: `[applyTextItemUpdate]`. No `clearMoveDrag` in deps (it no longer exists). ✓

---

### Step 3 — Fix A: Replace onPointerDown in drag overlay with full setPointerCapture handlers

Find the drag overlay div in the JSX — the `<div className="absolute touch-none select-none" ...>` that is conditionally rendered when `textMoveState` is truthy. Currently it has a single `onPointerDown` that attaches window listeners.

Replace the entire drag overlay element with the following. The only substantive change is that `onPointerDown` no longer calls `window.addEventListener`; instead three new handlers — `onPointerMove`, `onPointerUp`, `onPointerCancel` — live on the same div and `setPointerCapture` ensures the div receives all subsequent pointer events regardless of where the finger travels.

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
      const newX =
        moveDragStartRef.current.textStartX +
        (currentNormX - moveDragStartRef.current.normX);
      const newY =
        moveDragStartRef.current.textStartY +
        (currentNormY - moveDragStartRef.current.normY);

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

**Why `setPointerCapture` replaces window listeners**: Once `e.currentTarget.setPointerCapture(e.pointerId)` is called, all subsequent `pointermove`, `pointerup`, and `pointercancel` events for that pointer are delivered to the capturing element — even if the finger moves outside the element's bounds. The event system guarantees delivery; no manual window registration is needed. Pointer capture is automatically released when the element is removed from the DOM (unmount), which eliminates the need for any window-level cleanup.

---

### Step 4 — Fix A: Add minimal unmount cleanup effect

Add this effect alongside the other `useEffect` calls in the component. It ensures refs are cleared if the surface is torn down in any non-standard way (e.g., a navigation event that bypasses the normal close handlers).

```ts
useEffect(() => {
  return () => {
    movePointerIdRef.current = null;
    moveDragStartRef.current = null;
  };
}, []);
```

State updates (`setTextMoveState`, `canvasRef.current?.setInteractionEnabled`) are intentionally omitted from the cleanup: calling them during unmount is harmless in React 18 but unnecessary — the canvas and its interaction flag unmount with the editor surface.

---

### Step 5 — Fix B: Add applyTextItemUpdate to handleSaveAndClose dep array

Locate the `handleSaveAndClose` `useCallback` dependency array. Add `applyTextItemUpdate`:

```ts
// Before:
}, [
  activeTextTarget,
  closeEditor,
  commitMove,
  createAnnotationAsync,
  currentImage,
  resetTextDraft,
  sessionItems,
  textAnchor,
  textValue,
]);

// After:
}, [
  activeTextTarget,
  applyTextItemUpdate,
  closeEditor,
  commitMove,
  createAnnotationAsync,
  currentImage,
  resetTextDraft,
  sessionItems,
  textAnchor,
  textValue,
]);
```

---

### Step 6 — Fix E: Save and restore active tool around text edit mode

#### 6a — Add ref for previous tool

Add next to the other refs (near `handleSaveAndCloseRef`):

```ts
const previousToolBeforeEditRef = useRef<ImageAnnotationTool | null>(null);
```

#### 6b — Update resetTextDraft to restore the saved tool

```ts
const resetTextDraft = useCallback(() => {
  setTextAnchor(null);
  setTextValue('');
  setActiveTextTarget(null);

  if (previousToolBeforeEditRef.current !== null) {
    setActiveTool(previousToolBeforeEditRef.current);
    previousToolBeforeEditRef.current = null;
  }
}, []);
```

Deps remain `[]`. `setActiveTool` is a stable setter. `previousToolBeforeEditRef` is a ref. ✓

#### 6c — Update handleEditText to save the active tool before switching

```ts
const handleEditText = useCallback(
  (item: AnnotatedCanvasItem) => {
    if (!isTextCanvasItem(item)) {
      return;
    }

    cancelMove();
    previousToolBeforeEditRef.current = activeTool;
    setActiveTool('text');
    setActiveTextTarget(item);
    setTextAnchor({ x: item.data.x, y: item.data.y });
    setTextValue(item.data.text);
  },
  [activeTool, cancelMove],
);
```

`activeTool` is added to deps because it is now read inside the callback. When the user changes tools, `handleEditText` recreates — which is fine since `handleAnnotationTap` depends on `handleEditText` and will also update.

**Behaviour**: When `resetTextDraft` is called (commit via Enter/blur, discard via Escape/blur-empty, or undo while in text mode), `previousToolBeforeEditRef.current` is non-null → the saved tool is restored and the ref is cleared. If the user manually changed tools via the tool picker while the text input was open, `activeTool` changed without going through `handleEditText` again, so `previousToolBeforeEditRef.current` still holds the pre-edit value — the user is still returned to their original tool. This is the correct behaviour: the edit mode tool switch was automatic, so it should be fully undone on exit regardless of what happened in between.

---

### Step 7 — Fix D: Add void to invalidateQueries in useCreateImageAnnotation

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/actions/use-create-image-annotation.ts`

Locate the `onSettled` callback and prefix both `invalidateQueries` calls with `void`:

```ts
// Before:
onSettled: (_data, _error, input) => {
  queryClient.invalidateQueries({
    queryKey: imageKeys.detail(input.image_client_id),
  });
  queryClient.invalidateQueries({
    queryKey: imageKeys.lists(),
  });
},

// After:
onSettled: (_data, _error, input) => {
  void queryClient.invalidateQueries({
    queryKey: imageKeys.detail(input.image_client_id),
  });
  void queryClient.invalidateQueries({
    queryKey: imageKeys.lists(),
  });
},
```

This matches the pattern in `use-delete-image-annotation.ts` and `use-update-image-annotation.ts`.

---

## Risks and mitigations

- Risk: `setPointerCapture` on the overlay div is lost if the drag overlay re-renders and React unmounts + remounts the div (e.g., due to a key change or conditional re-mounting). The `movePointerIdRef.current` would still have a stale ID, and no `pointerup` event would arrive to clear it — the next drag would be blocked by the `if (movePointerIdRef.current !== null) return;` guard.
  Mitigation: The drag overlay is rendered as `{textMoveState ? <div ... > : null}`. React does not remount a stable element just because its props change. The only remount trigger would be `textMoveState` going from null to non-null (entering move mode) — which also sets `movePointerIdRef.current = null`, so the guard is clear. ✓

- Risk: After Fix E, `handleEditText` now depends on `activeTool`. When the user is in move mode and `activeTool` is e.g. `'draw'`, `handleEditText` holds `'draw'` in its closure. If the user then changes tool to `'arrow'` via the picker, `handleEditText` recreates. `handleAnnotationTap` depends on `handleEditText` and also recreates. The action sheet was opened with the OLD `handleEditText` reference (frozen surface props). The `onEditText` prop in the action sheet still calls the OLD `handleEditText` (which captured `activeTool = 'draw'`).
  Mitigation: `onEditText` in the surface props is `() => handleEditText(item)` — it calls `handleEditText` directly, not via a ref. This is a stale closure concern, but the only thing `activeTool` is used for in `handleEditText` is saving `previousToolBeforeEditRef.current`. If the closure is stale (holds `'draw'` instead of `'arrow'`), the restored tool after edit will be `'draw'` rather than `'arrow'`. This is an acceptable edge case (the user changed tools while the action sheet was open, then selected "Edit text" — an extremely unlikely multi-step interaction on mobile). If stricter correctness is needed in a future iteration, `handleEditText` can read `activeTool` from a ref rather than a closure.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `apps/managers-app/ManagerBeyo-app-managers`
- Manual — open browser DevTools → Application → Event Listeners on `window`: enter move mode, drag, Done; repeat 5 times; confirm no `pointermove` listeners accumulate on `window`
- Manual — drag text: enters smoothly, text follows finger, Done commits, Close cancels
- Manual — edit text while in draw mode: after committing edit, bottom controls show draw tool (not text tool)
- Manual — edit text then Escape: tool also restored to draw
- Manual — pinch during move: overlay disappears, pinch zoom works, canvas re-enables after pinch

## Review log

- `2026-05-22`: Implemented Fixes A-E in `ImageEditorPage.tsx` and `use-create-image-annotation.ts`.
- `2026-05-22`: Validation complete for `npm run typecheck` in `apps/managers-app/ManagerBeyo-app-managers`.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
