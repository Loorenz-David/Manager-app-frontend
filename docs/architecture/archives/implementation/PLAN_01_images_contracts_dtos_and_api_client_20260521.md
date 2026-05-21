# PLAN_01_images_contracts_dtos_and_api_client_20260521

## Metadata

- Plan ID: `PLAN_01_images_contracts_dtos_and_api_client_20260521`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T21:19:42Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`

## Goal and intent

- Goal: Build the complete backend contract and type-safe data layer for the Images feature — all Zod schemas, enums, DTOs, view model types, transformer functions, query key factory, and all raw API fetch/mutation functions.
- Business/user intent: Establish the foundation layer that every subsequent images plan depends on. No UI is built here. Any later plan that touches the network must import from this layer.
- Non-goals: TanStack Query hooks, action hooks, optimistic logic, UI components, camera, compression, surface registration.

## Scope

- In scope:
  - `src/features/images/types.ts` — all enum schemas, DTO schemas, request/response schemas, view model types, transformer functions
  - `src/features/images/api/image-keys.ts` — query key factory
  - `src/features/images/api/fetch-entity-images.ts` — GET /api/v1/images
  - `src/features/images/api/fetch-image.ts` — GET /api/v1/images/{image_client_id}
  - `src/features/images/api/request-image-upload-url.ts` — POST /api/v1/images/upload-url
  - `src/features/images/api/upload-blob-to-signed-url.ts` — direct PUT to external storage URL (no apiClient auth headers)
  - `src/features/images/api/confirm-image-upload.ts` — POST /api/v1/images/confirm-upload
  - `src/features/images/api/reorder-images.ts` — POST /api/v1/images/reorder
  - `src/features/images/api/unlink-image.ts` — DELETE /api/v1/images/links
  - `src/features/images/api/delete-image.ts` — DELETE /api/v1/images/{image_client_id}
  - `src/features/images/api/create-image-annotation.ts` — POST /api/v1/images/{image_client_id}/annotations
  - `src/features/images/api/fetch-image-download-url.ts` — GET /api/v1/images/{image_client_id}/download-url
- Out of scope: TanStack Query hooks, action hooks, optimistic state, Zustand stores, all UI, camera, surfaces.
- Assumptions:
  - `src/lib/api-client.ts` (apiClient) exists and follows `04_api_client.md` + `04_api_client_local.md`.
  - All responses follow the `{ ok: boolean, data: {...}, warnings: string[] }` envelope.
  - `upload-blob-to-signed-url` does a raw `fetch` PUT with `Content-Type` header — it does NOT use apiClient, because it calls an external signed URL that must not receive the app's auth token.

## Clarifications required

- [x] Backend endpoint contract is established — source: `docs/architecture/under_construction/intention/image_tables_and_endpoints.md`. No open questions.

## Acceptance criteria

1. `npm run typecheck` — zero TypeScript errors in the images feature.
2. All response schemas parse every documented field from `image_tables_and_endpoints.md` without `z.any()`.
3. Every API function is typed: input → `Promise<OutputType>`.
4. `imageKeys` factory covers `all`, `lists()`, `list(params)`, `details()`, `detail(id)`, `downloadUrl(id)`.
5. No UI, no hooks, no Zustand imports in this plan's files.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: overall project conventions
- `architecture/02_types.md`: Zod + inferred types rule
- `architecture/04_api_client.md`: apiClient usage, error handling
- `architecture/04_api_client_local.md`: flat error shape override, `{ ok, data, warnings }` envelope
- `architecture/13_errors.md`: ApiRequestError pattern
- `architecture/15_feature_structure.md`: feature folder layout, `types.ts` DTO structure
- `architecture/24_dto.md`: four DTO categories, transformation pipeline

### Local extensions loaded

- `architecture/04_api_client_local.md`: error shape is `{ error: string, ok: false }` — no `field_errors`, no `code` field; `codeFromStatus` derives the code from HTTP status. Success envelope is `{ ok: true, data: {...}, warnings: string[] }`.

### File read intent — pattern vs. relational

Permitted reads:
- `docs/architecture/under_construction/intention/image_tables_and_endpoints.md` — source of truth for all field names, enum values, response shapes.
- `src/lib/api-client.ts` — verify the existing apiClient export signature and error types.
- `src/types/api.ts` — verify ApiErrorSchema and ApiRequestError shapes already in the project.
- `src/features/items/types.ts` — verify the existing `z.object` + `z.infer` + `ClientIdSchema` pattern in use.
- `src/features/items/api/item-keys.ts` (or similar) — verify the existing query key factory pattern.

Prohibited reads:
- Any other feature's action hooks, controllers, or providers — patterns come from contracts.

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 1 — Read source of truth

Read `docs/architecture/under_construction/intention/image_tables_and_endpoints.md` in full. Extract every field name, type, enum value, and endpoint shape before writing any code. Do not invent field names.

### Step 2 — Create `src/features/images/types.ts`

Create a new file. Structure it in the four DTO sections defined by `24_dto.md`. Follow the exact order below.

**Section 1 — Enums (shared across DTOs)**

```ts
// ─── Enums ───────────────────────────────────────────────────────────────────

