# PLAN_02_images_entity_queries_and_mutations_20260521

## Metadata

- Plan ID: `PLAN_02_images_entity_queries_and_mutations_20260521`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01_images_contracts_dtos_and_api_client_20260521`

## Goal and intent

- Goal: Build the TanStack Query hooks (queries + actions) for every image endpoint. This is the server-state layer — query hooks that read data, and action hooks that write data with full optimistic lifecycle.
- Business/user intent: Give the controller layer (PLAN_04) typed, cache-managed hooks it can compose without knowing network details.
- Non-goals: Optimistic orchestration for the upload pipeline (that belongs in PLAN_04), compression (PLAN_03), UI, surfaces, camera.

## Scope

- In scope:
  - `src/features/images/api/use-entity-images.ts` — `useEntityImagesQuery`
  - `src/features/images/api/use-image.ts` — `useImageQuery`
  - `src/features/images/api/use-image-download-url.ts` — `useImageDownloadUrlQuery`
  - `src/features/images/actions/use-reorder-images.ts` — `useReorderImages`
  - `src/features/images/actions/use-unlink-image.ts` — `useUnlinkImage`
  - `src/features/images/actions/use-delete-image.ts` — `useDeleteImage`
  - `src/features/images/actions/use-request-image-upload-url.ts` — `useRequestImageUploadUrl`
  - `src/features/images/actions/use-confirm-image-upload.ts` — `useConfirmImageUpload`
  - `src/features/images/actions/use-create-image-annotation.ts` — `useCreateImageAnnotation`
- Out of scope: optimistic entity controller (PLAN_04), compression (PLAN_03), UI, camera, surfaces.
- Assumptions:
  - All API functions from PLAN_01 are implemented and type-correct.
  - `imageKeys` factory from PLAN_01 is available.
  - Upload and confirm mutations are intentionally simple here (no optimistic update) — the optimistic lifecycle for the upload pipeline lives in `useEntityImagesController` (PLAN_04), which orchestrates the full pipeline state. These action hooks are just the network layer.

## Clarifications required

- [x] Optimistic vs. non-optimistic split: `useReorderImages`, `useUnlinkImage`, `useDeleteImage` should be optimistic (they affect the entity image list). `useRequestImageUploadUrl` and `useConfirmImageUpload` are NOT optimistic at the action level — the controller (PLAN_04) manages the full upload state machine including optimistic insertion.

## Acceptance criteria

1. `useEntityImagesQuery` returns `EntityImage[]`, correctly typed.
2. `useReorderImages`, `useUnlinkImage`, `useDeleteImage` all implement the full `onMutate` / `onError` / `onSuccess` / `onSettled` lifecycle.
3. `useRequestImageUploadUrl` and `useConfirmImageUpload` are simple mutations — no optimistic update at this layer.
4. All hooks import from `@/features/images/api/image-keys` and `@/features/images/types`.
5. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: overall conventions
- `architecture/05_server_state.md`: TanStack Query patterns, query keys, optimistic lifecycle, cache invalidation rules
- `architecture/08_hooks.md`: action hook taxonomy — signature `{ fn, isPending, error }`, four-lifecycle pattern
- `architecture/13_errors.md`: error handling in actions
- `architecture/15_feature_structure.md`: `api/` vs `actions/` folder separation
- `architecture/17_testing.md`: test expectations for action hooks

### Local extensions loaded

- None beyond baseline contracts for this plan.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/api/image-keys.ts` — verify key factory from PLAN_01.
- `src/features/images/types.ts` — verify types from PLAN_01.
- `src/features/items/actions/use-delete-item.ts` (if it exists) — verify the exact optimistic delete pattern in use in this project.

Prohibited reads:
- Any action hook from another feature to understand the action pattern — use `08_hooks.md` instead.

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 1 — Create `src/features/images/api/use-entity-images.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchEntityImages } from './fetch-entity-images';
import { imageKeys } from './image-keys';
import type { ListEntityImagesParams } from '../types';

export function useEntityImagesQuery(params: ListEntityImagesParams) {
  return useQuery({
    queryKey: imageKeys.list(params),
    queryFn: () => fetchEntityImages(params),
  });
}
```

