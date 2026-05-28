# PLAN_image_confirm_upload_deferred_instance_flow_20260527

## Metadata

- Plan ID: `PLAN_image_confirm_upload_deferred_instance_flow_20260527`
- Status: `archived`
- Owner agent: `GitHub Copilot`
- Created at (UTC): `2026-05-27T00:00:00Z`
- Last updated at (UTC): `2026-05-27T13:32:23Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/INTENTION_image_confirm_upload_deferred_instance_flow_20260527.md`

## Goal and intent

- **Goal:** Migrate the image upload pipeline to the new confirm-upload backend contract. In `camera-to-editor` flow, the editor always closes immediately when Done is pressed — the confirm-upload is decoupled from the editor's lifecycle and fires in the background. Annotations are captured at Done time and sent with the confirm payload whenever the upload is ready.
- **Business/user intent:** Users experience zero editor latency on Done. The image tile in the preview grid reflects upload and confirm progress. Three concrete scenarios must all work:
  - **Scenario A — Done before upload finishes:** user annotates and presses Done while the blob is still uploading. Editor closes. Annotations are stored. When upload completes, confirm-upload fires automatically with the stored annotations.
  - **Scenario B — Upload finishes before Done:** upload completes (image is at `pre_confirm` state). User presses Done later. Confirm-upload fires immediately in the background while the editor closes.
  - **Scenario C — Existing persisted image:** user opens an already-saved image to edit annotations. Done makes a direct annotation mutation call (`createAnnotationAsync`) — no confirm-upload involved.
- **Non-goals:** Replacing all image flows with deferred/batch mode. Removing existing annotation mutation endpoints for persisted instances. Building offline queueing.

## Scope

- **In scope:**
  - `types.ts`: extend `ConfirmImageUploadInputSchema` with optional `image_client_id`, `width_px`, `height_px`, `image_annotations`. Add `'pre_confirm'` to `IMAGE_UPLOAD_STATE`. Add batch input/response schemas.
  - `lib/image-upload-pipeline.ts`: extract `runImagePreUploadPipeline` (compress → request URL → upload). Simplify `runImageUploadPipeline` to delegate.
  - `api/confirm-image-upload-batch.ts`: new file — batch confirm API function with duplicate-ID pre-validation.
  - `actions/use-confirm-image-upload-batch.ts`: new file — thin mutation wrapper for batch confirm.
  - `controllers/use-entity-images.controller.ts`: add deferred upload path and `onDeferredConfirm` callback.
  - `pages/ImageEditorPage.tsx`: branch save path on `onDeferredConfirm`; relax annotation availability guard.
  - Focused image tests covering the deferred confirm payload shape.
- **Out of scope:** New annotation tools, UI redesign, backend changes, upload-URL generation, other features.
- **Assumptions:**
  - The `optimisticClientId` generated via `generateClientId("Image")` in the controller is accepted by the backend as `image_client_id` (prefix `img_`).
  - Dimensions come from `CompressedImageResult.widthPx` / `CompressedImageResult.heightPx` — no special client metadata needed.
  - The editor opens before the pre-upload completes; the local blob URL is always available for rendering.
  - `file_size_bytes` is intentionally absent from all confirm-upload payloads — the backend rejects it.

## Clarifications required

_(none — all open questions in the intention are resolved in the decisions below)_

## Decisions (resolving intention open questions)

| Open question | Decision |
|---|---|
| Which batch shape is canonical? | `{ items: [...] }` envelope. Top-level list is normalised to this form inside `confirmImageUploadBatch` before posting. |
| Single-item confirm vs. batch for direct capture? | Always single-item confirm per captured image when Done is pressed. Batch is a standalone API/action capability only. |
| How to surface atomic batch failure? | Single error toast via `notify.error`. All items treated as failed. No per-item markers in this iteration. |
| Where do `width_px`/`height_px` come from? | From `CompressedImageResult` returned by `compressImageForUpload`. Stored in the optimistic `ImageViewModel` when pre-upload completes. |

## Acceptance criteria

1. Pressing Done in the editor **always closes the editor immediately** in the deferred path — the editor never blocks waiting for upload or confirm.
2. **Scenario A:** When Done is pressed while upload is still in progress, annotations are stored in the controller and confirm-upload fires automatically when `runImagePreUploadPipeline` completes — without any further user interaction.
3. **Scenario B:** When upload finishes before Done, confirm-upload fires in the background the moment Done is pressed.
4. In both Scenarios A and B, the confirm-upload payload contains `image_client_id`, `width_px`, `height_px`, and optionally `image_annotations` — never `file_size_bytes`.
5. Pressing Done with no annotations omits `image_annotations` from the confirm payload.
6. **Scenario C:** Existing editor flow for already-created images uses `createAnnotationAsync` directly — no regression.
7. The image tile in the preview grid reflects the full upload state sequence through to `completed` or `failed`.
8. `ConfirmImageUploadInputSchema` in types.ts parses both the old minimal shape (backward compat) and the new extended shape.
9. `confirmImageUploadBatch` pre-validates for duplicate `image_client_id` and duplicate `pending_upload_client_id`; throws before sending if duplicates are found.
10. `useConfirmImageUploadBatch` treats any error as full-batch failure (single `notify.error`).
11. `npm run typecheck` reports zero TypeScript errors after all changes.
12. Focused image pipeline tests pass for deferred pre-upload + deferred confirm path.