export const IMAGE_STORAGE_PROVIDER = ['s3', 'shopify', 'external'] as const;
export type ImageStorageProvider = (typeof IMAGE_STORAGE_PROVIDER)[number];

export const IMAGE_SOURCE_TYPE = ['uploaded', 'shopify_sync', 'generated'] as const;
export type ImageSourceType = (typeof IMAGE_SOURCE_TYPE)[number];

export const IMAGE_SOURCE_REFERENCE = ['s3_image_url', 'shopify_image_url'] as const;
export type ImageSourceReference = (typeof IMAGE_SOURCE_REFERENCE)[number];

export const IMAGE_EVENT_TYPE = [
  'upload_item_image',
  'upload_case_image',
  'upload_message_image',
] as const;
export type ImageEventType = (typeof IMAGE_EVENT_TYPE)[number];

export const IMAGE_EVENT_STATE = ['requested', 'in_progress', 'completed', 'failed'] as const;
export type ImageEventState = (typeof IMAGE_EVENT_STATE)[number];

export const IMAGE_EVENT_LAST_ERROR = [
  'upload_failed',
  'invalid_content_type',
  'storage_unavailable',
  'file_too_large',
  'virus_detected',
] as const;
export type ImageEventLastError = (typeof IMAGE_EVENT_LAST_ERROR)[number];

export const IMAGE_ANNOTATION_TYPE = [
  'draw',
  'arrow',
  'circle',
  'rectangle',
  'text',
  'measurement',
  'highlight',
] as const;
export type ImageAnnotationType = (typeof IMAGE_ANNOTATION_TYPE)[number];

export const IMAGE_LINK_ENTITY_TYPE = ['item', 'case', 'case_conversation_message'] as const;
export type ImageLinkEntityType = (typeof IMAGE_LINK_ENTITY_TYPE)[number];
```

**Section 2 — Response DTOs (what the backend returns, parsed with Zod)**

```ts
// ─── 1. Response DTOs ────────────────────────────────────────────────────────

export const ImageEventSchema = z.object({
  client_id: z.string(),
  event_type: z.enum(IMAGE_EVENT_TYPE),
  state: z.enum(IMAGE_EVENT_STATE),
  created_at: z.string().datetime({ offset: true }),
  last_error: z.enum(IMAGE_EVENT_LAST_ERROR).nullable().optional(),
});
export type ImageEvent = z.infer<typeof ImageEventSchema>;

