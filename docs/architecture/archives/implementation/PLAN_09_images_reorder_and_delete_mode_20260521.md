# PLAN_09_images_reorder_and_delete_mode_20260521

## Metadata

- Plan ID: `PLAN_09_images_reorder_and_delete_mode_20260521`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T22:04:43Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01`, `PLAN_04`, `PLAN_05`

## Goal and intent

- Goal: Implement the full reorder/delete edit mode for the image preview grid using `@dnd-kit`. Long-press activates edit mode — tiles shake, delete X buttons appear, and tiles become drag-sortable.
- Business/user intent: Users frequently need to set a primary (first) image and clean up their image order. This must feel like a native mobile photo editing experience.
- Non-goals: Camera, viewer, annotation editor, metadata sheet.

## Scope

- In scope:
  - `src/features/images/components/ImageSortableGrid.tsx` — new component wrapping `ImagePreviewGrid` with `@dnd-kit` sort context
  - Updates to `src/features/images/components/ImagePreviewGrid.tsx` — add edit mode state, long-press handler, exit button
  - Updates to `src/features/images/components/ImagePreviewTile.tsx` — shake animation in edit mode, X delete button active
  - CSS keyframe `shake` animation added to global styles
- Out of scope: Camera, viewer, annotation editor, surface registration.
- Assumptions:
  - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` must be installed. Verify `package.json`. If absent: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
  - Edit mode state is local to `ImagePreviewGrid` — not stored in Zustand.
  - Long-press threshold: 500ms.
  - Reorder persists via `controller.reorderImages(orderedClientIds)` from the context.
  - Only confirmed images (not uploading) should be draggable — uploading tiles are not draggable.

## Clarifications required

- [x] Delete in edit mode calls `controller.deleteImage(imageClientId)` — same path as metadata sheet delete. The controller (PLAN_04) handles the upload-during-delete reconciliation.

## Acceptance criteria

1. Long-pressing a tile for 500ms activates edit mode.
2. In edit mode: all tiles display a shake animation, an X button appears at top-right of each tile.
3. In edit mode: tiles are draggable via `@dnd-kit` sortable.
4. Drag end calls `controller.reorderImages(newOrderedClientIds)`.
5. Tapping X calls `controller.deleteImage(imageClientId)`.
6. A check/done button appears (in the grid or as a floating button) to exit edit mode.
7. Tapping outside the grid exits edit mode (if architecture supports).
8. Uploading tiles are not draggable (pointer-events-none on drag handle for uploading tiles).
9. `data-testid` on edit mode controls.
10. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: general conventions
- `architecture/07_components.md`: component updates
- `architecture/14_styling.md`: Tailwind, CSS keyframe animations
- `architecture/15_feature_structure.md`: component placement
- `architecture/18_performance.md`: GPU-friendly transforms for drag, avoid layout jank
- `architecture/23_providers.md`: context consumption only in components
- `architecture/31_animations.md`: CSS keyframe for shake, GPU-friendly drag transforms

### Local extensions loaded

- None for this plan.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/components/ImagePreviewGrid.tsx` — verify current structure before modifying.
- `src/features/images/components/ImagePreviewTile.tsx` — verify current structure before modifying.
- `src/features/images/controllers/use-entity-images.controller.ts` — verify `reorderImages` and `deleteImage` API.
- `package.json` — verify `@dnd-kit` packages exist.

### Skill selection

- Primary skill: none

## Implementation plan

### Step 0 — Verify @dnd-kit dependency

Read `package.json`. If `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` are not in dependencies, add them:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Step 1 — Add shake CSS animation to global styles

In `src/index.css` (or the project's global CSS file — verify path):

```css
@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25%       { transform: rotate(-1.5deg); }
  75%       { transform: rotate(1.5deg); }
}
```

### Step 2 — Create `src/features/images/components/ImageSortableGrid.tsx`

This component wraps the grid tiles in a `DndContext` + `SortableContext`.

```tsx
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImagePreviewTile } from './ImagePreviewTile';
import type { ImageViewModel } from '../types';

type ImageSortableGridProps = {
  images: ImageViewModel[];
  isEditMode: boolean;
  onReorder: (orderedClientIds: string[]) => void;
  onDelete: (imageClientId: string) => void;
  onTap: (imageClientId: string) => void;
};

