# PLAN_04_images_optimistic_entity_controller_20260521

## Metadata

- Plan ID: `PLAN_04_images_optimistic_entity_controller_20260521`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01`, `PLAN_02`, `PLAN_03`

## Goal and intent

- Goal: Build the central client-side orchestration layer for images on a given entity — the Zustand store for optimistic image state and the `useEntityImagesController` hook that composes the server state, optimistic state, upload pipeline, and surface actions into one typed API.
- Business/user intent: The controller is what consuming features (item form, case page) use. They should not need to know about upload URLs, compression, or cache reconciliation — they call `controller.openCamera()`, `controller.deleteImage(id)`, etc.
- Non-goals: UI components (PLAN_05+), camera stream internals (PLAN_06), surface page components (PLAN_06/07/08).

## Scope

- In scope:
  - `src/features/images/store/images.store.ts` — Zustand store for optimistic image collection state
  - `src/features/images/controllers/use-entity-images.controller.ts` — main controller hook
- Out of scope: Camera stream, preview grid UI, carousel, surfaces, annotation editor.
- Assumptions:
  - The optimistic image collection is stored in Zustand (not React state) so that the camera page surface (a separate component tree) can read and update it without prop drilling.
  - One controller instance per entity — the controller is scoped by `{ entityType, entityClientId }`.
  - The controller does NOT own the TanStack Query cache — it reads from `useEntityImagesQuery` and merges the server list with the local optimistic list to produce the final `ImageViewModel[]` for the UI.

## Clarifications required

- [x] Delete during upload: if the user deletes an optimistic image that is still uploading, the controller must mark it `delete_requested`, not remove it immediately. When the upload resolves (success or fail), the controller checks the state and calls the delete/unlink API if needed.
- [x] Object URL lifecycle: the controller creates the local object URL from the raw capture blob and revokes it when the image is either confirmed (replaced by `image_url`) or deleted.

## Acceptance criteria

1. `imagesStore` tracks the optimistic image list independently of TanStack Query.
2. `useEntityImagesController` returns `ImageViewModel[]` that merges server-confirmed + optimistic images, sorted by `displayOrder`.
3. `uploadImage(rawBlob)` creates an optimistic entry, runs the pipeline, reconciles on success, marks failed on error.
4. `deleteImage(imageClientId)` immediately marks as `delete_requested` if still uploading, or calls unlink/delete if confirmed.
5. `openCamera`, `openViewer`, `openMetadataSheet` call `useSurface().open(...)` with the correct surface IDs and props.
6. The controller type is exported as `ImageEntityController = ReturnType<typeof useEntityImagesController>`.
7. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: general conventions
- `architecture/06_client_state.md`: Zustand store pattern — one file per store, slice pattern for complex state
- `architecture/08_hooks.md`: controller hook taxonomy — aggregate queries + actions into one typed API
- `architecture/15_feature_structure.md`: `store/` and `controllers/` placement
- `architecture/18_performance.md`: avoid storing Blob in Zustand, revoke object URLs
- `architecture/23_providers.md`: controller is injected into context — not called directly from components

### Local extensions loaded

- `architecture/28_surfaces_local.md`: surface types in this app — `slide` for camera and viewer, `sheet` for metadata actions.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/types.ts` — `ImageViewModel`, `ImageUploadState`, enums.
- `src/features/images/lib/image-upload-pipeline.ts` — pipeline input/output types.
- `src/features/images/actions/use-unlink-image.ts` — verify action API.
- `src/features/images/actions/use-delete-image.ts` — verify action API.
- `src/features/images/actions/use-reorder-images.ts` — verify action API.
- `src/features/images/api/use-entity-images.ts` — verify query hook API.
- `src/hooks/use-surface.ts` — verify `useSurface().open(id, props)` signature.
- `src/features/items/controllers/` (one file) — verify the existing project controller pattern.

Prohibited reads:
- Any feature's Zustand store to understand the store pattern — use `06_client_state.md`.

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 1 — Create `src/features/images/store/images.store.ts`

The store manages the optimistic image collection for ALL entities simultaneously (keyed by a composite key). This allows the camera surface (which opens on top of any page) to update the correct entity's list.