export const ImageAnnotationSchema = z.object({
  client_id: z.string(),
  annotation_type: z.enum(IMAGE_ANNOTATION_TYPE),
  data: z.record(z.unknown()).nullable().optional(),
  accuracy: z.number().int().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
});
export type ImageAnnotation = z.infer<typeof ImageAnnotationSchema>;

export const ImageSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  storage_provider: z.enum(IMAGE_STORAGE_PROVIDER),
  source_type: z.enum(IMAGE_SOURCE_TYPE),
  source_reference: z.enum(IMAGE_SOURCE_REFERENCE).nullable().optional(),
  width_px: z.number().int().nullable().optional(),
  height_px: z.number().int().nullable().optional(),
  file_size_bytes: z.number().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
  last_event: ImageEventSchema.nullable().optional(),
  events: z.array(ImageEventSchema),
  image_annotation: ImageAnnotationSchema.nullable().optional(),
});
export type Image = z.infer<typeof ImageSchema>;

// EntityImage is one item in the list response — includes the link metadata
export const EntityImageSchema = z.object({
  link_client_id: z.string(),
  image: ImageSchema,
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  display_order: z.number().int(),
});
export type EntityImage = z.infer<typeof EntityImageSchema>;
```

**Section 3 — Request DTOs (what we send to the backend)**

```ts
// ─── 2. Request DTOs ─────────────────────────────────────────────────────────

export const ListEntityImagesParamsSchema = z.object({
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
});
export type ListEntityImagesParams = z.infer<typeof ListEntityImagesParamsSchema>;

export const RequestImageUploadUrlInputSchema = z.object({
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  file_name: z.string(),
  content_type: z.string(),
  file_size_bytes: z.number().int().optional(),
});
export type RequestImageUploadUrlInput = z.infer<typeof RequestImageUploadUrlInputSchema>;

export const ConfirmImageUploadInputSchema = z.object({
  pending_upload_client_id: z.string(),
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
});
export type ConfirmImageUploadInput = z.infer<typeof ConfirmImageUploadInputSchema>;

export const ReorderImagesInputSchema = z.object({
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
  ordered_image_client_ids: z.array(z.string()),
});
export type ReorderImagesInput = z.infer<typeof ReorderImagesInputSchema>;

export const UnlinkImageInputSchema = z.object({
  image_client_id: z.string(),
  entity_type: z.enum(IMAGE_LINK_ENTITY_TYPE),
  entity_client_id: z.string(),
});
export type UnlinkImageInput = z.infer<typeof UnlinkImageInputSchema>;

export const CreateImageAnnotationInputSchema = z.object({
  image_client_id: z.string(),
  annotation_type: z.enum(IMAGE_ANNOTATION_TYPE),
  data: z.record(z.unknown()),
  accuracy: z.number().int().optional(),
});
export type CreateImageAnnotationInput = z.infer<typeof CreateImageAnnotationInputSchema>;
```

**Section 4 — API Response Envelopes**

```ts
// ─── 3. API Response Envelope Schemas ────────────────────────────────────────

export const ListEntityImagesResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ images: z.array(EntityImageSchema) }),
  warnings: z.array(z.string()),
});
export type ListEntityImagesResponse = z.infer<typeof ListEntityImagesResponseSchema>;

export const GetImageResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ image: ImageSchema }),
  warnings: z.array(z.string()),
});
export type GetImageResponse = z.infer<typeof GetImageResponseSchema>;

export const RequestImageUploadUrlResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    upload_url: z.string(),
    pending_upload_client_id: z.string(),
    storage_key: z.string(),
    expires_in: z.number().int(),
  }),
  warnings: z.array(z.string()),
});
export type RequestImageUploadUrlResponse = z.infer<typeof RequestImageUploadUrlResponseSchema>;

export const ConfirmImageUploadResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ image: ImageSchema }),
  warnings: z.array(z.string()),
});
export type ConfirmImageUploadResponse = z.infer<typeof ConfirmImageUploadResponseSchema>;