## Contracts and skills

### Contracts loaded

Read order:
- `architecture/04_api_client.md` (baseline) + `architecture/04_api_client_local.md` (app delta)
- `architecture/08_hooks.md` (action hook shape — used for `useConfirmImageUploadBatch`)
- `architecture/05_server_state.md` (mutation lifecycle — used for batch action hook)
- `architecture/13_errors.md` (error handling — `notify.error` for batch failure)
- `architecture/15_feature_structure.md` (feature folder conventions)

### File read intent — pattern vs. relational

Permitted relational reads (understanding what exists):
- `src/features/images/types.ts` — actual field names, Zod schemas, `ImageUploadState` const ✓
- `src/features/images/lib/image-upload-pipeline.ts` — current pipeline steps and `UploadPipelineProgressState` ✓
- `src/features/images/lib/compress-image-for-upload.ts` — `CompressedImageResult` shape (`widthPx`, `heightPx`) ✓
- `src/features/images/api/confirm-image-upload.ts` — current payload construction ✓
- `src/features/images/actions/use-confirm-image-upload.ts` — existing action hook shape ✓
- `src/features/images/controllers/use-entity-images.controller.ts` — full controller: `uploadImage`, `startUpload`, `openEditorForCapturedImage`, optimistic store usage ✓
- `src/features/images/pages/ImageEditorPage.tsx` — `handleSaveAndClose`, `isAnnotationUnavailable`, `ImageEditorSurfaceProps` consumption ✓
- `src/lib/client-id.ts` — `generateClientId("Image")` produces `img_{ulid}` ✓

Prohibited pattern reads: none applicable; no need to read other action hooks or controllers.

### Skill selection

- Primary skill: not applicable (this is a targeted contract migration, not a new CRUD feature).

## Domain schemas consulted

- `src/features/images/types.ts`:
  - `ImageUploadState` const: `'idle' | 'captured' | 'compressing' | 'requesting_upload_url' | 'uploading' | 'confirming' | 'completed' | 'failed' | 'delete_requested' | 'deleting'`
  - `ConfirmImageUploadInputSchema`: currently only `pending_upload_client_id`, `entity_type`, `entity_client_id`
  - `ImageViewModel`: has `pendingUploadClientId: string | null`, `widthPx: number | null`, `heightPx: number | null` — all needed for deferred state
  - `ImageAnnotationItemData`: union of all annotation tool data types — used as `image_annotations` element type
  - `CompressedImageResult`: has `widthPx: number`, `heightPx: number`
  - `generateClientId("Image")` → `img_{ulid}` prefix

## Implementation plan

### Step 1 — `types.ts`: schema extensions

**File:** `src/features/images/types.ts`

1.1 Add `'pre_confirm'` to `IMAGE_UPLOAD_STATE` after `'uploading'`:
```ts
export const IMAGE_UPLOAD_STATE = [
  'idle', 'captured', 'compressing', 'requesting_upload_url',
  'uploading', 'pre_confirm', 'confirming', 'completed',
  'failed', 'delete_requested', 'deleting',
] as const;
```

1.2 Extend `ConfirmImageUploadInputSchema` with optional new fields. Preserve the existing three required fields for backward compatibility. `file_size_bytes` must not appear anywhere in this schema.
```ts
export const ConfirmImageUploadInputSchema = z.object({
  pending_upload_client_id: z.string(),
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  image_client_id: z.string().optional(),
  width_px: z.number().int().optional(),
  height_px: z.number().int().optional(),
  image_annotations: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type ConfirmImageUploadInput = z.infer<typeof ConfirmImageUploadInputSchema>;
```

1.3 Add batch schemas.

Confirmed request payload shape (matches backend spec):
```json
{
  "items": [
    {
      "pending_upload_client_id": "pu_01...",
      "entity_type": "item",
      "entity_client_id": "itm_01...",
      "image_client_id": "img_01...",
      "width_px": 1600,
      "height_px": 900,
      "image_annotations": [{ "tool": "text", "x": 10, "y": 20, "text": "note" }]
    },
    {
      "pending_upload_client_id": "pu_02...",
      "entity_type": "item",
      "entity_client_id": "itm_01..."
    }
  ]
}
```

