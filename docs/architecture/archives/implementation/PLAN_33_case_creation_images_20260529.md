# PLAN_33_case_creation_images_20260529

## Metadata

- Plan ID: `PLAN_33_case_creation_images_20260529`
- Status: `archived`
- Owner agent: `codex`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Last updated at (UTC): `2026-05-29T13:01:10Z`
- Related issue/ticket: `N/A`
- Intention plan: `N/A`

## Goal and intent

- Goal: Add image capture and preview capability to the case creation form by wiring `EntityImagesProvider` + `ImagePreviewGrid` from `@beyo/images` into `CaseCreationFormContent`, using the pre-generated `caseClientId` as the entity anchor. Also preload the camera surface from the workers-app case creation slide page.
- Business/user intent: When creating a case the user can attach photos (with annotation support) directly in the creation form. Images are uploaded immediately to the backend against the pre-generated `caseClientId`; on case creation the server automatically associates them with the new case entity.
- Non-goals:
  - Clearing uploaded images on form success — images uploaded to `caseClientId` belong to the case once it is created; clearing is not needed. `regenerateId()` already detaches the next session from the previous session's `caseClientId`.
  - Adding images to the `CreateCaseInput` wire shape — the backend associates images via `entity_client_id`; no extra field is needed in the create-case request body.
  - Changing the image viewer mode (defaults to `"preview-edit"`, which is correct for a creation form where the user owns the images they just captured).
  - Image grid in the managers-app case creation flow — that app's entry point is outside this plan's scope; the same Step 1 change applies automatically since `CaseCreationFormContent` is shared, but preloading for the managers-app slide is deferred.

## Scope

- In scope:
  - `packages/cases/src/components/CaseCreationFormContent.tsx` — import `EntityImagesProvider` and `ImagePreviewGrid` from `@beyo/images`; add image section below `CaseInitialMessageComposer` in the scrollable field list.
  - `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx` — add `usePreloadSurface(preloadImageCameraSurface)` so the camera slide chunk is loaded as soon as the creation slide opens.
- Out of scope:
  - Any changes to `CaseCreationFormProvider`, `CaseCreationRouteEntry`, or any other provider/entry component — `caseClientId` and `regenerateId` are already in the provider context.
  - Any new API mutations — image upload/delete/reorder are handled entirely inside `EntityImagesProvider` / `useEntityImagesController`.
  - `packages/cases/src/index.ts` — no new exports are required; `EntityImagesProvider` and `ImagePreviewGrid` are consumed directly inside `CaseCreationFormContent`, not re-exported.
  - Playwright spec — deferred to a future validation pass.
- Assumptions:
  - The backend accepts `requestImageUploadUrl` and `confirmImageUpload` calls with `entity_type: "case"` before the case entity is persisted in the database (polymorphic/lazy linking pattern, same as `entity_type: "item"` in task creation).
  - `imageSurfaces` (camera, viewer, editor, annotation, etc.) are already registered in the workers-app `surface-registry.ts` — confirmed by reading the file.
  - `@beyo/images` is already a declared dependency of `packages/cases` — confirmed by the presence of `CaseComposerDraftImagesProvider.tsx` which imports `EntityImagesProvider` from `@beyo/images`.
  - `caseClientId` is already destructured from `useCaseCreationFormContext()` inside `CaseCreationFormContent` — confirmed by reading the file.

## Clarifications required

_None — all design decisions are resolved by the existing image feature architecture and the task-creation reference example._

## Acceptance criteria