export const ReorderImagesResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ reordered: z.number().int() }),
  warnings: z.array(z.string()),
});

export const UnlinkImageResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ unlinked: z.boolean() }),
  warnings: z.array(z.string()),
});

export const DeleteImageResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ client_id: z.string() }),
  warnings: z.array(z.string()),
});

export const CreateImageAnnotationResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ client_id: z.string() }),
  warnings: z.array(z.string()),
});

export const ImageDownloadUrlResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ download_url: z.string(), expires_in: z.number().int() }),
  warnings: z.array(z.string()),
});
```

**Section 5 — View Model types and transformers**

```ts
// ─── 4. View Models ───────────────────────────────────────────────────────────

// Upload states used by the optimistic controller (PLAN_04)
export const IMAGE_UPLOAD_STATE = [
  'idle',
  'captured',
  'compressing',
  'requesting_upload_url',
  'uploading',
  'confirming',
  'completed',
  'failed',
  'delete_requested',
  'deleting',
] as const;
export type ImageUploadState = (typeof IMAGE_UPLOAD_STATE)[number];

export type ImageAnnotationViewModel = {
  clientId: string;
  annotationType: ImageAnnotationType;
  data: Record<string, unknown> | null;
  accuracy: number | null;
  createdAt: string;
};

export type ImageViewModel = {
  clientId: string;
  linkClientId: string | null;
  entityType: ImageLinkEntityType | null;
  entityClientId: string | null;
  imageUrl: string;
  localObjectUrl: string | null;
  displayOrder: number;
  widthPx: number | null;
  heightPx: number | null;
  fileSizeBytes: number | null;
  createdAt: string | null;
  uploadState: ImageUploadState;
  isOptimistic: boolean;
  isDeleted: boolean;
  pendingUploadClientId: string | null;
  uploadError: string | null;
  annotation: ImageAnnotationViewModel | null;
};

export function toImageAnnotationViewModel(
  annotation: ImageAnnotation,
): ImageAnnotationViewModel {
  return {
    clientId: annotation.client_id,
    annotationType: annotation.annotation_type,
    data: annotation.data ?? null,
    accuracy: annotation.accuracy ?? null,
    createdAt: annotation.created_at,
  };
}

// Transforms a confirmed EntityImage (from server) into an ImageViewModel.
// Optimistic images are built differently by the controller — see PLAN_04.
export function toImageViewModel(entityImage: EntityImage): ImageViewModel {
  return {
    clientId: entityImage.image.client_id,
    linkClientId: entityImage.link_client_id,
    entityType: entityImage.entity_type,
    entityClientId: entityImage.entity_client_id,
    imageUrl: entityImage.image.image_url,
    localObjectUrl: null,
    displayOrder: entityImage.display_order,
    widthPx: entityImage.image.width_px ?? null,
    heightPx: entityImage.image.height_px ?? null,
    fileSizeBytes: entityImage.image.file_size_bytes ?? null,
    createdAt: entityImage.image.created_at,
    uploadState: 'completed',
    isOptimistic: false,
    isDeleted: false,
    pendingUploadClientId: null,
    uploadError: null,
    annotation: entityImage.image.image_annotation
      ? toImageAnnotationViewModel(entityImage.image.image_annotation)
      : null,
  };
}
```

### Step 3 — Create `src/features/images/api/image-keys.ts`

```ts
import type { ListEntityImagesParams } from '../types';

export const imageKeys = {
  all: ['images'] as const,
  lists: () => [...imageKeys.all, 'list'] as const,
  list: (params: ListEntityImagesParams) => [...imageKeys.lists(), params] as const,
  details: () => [...imageKeys.all, 'detail'] as const,
  detail: (imageClientId: string) => [...imageKeys.details(), imageClientId] as const,
  downloadUrl: (imageClientId: string) =>
    [...imageKeys.detail(imageClientId), 'download-url'] as const,
};
```

### Step 4 — Create `src/features/images/api/fetch-entity-images.ts`

Calls `GET /api/v1/images?entity_type=…&entity_client_id=…`. Parse with `ListEntityImagesResponseSchema`. Return `EntityImage[]`.

```ts
import { apiClient } from '@/lib/api-client';
import { ListEntityImagesResponseSchema } from '../types';
import type { ListEntityImagesParams, EntityImage } from '../types';

