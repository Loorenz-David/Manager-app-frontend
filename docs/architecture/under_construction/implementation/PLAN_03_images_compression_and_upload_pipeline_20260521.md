# PLAN_03_images_compression_and_upload_pipeline_20260521

## Metadata

- Plan ID: `PLAN_03_images_compression_and_upload_pipeline_20260521`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01_images_contracts_dtos_and_api_client_20260521`

## Goal and intent

- Goal: Build the reusable client-side image compression pipeline and the full async upload orchestration pipeline. These are pure utility functions — no React, no hooks, no TanStack Query. They are called by the controller (PLAN_04).
- Business/user intent: Captured images must be compressed to WebP before upload. The raw camera blob must never be sent to the backend — only the compressed, resized output. The upload pipeline must sequence: compress → request upload URL → upload to storage → confirm upload.
- Non-goals: Optimistic state management (PLAN_04), camera UI (PLAN_06), React hooks, TanStack Query.

## Scope

- In scope:
  - `src/features/images/lib/compress-image-for-upload.ts` — crop, resize, convert to WebP using canvas APIs
  - `src/features/images/lib/build-compressed-image-filename.ts` — deterministic filename generation
  - `src/features/images/lib/image-upload-pipeline.ts` — async pipeline function that sequences compress → request URL → upload → confirm
- Out of scope: Camera stream, TanStack Query mutations, React hooks, Zustand store, UI components.
- Assumptions:
  - The browser supports `canvas.toBlob()` with `image/webp`. On Safari < 16, WebP canvas export may silently fall back to PNG. The pipeline should detect this and still proceed (PLAN_06 can warn the user if needed).
  - `base64` conversion is explicitly forbidden — use `Blob` and object URLs only.
  - The pipeline is called from the controller (PLAN_04) with a raw `Blob` from the camera canvas or a file input.

## Clarifications required

- [x] Upload-URL request must happen AFTER compression because the backend requires `file_name`, `content_type`, and `file_size_bytes` of the final compressed file, not the raw capture.
- [x] `localObjectUrl` for the optimistic image is created BEFORE compression starts (from the raw capture blob) so the UI shows a preview immediately. The optimistic image is inserted by the controller, not by this pipeline.

## Acceptance criteria

1. `compressImageForUpload` accepts a raw `Blob`, compression options, and returns `{ blob: Blob, fileName: string, contentType: string, fileSizeBytes: number, widthPx: number, heightPx: number }`.
2. Output is always `image/webp` unless the browser silently produces a different MIME type (detected and logged).
3. The 1:1 crop centers the image and clips to a square.
4. `buildCompressedImageFileName` returns a deterministic name like `img_{uuid}.webp`.
5. `runImageUploadPipeline` resolves with the confirmed `Image` from PLAN_01.
6. `runImageUploadPipeline` throws if any step fails — no silent failures.
7. Zero base64 usage.
8. No React imports. These are pure browser utilities.
9. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: general conventions
- `architecture/02_types.md`: TypeScript patterns
- `architecture/15_feature_structure.md`: utility placement within feature
- `architecture/18_performance.md`: avoid storing large blobs in state, use object URLs, revoke when done

### Local extensions loaded

- None for this plan.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/types.ts` — verify `Image` type and `RequestImageUploadUrlInput` type from PLAN_01.
- `src/features/images/api/request-image-upload-url.ts` — verify function signature.
- `src/features/images/api/upload-blob-to-signed-url.ts` — verify function signature.
- `src/features/images/api/confirm-image-upload.ts` — verify function signature.

Prohibited reads:
- Any other feature's compression or upload utilities — no relevant patterns exist.

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 1 — Create `src/features/images/lib/build-compressed-image-filename.ts`

```ts
export function buildCompressedImageFileName(extension = 'webp'): string {
  return `img_${crypto.randomUUID()}.${extension}`;
}
```

### Step 2 — Create `src/features/images/lib/compress-image-for-upload.ts`

This is the core compression utility. It uses only browser canvas APIs.

**Default compression options:**

```ts
export type ImageCompressionOptions = {
  maxWidthPx: number;
  maxHeightPx: number;
  quality: number;
  mimeType: string;
  outputExtension: string;
};

export const DEFAULT_IMAGE_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxWidthPx: 1600,
  maxHeightPx: 1600,
  quality: 0.82,
  mimeType: 'image/webp',
  outputExtension: 'webp',
};
```

**Result type:**

```ts
export type CompressedImageResult = {
  blob: Blob;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  widthPx: number;
  heightPx: number;
};
```

**Implementation:**

```ts
import { buildCompressedImageFileName } from './build-compressed-image-filename';

export async function compressImageForUpload(
  rawBlob: Blob,
  options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
): Promise<CompressedImageResult> {
  // 1. Decode the raw blob into an ImageBitmap
  const bitmap = await createImageBitmap(rawBlob);

  // 2. Compute 1:1 square crop (center crop)
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = Math.floor((bitmap.width - sourceSize) / 2);
  const sourceY = Math.floor((bitmap.height - sourceSize) / 2);

  // 3. Compute output dimensions (scale down if needed, maintain square)
  const outputSize = Math.min(sourceSize, options.maxWidthPx, options.maxHeightPx);

  // 4. Draw onto canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(
    bitmap,
    sourceX,      // source x
    sourceY,      // source y
    sourceSize,   // source width
    sourceSize,   // source height
    0,            // dest x
    0,            // dest y
    outputSize,   // dest width
    outputSize,   // dest height
  );

  bitmap.close(); // release memory

  // 5. Convert to Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('canvas.toBlob returned null — format may be unsupported'));
          return;
        }
        resolve(result);
      },
      options.mimeType,
      options.quality,
    );
  });

  const fileName = buildCompressedImageFileName(options.outputExtension);

  return {
    blob,
    fileName,
    contentType: blob.type || options.mimeType, // blob.type reflects actual output
    fileSizeBytes: blob.size,
    widthPx: outputSize,
    heightPx: outputSize,
  };
}
```