### Step 2 — Create `src/features/images/api/use-image.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchImage } from './fetch-image';
import { imageKeys } from './image-keys';

export function useImageQuery(imageClientId: string | null | undefined) {
  return useQuery({
    queryKey: imageKeys.detail(imageClientId ?? ''),
    queryFn: () => fetchImage(imageClientId!),
    enabled: Boolean(imageClientId),
  });
}
```

### Step 3 — Create `src/features/images/api/use-image-download-url.ts`

This is a lazy query — only fires when the caller explicitly enables it (e.g., user taps a download action).

```ts
import { useQuery } from '@tanstack/react-query';
import { fetchImageDownloadUrl } from './fetch-image-download-url';
import { imageKeys } from './image-keys';

export function useImageDownloadUrlQuery(
  imageClientId: string | null | undefined,
  enabled = false,
) {
  return useQuery({
    queryKey: imageKeys.downloadUrl(imageClientId ?? ''),
    queryFn: () => fetchImageDownloadUrl(imageClientId!),
    enabled: Boolean(imageClientId) && enabled,
    staleTime: 1000 * 60 * 4, // download URLs expire — keep stale time below 5 min
    gcTime: 1000 * 60 * 5,
  });
}
```

### Step 4 — Create `src/features/images/actions/use-request-image-upload-url.ts`

Simple mutation — no optimistic update. The controller (PLAN_04) owns the optimistic image state.

```ts
import { useMutation } from '@tanstack/react-query';
import { requestImageUploadUrl } from '../api/request-image-upload-url';
import type { RequestImageUploadUrlInput, RequestImageUploadUrlResponse } from '../types';

export function useRequestImageUploadUrl() {
  const mutation = useMutation({
    mutationFn: requestImageUploadUrl,
  });

  return {
    requestUploadUrl: mutation.mutate,
    requestUploadUrlAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### Step 5 — Create `src/features/images/actions/use-confirm-image-upload.ts`

Simple mutation — the controller (PLAN_04) reconciles the confirmed image into the optimistic collection after this resolves.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmImageUpload } from '../api/confirm-image-upload';
import { imageKeys } from '../api/image-keys';
import type { ConfirmImageUploadInput } from '../types';

export function useConfirmImageUpload() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: confirmImageUpload,
    onSuccess: (image, input) => {
      // Seed the detail cache with the confirmed image
      queryClient.setQueryData(imageKeys.detail(image.client_id), image);
    },
    onSettled: (_data, _err, input) => {
      // Invalidate the entity list so confirmed image appears with correct metadata
      queryClient.invalidateQueries({
        queryKey: imageKeys.lists(),
      });
    },
  });

  return {
    confirmUpload: mutation.mutate,
    confirmUploadAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### Step 6 — Create `src/features/images/actions/use-reorder-images.ts`

Optimistic reorder: apply the new order to the entity list cache immediately, roll back on error.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reorderImages } from '../api/reorder-images';
import { imageKeys } from '../api/image-keys';
import type { ReorderImagesInput, EntityImage } from '../types';

export function useReorderImages() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: reorderImages,

    onMutate: async (input) => {
      const listKey = imageKeys.list({
        entity_type: input.entity_type,
        entity_client_id: input.entity_client_id,
      });
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData<EntityImage[]>(listKey);

      // Apply optimistic reorder: sort the cached list to match the new order
      queryClient.setQueryData<EntityImage[]>(listKey, (old) => {
        if (!old) return old;
        const orderMap = new Map(
          input.ordered_image_client_ids.map((id, index) => [id, index]),
        );
        return [...old].sort(
          (a, b) =>
            (orderMap.get(a.image.client_id) ?? 9999) -
            (orderMap.get(b.image.client_id) ?? 9999),
        );
      });

      return { previousList, listKey };
    },

    onError: (_err, _input, context) => {
      if (context?.listKey && context.previousList !== undefined) {
        queryClient.setQueryData(context.listKey, context.previousList);
      }
    },

    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({
        queryKey: imageKeys.list({
          entity_type: input.entity_type,
          entity_client_id: input.entity_client_id,
        }),
      });
    },
  });

  return {
    reorderImages: mutation.mutate,
    reorderImagesAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

### Step 7 — Create `src/features/images/actions/use-unlink-image.ts`

Optimistic unlink: remove the image from the entity list immediately.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unlinkImage } from '../api/unlink-image';
import { imageKeys } from '../api/image-keys';
import type { UnlinkImageInput, EntityImage } from '../types';