function SortableTile({
  image,
  isEditMode,
  onDelete,
  onTap,
}: {
  image: ImageViewModel;
  isEditMode: boolean;
  onDelete: (id: string) => void;
  onTap: (id: string) => void;
}): React.JSX.Element {
  const isDraggable = isEditMode && image.uploadState === 'completed';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: image.clientId,
    disabled: !isDraggable,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
    >
      <ImagePreviewTile
        image={image}
        onTap={onTap}
        isEditMode={isEditMode}
        onDeletePress={onDelete}
        testId={`image-sortable-tile-${image.clientId}`}
      />
    </div>
  );
}

export function ImageSortableGrid({
  images,
  isEditMode,
  onReorder,
  onDelete,
  onTap,
}: ImageSortableGridProps): React.JSX.Element {
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.clientId === active.id);
    const newIndex = images.findIndex((img) => img.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(images, oldIndex, newIndex);
    onReorder(reordered.map((img) => img.clientId));
  }

  if (!isEditMode) {
    // Not in edit mode — render plain tiles without DnD context
    return (
      <>
        {images.map((image) => (
          <ImagePreviewTile
            key={image.clientId}
            image={image}
            onTap={onTap}
            isEditMode={false}
            testId={`image-preview-tile-${image.clientId}`}
          />
        ))}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images.map((img) => img.clientId)}
        strategy={rectSortingStrategy}
      >
        {images.map((image) => (
          <SortableTile
            key={image.clientId}
            image={image}
            isEditMode={isEditMode}
            onDelete={onDelete}
            onTap={onTap}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### Step 3 — Update `src/features/images/components/ImagePreviewGrid.tsx`

Read the current file before editing. Apply these changes:

1. Add local `isEditMode` state: `const [isEditMode, setIsEditMode] = useState(false)`.
2. Replace the flat tile loop with `<ImageSortableGrid>`.
3. Add a long-press handler on the grid container that activates edit mode.
4. Add a "Done" button that appears when `isEditMode === true`.

**Long-press implementation:**

```tsx
import { useRef, useCallback } from 'react';

const LONG_PRESS_DELAY_MS = 500;

function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      onLongPress();
    }, LONG_PRESS_DELAY_MS);
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel };
}
```

**Updated grid structure:**

```tsx
// Replace the inner grid content with:
<div
  className="grid grid-cols-3 gap-2"
  data-testid={testId ?? 'image-preview-grid'}
  {...longPressHandlers}
>
  <ImageSortableGrid
    images={visibleImages}
    isEditMode={isEditMode}
    onReorder={reorderImages}
    onDelete={deleteImage}
    onTap={isEditMode ? () => {} : openViewer}
  />
  {!isEditMode && showAddButton ? (
    <ImageAddPictureButton onPress={openCamera} testId="image-add-picture-button" />
  ) : null}
</div>

{/* Done button — shown in edit mode, outside the grid */}
{isEditMode ? (
  <button
    type="button"
    className="mt-2 flex w-full items-center justify-center rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground"
    onClick={() => setIsEditMode(false)}
    data-testid="image-edit-mode-done-button"
    aria-label="Done editing"
  >
    Done
  </button>
) : null}
```

### Step 4 — Typecheck

Run `npm run typecheck`. Resolve any errors.

## Risks and mitigations

- Risk: DnD touch sensor conflicts with the scroll container (Vaul/page scroll) on mobile.
  Mitigation: `TouchSensor` with `delay: 250, tolerance: 5` prevents accidental drags during scroll. The grid is a fixed-height element — it doesn't scroll internally.

- Risk: Drag transform applied while `transition` is still animating causes visual jitter.
  Mitigation: `CSS.Transform.toString(transform)` with `transition` from `useSortable` are the idiomatic @dnd-kit approach and handle this correctly.

- Risk: Long-press fires while the user is scrolling the page.
  Mitigation: `onPointerLeave` and `onPointerUp` cancel the timer. Scroll moves the pointer, triggering leave.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual test (iPhone): long-press activates shake, tiles reorder by drag, X deletes, Done exits.
- Unit tests (PLAN_12): `ImageSortableGrid` — drag end calls `onReorder` with correct new order.
- Unit tests (PLAN_12): X button calls `onDelete` with correct id.
- Playwright (PLAN_12): edit mode activated, done button exits mode.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