**Notes for Codex:**
- `createImageBitmap` is available in all modern browsers and handles JPEG, PNG, WebP, HEIC (on Safari 17+). Do not use `new Image()` + `onload` pattern — `createImageBitmap` is cleaner and avoids memory leaks.
- `bitmap.close()` is essential to release GPU memory after drawing.
- `canvas.toBlob` is async. The Promise wrapper is the correct pattern.
- `blob.type` may differ from `options.mimeType` if the browser does not support the requested MIME type. The returned `contentType` reflects the actual output — use it for the upload URL request.

### Step 3 — Create `src/features/images/lib/image-upload-pipeline.ts`

This is the sequenced async pipeline. It orchestrates: compress → request upload URL → upload → confirm.

**Input type:**

```ts
import type { ImageCompressionOptions } from './compress-image-for-upload';
import type { ImageLinkEntityType, Image } from '../types';

export type ImageUploadPipelineInput = {
  rawBlob: Blob;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  compressionOptions?: ImageCompressionOptions;
  onProgress?: (state: UploadPipelineProgressState) => void;
};

export type UploadPipelineProgressState =
  | 'compressing'
  | 'requesting_upload_url'
  | 'uploading'
  | 'confirming'
  | 'completed';
```

**Implementation:**

```ts
import { compressImageForUpload, DEFAULT_IMAGE_COMPRESSION_OPTIONS } from './compress-image-for-upload';
import { requestImageUploadUrl } from '../api/request-image-upload-url';
import { uploadBlobToSignedUrl } from '../api/upload-blob-to-signed-url';
import { confirmImageUpload } from '../api/confirm-image-upload';

export async function runImageUploadPipeline(
  input: ImageUploadPipelineInput,
): Promise<Image> {
  const options = input.compressionOptions ?? DEFAULT_IMAGE_COMPRESSION_OPTIONS;

  // Step A — Compress
  input.onProgress?.('compressing');
  const compressed = await compressImageForUpload(input.rawBlob, options);

  // Step B — Request upload URL (must happen AFTER compression — backend needs final file metadata)
  input.onProgress?.('requesting_upload_url');
  const uploadUrlData = await requestImageUploadUrl({
    entity_type: input.entityType,
    entity_client_id: input.entityClientId,
    file_name: compressed.fileName,
    content_type: compressed.contentType,
    file_size_bytes: compressed.fileSizeBytes,
  });

  // Step C — Upload to signed URL (raw fetch, no auth headers)
  input.onProgress?.('uploading');
  await uploadBlobToSignedUrl({
    uploadUrl: uploadUrlData.upload_url,
    blob: compressed.blob,
    contentType: compressed.contentType,
  });

  // Step D — Confirm upload
  input.onProgress?.('confirming');
  const confirmedImage = await confirmImageUpload({
    pending_upload_client_id: uploadUrlData.pending_upload_client_id,
    entity_type: input.entityType,
    entity_client_id: input.entityClientId,
  });

  input.onProgress?.('completed');
  return confirmedImage;
}
```

**Notes for Codex:**
- This function does NOT manage optimistic state — that is entirely the controller's responsibility (PLAN_04).
- Caller (PLAN_04 controller) is responsible for creating the local object URL from `rawBlob` BEFORE calling this function — so the optimistic preview is visible while compression and upload run.
- Caller is responsible for revoking the object URL after the upload completes and the confirmed `image_url` is available.
- If any step throws, let the error propagate to the controller — do not swallow.

### Step 4 — Typecheck

Run `npm run typecheck`. Resolve any errors in the three files.

## Risks and mitigations

- Risk: `canvas.toBlob` returns `null` in some environments (e.g., workers, headless tests).
  Mitigation: Throw a descriptive error. The controller (PLAN_04) catches it and marks the image as `failed`.

- Risk: `createImageBitmap` is not available in all test environments.
  Mitigation: Unit tests for `compressImageForUpload` should mock `createImageBitmap` and `HTMLCanvasElement.prototype.toBlob`. See PLAN_12 for test stubs.

- Risk: WebP encoding quality varies across browsers. Safari produces WebP via canvas since Safari 16.
  Mitigation: Use `blob.type` (not `options.mimeType`) as the `contentType` for the upload URL request, so the backend receives the actual MIME type if it differs.

- Risk: Large raw blobs held in memory during compression.
  Mitigation: `bitmap.close()` is called immediately after drawing. The `rawBlob` reference is not stored beyond the pipeline function's execution. The caller revokes the object URL when done.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Unit tests (PLAN_12): `compressImageForUpload` with mocked canvas — verify output dimensions, 1:1 crop, WebP content type.
- Unit tests (PLAN_12): `runImageUploadPipeline` with mocked API functions — verify step order, verify upload URL request uses compressed metadata (not raw blob size).

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