```ts
// Batch item — same shape as single-item input
export const ConfirmImageUploadBatchItemSchema = ConfirmImageUploadInputSchema;
export type ConfirmImageUploadBatchItem = ConfirmImageUploadInput;

// Canonical batch payload — { items: [...] }
export const ConfirmImageUploadBatchEnvelopeSchema = z.object({
  items: z.array(ConfirmImageUploadBatchItemSchema).min(1),
});
export type ConfirmImageUploadBatchEnvelope = z.infer<typeof ConfirmImageUploadBatchEnvelopeSchema>;

// ASSUMPTION: batch confirm response wraps a list of confirmed images.
// Codex must verify the actual response body shape from the backend before finalising this schema.
// If the backend returns a different envelope (e.g. { confirmed: [...] }), update the field name.
export const ConfirmImageUploadBatchResponseSchema = ApiEnvelopeSchema(
  z.object({ images: z.array(ImageSchema) }),
).extend({ ok: z.literal(true) });
export type ConfirmImageUploadBatchResponse = z.infer<typeof ConfirmImageUploadBatchResponseSchema>;
```

---

### Step 2 — `lib/image-upload-pipeline.ts`: extract pre-upload function

**File:** `src/features/images/lib/image-upload-pipeline.ts`

2.1 Add `ImagePreUploadResult` type:
```ts
export type ImagePreUploadResult = {
  pendingUploadClientId: string;
  widthPx: number;
  heightPx: number;
};
```

2.2 Add `ImagePreUploadPipelineInput` type. The `onProgress` callback accepts the full `UploadPipelineProgressState` union — the function only calls it with the three pre-upload states, but using the wider type avoids a cast at the call site in `runImageUploadPipeline`.
```ts
export type ImagePreUploadPipelineInput = {
  rawBlob: Blob;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  compressionOptions?: ImageCompressionOptions;
  onProgress?: (state: UploadPipelineProgressState) => void;
};
```

2.3 Add `runImagePreUploadPipeline`:
```ts
export async function runImagePreUploadPipeline(
  input: ImagePreUploadPipelineInput,
): Promise<ImagePreUploadResult> {
  const compressionOptions = input.compressionOptions ?? DEFAULT_IMAGE_COMPRESSION_OPTIONS;

  input.onProgress?.('compressing');
  const compressedImage = await compressImageForUpload(input.rawBlob, compressionOptions);

  input.onProgress?.('requesting_upload_url');
  const uploadData = await requestImageUploadUrl({
    entity_type: input.entityType,
    entity_client_id: input.entityClientId,
    file_name: compressedImage.fileName,
    content_type: compressedImage.contentType,
    file_size_bytes: compressedImage.fileSizeBytes,
  });

  input.onProgress?.('uploading');
  await uploadBlobToSignedUrl({
    uploadUrl: uploadData.upload_url,
    blob: compressedImage.blob,
    contentType: compressedImage.contentType,
  });

  return {
    pendingUploadClientId: uploadData.pending_upload_client_id,
    widthPx: compressedImage.widthPx,
    heightPx: compressedImage.heightPx,
  };
}
```

2.4 Refactor `runImageUploadPipeline` to delegate. No cast needed — `ImagePreUploadPipelineInput.onProgress` now accepts the same `UploadPipelineProgressState` union as `ImageUploadPipelineInput.onProgress`.
```ts
export async function runImageUploadPipeline(input: ImageUploadPipelineInput): Promise<Image> {
  const preUploadResult = await runImagePreUploadPipeline({
    rawBlob: input.rawBlob,
    entityType: input.entityType,
    entityClientId: input.entityClientId,
    compressionOptions: input.compressionOptions,
    onProgress: input.onProgress,
  });

  input.onProgress?.('confirming');
  const image = await confirmImageUpload({
    pending_upload_client_id: preUploadResult.pendingUploadClientId,
    entity_type: input.entityType,
    entity_client_id: input.entityClientId,
  });

  input.onProgress?.('completed');
  return image;
}
```

No changes to `ImageUploadPipelineInput` — it stays as-is.

---

### Step 3 — `api/confirm-image-upload-batch.ts`: new file

**File:** `src/features/images/api/confirm-image-upload-batch.ts`