```ts
import { create } from 'zustand';
import type { ImageViewModel, ImageUploadState } from '../types';

type OptimisticImagePatch = Partial<
  Pick<
    ImageViewModel,
    | 'uploadState'
    | 'uploadError'
    | 'clientId'
    | 'imageUrl'
    | 'localObjectUrl'
    | 'pendingUploadClientId'
    | 'isOptimistic'
    | 'isDeleted'
    | 'widthPx'
    | 'heightPx'
    | 'fileSizeBytes'
    | 'annotation'
  >
>;

type ImagesStoreState = {
  // Key: `${entityType}::${entityClientId}` → list of optimistic images for that entity
  optimisticImages: Record<string, ImageViewModel[]>;

  // Actions
  insertOptimisticImage: (entityKey: string, image: ImageViewModel) => void;
  patchOptimisticImage: (
    entityKey: string,
    optimisticClientId: string,
    patch: OptimisticImagePatch,
  ) => void;
  removeOptimisticImage: (entityKey: string, optimisticClientId: string) => void;
  clearOptimisticImages: (entityKey: string) => void;
};

export const useImagesStore = create<ImagesStoreState>((set) => ({
  optimisticImages: {},

  insertOptimisticImage: (entityKey, image) =>
    set((state) => ({
      optimisticImages: {
        ...state.optimisticImages,
        [entityKey]: [...(state.optimisticImages[entityKey] ?? []), image],
      },
    })),

  patchOptimisticImage: (entityKey, optimisticClientId, patch) =>
    set((state) => ({
      optimisticImages: {
        ...state.optimisticImages,
        [entityKey]: (state.optimisticImages[entityKey] ?? []).map((img) =>
          img.clientId === optimisticClientId ? { ...img, ...patch } : img,
        ),
      },
    })),

  removeOptimisticImage: (entityKey, optimisticClientId) =>
    set((state) => {
      const list = state.optimisticImages[entityKey] ?? [];
      const updated = list.filter((img) => img.clientId !== optimisticClientId);
      return {
        optimisticImages: { ...state.optimisticImages, [entityKey]: updated },
      };
    }),

  clearOptimisticImages: (entityKey) =>
    set((state) => ({
      optimisticImages: { ...state.optimisticImages, [entityKey]: [] },
    })),
}));

export function buildEntityKey(entityType: string, entityClientId: string): string {
  return `${entityType}::${entityClientId}`;
}
```

### Step 2 — Create `src/features/images/controllers/use-entity-images.controller.ts`

This is the main controller. It is large because it is the entire orchestration boundary for image interactions.

**Controller input:**

```ts
type UseEntityImagesControllerInput = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  viewerMode?: 'preview-only' | 'preview-edit'; // passed to the viewer surface
};
```

**Controller shape (return type):**

```ts
export type EntityImagesController = {
  // Data
  images: ImageViewModel[];         // merged server + optimistic, sorted by displayOrder
  isPending: boolean;
  isError: boolean;

  // Upload
  uploadImage: (rawBlob: Blob) => void;

  // Delete
  deleteImage: (imageClientId: string) => void;

  // Reorder — receives the full new-order list of image clientIds
  reorderImages: (orderedClientIds: string[]) => void;

  // Surface openers
  openCamera: () => void;
  openViewer: (initialImageClientId: string) => void;
  openMetadataSheet: (imageClientId: string) => void;

  // State flags
  isUploading: boolean;
  isDeleting: boolean;
  isReordering: boolean;
};
```

**Implementation skeleton (Codex fills in):**