export async function fetchEntityImages(
  params: ListEntityImagesParams,
): Promise<EntityImage[]> {
  const searchParams = new URLSearchParams({
    entity_type: params.entity_type,
    entity_client_id: params.entity_client_id,
  });
  const response = await apiClient.get(`/api/v1/images?${searchParams.toString()}`);
  const parsed = ListEntityImagesResponseSchema.parse(response);
  return parsed.data.images;
}
```

### Step 5 — Create `src/features/images/api/fetch-image.ts`

Calls `GET /api/v1/images/{image_client_id}`. Parse with `GetImageResponseSchema`. Return `Image`.

```ts
import { apiClient } from '@/lib/api-client';
import { GetImageResponseSchema } from '../types';
import type { Image } from '../types';

export async function fetchImage(imageClientId: string): Promise<Image> {
  const response = await apiClient.get(`/api/v1/images/${imageClientId}`);
  const parsed = GetImageResponseSchema.parse(response);
  return parsed.data.image;
}
```

### Step 6 — Create `src/features/images/api/request-image-upload-url.ts`

Calls `POST /api/v1/images/upload-url`. Parse with `RequestImageUploadUrlResponseSchema`. Return the `data` object.

```ts
import { apiClient } from '@/lib/api-client';
import { RequestImageUploadUrlResponseSchema } from '../types';
import type { RequestImageUploadUrlInput, RequestImageUploadUrlResponse } from '../types';

export async function requestImageUploadUrl(
  input: RequestImageUploadUrlInput,
): Promise<RequestImageUploadUrlResponse['data']> {
  const response = await apiClient.post('/api/v1/images/upload-url', input);
  const parsed = RequestImageUploadUrlResponseSchema.parse(response);
  return parsed.data;
}
```

### Step 7 — Create `src/features/images/api/upload-blob-to-signed-url.ts`

**Important:** This function does NOT use `apiClient`. It makes a raw `fetch` PUT request to the external signed storage URL. Sending the app's auth token to an external S3 URL would break the request.

```ts
type UploadBlobToSignedUrlInput = {
  uploadUrl: string;
  blob: Blob;
  contentType: string;
};

export async function uploadBlobToSignedUrl(input: UploadBlobToSignedUrlInput): Promise<void> {
  const response = await fetch(input.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': input.contentType },
    body: input.blob,
  });

  if (!response.ok) {
    throw new Error(`Storage upload failed with status ${response.status}`);
  }
}
```

### Step 8 — Create `src/features/images/api/confirm-image-upload.ts`

Calls `POST /api/v1/images/confirm-upload`. Returns the confirmed `Image`.

```ts
import { apiClient } from '@/lib/api-client';
import { ConfirmImageUploadResponseSchema } from '../types';
import type { ConfirmImageUploadInput, Image } from '../types';

export async function confirmImageUpload(input: ConfirmImageUploadInput): Promise<Image> {
  const response = await apiClient.post('/api/v1/images/confirm-upload', input);
  const parsed = ConfirmImageUploadResponseSchema.parse(response);
  return parsed.data.image;
}
```

### Step 9 — Create `src/features/images/api/reorder-images.ts`

Calls `POST /api/v1/images/reorder`. Returns `reordered` count.

```ts
import { apiClient } from '@/lib/api-client';
import { ReorderImagesResponseSchema } from '../types';
import type { ReorderImagesInput } from '../types';