```ts
import { apiClient } from '@/lib/api-client';
import {
  ConfirmImageUploadBatchEnvelopeSchema,
  ConfirmImageUploadBatchResponseSchema,
} from '../types';
import type { ConfirmImageUploadBatchItem, Image } from '../types';

export class ConfirmImageUploadBatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfirmImageUploadBatchValidationError';
  }
}

function validateBatchItems(items: ConfirmImageUploadBatchItem[]): void {
  const imageClientIds = items
    .map((item) => item.image_client_id)
    .filter((id): id is string => id !== undefined);
  const pendingIds = items.map((item) => item.pending_upload_client_id);

  const dupImageClientId = imageClientIds.find(
    (id, index) => imageClientIds.indexOf(id) !== index,
  );
  if (dupImageClientId) {
    throw new ConfirmImageUploadBatchValidationError(
      `Duplicate image_client_id in batch: ${dupImageClientId}`,
    );
  }

  const dupPendingId = pendingIds.find(
    (id, index) => pendingIds.indexOf(id) !== index,
  );
  if (dupPendingId) {
    throw new ConfirmImageUploadBatchValidationError(
      `Duplicate pending_upload_client_id in batch: ${dupPendingId}`,
    );
  }
}

export async function confirmImageUploadBatch(
  items: ConfirmImageUploadBatchItem[],
): Promise<Image[]> {
  validateBatchItems(items);

  const parsedBody = ConfirmImageUploadBatchEnvelopeSchema.parse({ items });
  const response = await apiClient.post(
    '/api/v1/images/confirm-upload',
    ConfirmImageUploadBatchResponseSchema,
    parsedBody,
  );
  return response.data.images;
}
```

---

### Step 4 — `actions/use-confirm-image-upload-batch.ts`: new file

**File:** `src/features/images/actions/use-confirm-image-upload-batch.ts`

Follows `08_hooks.md` action hook shape. Batch is atomic: one failure → all fail. No optimistic update (instances don't exist in TanStack Query cache until confirmed).

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/lib/notify';
import { imageKeys } from '../api/image-keys';
import { confirmImageUploadBatch } from '../api/confirm-image-upload-batch';

export function useConfirmImageUploadBatch() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: confirmImageUploadBatch,
    onSuccess: (images) => {
      images.forEach((image) => {
        queryClient.setQueryData(imageKeys.detail(image.client_id), image);
      });
    },
    onError: () => {
      notify.error(
        'Batch confirm failed',
        'All uploads in this batch were rolled back. Please retry.',
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
    },
  });

  return {
    confirmBatch: mutation.mutate,
    confirmBatchAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    variables: mutation.variables,
    reset: mutation.reset,
  };
}
```

---

### Step 5 — `controllers/use-entity-images.controller.ts`: deferred upload path

**File:** `src/features/images/controllers/use-entity-images.controller.ts`

#### Behavioral contract (must match all three scenarios exactly)

**Scenario A — Done before upload finishes:**
1. `uploadImage` starts `startUploadDeferred` in background (blob is still uploading).
2. Editor opens. User annotates, presses Done.
3. Editor calls `onDeferredConfirm(annotations)` → controller stores annotations in `capturedAnnotationsRef` → returns immediately (synchronous, no await).
4. Editor closes immediately.
5. Background: `runImagePreUploadPipeline` completes → completion handler checks `capturedAnnotationsRef` → finds stored annotations → fires `runDeferredConfirm` → image tile shows `'confirming'` → `'completed'`.

**Scenario B — Upload finishes before Done:**
1. `uploadImage` starts `startUploadDeferred` in background.
2. Editor opens. Pre-upload completes → optimistic image patches to `'pre_confirm'`. Annotations not stored yet.
3. User annotates, presses Done.
4. Editor calls `onDeferredConfirm(annotations)` → controller stores annotations in `capturedAnnotationsRef` → immediately calls `runDeferredConfirm` (upload is done) → returns immediately.
5. Editor closes immediately. Confirm fires in background. Tile shows `'confirming'` → `'completed'`.

**Key invariant:** `onDeferredConfirm` is **synchronous** (returns `void`, not `Promise<void>`). The editor never awaits it.

#### 5.1 Update `ImageEditorSurfaceProps`

```ts
export type ImageEditorSurfaceProps = {
  image: ImageViewModel;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  isDirectCaptureSession?: boolean;
  onSaveComplete?: () => void;
  onCancelCapture?: (imageClientId: string) => Promise<void> | void;
  onDeferredConfirm?: (annotations: ImageAnnotationItemData[]) => void;  // sync, fire-and-forget
};
```

Add the missing import at the top of the file:
```ts
import type { ImageAnnotationItemData } from '../types';
import { runImagePreUploadPipeline, type ImagePreUploadResult } from '../lib/image-upload-pipeline';
import { confirmImageUpload } from '../api/confirm-image-upload';
```

#### 5.2 Add refs

After the existing `uploadRetrySourcesRef` and `pendingDeleteModesRef` declarations:

```ts
// Stores pre-upload results (pendingUploadClientId + dimensions) once upload completes.
// Used by runDeferredConfirm to build the confirm-upload payload.
const preUploadResultsRef = useRef(new Map<string, ImagePreUploadResult>());