```ts
import { useCallback, useMemo } from 'react';
import { useEntityImagesQuery } from '../api/use-entity-images';
import { useUnlinkImage } from '../actions/use-unlink-image';
import { useDeleteImage } from '../actions/use-delete-image';
import { useReorderImages } from '../actions/use-reorder-images';
import { useImagesStore, buildEntityKey } from '../store/images.store';
import { runImageUploadPipeline } from '../lib/image-upload-pipeline';
import { toImageViewModel } from '../types';
import { useSurface } from '@/hooks/use-surface';
import type { ImageLinkEntityType, ImageViewModel } from '../types';

export function useEntityImagesController(
  input: UseEntityImagesControllerInput,
): EntityImagesController {
  const { entityType, entityClientId, viewerMode = 'preview-edit' } = input;
  const entityKey = buildEntityKey(entityType, entityClientId);
  const surface = useSurface();

  // Server state
  const { data: serverImages = [], isPending, isError } = useEntityImagesQuery({
    entity_type: entityType,
    entity_client_id: entityClientId,
  });

  // Optimistic state from Zustand
  const optimisticImages = useImagesStore((s) => s.optimisticImages[entityKey] ?? []);
  const { insertOptimisticImage, patchOptimisticImage, removeOptimisticImage } = useImagesStore();

  // Actions
  const unlinkAction = useUnlinkImage();
  const deleteAction = useDeleteImage();
  const reorderAction = useReorderImages();

  // Merge server images + optimistic images into one sorted list
  const images = useMemo<ImageViewModel[]>(() => {
    // Convert confirmed server images to view models
    const confirmed = serverImages.map(toImageViewModel);

    // Optimistic images that have been confirmed (have a server counterpart) are excluded
    // from the optimistic list — they now live in the server list.
    const confirmedIds = new Set(confirmed.map((img) => img.clientId));
    const pendingOptimistic = optimisticImages.filter(
      (img) => img.isOptimistic && !confirmedIds.has(img.clientId) && !img.isDeleted,
    );

    // Merge: confirmed images first (sorted by displayOrder), then pending optimistic at end
    const merged = [
      ...confirmed.sort((a, b) => a.displayOrder - b.displayOrder),
      ...pendingOptimistic,
    ];

    return merged;
  }, [serverImages, optimisticImages]);

  // Upload: create optimistic entry, run pipeline, reconcile
  const uploadImage = useCallback(
    (rawBlob: Blob) => {
      const optimisticClientId = crypto.randomUUID();
      const localObjectUrl = URL.createObjectURL(rawBlob);

      // Calculate next display order (last confirmed + 1, or 0)
      const maxOrder = images.reduce((max, img) => Math.max(max, img.displayOrder), -1);

      // Insert optimistic image immediately — UI shows preview before upload completes
      insertOptimisticImage(entityKey, {
        clientId: optimisticClientId,
        linkClientId: null,
        entityType,
        entityClientId,
        imageUrl: localObjectUrl,
        localObjectUrl,
        displayOrder: maxOrder + 1,
        widthPx: null,
        heightPx: null,
        fileSizeBytes: null,
        createdAt: new Date().toISOString(),
        uploadState: 'captured',
        isOptimistic: true,
        isDeleted: false,
        pendingUploadClientId: null,
        uploadError: null,
        annotation: null,
      });

      // Run pipeline asynchronously
      void runImageUploadPipeline({
        rawBlob,
        entityType,
        entityClientId,
        onProgress: (state) => {
          patchOptimisticImage(entityKey, optimisticClientId, { uploadState: state });
        },
      }).then((confirmedImage) => {
        // Check if user deleted this image while it was uploading
        const currentState = useImagesStore.getState().optimisticImages[entityKey]?.find(
          (img) => img.clientId === optimisticClientId,
        );

        if (currentState?.uploadState === 'delete_requested') {
          // User requested delete during upload — call unlink now that we have the confirmed id
          void unlinkAction.unlinkImageAsync({
            image_client_id: confirmedImage.client_id,
            entity_type: entityType,
            entity_client_id: entityClientId,
          });
          removeOptimisticImage(entityKey, optimisticClientId);
        } else {
          // Upload succeeded — patch with confirmed data, revoke object URL
          URL.revokeObjectURL(localObjectUrl);
          patchOptimisticImage(entityKey, optimisticClientId, {
            clientId: confirmedImage.client_id, // update to server-assigned id
            imageUrl: confirmedImage.image_url,
            localObjectUrl: null,
            uploadState: 'completed',
            isOptimistic: false,
            widthPx: confirmedImage.width_px ?? null,
            heightPx: confirmedImage.height_px ?? null,
            fileSizeBytes: confirmedImage.file_size_bytes ?? null,
          });
        }
      }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Upload failed';
        // Check if delete-requested — no recovery needed
        const currentState = useImagesStore.getState().optimisticImages[entityKey]?.find(
          (img) => img.clientId === optimisticClientId,
        );
        if (currentState?.uploadState === 'delete_requested') {
          removeOptimisticImage(entityKey, optimisticClientId);
          URL.revokeObjectURL(localObjectUrl);
        } else {
          patchOptimisticImage(entityKey, optimisticClientId, {
            uploadState: 'failed',
            uploadError: message,
          });
        }
      });
    },
    [entityKey, entityType, entityClientId, images, insertOptimisticImage, patchOptimisticImage, removeOptimisticImage, unlinkAction],
  );

  // Delete
  const deleteImage = useCallback(
    (imageClientId: string) => {
      // Check if this is an optimistic image still uploading
      const optimistic = useImagesStore.getState().optimisticImages[entityKey]?.find(
        (img) => img.clientId === imageClientId,
      );

      if (optimistic?.isOptimistic && optimistic.uploadState !== 'completed') {
        // Mark delete_requested — pipeline will clean up when it resolves
        patchOptimisticImage(entityKey, imageClientId, {
          uploadState: 'delete_requested',
          isDeleted: true,
        });
        return;
      }

      // Confirmed image — unlink from entity (not global delete)
      void unlinkAction.unlinkImageAsync({
        image_client_id: imageClientId,
        entity_type: entityType,
        entity_client_id: entityClientId,
      });
    },
    [entityKey, entityType, entityClientId, patchOptimisticImage, unlinkAction],
  );

  // Reorder
  const reorderImages = useCallback(
    (orderedClientIds: string[]) => {
      reorderAction.reorderImages({
        entity_type: entityType,
        entity_client_id: entityClientId,
        ordered_image_client_ids: orderedClientIds,
      });
    },
    [entityType, entityClientId, reorderAction],
  );

  // Surface openers
  const openCamera = useCallback(() => {
    surface.open('image-camera', {
      entityType,
      entityClientId,
      onCapture: uploadImage,
    });
  }, [surface, entityType, entityClientId, uploadImage]);

  const openViewer = useCallback(
    (initialImageClientId: string) => {
      surface.open('image-viewer', {
        images,
        initialImageClientId,
        entityType,
        entityClientId,
        mode: viewerMode,
        onDelete: viewerMode === 'preview-edit' ? deleteImage : undefined,
      });
    },
    [surface, images, entityType, entityClientId, viewerMode, deleteImage],
  );

  const openMetadataSheet = useCallback(
    (imageClientId: string) => {
      const image = images.find((img) => img.clientId === imageClientId);
      if (!image) return;
      surface.open('image-metadata', {
        image,
        entityType,
        entityClientId,
        mode: viewerMode,
        onDelete: viewerMode === 'preview-edit' ? deleteImage : undefined,
      });
    },
    [surface, images, entityType, entityClientId, viewerMode, deleteImage],
  );

  return {
    images,
    isPending,
    isError,
    uploadImage,
    deleteImage,
    reorderImages,
    openCamera,
    openViewer,
    openMetadataSheet,
    isUploading: optimisticImages.some(
      (img) =>
        img.uploadState === 'compressing' ||
        img.uploadState === 'requesting_upload_url' ||
        img.uploadState === 'uploading' ||
        img.uploadState === 'confirming',
    ),
    isDeleting: unlinkAction.isPending || deleteAction.isPending,
    isReordering: reorderAction.isPending,
  };
}

export type EntityImagesController = ReturnType<typeof useEntityImagesController>;
```