1. `npm run typecheck` passes with zero TypeScript errors across all workspaces.
2. The case creation form renders an image grid section below the description composer (`CaseInitialMessageComposer`).
3. Tapping the `+` button in the image grid opens the camera slide.
4. Capturing a photo opens the image editor slide; confirming saves the image and shows it as a tile in the grid.
5. Tapping a tile opens the image viewer slide (preview-edit mode: delete is available).
6. Long-pressing a tile enters edit mode; the user can reorder tiles or delete images.
7. Submitting the case creation form does **not** require images — the form submits successfully with zero images attached.
8. After a successful case creation, `regenerateId()` resets `caseClientId` in the provider, detaching the new session from the previously uploaded images. The grid is empty for the next creation.
9. `preloadImageCameraSurface` is called via `usePreloadSurface` in `CaseCreationSlidePage` in the workers app, so the camera chunk begins loading when the creation slide opens.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: monorepo structure, package boundary rules — confirms `@beyo/images` is a valid import from `packages/cases`
- `architecture/07_components.md`: component authoring, `data-testid` placement
- `architecture/15_feature_structure.md`: package component layer conventions
- `architecture/35_shared_packages.md §13`: package boundary rule — `packages/cases` may consume `@beyo/images` components; it must not call `openSurface` directly (camera is opened by `EntityImagesProvider`'s internal controller)

### Local extensions loaded

- `architecture/30_dynamic_loading_local.md`: `lazyWithPreload` / `usePreloadSurface` pattern — used in Step 2 to preload the camera surface from the slide page

### File read intent — pattern vs. relational

Before reading any implementation file outside this plan's scope, apply the test from `task_system/frontend_contract_goal_mapping_guide.md`:

> "Am I reading this to understand **how to write** my new code — or to understand **what this existing code does**?"

- **How to write** → read the contract instead
- **What exists** → reading is legitimate (existing behavior, return shapes, field names, context values)

Prohibited (pattern reads — contract already covers these):
- Reading `useEntityImagesController` to understand upload pipeline shape → `08_hooks.md`
- Reading `useUnlinkImage` / `useDeleteImage` to understand mutation setup → `08_hooks.md`
- Reading another provider to understand context shell → `23_providers.md`

Permitted (relational reads — understanding what exists):
- `packages/cases/src/components/CaseCreationFormContent.tsx` — exact current imports, context destructure, and form body markup to know the insertion point
- `packages/images/src/index.ts` — verify exported names for `EntityImagesProvider`, `ImagePreviewGrid`, `preloadImageCameraSurface`
- `packages/images/src/types.ts` — verify `IMAGE_LINK_ENTITY_TYPE` includes `"case"`
- `packages/images/src/providers/EntityImagesProvider.tsx` — verify prop names (`entityType`, `entityClientId`, `captureFlow`, `deleteMode`)
- `packages/images/src/components/ImagePreviewGrid.tsx` — verify prop names (`maxImages`, `testId`)
- `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx` — current imports and `usePreloadSurface` call to know insertion point
- `apps/workers-app/ManagerBeyo-app-workers/src/app/surface-registry.ts` — confirm `imageSurfaces` is already registered

### Skill selection

- Primary skill: N/A — standard feature composition following established package patterns
- Trigger terms: N/A
- Excluded alternatives: N/A

## Implementation plan

### Touch point summary (2 files modified, 0 files created)

| # | File | Change |
|---|---|---|
| 1 | `packages/cases/src/components/CaseCreationFormContent.tsx` | Import `EntityImagesProvider` + `ImagePreviewGrid`; add image section below `<CaseInitialMessageComposer />` |
| 2 | `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx` | Import `preloadImageCameraSurface`; add `usePreloadSurface` call |

---

### Step 1 — `packages/cases/src/components/CaseCreationFormContent.tsx`

**Goal:** Render an image capture/preview grid below the description composer, bound to the pre-generated `caseClientId`.

**Add imports** (append to the `@beyo/images` import block, or add a new one if none exists yet):

```ts
import { EntityImagesProvider, ImagePreviewGrid } from "@beyo/images";
```

**No context destructure change needed** — `caseClientId` is already destructured from `useCaseCreationFormContext()` in the existing submit handler.

**Update the form body** — add the image section immediately after `<CaseInitialMessageComposer />`, inside the same `gap-4` flex column:

Before:
```tsx
<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
  <CaseTypePickerTriggerField />
  <CaseInitialMessageComposer />
</div>
```

After:
```tsx
<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
  <CaseTypePickerTriggerField />
  <CaseInitialMessageComposer />
  <div
    className="rounded-2xl bg-card px-4 py-3 shadow-sm"
    data-testid="case-creation-images-section"
  >
    <EntityImagesProvider
      captureFlow="camera-to-editor"
      deleteMode="hard-delete"
      entityClientId={caseClientId}
      entityType="case"
    >
      <ImagePreviewGrid
        maxImages={6}
        testId="case-creation-images-grid"
      />
    </EntityImagesProvider>
  </div>
</div>
```

**Design decisions:**

- `entityType="case"` — images are linked to the case entity. `IMAGE_LINK_ENTITY_TYPE` already includes `"case"` and the backend exposes `upload_case_image` as an event type.
- `entityClientId={caseClientId}` — uses the pre-generated `ca_`-prefixed client ID from the provider. The same ID is used when the case is created, so the backend can associate the uploaded images without any extra payload field.
- `captureFlow="camera-to-editor"` — same as task creation; lets the user annotate the image in the editor before confirming the upload.
- `deleteMode="hard-delete"` — same as task creation. In the creation flow the case does not yet exist in the DB, so unlink is not meaningful; the image itself should be removed from storage if the user discards it.
- Wrapper `div` uses `rounded-2xl bg-card shadow-sm px-4 py-3` — matches the visual weight of `CaseTypePickerTriggerField` (`rounded-2xl bg-[var(--color-card)] shadow-sm`). The image grid sits inside a card-like container consistent with the form's field-level visual language.
- `maxImages={6}` — same cap as task creation; six tiles fill the 3-column grid exactly twice.
- `data-testid="case-creation-images-section"` on the wrapper, `testId="case-creation-images-grid"` passed to `ImagePreviewGrid` (becomes `data-testid` on the inner grid).
- The image section is placed **after** `CaseInitialMessageComposer`, not before. The composer must remain last in the visible field list while the keyboard is open (native "scroll to focused element" keeps it accessible). Images are a supplementary field that the user fills in after composing the description, or independently.

---

### Step 2 — `apps/workers-app/ManagerBeyo-app-workers/src/pages/cases/CaseCreationSlidePage.tsx`

**Goal:** Preload the camera surface chunk as soon as the case creation slide opens, so the first tap on the `+` image button launches the camera instantly.

**Add import:**

```ts
import { preloadImageCameraSurface } from "@beyo/images";
```

**Add `usePreloadSurface` call** (alongside the existing `preloadCaseTypePickerSheetSurface` call):

Before:
```tsx
export function CaseCreationSlidePage(): React.JSX.Element {
  usePreloadSurface(preloadCaseTypePickerSheetSurface);

  return <CaseCreationRouteEntry />;
}
```

After:
```tsx
export function CaseCreationSlidePage(): React.JSX.Element {
  usePreloadSurface(preloadCaseTypePickerSheetSurface);
  usePreloadSurface(preloadImageCameraSurface);

  return <CaseCreationRouteEntry />;
}
```

**Key detail:** `preloadImageCameraSurface` both preloads the camera page chunk **and** calls `prewarmCameraStream()` (as seen in `packages/images/src/surfaces.ts`). Camera stream warm-up reduces the delay between the user tapping `+` and seeing the live viewfinder. The deduplication guard inside `preloadImageCameraSurface` ensures warm-up runs only once per session even if the creation slide is opened multiple times.

---

## Risks and mitigations

- **Risk:** Backend does not accept `requestImageUploadUrl` for `entity_type: "case"` when the case entity does not yet exist.
  **Mitigation:** `upload_case_image` event type is declared in `IMAGE_EVENT_TYPE` and `"case"` is in `IMAGE_LINK_ENTITY_TYPE`, which indicates the backend handles case image uploads. If the backend rejects pre-creation uploads, the optimistic image will enter `"failed"` upload state and the grid will show a retry tile — no crash, no data loss. Confirm with the backend team before the production release if this assumption has not already been validated in a staging environment.

- **Risk:** Uploaded images are orphaned if the user abandons the creation form after uploading images (case never created).
  **Mitigation:** Acceptable for the initial implementation. The image records exist on the backend linked to a `case` entity client_id that was never created. A future cleanup job or TTL policy on image records without a matching case entity is the proper mitigation. This is the same trade-off accepted by the task creation flow for item images.

- **Risk:** `caseClientId` in the provider changes (via `regenerateId()`) while `EntityImagesProvider` is mounted, causing the controller to reset and show an empty grid for images that were uploaded under the old ID.
  **Mitigation:** `regenerateId()` is called only inside the submit handler's success branch, at which point the creation form is dismissed (the creation slide closes). The provider unmounts before the next mount with the new `caseClientId`. No stale grid is visible to the user.

- **Risk:** Image grid placed below the composer occupies screen space and pushes the submit button out of view on small screens.
  **Mitigation:** The image grid renders empty with just the `+` button by default (no images yet), which is compact. The outer scroll container (`overflow-y-auto`) allows the user to scroll to the submit button. This is consistent with the task creation form which also uses a scrollable container for fields plus a pinned footer.

- **Risk:** Camera stream warm-up (`prewarmCameraStream()`) in `usePreloadSurface(preloadImageCameraSurface)` requests camera permissions on slide open, before the user taps `+`.
  **Mitigation:** `prewarmCameraStream()` is designed to acquire the stream quietly; permission prompts are browser-controlled and only appear once per origin. The user has already granted camera permission if the app is used for case images in the conversation composer. If permission has never been granted, the first `+` tap triggers the permission dialog natively — same UX as before this change. The preload only avoids the stream-startup delay *after* permission is granted.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in all workspaces.
- `npm run test -- --grep "case-creation-images"`: image grid renders, `+` button visible, upload flow starts on capture.
- Manual smoke test (mobile viewport in workers app):
  1. Open case creation slide (from task step detail via "Create case").
  2. Verify the image grid section is visible below the description composer, with a `+` tile.
  3. Tap `+` → camera slide opens; viewfinder is live immediately (preload worked).
  4. Capture a photo → image editor slide opens; annotate and confirm.
  5. Return to creation form → photo tile appears in the grid.
  6. Long-press the tile → edit mode; tap the delete icon → tile removed; image hard-deleted on backend.
  7. Capture a second photo without annotation; confirm.
  8. Tap "Create case" → request succeeds; form closes; no image-related payload key needed in the request body.
  9. Open creation slide again → image grid is empty (new `caseClientId`, new session).

## Review log

_No reviews yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
