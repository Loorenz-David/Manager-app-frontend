# PLAN_image_thumbnail_grid_standardization_20260626

## Metadata

- Plan ID: `PLAN_image_thumbnail_grid_standardization_20260626`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-06-26T00:00:00Z`
- Last updated at (UTC): `2026-06-26T19:49:06Z`
- Related issue/ticket: —
- Intention plan: —

## Goal and intent

- **Goal:** Create a single shared `ImageThumbnailGrid` component inside `@beyo/images`, then replace the duplicate grid-rendering logic in `TaskNoteReadonlyImages` (`@beyo/task-notes`) and `TaskStepImagesPreview` (workers app) with it.
- **Business/user intent:** Two independent implementations of the same 3-column image preview grid have diverged in annotation behavior, image-loading attributes, and visual styling. Unifying them eliminates the drift and gives every consumer the best behavior of both.
- **Non-goals:**
  - Changing caller prop surfaces outside of the two target files.
  - Changing how `toTaskNoteViewerImages` works or where it lives.
  - Touching the editable `ImagePreviewGrid` (it is a different component for upload/edit flows with context, long-press, reorder — completely different concern).

## Scope

- **In scope:**
  - New `ImageThumbnailGrid` component in `packages/images/src/components/`.
  - Export from `packages/images/src/index.ts`.
  - `TaskNoteReadonlyImages` updated to delegate rendering to `ImageThumbnailGrid`.
  - `TaskStepImagesPreview` updated to delegate rendering to `ImageThumbnailGrid`.
- **Out of scope:**
  - Managers app (no equivalent component exists there yet).
  - `ImagePreviewGrid` — the editable upload grid; leave untouched.
  - Any surface wiring changes — both consumers already have correct surface architecture per §13 of contract `35_shared_packages.md`.
- **Assumptions:**
  - `@beyo/images` is already a dependency of `@beyo/task-notes` (it imports `ImageAnnotationSvgLayer` and `toImageAnnotationViewModels`).
  - `@beyo/images` is already a dependency of the workers app.
  - No `npm install` step is needed.

## Clarifications required

_(none — all behaviors are decided below)_

## Acceptance criteria

1. A single `ImageThumbnailGrid` component is exported from `@beyo/images`.
2. `TaskNoteReadonlyImages` renders identically to before but via `ImageThumbnailGrid`.
3. `TaskStepImagesPreview` renders identically to before but via `ImageThumbnailGrid`.
4. Annotations render on the first two tiles for both consumers (was: all 3 in notes, first 2 in steps — unified to first 2).
5. Third tile renders overflow overlay when `images.length > 3`; no annotation SVG layer underneath it.
6. `npm run typecheck` passes in both `@beyo/task-notes` and the workers app.

## Contracts and skills

### Contracts loaded

- `architecture/35_shared_packages.md`: shared-package structure, dependency rules, export conventions.

### File read intent — pattern vs. relational

Permitted reads:
- `packages/images/src/components/ImageAnnotationSvgLayer.tsx` — existing prop surface (`annotations`, `coverMode`, `widthPx`, `heightPx`, `testId`).
- `packages/images/src/types.ts` — `ImageAnnotationViewModel` type, `toImageAnnotationViewModels`.
- `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx` — exact data shape used (`TaskNoteApiImage`, `image_annotation`, `image_annotations`, `width_px`, `height_px`).
- `apps/workers-app/.../TaskStepImagesPreview.tsx` — exact context shape used (`step.item_images`, `handleOpenImageViewer`).

Prohibited (pattern reads, contracts cover these):
- Any other component to understand how to write a grid or button.

### Skill selection

- Primary skill: `skills/codex/SKILL.md`
- Trigger terms: `create component`, `replace usage`, `export from package`
- Excluded alternatives: none

## Implementation plan

### Step 1 — Create `ImageThumbnailGrid`

**File:** `packages/images/src/components/ImageThumbnailGrid.tsx` _(new)_

```tsx
import { ImageAnnotationSvgLayer } from "./ImageAnnotationSvgLayer";
import type { ImageAnnotationViewModel } from "../types";

export type ImageThumbnailGridItem = {
  clientId: string;
  imageUrl: string;
  widthPx: number | null;
  heightPx: number | null;
  annotations: ImageAnnotationViewModel[];
};

type ImageThumbnailGridProps = {
  images: ImageThumbnailGridItem[];
  onOpen: (clientId: string) => void;
  testId?: string;
};

