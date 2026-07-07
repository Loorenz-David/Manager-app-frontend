# PLAN_camera_gallery_picker_20260707

## Metadata

- Plan ID: `PLAN_camera_gallery_picker_20260707`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-07-07T00:00:00Z`
- Last updated at (UTC): `2026-07-07T11:06:10Z`
- Related issue/ticket: —
- Intention plan: — (no formal intention doc; goal/intent captured inline below from the user's direct request)

## Goal and intent

- Goal: Repurpose the bottom-left "Latest image" button on `ImageCameraPage` so it no longer shows/opens the last-captured photo. Instead it opens the device's native file picker (images only); the selected file is compressed to `.webp` and fed through the exact same established capture flow a live camera shot uses (optimistic insert → compress/upload pipeline → editor, when the surface's `captureFlow` calls for it).
- Business/user intent: Users often already have a usable photo (taken earlier, received from someone else, downloaded) and shouldn't be forced to re-shoot it live through the in-app camera. Reusing the existing capture pipeline means device-picked images get identical treatment (crop, compression, edit, upload) to camera shots with no new backend surface.
- Non-goals: Multi-file/batch selection from the device; changing the center-square crop or webp compression behavior itself; adding non-image file type support; removing or altering the live camera shutter capability; any backend or upload-pipeline change (compression already happens downstream of `onCapture` for every source).

## Scope

- In scope:
  - `packages/images/src/pages/ImageCameraPage.tsx` — replace the "latest image" preview button with a "select from device" action; add hidden file input + handler.
  - `packages/images/src/controllers/use-entity-images.controller.ts` — remove now-dead `latestImageUrl` / `onViewLatest` from `ImageCameraSurfaceProps` and the `openCamera` surface-open call.
  - `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/images/images-item-flow.spec.ts` — add coverage for the device-picker path; add a small real fixture image if none exists.
- Out of scope: `packages/images/src/lib/compress-image-for-upload.ts`, `packages/images/src/lib/image-upload-pipeline.ts` (already produce webp via `DEFAULT_IMAGE_COMPRESSION_OPTIONS` regardless of source — no change needed); `ImageEditorPage.tsx`; any consuming app other than the shared `@beyo/images` package surface (sellers/workers apps inherit the fix automatically since they consume the same package page).
- Assumptions: `compressImageForUpload` already center-crops to a square and encodes to webp for any `Blob`/`File` passed through `onCapture` (`uploadImage` in the controller), whether it originated from `captureFrame()` (camera) or a device file picker. So "compress to webp and follow the established flow" is satisfied simply by routing the selected `File` through the same `onCapture` → `onEditCapturedImage` callbacks `handleCapture` already uses — no separate compression call belongs in the page component. A selected file whose `type` doesn't start with `image/` (possible on some OS file pickers despite `accept="image/*"`) is silently ignored rather than surfaced as an error, since no notification/toast dependency is otherwise needed for this change.

## Clarifications required

None — the one open question (non-image file selection UX) is resolved under Assumptions with a minimal, reversible default (silent ignore) rather than blocking on it.

## Acceptance criteria

1. The bottom-left button on `ImageCameraPage` no longer reads or displays `localLatestUrl`/`latestImageUrl`; clicking it opens the OS/browser file picker restricted to images (`accept="image/*"`).
2. Selecting a file routes it through `onCapture` (the same optimistic-insert + compression/upload pipeline as a live capture), producing a webp-compressed, center-cropped image identical in shape/quality to a camera capture.
3. When `captureFlow === "camera-to-editor"`, selecting a device image opens `ImageEditorPage` for that image, exactly as a live capture does (same cancel/save/discard behavior via `onCancelCapture` / `onSaveComplete` / `onDeferredConfirm`).
4. When `captureFlow === "camera-to-viewer"`, selecting a device image starts the background upload without opening the editor, matching live-capture behavior for that flow.
5. The camera stream and live-capture shutter button (`camera-capture-button`) continue to work unchanged; nothing in this change touches `useCameraStream` or `captureFrame`.
6. `latestImageUrl` and `onViewLatest` are removed from `ImageCameraSurfaceProps` and from `openCamera` in `use-entity-images.controller.ts` with zero remaining references in the repo.
7. `npm run typecheck` passes with zero errors; the updated/added Playwright case passes on `--project=mobile` then `--project=desktop`.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: Confirms the page stays a thin surface-prop consumer (reads callbacks via `useSurfaceProps`, no logic-layer imports) — the button/handler rewrite must not pull in `api/`, `actions/`, or `store/` imports directly.
- `architecture/08_hooks.md`: Governs the controller's callback-wiring shape (`openCamera` building `ImageCameraSurfaceProps`) — the removal of `latestImageUrl`/`onViewLatest` is a controller-level edit and must keep the surface-open call's shape consistent with how other callbacks (`onCapture`, `onEditCapturedImage`, `onCloseCamera`) are wired.
- `architecture/17_testing.md`: Playwright spec conventions (import `test`/`expect` from `app-fixture`, one spec per cohesive flow).
- `architecture/34_runtime_validation.md`: `data-testid` naming convention (`[feature]-[element-type]-[context?]`) for the new hidden input and repurposed button.

### Local extensions loaded

- `architecture/34_runtime_validation_local.md`: Reuses the already-bootstrapped fixture/helper paths (`app-fixture.ts`, `installCameraMocks`, `mockImagesRoutes`), npm scripts (`test:e2e:mobile` / `test:e2e:desktop`), and project names (`mobile` / `desktop`) as-is — no new infrastructure needed.

### File read intent — pattern vs. relational

- `packages/images/src/pages/ImageCameraPage.tsx` (already read) — relational: understanding the exact current button/handler/state to modify.
- `packages/images/src/controllers/use-entity-images.controller.ts` (already read) — relational: understanding `ImageCameraSurfaceProps`, `openCamera`, and confirming `onCapture`/`uploadImage` is source-agnostic (accepts any `Blob`).
- `packages/images/src/lib/compress-image-for-upload.ts`, `packages/images/src/lib/image-upload-pipeline.ts` (already read) — relational: confirming webp compression + center-square crop already happen downstream of `onCapture` for any blob, so no new compression call is needed in the page.
- `packages/images/src/hooks/use-camera-stream.ts` (already read) — relational: confirming `captureFrame`/`useCameraStream` are untouched by this change.
- `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/images/images-item-flow.spec.ts` (already read) — relational: existing camera-flow test conventions (`installCameraMocks`, `mockImagesRoutes`, `data-testid` usage) to extend, not to copy as a "how to write a controller/page" pattern.

### Skill selection

- Primary skill: none — this is a targeted, contract-guided edit to one existing page and its controller; no dedicated skill applies.
- Trigger terms: n/a
- Excluded alternatives: `architecture/22_file_handling.md` — its multipart `POST /api/v1/files/upload` → `file_id` model is a different, generic-attachment subsystem. This feature stays inside the images package's own already-established direct-to-storage signed-URL pipeline (`request-image-upload-url` → `upload-blob-to-signed-url` → `confirm-image-upload`), which already performs the webp compression this task asks for; introducing the generic file-handling contract's pattern here would duplicate/conflict with the existing pipeline. `architecture/09_forms.md`, `24_dto.md`, `23_providers.md`, `10_pages.md`, `11_routing.md` — excluded, no new form, DTO, provider, page, or route is introduced.

## Implementation plan

1. Read `packages/images/src/types.ts` to confirm the `ImageViewModel` shape returned by `uploadImage`/`onCapture` (already established; no field changes needed) — relational read, confirms nothing downstream needs updating.
2. In `packages/images/src/controllers/use-entity-images.controller.ts`:
   - Remove `latestImageUrl?: string;` and `onViewLatest?: () => void;` from `ImageCameraSurfaceProps` (around lines 72–82).
   - Remove the `latestImageUrl: imagesRef.current.at(-1)?.imageUrl,` line and the `onViewLatest: () => { ... }` block from the `surface.open(IMAGE_CAMERA_SURFACE_ID, { ... })` call inside `openCamera` (around lines 859–878). Leave `onCapture`, `onEditCapturedImage`, `onCloseCamera`, `captureFlow`, `entityType`, `entityClientId`, `cameraSessionId` untouched.
3. In `packages/images/src/pages/ImageCameraPage.tsx`:
   - Remove `localLatestUrl` state, `localLatestUrlRef`, the cleanup `useEffect` that revokes it, and the `latestImageUrl` / `onViewLatest` destructuring from `useSurfaceProps<ImageCameraSurfaceProps>()`.
   - In `handleCapture`, drop the `captureFlow !== "camera-to-editor"` branch that set `localLatestUrl` (dead code once the button stops displaying a preview).
   - Add `const fileInputRef = useRef<HTMLInputElement>(null);` and `const [isSelecting, setIsSelecting] = useState(false);`.
   - Add `handleChooseFromDevice` (`useCallback(() => fileInputRef.current?.click(), [])`).
   - Add `handleFileSelected` (`useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => { ... }, [captureFlow, isCapturing, isSelecting, onCapture, onEditCapturedImage])`) that:
     - Reads `const file = event.target.files?.[0];` then immediately resets `event.target.value = "";` so re-selecting the same file re-fires `onChange`.
     - Returns early if `!file || !onCapture || isCapturing || isSelecting || !file.type.startsWith("image/")`.
     - Sets `isSelecting(true)`, calls `const capturedImage = onCapture(file);`, and if `captureFlow === "camera-to-editor"` calls `onEditCapturedImage?.(capturedImage);`, then `isSelecting(false)` in a `finally` block — mirroring `handleCapture`'s post-capture branching exactly, minus the camera-only `triggerFlash()`/`navigator.vibrate?.(10)` shutter feedback.
   - Render a hidden input right before the controls row: `<input ref={fileInputRef} type="file" accept="image/*" className="sr-only" data-testid="camera-file-input" onChange={(event) => { void handleFileSelected(event); }} />`.
   - Replace the bottom-left button:
     - `aria-label="Select image from device"`.
     - `data-testid="camera-select-image-button"` (was `camera-latest-thumbnail`).
     - Drop the `disabled={!localLatestUrl && !latestImageUrl}` condition — always enabled (optionally `disabled={isSelecting}` to prevent double-taps).
     - Drop the conditional `<img>`/`Camera` fallback; render a static `ImagePlus` icon (import from `lucide-react` alongside the existing `X` import; drop the now-unused `Camera` import since it was only used for this button's empty state — verify it isn't used elsewhere in the file before removing).
     - `onClick={handleChooseFromDevice}`.
4. Verify no other files import or reference `latestImageUrl`, `onViewLatest`, or `camera-latest-thumbnail` (already confirmed absent outside this page/controller pair via repo-wide search) so the removal is clean.
5. Extend `apps/managers-app/ManagerBeyo-app-managers/tests/playwright/features/images/images-item-flow.spec.ts`:
   - Add a small real image fixture (e.g. `tests/playwright/fixtures/sample-image.jpg`) since none currently exists in that app's Playwright test tree.
   - Add a test that opens the camera surface (`image-add-picture-button` → `image-camera-page` visible), calls `await page.setInputFiles('[data-testid="camera-file-input"]', <fixture path>)`, and asserts the same downstream behavior already asserted for live capture: `image-editor-page` becomes visible (capture-to-editor flow), editor `done`/`close` behave identically, and the resulting image appears in `testing-images-grid` after confirm — reusing `installCameraMocks`/`mockImagesRoutes` from the existing describe block.
   - Assert `camera-select-image-button` is present and enabled immediately on camera-page load (no dependency on a prior capture existing).

## Risks and mitigations

- Risk: A device file picker (some Android/desktop OS combinations) can still surface non-image files despite `accept="image/*"`, and `createImageBitmap` in `compressImageForUpload` would then throw.
  Mitigation: The `file.type.startsWith("image/")` guard in `handleFileSelected` rejects non-image files before they ever reach `onCapture`/the compression pipeline; the existing `.catch` in `startUpload`/`startUploadDeferred` already surfaces a `failed` upload state for any pipeline error as a backstop.
- Risk: Removing `latestImageUrl`/`onViewLatest` could break an undiscovered consumer outside this repo's search scope (e.g. a stale dynamic import).
  Mitigation: Both symbols are exported only as part of `ImageCameraSurfaceProps`/`openCamera`'s internal wiring, not re-exported from the package's public `index.ts` — confirm via `grep` in `packages/images/src/index.ts` before deleting, and re-run `npm run typecheck` across the monorepo (not just the images package) to catch any cross-package break.
- Risk: The center-square crop in `compressImageForUpload` may crop meaningfully more content off a non-square device photo (e.g. a full-height portrait shot) than it does off a live camera frame (already square-cropped by `captureFrame`'s video viewport).
  Mitigation: Explicitly a non-goal per the user's request to "follow the current established flow" — the crop behavior is intentionally left unchanged for both sources; flagged here only so it isn't mistaken for an oversight during review.

## Validation plan

- `npm run typecheck`: zero TypeScript errors across the monorepo (catches any stale reference to the removed `latestImageUrl`/`onViewLatest` props).
- `npm run test -- --grep images`: existing Vitest coverage for the images package/controller continues to pass unchanged.
- `npx playwright test --grep "Images item flow" --project=mobile`: existing live-capture cases plus the new device-picker case pass.
- `npx playwright test --grep "Images item flow" --project=desktop`: same, on desktop viewport.

## Review log

- `2026-07-07` `author`: Initial draft from user's direct request (no prior intention doc).
- `2026-07-07` `Codex`: Implemented the device image picker flow, added Playwright coverage for the picker path, and archived the plan after validation.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