**Notes for Codex:**
- `useImagesStore.getState()` (imperative access) is used inside callbacks to read the latest state without creating a stale closure — this is the correct Zustand pattern for async callbacks.
- The `images` array in `openViewer` and `openMetadataSheet` is the merged list — it includes optimistic images, so the viewer can display images before upload completes.
- Surface IDs `'image-camera'`, `'image-viewer'`, `'image-metadata'` are registered in PLAN_11.

### Step 3 — Typecheck

Run `npm run typecheck`. Resolve any errors.

## Risks and mitigations

- Risk: Race condition — user deletes while upload resolves simultaneously. Both branches check `delete_requested` but there's a brief window.
  Mitigation: The Zustand store is synchronous and single-threaded in the JS event loop. The `uploadImage` promise chain checks state via `useImagesStore.getState()` at the exact moment of resolution — the check is atomic within a microtask. Edge cases are acceptable for MVP.

- Risk: Optimistic image `clientId` collides with confirmed image `clientId` during reconciliation (e.g. if the server happened to return the same UUID we generated — statistically impossible but worth noting).
  Mitigation: Use `crypto.randomUUID()` — collision probability is negligible. The reconciliation check uses `confirmedIds` set built from server data at merge time.

- Risk: `openCamera` captures `uploadImage` in a closure — if `uploadImage` identity changes on every render, the camera surface receives a stale reference.
  Mitigation: `uploadImage` is wrapped in `useCallback` with stable deps. Verify the closure identity in tests.

## Validation plan

- `npm run typecheck`: zero errors.
- Unit tests (PLAN_12): `uploadImage` — verify optimistic image inserted before pipeline resolves.
- Unit tests (PLAN_12): `deleteImage` during upload — verify `delete_requested` state, cleanup after pipeline.
- Unit tests (PLAN_12): `images` merge — verify optimistic + server images merged and sorted correctly.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