export async function reorderImages(input: ReorderImagesInput): Promise<number> {
  const response = await apiClient.post('/api/v1/images/reorder', input);
  const parsed = ReorderImagesResponseSchema.parse(response);
  return parsed.data.reordered;
}
```

### Step 10 — Create `src/features/images/api/unlink-image.ts`

Calls `DELETE /api/v1/images/links`. Returns `unlinked` boolean.

```ts
import { apiClient } from '@/lib/api-client';
import { UnlinkImageResponseSchema } from '../types';
import type { UnlinkImageInput } from '../types';

export async function unlinkImage(input: UnlinkImageInput): Promise<boolean> {
  const response = await apiClient.delete('/api/v1/images/links', { body: input });
  const parsed = UnlinkImageResponseSchema.parse(response);
  return parsed.data.unlinked;
}
```

Note: check whether `apiClient.delete` accepts a body. If the apiClient does not support body on DELETE, pass the body as query params or verify with `src/lib/api-client.ts`. If unsupported, use `apiClient.request('DELETE', '/api/v1/images/links', { body: JSON.stringify(input) })` or equivalent.

### Step 11 — Create `src/features/images/api/delete-image.ts`

Calls `DELETE /api/v1/images/{image_client_id}`. Returns the deleted `client_id`.

```ts
import { apiClient } from '@/lib/api-client';
import { DeleteImageResponseSchema } from '../types';

export async function deleteImage(imageClientId: string): Promise<string> {
  const response = await apiClient.delete(`/api/v1/images/${imageClientId}`);
  const parsed = DeleteImageResponseSchema.parse(response);
  return parsed.data.client_id;
}
```

### Step 12 — Create `src/features/images/api/create-image-annotation.ts`

Calls `POST /api/v1/images/{image_client_id}/annotations`. Returns the annotation `client_id`.

```ts
import { apiClient } from '@/lib/api-client';
import { CreateImageAnnotationResponseSchema } from '../types';
import type { CreateImageAnnotationInput } from '../types';

export async function createImageAnnotation(
  input: CreateImageAnnotationInput,
): Promise<string> {
  const response = await apiClient.post(
    `/api/v1/images/${input.image_client_id}/annotations`,
    input,
  );
  const parsed = CreateImageAnnotationResponseSchema.parse(response);
  return parsed.data.client_id;
}
```

### Step 13 — Create `src/features/images/api/fetch-image-download-url.ts`

Calls `GET /api/v1/images/{image_client_id}/download-url`. Returns `{ downloadUrl: string, expiresIn: number }`.

```ts
import { apiClient } from '@/lib/api-client';
import { ImageDownloadUrlResponseSchema } from '../types';

export async function fetchImageDownloadUrl(
  imageClientId: string,
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const response = await apiClient.get(
    `/api/v1/images/${imageClientId}/download-url`,
  );
  const parsed = ImageDownloadUrlResponseSchema.parse(response);
  return { downloadUrl: parsed.data.download_url, expiresIn: parsed.data.expires_in };
}
```

### Step 14 — Typecheck

Run `npm run typecheck` from the workspace root. Resolve any TypeScript errors in the files created in this plan before marking complete.

## Risks and mitigations

- Risk: `apiClient.delete` may not support a JSON body (DELETE /api/v1/images/links requires one).
  Mitigation: Read `src/lib/api-client.ts` to verify the supported methods. If body is unsupported on DELETE, adapt the call to use a POST or use a raw fetch with auth headers. Document the workaround in the file.

- Risk: `file_size_bytes` is typed as `BigInteger` in the backend table, but JSON numbers have a 53-bit safe integer limit. Large files could overflow.
  Mitigation: Use `z.number()` (not `z.bigint()`) in the Zod schema — the backend serializes it as a JSON number. Add a note in `types.ts` about this limitation.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across all 13 new files.
- Manual check: import `fetchEntityImages`, `toImageViewModel` in a sandbox file and verify TypeScript types flow correctly end-to-end.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