export function useUnlinkImage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: unlinkImage,

    onMutate: async (input) => {
      const listKey = imageKeys.list({
        entity_type: input.entity_type,
        entity_client_id: input.entity_client_id,
      });
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousList = queryClient.getQueryData<EntityImage[]>(listKey);

      queryClient.setQueryData<EntityImage[]>(listKey, (old) =>
        old?.filter((item) => item.image.client_id !== input.image_client_id) ?? [],
      );

      return { previousList, listKey };
    },

    onError: (_err, _input, context) => {
      if (context?.listKey && context.previousList !== undefined) {
        queryClient.setQueryData(context.listKey, context.previousList);
      }
    },

    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({
        queryKey: imageKeys.list({
          entity_type: input.entity_type,
          entity_client_id: input.entity_client_id,
        }),
      });
    },
  });

  return {
    unlinkImage: mutation.mutate,
    unlinkImageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

### Step 8 — Create `src/features/images/actions/use-delete-image.ts`

Soft-delete: removes image globally. Must also remove it from all active entity list caches.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteImage } from '../api/delete-image';
import { imageKeys } from '../api/image-keys';
import type { EntityImage } from '../types';

export function useDeleteImage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteImage,

    onMutate: async (imageClientId) => {
      await queryClient.cancelQueries({ queryKey: imageKeys.lists() });

      const previousLists = queryClient.getQueriesData<EntityImage[]>({
        queryKey: imageKeys.lists(),
      });

      // Remove from every active entity list cache
      queryClient.setQueriesData<EntityImage[]>({ queryKey: imageKeys.lists() }, (old) =>
        old?.filter((item) => item.image.client_id !== imageClientId) ?? [],
      );

      return { previousLists };
    },

    onError: (_err, _imageClientId, context) => {
      context?.previousLists.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
    },

    onSuccess: (_clientId, imageClientId) => {
      queryClient.removeQueries({ queryKey: imageKeys.detail(imageClientId) });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
    },
  });

  return {
    deleteImage: mutation.mutate,
    deleteImageAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

### Step 9 — Create `src/features/images/actions/use-create-image-annotation.ts`

Simple mutation — no optimistic update for annotations at this layer. The confirmed annotation is reconciled by invalidating the image detail cache.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createImageAnnotation } from '../api/create-image-annotation';
import { imageKeys } from '../api/image-keys';
import type { CreateImageAnnotationInput } from '../types';

export function useCreateImageAnnotation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createImageAnnotation,

    onSettled: (_data, _err, input) => {
      // Invalidate the image detail so the new annotation is fetched
      queryClient.invalidateQueries({
        queryKey: imageKeys.detail(input.image_client_id),
      });
    },
  });

  return {
    createAnnotation: mutation.mutate,
    createAnnotationAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

### Step 10 — Typecheck

Run `npm run typecheck`. Resolve any TypeScript errors in the files created in this plan.

## Risks and mitigations

- Risk: `useEntityImagesQuery` cache key must match exactly what `useReorderImages` and `useUnlinkImage` invalidate — if the key shape diverges, cache updates won't work.
  Mitigation: All three import `imageKeys` from the same factory file. The key structure is: `imageKeys.list({ entity_type, entity_client_id })`. Every action that reads or writes this key must pass the same params object shape.

- Risk: `useConfirmImageUpload`'s `onSettled` does a broad `imageKeys.lists()` invalidation, which refetches every open entity list. For pages with multiple entities loaded simultaneously this could be noisy.
  Mitigation: Acceptable for MVP. PLAN_04's controller can scope the invalidation to the specific entity key once we have the entity context.

## Validation plan

- `npm run typecheck`: zero TypeScript errors.
- Unit tests (from PLAN_12): `useReorderImages` — verify `onMutate` reorders the cache, `onError` restores it.
- Unit tests (from PLAN_12): `useUnlinkImage` — verify removed from cache, restored on error.
- Unit tests (from PLAN_12): `useDeleteImage` — verify removed from all active lists.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