// Stores annotations captured at Done time. Set before upload may have finished.
// The completion handler checks this to trigger confirm automatically (Scenario A).
const capturedAnnotationsRef = useRef(new Map<string, ImageAnnotationItemData[]>());
```

#### 5.3 Add `runDeferredConfirm`

This private async helper fires the confirm-upload call. Called from two places: the pre-upload completion handler (Scenario A) and `onDeferredConfirm` when the upload is already done (Scenario B).

```ts
const runDeferredConfirm = useCallback(
  (
    imageClientId: string,
    annotations: ImageAnnotationItemData[],
    preUploadResult: ImagePreUploadResult,
    fallbackDisplayOrder: number,
  ): void => {
    patchOptimisticImage(entityKey, imageClientId, { uploadState: 'confirming' });

    void confirmImageUpload({
      pending_upload_client_id: preUploadResult.pendingUploadClientId,
      entity_type: entityType,
      entity_client_id: entityClientId,
      image_client_id: imageClientId,
      width_px: preUploadResult.widthPx,
      height_px: preUploadResult.heightPx,
      image_annotations:
        annotations.length > 0
          ? (annotations as unknown as Record<string, unknown>[])
          : undefined,
    })
      .then(async (confirmedImage) => {
        const currentImage = useImagesStore
          .getState()
          .optimisticImages[entityKey]?.find((img) => img.clientId === imageClientId);

        if (currentImage?.uploadState === 'delete_requested') {
          const deleteOptions = pendingDeleteModesRef.current.get(imageClientId);
          revokeLocalObjectUrl(currentImage);
          clearRetrySource(imageClientId);
          removeOptimisticImage(entityKey, imageClientId);

          if (deleteOptions?.hardDelete) {
            void deleteAction
              .deleteImageWithOptionsAsync({ imageClientId: confirmedImage.client_id, hardDelete: true })
              .then(() => onImagesChanged?.());
          } else {
            void unlinkAction
              .unlinkImageAsync({
                image_client_id: confirmedImage.client_id,
                entity_type: entityType,
                entity_client_id: entityClientId,
              })
              .then(() => onImagesChanged?.());
          }
          return;
        }

        revokeLocalObjectUrl(currentImage);
        clearRetrySource(imageClientId);
        patchOptimisticImage(
          entityKey,
          imageClientId,
          toConfirmedOptimisticViewModel(
            confirmedImage,
            entityType,
            entityClientId,
            currentImage?.displayOrder ?? fallbackDisplayOrder,
          ),
        );

        await invalidateEntityImages();
      })
      .catch((error: unknown) => {
        patchOptimisticImage(entityKey, imageClientId, {
          uploadState: 'failed',
          uploadError: error instanceof Error ? error.message : 'Confirm failed.',
        });
      });
  },
  [
    clearRetrySource,
    deleteAction,
    entityClientId,
    entityKey,
    entityType,
    invalidateEntityImages,
    onImagesChanged,
    patchOptimisticImage,
    removeOptimisticImage,
    unlinkAction,
  ],
);
```

#### 5.4 Add `startUploadDeferred`

Runs the pre-upload pipeline (compress → request URL → upload blob). On completion, either triggers confirm immediately (if annotations were already captured — Scenario A) or patches state to `'pre_confirm'` and waits (Scenario B).

```ts
const startUploadDeferred = useCallback(
  ({
    imageClientId,
    rawBlob,
    fallbackDisplayOrder,
  }: {
    imageClientId: string;
    rawBlob: Blob;
    fallbackDisplayOrder: number;
  }): void => {
    void runImagePreUploadPipeline({
      rawBlob,
      entityType,
      entityClientId,
      onProgress: (progressState) => {
        patchOptimisticImage(entityKey, imageClientId, { uploadState: progressState });
      },
    })
      .then((result) => {
        const currentImage = useImagesStore
          .getState()
          .optimisticImages[entityKey]?.find((img) => img.clientId === imageClientId);

        if (currentImage?.uploadState === 'delete_requested') {
          // User deleted before upload finished. Instance was never created, so just clean up.
          revokeLocalObjectUrl(currentImage);
          clearRetrySource(imageClientId);
          removeOptimisticImage(entityKey, imageClientId);
          return;
        }

        // Store pre-upload result for use by runDeferredConfirm.
        preUploadResultsRef.current.set(imageClientId, result);

        // Scenario A: user already pressed Done — annotations are waiting.
        const pendingAnnotations = capturedAnnotationsRef.current.get(imageClientId);
        if (pendingAnnotations !== undefined) {
          capturedAnnotationsRef.current.delete(imageClientId);
          runDeferredConfirm(imageClientId, pendingAnnotations, result, fallbackDisplayOrder);
          return;
        }

        // Scenario B: user hasn't pressed Done yet. Update state so the tile reflects readiness.
        patchOptimisticImage(entityKey, imageClientId, {
          uploadState: 'pre_confirm',
          pendingUploadClientId: result.pendingUploadClientId,
          widthPx: result.widthPx,
          heightPx: result.heightPx,
        });
      })
      .catch((error: unknown) => {
        const currentImage = useImagesStore
          .getState()
          .optimisticImages[entityKey]?.find((img) => img.clientId === imageClientId);

        if (currentImage?.uploadState === 'delete_requested') {
          revokeLocalObjectUrl(currentImage);
          clearRetrySource(imageClientId);
          removeOptimisticImage(entityKey, imageClientId);
          return;
        }

        patchOptimisticImage(entityKey, imageClientId, {
          uploadState: 'failed',
          uploadError: error instanceof Error ? error.message : 'Upload failed.',
        });
      });
  },
  [
    clearRetrySource,
    entityClientId,
    entityKey,
    entityType,
    patchOptimisticImage,
    removeOptimisticImage,
    runDeferredConfirm,
  ],
);
```

#### 5.5 Add `buildDeferredConfirmCallback`

Returns the `onDeferredConfirm` function that the editor calls on Done. Synchronous — stores annotations, triggers confirm if upload is already done, returns immediately.

```ts
const buildDeferredConfirmCallback = useCallback(
  (imageClientId: string, fallbackDisplayOrder: number) =>
    (annotations: ImageAnnotationItemData[]): void => {
      // Always store annotations so the pre-upload completion handler can find them (Scenario A).
      capturedAnnotationsRef.current.set(imageClientId, annotations);

      // Scenario B: pre-upload already completed — trigger confirm immediately.
      const preUploadResult = preUploadResultsRef.current.get(imageClientId);
      if (preUploadResult !== undefined) {
        capturedAnnotationsRef.current.delete(imageClientId);
        runDeferredConfirm(imageClientId, annotations, preUploadResult, fallbackDisplayOrder);
      }
      // Scenario A: upload still in progress — startUploadDeferred completion handler will
      // find the stored annotations and call runDeferredConfirm when it finishes.
    },
  [runDeferredConfirm],
);
```

#### 5.6 Modify `uploadImage` to branch on `captureFlow`

```ts
const uploadImage = useCallback(
  (rawBlob: Blob) => {
    const optimisticClientId = generateClientId('Image');
    const localObjectUrl = URL.createObjectURL(rawBlob);
    const maxDisplayOrder = images.reduce(
      (maxValue, image) => Math.max(maxValue, image.displayOrder),
      -1,
    );
    const optimisticImage: ImageViewModel = {
      clientId: optimisticClientId,
      linkClientId: null,
      entityType,
      entityClientId,
      imageUrl: localObjectUrl,
      localObjectUrl,
      displayOrder: maxDisplayOrder + 1,
      widthPx: null,
      heightPx: null,
      fileSizeBytes: rawBlob.size,
      createdAt: new Date().toISOString(),
      uploadState: 'captured',
      isOptimistic: true,
      isDeleted: false,
      pendingUploadClientId: null,
      uploadError: null,
      annotation: null,
      annotations: [],
    };

    insertOptimisticImage(entityKey, optimisticImage);
    uploadRetrySourcesRef.current.set(optimisticClientId, rawBlob);

    if (captureFlow === 'camera-to-editor') {
      startUploadDeferred({
        imageClientId: optimisticClientId,
        rawBlob,
        fallbackDisplayOrder: maxDisplayOrder + 1,
      });
    } else {
      startUpload({
        imageClientId: optimisticClientId,
        rawBlob,
        fallbackDisplayOrder: maxDisplayOrder + 1,
      });
    }

    return optimisticImage;
  },
  [
    captureFlow,
    images,
    insertOptimisticImage,
    startUpload,
    startUploadDeferred,
    entityClientId,
    entityKey,
    entityType,
  ],
);
```

#### 5.7 Modify `openEditorForCapturedImage` to pass `onDeferredConfirm`

```ts
const openEditorForCapturedImage = useCallback(
  (capturedImage: ImageViewModel) => {
    surface.open(IMAGE_EDITOR_SURFACE_ID, {
      image: capturedImage,
      entityType,
      entityClientId,
      isDirectCaptureSession: true,
      onSaveComplete: () => {
        useSurfaceStore
          .getState()
          .closeMany([IMAGE_EDITOR_SURFACE_ID, IMAGE_CAMERA_SURFACE_ID]);
      },
      onCancelCapture: (imageClientId: string) => {
        deleteImage(imageClientId, { hardDelete: true });
      },
      onDeferredConfirm: buildDeferredConfirmCallback(
        capturedImage.clientId,
        capturedImage.displayOrder,
      ),
    } satisfies ImageEditorSurfaceProps);
  },
  [buildDeferredConfirmCallback, deleteImage, entityClientId, entityType, surface],
);
```

#### 5.8 Extend `clearRetrySource` to clean up the new refs

```ts
const clearRetrySource = useCallback((imageClientId: string) => {
  uploadRetrySourcesRef.current.delete(imageClientId);
  pendingDeleteModesRef.current.delete(imageClientId);
  preUploadResultsRef.current.delete(imageClientId);
  capturedAnnotationsRef.current.delete(imageClientId);
}, []);
```

The existing unmount effect already iterates `optimisticImages` and calls `clearRetrySource` — no additional cleanup needed for the new refs.

---

### Step 6 — `pages/ImageEditorPage.tsx`: deferred confirm branch

**File:** `src/features/images/pages/ImageEditorPage.tsx`

#### 6.1 Extend destructured surface props and disable `useImageQuery` in deferred mode

```ts
const { image, isDirectCaptureSession, onSaveComplete, onCancelCapture, onDeferredConfirm } =
  useSurfaceProps<ImageEditorSurfaceProps>();