export function ImageThumbnailGrid({
  images,
  onOpen,
  testId = "image-thumbnail-grid",
}: ImageThumbnailGridProps): React.JSX.Element | null {
  if (images.length === 0) {
    return null;
  }

  const visibleImages = images.slice(0, 3);
  const overflowCount = Math.max(images.length - 3, 0);

  return (
    <div className="grid grid-cols-3 gap-2" data-testid={testId}>
      {visibleImages.map((image, index) => {
        const isOverflowSlot = index === 2 && overflowCount > 0;
        const showAnnotations = index < 2 && image.annotations.length > 0;

        return (
          <button
            key={image.clientId}
            className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            data-testid={`${testId}-tile-${image.clientId}`}
            type="button"
            onClick={() => onOpen(image.clientId)}
          >
            <img
              alt=""
              className="size-full object-cover"
              decoding="async"
              draggable={false}
              loading="lazy"
              src={image.imageUrl}
            />

            {showAnnotations ? (
              <ImageAnnotationSvgLayer
                annotations={image.annotations}
                coverMode
                heightPx={image.heightPx}
                widthPx={image.widthPx}
              />
            ) : null}

            {isOverflowSlot ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="text-lg font-semibold text-white">
                  +{overflowCount}
                </span>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
```

**Behavior decisions:**
- **Annotations on first 2 tiles only.** The third tile is either an overflow slot (fully covered by the dark overlay, so SVG would be invisible) or the last image — in both cases suppressing annotations on slot 2 avoids unnecessary rendering under the overlay and matches the established `TaskStepImagesPreview` behavior.
- **`rounded-2xl`** — taken from `TaskNoteReadonlyImages` (note grid used `rounded-2xl`; step grid used `rounded-xl`; the larger radius wins for the unified standard).
- **Image attrs** — `decoding="async"`, `draggable={false}`, `loading="lazy"` from `TaskStepImagesPreview` (notes grid had none; these are correct for thumbnail grids that are below the fold).
- **Overflow overlay** — `bg-black/60`, `text-lg font-semibold text-white` in a `<span>` (from `TaskStepImagesPreview`; both components had the same intent, step's version is slightly more polished).

---

### Step 2 — Export from `@beyo/images`

**File:** `packages/images/src/index.ts` _(modified)_

Add after the existing component exports block:
```ts
export { ImageThumbnailGrid } from "./components/ImageThumbnailGrid";
export type { ImageThumbnailGridItem } from "./components/ImageThumbnailGrid";
```

---

### Step 3 — Update `TaskNoteReadonlyImages`

**File:** `packages/task-notes/src/components/TaskNoteReadonlyImages.tsx` _(modified)_

Replace the internal grid JSX with a call to `ImageThumbnailGrid`. Keep `toTaskNoteViewerImages` export unchanged (it is used by `TaskNotesSheetPage.tsx` and is public via `index.ts`).

Full replacement:

```tsx
import {
  ImageThumbnailGrid,
  toImageAnnotationViewModels,
  type ImageAnnotationViewModel,
  type ImageLinkEntityType,
  type ImageViewModel,
} from "@beyo/images";

import type { TaskNoteApiEntry, TaskNoteApiImage } from "../types";

type TaskNoteReadonlyImagesProps = {
  images: TaskNoteApiImage[];
  onOpen: (imageClientId: string) => void;
  testId?: string;
};

export function TaskNoteReadonlyImages({
  images,
  onOpen,
  testId = "task-note-readonly-images",
}: TaskNoteReadonlyImagesProps): React.JSX.Element | null {
  if (images.length === 0) {
    return null;
  }

  return (
    <ImageThumbnailGrid
      images={images.map((image) => ({
        clientId: image.client_id,
        imageUrl: image.image_url,
        widthPx: image.width_px ?? null,
        heightPx: image.height_px ?? null,
        annotations: toTaskNoteImageAnnotations(image),
      }))}
      onOpen={onOpen}
      testId={testId}
    />
  );
}

export function toTaskNoteViewerImages(entry: TaskNoteApiEntry): ImageViewModel[] {
  return entry.note_images.map((image, index) => ({
    clientId: image.client_id,
    linkClientId: typeof image.link_client_id === "string" ? image.link_client_id : null,
    entityType: "note" as ImageLinkEntityType,
    entityClientId: entry.note.client_id,
    imageUrl: image.image_url,
    localObjectUrl: null,
    displayOrder: typeof image.display_order === "number" ? image.display_order : index,
    widthPx: typeof image.width_px === "number" ? image.width_px : null,
    heightPx: typeof image.height_px === "number" ? image.height_px : null,
    fileSizeBytes: typeof image.file_size_bytes === "number" ? image.file_size_bytes : null,
    createdAt: typeof image.created_at === "string" ? image.created_at : entry.note.created_at,
    uploadState: "completed",
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation: toTaskNoteImageAnnotations(image)[0] ?? null,
    annotations: toTaskNoteImageAnnotations(image),
  }));
}

function toTaskNoteImageAnnotations(image: TaskNoteApiImage): ImageAnnotationViewModel[] {
  return toImageAnnotationViewModels(
    image.image_annotation ?? null,
    image.image_annotations ?? [],
  );
}
```

**Note:** The `ImageAnnotationSvgLayer` import is removed from this file — it no longer renders the SVG layer directly. The duplicate `commented-out label` block that was already commented out (`{/* <p>Note images</p> */}`) is not re-added.

---

### Step 4 — Update `TaskStepImagesPreview`

**File:** `apps/workers-app/ManagerBeyo-app-workers/src/features/task_steps/components/detail/TaskStepImagesPreview.tsx` _(modified)_

Replace the internal grid JSX with `ImageThumbnailGrid`. Remove the `ImageAnnotationSchema` import (no longer needed — annotation parsing moves to `toImageAnnotationViewModels`). Remove the `index < 2` annotation restriction (now handled inside `ImageThumbnailGrid`).

Full replacement:

```tsx
import {
  ImageThumbnailGrid,
  ImageAnnotationSchema,
  toImageAnnotationViewModels,
  type ImageAnnotationViewModel,
} from "@beyo/images";
import { useTaskStepDetailContext } from "../../providers/TaskStepDetailProvider";

function getImageAnnotations(image: { image_annotation?: unknown; image_annotations?: unknown[] }): ImageAnnotationViewModel[] {
  const parsed = ImageAnnotationSchema.nullable().safeParse(image.image_annotation);
  const single = parsed.success && parsed.data ? parsed.data : null;
  return toImageAnnotationViewModels(single ?? undefined, undefined);
}

export function TaskStepImagesPreview(): React.JSX.Element | null {
  const { step, handleOpenImageViewer } = useTaskStepDetailContext();

  if (!step || step.item_images.length === 0) {
    return null;
  }

  return (
    <ImageThumbnailGrid
      images={step.item_images.map((image) => ({
        clientId: image.client_id,
        imageUrl: image.image_url,
        widthPx: image.width_px ?? null,
        heightPx: image.height_px ?? null,
        annotations: getImageAnnotations(image),
      }))}
      onOpen={handleOpenImageViewer}
      testId="task-step-images-preview"
    />
  );
}
```

**Note:** `getImageAnnotations` keeps the existing `ImageAnnotationSchema.safeParse` approach for the workers app since `step.item_images` carries raw unknown data. The `index < 2` annotation guard is no longer here — it has moved into `ImageThumbnailGrid` as the authoritative rule for annotation slot eligibility.

---

## Risks and mitigations

- **Risk:** `ImageAnnotationSvgLayer` uses a `markerId` default (`img-ann-arrow`). If two `ImageThumbnailGrid` instances render on the same page, their SVG `<defs>` will both define `#img-ann-arrow` in the DOM, causing potential conflicts in some browsers.
  **Mitigation:** `ImageThumbnailGrid` passes a unique `markerId` derived from `testId` (e.g., `markerId={`${testId}-arrow`}`) to each tile's `ImageAnnotationSvgLayer`. Add this as a prop on the SVG layer call.

  Concretely in `ImageThumbnailGrid`, replace:
  ```tsx
  <ImageAnnotationSvgLayer
    annotations={image.annotations}
    coverMode
    heightPx={image.heightPx}
    widthPx={image.widthPx}
  />
  ```
  with:
  ```tsx
  <ImageAnnotationSvgLayer
    annotations={image.annotations}
    coverMode
    heightPx={image.heightPx}
    markerId={`${testId}-arrow-${index}`}
    widthPx={image.widthPx}
  />
  ```

- **Risk:** `TaskNoteReadonlyImages` calls `toTaskNoteImageAnnotations(image)` twice per image in `toTaskNoteViewerImages` (for `annotation` and `annotations` fields). This is a pre-existing issue; plan does not make it worse.
  **Mitigation:** Out of scope. A trivial `const annotations = toTaskNoteImageAnnotations(image)` local can be introduced at the same time if Codex finds it clean.

## Validation plan

- `npm run typecheck` from `frontend/` root: zero TypeScript errors.
- Visual smoke test in workers app: task step detail page shows image thumbnails with annotations on first two tiles, overflow overlay on third when more than 3 images.
- Visual smoke test in workers app notes viewer: unread note slides with images render thumbnails correctly.

## Review log

_(none yet)_

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
