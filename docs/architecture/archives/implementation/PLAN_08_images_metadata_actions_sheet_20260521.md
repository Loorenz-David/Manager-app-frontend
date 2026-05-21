# PLAN_08_images_metadata_actions_sheet_20260521

## Metadata

- Plan ID: `PLAN_08_images_metadata_actions_sheet_20260521`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T21:58:39Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01`, `PLAN_04`

## Goal and intent

- Goal: Build the image metadata and actions bottom sheet — the sheet opened by the three-dot button in the viewer and from tile long-press (future). Shows image details and the delete action when the mode allows.
- Business/user intent: Users need quick access to image metadata (size, date, state) and a delete action without leaving the viewer context.
- Non-goals: Full viewer (PLAN_07), camera (PLAN_06), reorder (PLAN_09), annotation editor (PLAN_10).

## Scope

- In scope:
  - `src/features/images/pages/ImageMetadataActionsSheetPage.tsx` — `sheet` surface page component
- Out of scope: All other image surfaces.
- Assumptions:
  - The sheet opens as a `sheet` surface (Vaul bottom drawer). Props: `{ image: ImageViewModel, entityType, entityClientId, mode: 'preview-only' | 'preview-edit', onDelete?: (imageClientId: string) => void }`.
  - Delete calls `onDelete(image.clientId)` from props (the controller's `deleteImage`), then closes the sheet.
  - File size formatted with `Intl` — use the existing locale.
  - Dimensions formatted as `{widthPx}×{heightPx} px`.
  - Upload state is shown as a human-readable label for non-completed images.

## Clarifications required

- [x] The sheet does NOT own global image state — it receives `image` as a prop snapshot from the viewer/controller.
- [x] Delete from sheet: calls `onDelete`, then calls `useSurfaceStore.getState().closeTop()`.

## Acceptance criteria

1. Sheet shows: image thumbnail, upload state (if not completed), created date, file size, dimensions.
2. Delete row visible only when `mode === 'preview-edit'` and `onDelete` is provided.
3. Tapping delete calls `onDelete(image.clientId)` and closes the sheet.
4. `data-testid` on all elements.
5. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: component structure
- `architecture/14_styling.md`: Tailwind styling
- `architecture/15_feature_structure.md`: pages/ placement
- `architecture/27_responsive.md`: bottom sheet safe area
- `architecture/33_vaul_drawer.md`: bottom sheet Vaul close pattern

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `sheet` surface pattern — `useSurfaceProps`, `useSurfaceStore.getState().closeTop()`.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/types.ts` — `ImageViewModel`, `ImageUploadState`.
- `src/features/items/pages/ItemCategoryPickerSheetPage.tsx` — verify existing sheet surface page close pattern.

### Skill selection

- Primary skill: none

## Implementation plan

### Step 1 — Create `src/features/images/pages/ImageMetadataActionsSheetPage.tsx`

```tsx
import { useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { cn } from '@/lib/utils';
import type { ImageViewModel, ImageLinkEntityType, ImageUploadState } from '../types';

type ImageMetadataActionsSheetPageProps = {
  image: ImageViewModel;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: 'preview-only' | 'preview-edit';
  onDelete?: (imageClientId: string) => void;
};

const UPLOAD_STATE_LABELS: Record<ImageUploadState, string | null> = {
  idle: null,
  captured: 'Processing',
  compressing: 'Compressing',
  requesting_upload_url: 'Preparing upload',
  uploading: 'Uploading',
  confirming: 'Finalising',
  completed: null,
  failed: 'Upload failed',
  delete_requested: 'Deleting',
  deleting: 'Deleting',
};

function formatFileSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string | null): string | null {
  if (!isoString) return null;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function ImageMetadataActionsSheetPage(): React.JSX.Element {
  const { image, mode, onDelete } = useSurfaceProps<ImageMetadataActionsSheetPageProps>();

  const displayUrl = image.localObjectUrl ?? image.imageUrl;
  const uploadStateLabel = UPLOAD_STATE_LABELS[image.uploadState];
  const fileSize = formatFileSize(image.fileSizeBytes);
  const createdDate = formatDate(image.createdAt);
  const dimensions =
    image.widthPx && image.heightPx ? `${image.widthPx}×${image.heightPx} px` : null;

  const handleDelete = useCallback(() => {
    onDelete?.(image.clientId);
    useSurfaceStore.getState().closeTop();
  }, [image.clientId, onDelete]);

  return (
    <div
      className="flex flex-col gap-0"
      data-testid="image-metadata-sheet"
    >
      {/* Image preview header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <img
          src={displayUrl}
          alt="Image preview"
          className="size-14 shrink-0 rounded-xl object-cover"
          data-testid="metadata-sheet-thumbnail"
        />
        <div className="min-w-0 flex-1">
          {uploadStateLabel ? (
            <span
              className="text-sm text-muted-foreground"
              data-testid="metadata-sheet-upload-state"
            >
              {uploadStateLabel}
            </span>
          ) : null}
          {createdDate ? (
            <p
              className="truncate text-sm text-foreground"
              data-testid="metadata-sheet-created-at"
            >
              {createdDate}
            </p>
          ) : null}
        </div>
      </div>

      {/* Metadata rows */}
      <div className="flex flex-col divide-y divide-border px-4">
        {fileSize ? (
          <div
            className="flex items-center justify-between py-3"
            data-testid="metadata-sheet-file-size"
          >
            <span className="text-sm text-muted-foreground">Size</span>
            <span className="text-sm text-foreground">{fileSize}</span>
          </div>
        ) : null}

        {dimensions ? (
          <div
            className="flex items-center justify-between py-3"
            data-testid="metadata-sheet-dimensions"
          >
            <span className="text-sm text-muted-foreground">Dimensions</span>
            <span className="text-sm text-foreground">{dimensions}</span>
          </div>
        ) : null}
      </div>

      {/* Delete action — only in preview-edit mode */}
      {mode === 'preview-edit' && onDelete ? (
        <div className="mt-2 border-t border-border px-4 pb-safe-area-inset-bottom pt-1">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-destructive transition-colors duration-150 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            onClick={handleDelete}
            data-testid="metadata-sheet-delete-button"
            aria-label="Delete image"
          >
            <Trash2 className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Delete image</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

### Step 2 — Typecheck

Run `npm run typecheck`. Resolve any errors.

## Risks and mitigations

- Risk: `onDelete` called but surface is already closed by external navigation before the callback fires.
  Mitigation: `closeTop()` is idempotent — safe to call even if already closed.

## Validation plan

- `npm run typecheck`: zero errors.
- Unit tests (PLAN_12): sheet renders metadata fields, delete button only in `preview-edit` mode.
- Unit tests (PLAN_12): clicking delete calls `onDelete` and `closeTop`.
- Playwright (PLAN_12): three-dot button in viewer opens sheet, delete removes image from grid.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.
- `2026-05-21` Codex: Implemented metadata sheet and image surface registration. `npm run typecheck` passed.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