```

No new import needed — `ImageAnnotationItemData` is already in scope via the existing union type import from `'../types'`.

**Disable `useImageQuery` when in deferred mode.** When `onDeferredConfirm` is provided the backend instance does not exist yet — querying by the optimistic client ID would produce repeated 404 requests. Pass `undefined` to disable the query:

```ts
// Before:
const { data: freshImage } = useImageQuery(image?.clientId);

// After:
const { data: freshImage } = useImageQuery(
  onDeferredConfirm !== undefined ? undefined : image?.clientId,
);
```

`useImageQuery` already handles `undefined` input by disabling the query (same as the existing `image?.clientId` guard when `image` is absent).

#### 6.2 Update `isAnnotationUnavailable`

The current guard `uploadState !== 'completed'` blocks annotation during deferred mode. Replace:

```ts
// Before:
const isAnnotationUnavailable =
  !currentImage || currentImage.uploadState !== 'completed';

// After:
const isAnnotationUnavailable =
  !currentImage ||
  (currentImage.uploadState !== 'completed' &&
    currentImage.uploadState !== 'pre_confirm' &&
    onDeferredConfirm === undefined);
```

When `onDeferredConfirm` is provided, the editor was opened in deferred capture mode and always has a local blob URL to display — annotation is always available.

#### 6.3 Branch `handleSaveAndClose` for deferred path

**Critical:** the deferred branch must NOT `await` the callback. `onDeferredConfirm` is synchronous. The editor closes immediately in both scenarios.

Replace the annotation-persist block:

```ts
// REMOVE:
const payload = buildImageAnnotationPayload(finalSessionItems);

if (!payload || finalSessionItems.length === 0) {
  useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
  completeSaveFlow();
  return;
}

await createAnnotationAsync({
  image_client_id: currentImage.clientId,
  annotation_type: payload.annotationType,
  data: payload.data,
});

// REPLACE WITH:
if (onDeferredConfirm) {
  // Synchronous: stores annotations + triggers confirm in background. Editor closes immediately.
  onDeferredConfirm(finalSessionItems);
  useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
  completeSaveFlow();
  return;
}

// Scenario C: existing persisted image — use annotation mutation endpoint directly.
const payload = buildImageAnnotationPayload(finalSessionItems);

if (!payload || finalSessionItems.length === 0) {
  useSurfaceStore.getState().close(IMAGE_EDITOR_DISCARD_CHANGES_SURFACE_ID);
  completeSaveFlow();
  return;
}

await createAnnotationAsync({
  image_client_id: currentImage.clientId,
  annotation_type: payload.annotationType,
  data: payload.data,
});
```

#### 6.4 Update `handleSaveAndClose` dependency array

```ts
}, [
  activeTextTarget,
  applyTextItemUpdate,
  completeSaveFlow,
  commitMove,
  createAnnotationAsync,
  currentImage,
  onDeferredConfirm,   // ← add
  resetTextDraft,
  sessionItems,
  textAnchor,
  textValue,
]);
```

#### 6.5 Remove `isPending` from the Done button disabled/loading state in the deferred path

Currently `isSaving={isPending || isCancelingCapture}` passes `isPending` from `useCreateImageAnnotation`. In the deferred path, `createAnnotationAsync` is never called so `isPending` is irrelevant — but it causes no harm since it will always be `false` in deferred mode. No change required.

---

### Step 7 — Tests

**Files to update / create:**
- `src/features/images/lib/image-upload-pipeline.test.ts` — add test for `runImagePreUploadPipeline`: verifies it returns `{ pendingUploadClientId, widthPx, heightPx }` and does NOT call `confirmImageUpload`.
- `src/features/images/api/confirm-image-upload-batch.ts` (test inline or new test file) — add test for duplicate-ID pre-validation: confirms `ConfirmImageUploadBatchValidationError` is thrown before the API call.
- `src/features/images/controllers/use-entity-images.controller.test.tsx` — add test asserting that in `camera-to-editor` captureFlow, `uploadImage` calls `runImagePreUploadPipeline` (not the full pipeline), and the returned optimistic image eventually reaches `'pre_confirm'` state.

---

## Risks and mitigations

- **Risk:** Scenario A race — `startUploadDeferred` completion handler fires between `capturedAnnotationsRef.set` and the check in the handler, leading to a missed trigger.
  **Mitigation:** JavaScript is single-threaded. The `.then()` callback and the `buildDeferredConfirmCallback` call cannot interleave. The check-then-act sequence is safe without locks.

- **Risk:** Controller unmounts while a deferred confirm is still in flight (user navigates away).
  **Mitigation:** `clearRetrySource` (called in the unmount cleanup) removes entries from both `preUploadResultsRef` and `capturedAnnotationsRef`. The in-flight `confirmImageUpload` fetch will complete but `patchOptimisticImage` will be a no-op on stale state (the store entry was removed). No crash, no stale UI.

- **Risk:** `image_annotations` type mismatch — frontend `ImageAnnotationItemData[]` vs backend's expected annotation items.
  **Mitigation:** The `image_annotations` field is typed as `z.array(z.record(z.string(), z.unknown()))` in the schema to remain open. The cast `annotations as unknown as Record<string, unknown>[]` in the controller handles the conversion without losing data. The backend already accepts the same shapes via `createAnnotationAsync`.

- **Risk:** Regression in the non-deferred path (`camera-to-viewer` or grid-triggered upload).
  **Mitigation:** `uploadImage` only calls `startUploadDeferred` when `captureFlow === 'camera-to-editor'`. All other flows use the unchanged `startUpload`. `runImageUploadPipeline` is refactored but behaviorally identical.

- **Risk:** `retryImageUpload` on a `pre_confirm` image could re-run the full non-deferred pipeline. **Do NOT add `'pre_confirm'` to `isUploadingState`** — doing so would make `deleteImage` set `delete_requested` on a `pre_confirm` image and then wait for a completion handler that has already finished, leaving the image stuck forever. The cancel path already works correctly without it: `pre_confirm` is not in `isUploadingState`, so `deleteImage` falls through to `revokeLocalObjectUrl` + `clearRetrySource` (which removes both new refs) + `removeOptimisticImage` + early return before any server call (since `uploadState !== 'completed'`). For retry: the retry button is only shown on `'failed'` images in the UI, so `pre_confirm` images will never reach `retryImageUpload` in practice.

- **Risk:** Cancel (via `onCancelCapture`) while the image is at `pre_confirm` but confirm hasn't fired yet — the instance was never created so a server delete is not needed.
  **Mitigation:** `deleteImage` with `hardDelete: true` is called. If the image is at `pre_confirm`, no confirm has been sent, so there is no server instance to delete. The local optimistic image is removed immediately. `clearRetrySource` cleans up both refs.

- **Risk:** Done pressed twice (race) creates duplicate entries in `capturedAnnotationsRef`.
  **Mitigation:** `onSaveComplete` closes the editor surface, making a second Done tap physically impossible — the editor is gone.

---

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- `npm run test -- --grep "image-upload-pipeline"`: `runImagePreUploadPipeline` test passes; existing pipeline test unchanged.
- `npm run test -- --grep "confirm-image-upload-batch"`: duplicate-ID pre-validation tests pass.
- `npm run test -- --grep "use-entity-images.controller"`:
  - Scenario A: Done fires before pre-upload mock resolves → editor closes immediately → confirm fires only after mock resolves → payload contains annotations.
  - Scenario B: pre-upload mock resolves before Done fires → Done triggers confirm immediately → editor closes.
  - Confirm payload never contains `file_size_bytes`.
  - `camera-to-viewer` flow: full pipeline runs (no deferred split), no regression.
- Manual smoke (Scenario A): capture → annotate quickly → tap Done → editor closes → tile shows uploading → uploading finishes → tile shows confirming → completed. Network tab: confirm-upload fires AFTER the blob PUT, carries `image_client_id`, `width_px`, `height_px`, `image_annotations`.
- Manual smoke (Scenario B): capture → wait for upload indicator to clear → annotate → tap Done → editor closes immediately → tile briefly shows confirming → completed. Network tab: confirm-upload fires after Done tap, same payload shape.
- Manual smoke (Scenario C): open existing saved image → annotate → Done → network tab shows annotation mutation call, NOT confirm-upload. No regression.

---

## Review log

- `2026-05-27T13:32:23Z` — Implemented deferred pre-upload + background confirm flow across image schemas, pipeline, controller, and editor.
- `2026-05-27T13:32:23Z` — Added focused Vitest coverage for pre-upload, batch validation, and deferred confirm payload sequencing.
- `2026-05-27T13:32:23Z` — Validation passed: `npm run typecheck`, focused Vitest suite for touched image files.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
