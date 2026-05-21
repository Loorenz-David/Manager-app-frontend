# Images Feature Intention Plan

Implement the Images feature system as a first-class reusable operational feature following the current frontend architecture contracts, polymorphic backend model strategy, primitive composition philosophy, and mobile-first interaction system.
This feature is one of the foundational operational systems of the application and must be designed for:

- scalability
- composability
- optimistic interactions
- mobile ergonomics
- realtime-friendly orchestration
- future extensibility
  The backend API and persistence model already exist. The frontend implementation must establish the reusable image interaction architecture that all operational domains can consume.
  The detailed backend tables, endpoint contracts, response shapes, request shapes, and enum values are documented in:

````txt
frontend/docs/architecture/under_construction/intention/image_tables_and_endpoints.md

Claude must use that file as the source of truth for building frontend DTOs, Zod schemas, API clients, request schemas, response schemas, enum definitions, and normalized image view models. Do not guess endpoint payloads or backend field names from memory.

⸻

1. Core Architectural Intention

The backend image system is polymorphic and entity-driven. Images can belong to:

* items
* cases
* case conversation messages
* future operational entities

The backend exposes this through entity_type and entity_client_id.

The frontend Images feature may understand this polymorphic backend shape internally, but normal consuming UI should not need to know about the persistence details.

Consumers should work with a simple orchestration interface such as:

* image collection
* image actions
* upload action
* delete action
* reorder action
* open preview action
* open camera action
* edit/annotation action

Consumers should not need direct awareness of:

* image_links
* display_order persistence mechanics
* pending upload records
* storage providers
* annotation persistence internals
* upload lifecycle reconciliation

The Images feature itself owns those details.

⸻

2. Source of Truth for Backend Contracts

Before implementing API clients or schemas, inspect:

frontend/docs/architecture/under_construction/intention/image_tables_and_endpoints.md

Use that file to define:

* ImageDto
* ImageEventDto
* ImageAnnotationDto
* ImageLinkDto
* list images response schema
* upload-url request/response schema
* confirm-upload request/response schema
* reorder request/response schema
* unlink request/response schema
* soft-delete response schema
* get image response schema
* create annotation request/response schema
* download-url response schema
* all related enums

Important backend endpoints already available:

* GET /api/v1/images
* POST /api/v1/images/upload-url
* direct upload to returned upload_url
* POST /api/v1/images/confirm-upload
* POST /api/v1/images/reorder
* DELETE /api/v1/images/links
* DELETE /api/v1/images/{image_client_id}
* GET /api/v1/images/{image_client_id}
* POST /api/v1/images/{image_client_id}/annotations
* GET /api/v1/images/{image_client_id}/download-url

The frontend image feature should not invent alternative routes or response shapes.

⸻

3. Primary Feature Goals

The feature system must provide reusable building blocks for:

* camera capture
* square 1:1 image creation
* direct image uploading
* optimistic image lifecycle
* image preview grid
* full-screen image carousel viewing
* image editing / annotation overlays
* image reordering
* image deletion
* image metadata and action sheet
* entity image orchestration

All systems should be independently usable but composable together.

Examples:

* an item card may render one tappable image and open the full-screen image viewer
* an item creation form may render an add-picture button and preview grid
* a case page may render an image grid in a different layout area
* a conversation message may reuse the image viewer but not the camera
* a future AI inspection flow may reuse the camera and annotation editor

Do not build this as one monolithic component.

⸻

4. Recommended Feature Decomposition

Use the current feature architecture contracts to decide exact paths, but the system should conceptually separate these concerns.

API and DTO layer:

* image DTO schemas
* endpoint request/response schemas
* API client functions
* normalized mappers
* enum definitions

Server state layer:

* list images query by entity_type + entity_client_id
* get image query by image_client_id
* upload-url mutation
* confirm-upload mutation
* reorder mutation
* unlink mutation
* soft-delete mutation
* create annotation mutation
* download-url query/mutation as appropriate

Client orchestration layer:

* optimistic image collection state
* pending upload queue
* upload/delete reconciliation
* reorder state
* preview open state
* camera open state
* editor open state
* selected image index
* selected image action-sheet state

UI layer:

* ImageCameraPage
* ImagePreviewGrid
* ImagePreviewTile
* ImageAddPictureButton
* ImageFullscreenViewerPage
* ImageMetadataActionsSheetPage
* ImageEditorPage or editor mode inside viewer
* ImageAnnotationToolbar
* ImageCarouselIndicators
* ImageUploadOverlay

Controller / hook layer:

* useEntityImagesController
* useImageUploadController
* useImagePreviewController
* useImageCameraController
* useImageReorderController
* useImageAnnotationController

Names may be adapted to the project conventions.

⸻

5. Image View Model Intention

Build a frontend view model that hides backend complexity.

A consuming component should be able to render images with fields like:

interface ImageViewModel {
  clientId: string;
  linkClientId?: string;
  entityType?: string;
  entityClientId?: string;
  imageUrl: string;
  localObjectUrl?: string;
  displayOrder: number;
  widthPx?: number | null;
  heightPx?: number | null;
  fileSizeBytes?: number | null;
  createdAt?: string;
  createdById?: string;
  uploadState: "idle" | "uploading" | "confirming" | "completed" | "failed" | "deleting";
  isOptimistic: boolean;
  isDeleted?: boolean;
  pendingUploadClientId?: string;
  uploadError?: string | null;
  annotations?: ImageAnnotationViewModel[];
}

The exact final type should be aligned with existing project type conventions and generated from the backend DTO schemas where possible.

The important concept is that UI components should not constantly parse raw backend nested payloads.

⸻

6. Camera Page Layout and Behavior

Implement a reusable mobile-first camera page.

This page should be opened inside the existing full-page slide surface system.

Camera page objective

The camera must feel instant and native on mobile:

* smooth live preview
* high frame rate
* high resolution
* reliable camera stream
* no visible startup delay when possible
* square 1:1 capture output

Camera source

Use the mobile rear/environment camera by default for item/documentation workflows.

Use browser media APIs directly:

* navigator.mediaDevices.getUserMedia
* HTMLVideoElement
* HTMLCanvasElement
* canvas.toBlob

Do not introduce a heavy camera library unless the existing architecture requires it.

Recommended constraints:

{
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1920 },
  },
  audio: false,
}

The implementation should gracefully fallback if the device cannot satisfy the ideal constraints.

Stream prewarming

Support prewarming the camera stream before the page becomes visible.

The stream lifecycle should be controllable by the parent/controller, not hard-owned only by the visual page.

This allows:

* opening the camera with video already flowing
* reusing the warm stream between capture sessions
* deliberately stopping the stream when the parent flow is finished

Visual layout

The camera page should be full screen.

Base layout:

* full-screen black/dark background
* video preview fills the available screen
* visible 1:1 capture guide / crop area
* captured output must be square even if the video feed is not square
* controls float over the video

Bottom control bar:

* fixed to bottom safe-area region
* capture button centered horizontally
* preview thumbnail button on the left
* back/close arrow button on the right

Capture button:

* large circular button
* industry-standard mobile camera placement
* touch target must be comfortable
* visual press feedback
* optional ring/border treatment

Left preview thumbnail:

* square
* rounded corners
* displays the most recent captured image
* if no image exists, render an empty/disabled state
* tapping opens the full-screen image carousel at the latest image

Right close button:

* back arrow icon
* closes the camera page surface
* does not necessarily stop the stream unless the parent/controller decides to stop it

Capture behavior

When the user taps the capture button:

1. Take the current video frame.
2. Crop/compose it into a 1:1 square using canvas.
3. Convert to Blob.
4. Create a local object URL for immediate preview.
5. Insert an optimistic image into the image collection immediately.
6. Start upload immediately.
7. Trigger haptic feedback if available.
8. Trigger a quick capture flash animation.

Use:

navigator.vibrate?.(10)

Do not make vibration required.

Capture animation

Add a lightweight camera flash effect:

* white overlay
* very short duration
* fade out quickly
* CSS animation only

Avoid heavy animation libraries for this.

⸻

7. Upload Lifecycle Intention

Upload begins immediately after capture.

Flow:

1. Request upload URL from POST /api/v1/images/upload-url.
2. Upload the image Blob directly to the returned upload_url.
3. Confirm the upload with POST /api/v1/images/confirm-upload.
4. Reconcile the optimistic image with the confirmed backend image.
5. Keep local display order stable.

The upload controller should expose upload states to the UI:

* uploading
* confirming
* completed
* failed
* deleting

The preview grid should show uploading images immediately, even before backend confirmation.

Optimistic identity

The frontend should create stable client-side identity immediately.

Important:

* the optimistic image must remain usable in preview
* the optimistic image must remain editable
* the optimistic image must remain reorderable
* the optimistic image must remain deletable
* when backend confirmation completes, reconcile instead of replacing in a way that breaks UI state

Delete during upload

If the user deletes an image while it is still uploading:

* remove it visually immediately
* mark the optimistic image as delete-requested
* if upload fails, no backend delete is needed
* if upload succeeds, send delete/unlink as required after the backend image id is known

This reconciliation is important and should be handled inside the Images feature controller, not scattered across consuming forms.



Upload begins immediately after capture, but the raw camera image must not be uploaded directly.
The UI should insert the optimistic image immediately after capture using a local object URL. The user should see the image right away, even while compression and upload are still running asynchronously.
Flow:
1. Capture the raw image frame from the camera stream.
2. Create a local object URL and insert the optimistic image into the current image collection immediately.
3. Run the async image compression / normalization pipeline.
4. Convert / crop the captured image into the required 1:1 square format.
5. Resize the image using configurable compression params.
6. Convert the final upload payload to `.webp`.
7. Request upload URL from `POST /api/v1/images/upload-url` using the final compressed file metadata.
8. Upload the compressed `.webp` `Blob` directly to the returned `upload_url`.
9. Confirm the upload with `POST /api/v1/images/confirm-upload`.
10. Reconcile the optimistic image with the confirmed backend image.
11. Keep local display order stable.
Important ordering rule:
The upload URL request must happen after compression finishes, because the backend upload-url request must describe the actual file that will be uploaded, not the original raw camera capture.
The upload-url request must use:
- final `.webp` file name
- final `image/webp` content type
- final compressed file size
- final width and height when available
### Image Compression / Normalization
Do not upload the raw camera image directly.
Before requesting the upload URL, the frontend must process the captured image through a reusable client-side image compression pipeline.
The compression pipeline should:
- accept the raw captured `Blob` or canvas output
- crop / normalize the image to the intended 1:1 square format
- resize the image according to configurable params
- convert the final output to `.webp`
- control output quality through configurable params
- produce the final `Blob` used for upload
- expose final metadata such as:
  - file name
  - content type
  - file size
  - width
  - height
Default target format:
- MIME type: `image/webp`
- file extension: `.webp`
Suggested configurable compression params:
```ts
const DEFAULT_IMAGE_COMPRESSION_OPTIONS = {
  maxWidthPx: 1600,
  maxHeightPx: 1600,
  quality: 0.82,
  mimeType: "image/webp",
  outputExtension: "webp",
};

The exact values may be adjusted after checking current performance and backend expectations, but the architecture must support configurable params instead of hardcoded one-off values.

The compression utility should be reusable and independent from the camera page so future flows can compress images from other sources, such as file picker uploads.

Recommended implementation direction:

* use native browser canvas APIs for the first version
* avoid adding a heavy image compression library unless strongly justified
* avoid base64 conversion
* keep the utility testable as a browser helper
* return Blob, object URL, and metadata as needed by the image upload controller
* revoke temporary object URLs when no longer needed

Potential helper names:

* compressImageForUpload
* createWebpImageBlob
* normalizeCapturedImage
* buildCompressedImageFileName

The compression pipeline belongs between capture and upload-url creation.

Async Pipeline Example

const optimisticImage = createOptimisticImageFromCapture(rawImageBlob);
insertOptimisticImage(optimisticImage);
const compressed = await compressImageForUpload(rawImageBlob, {
  maxWidthPx: 1600,
  maxHeightPx: 1600,
  quality: 0.82,
  mimeType: "image/webp",
  outputExtension: "webp",
});
const uploadUrlResponse = await requestImageUploadUrl({
  entity_type: entityType,
  entity_client_id: entityClientId,
  file_name: compressed.fileName,
  content_type: compressed.contentType,
  file_size_bytes: compressed.fileSizeBytes,
});
await uploadBlobToSignedUrl({
  uploadUrl: uploadUrlResponse.upload_url,
  blob: compressed.blob,
  contentType: compressed.contentType,
});
const confirmedImage = await confirmImageUpload({
  pending_upload_client_id: uploadUrlResponse.pending_upload_client_id,
  entity_type: entityType,
  entity_client_id: entityClientId,
});
reconcileOptimisticImage({
  optimisticClientId: optimisticImage.clientId,
  confirmedImage,
});

The important architectural point is that the optimistic image appears immediately, but the upload pipeline continues asynchronously in the background of the current UI interaction.

The upload lifecycle should therefore support these internal states:

* captured
* compressing
* requesting_upload_url
* uploading
* confirming
* completed
* failed
* delete_requested
* deleting

These states do not all need to be rendered as separate UI labels, but the controller should be able to distinguish them internally for correct reconciliation.

⸻

8. Image Preview Grid Layout and Behavior

Implement a reusable ImagePreviewGrid that parent features can place anywhere.

This grid is the main image interface used in forms and preview/detail pages.

Layout

Default mobile layout:

* CSS grid
* 3 columns
* maximum 2 visible rows by default
* square tiles
* rounded corners
* consistent gap using current spacing tokens

The grid should be configurable enough for parent contexts, but the default behavior should be:

* max 6 visible image previews
* 3 columns x 2 rows
* square aspect ratio

Tile layout

Each image tile:

* displays the image as cover
* has rounded corners
* clips overflow
* has a subtle background while loading
* supports dark upload overlay
* supports spinner while uploading
* supports failed state indication

Uploading state:

* image preview visible if local object URL exists
* dark overlay above image
* centered spinner

Failed state:

* visible error state
* retry affordance may be planned if supported by architecture

Tap behavior

Single tap on a tile:

* opens the full-screen image viewer
* passes the full current image list
* opens at the tapped image index

Long press behavior

Long press on any tile:

* enters edit/reorder mode
* all tiles begin a subtle shake animation
* delete controls become visible
* reorder behavior becomes active

Edit/reorder mode layout

In reorder mode:

* each tile shows an x delete button at top-right
* grid displays a check/confirm action
* tile shaking animation indicates editable state
* user can drag tiles to reorder
* user can tap outside the grid to exit if architecture supports outside press handling

Exit reorder mode:

* tap check button
* tap outside
* complete reorder

Reorder changes should be optimistic and then persisted through POST /api/v1/images/reorder.

⸻

9. Drag and Drop Library Decision

Use @dnd-kit for drag and drop.

Recommended packages:

@dnd-kit/core
@dnd-kit/sortable
@dnd-kit/utilities

Reasoning:

* good React support
* supports sortable grids
* supports pointer and touch interactions
* works for mobile-first drag behavior
* avoids the heavier/older assumptions of some HTML5 DnD libraries
* can be scoped to only the preview grid

Implementation guidance:

* use sortable grid behavior only inside reorder mode
* avoid enabling drag during normal preview mode
* use long press or activation constraints for touch sensors
* keep drag transforms GPU-friendly
* keep the 3x2 preview grid simple

Do not use native HTML5 drag and drop for the mobile grid.

If project contracts already define a preferred DnD package, follow the contract. Otherwise, use @dnd-kit.

⸻

10. Full-Screen Image Viewer Layout and Behavior

Implement a full-screen image carousel viewer page.

This page should be opened inside the existing full-page slide surface system.

Viewer purpose

The viewer supports:

* full-screen image viewing
* carousel navigation
* opening at selected image index
* metadata/action sheet access
* optional edit mode
* optional delete actions depending on mode

Viewer layout

Base layout:

* full-screen dark background
* image centered in viewport
* image uses contain behavior, not cover
* image should preserve full visibility
* gestures should not accidentally scroll the underlying page

Top-right:

* three-dot action button
* opens bottom sheet with metadata/actions for current image

Bottom region:

* carousel dot indicators centered
* close/back arrow button at bottom-right
* edit button at bottom-left only when viewer mode allows editing

The back arrow should match the camera page close/back visual language.

Carousel behavior

Use a lightweight carousel approach optimized for touch.

Preferred implementation:

* use embla-carousel-react

Recommended package:

embla-carousel-react

Reasoning:

* lightweight
* smooth touch gestures
* good mobile carousel behavior
* React-friendly
* avoids building complex momentum/swipe logic manually

Carousel expectations:

* horizontal swipe
* opens at provided initial index
* maintains active index
* updates dot indicators
* supports optimistic images
* avoids layout jank when images are loading


⸻

11. Viewer Modes

The full-screen viewer must support explicit modes.

Preview-only mode

Use when the consuming feature only wants image visualization.

Allowed:

* swipe images
* close viewer
* open metadata sheet

Not allowed:

* edit image
* delete image
* annotation tools

Preview-edit mode

Use when the consuming feature owns image modification rights.

Allowed:

* swipe images
* close viewer
* open metadata sheet
* delete image
* enter image edit mode

Image edit mode

Use when editing the current image.

Allowed:

* draw freehand strokes
* place text
* place shapes
* move/adjust annotations if supported
* save annotation
* cancel editing

The viewer should not always render editing tools. Editing tools only appear in edit mode.

⸻

12. Image Metadata / Actions Sheet Layout

The three-dot button opens a bottom slide sheet using the existing sheet/surface system.

The sheet is scoped to the current image.

Content should include:

* image preview thumbnail or small header reference
* created/uploaded date
* uploaded by / created by when available
* file size when available
* dimensions when available
* current upload/event state when useful
* delete action when viewer mode allows editing/deletion
* future actions can be added later

The sheet must not own global image state. It receives the current image and callbacks/actions from the image controller.

⸻

13. Image Editing / Annotation Library Decision

Use react-konva / konva for the image annotation editor unless existing architecture contracts define a different canvas standard.

Recommended packages:

konva
react-konva

Reasoning:

* suitable for canvas-like interactive drawing tools
* supports shapes, text, freehand lines, transforms, and layering
* React-friendly
* easier to model annotation overlays than raw canvas
* extensible for future measurement/highlight tools

This is preferable to building a complete editor from scratch.

Avoid heavy full image editor packages unless explicitly justified. The desired editor is not a Photoshop-like editor; it is an operational annotation overlay tool.

Editor capabilities

Initial editor should plan for:

* freehand draw
* arrow
* circle
* rectangle
* highlight
* text
* measurement later

These match backend annotation enum direction:

* draw
* arrow
* circle
* rectangle
* text
* measurement
* highlight

Use the endpoint definitions from image_tables_and_endpoints.md to confirm exact enum values.

Editor layout

Image edit mode should render:

* full-screen dark background
* image centered
* annotation canvas overlay aligned exactly over the image
* top or bottom toolbar for annotation tools
* save action
* cancel/back action

Toolbar should be mobile-first:

* compact icon buttons
* selected tool highlighted
* no large desktop-style panels

Annotation persistence

Annotations should be saved through:

POST /api/v1/images/{image_client_id}/annotations

Use backend schema from image_tables_and_endpoints.md.

Annotation data should store the editor payload needed to re-render the overlay.

Plan a clean internal annotation data shape for each annotation type, for example:

* points for freehand draw
* x/y/width/height for rectangles
* x/y/radius for circles
* start/end points for arrows
* text content + x/y + style data for text

The final payload must remain compatible with backend data: object.

Editing optimistic images

If an image has not completed upload yet, the editor should still allow local annotation creation.

If the backend image id is not yet confirmed:

* keep annotation locally attached to the optimistic image
* when upload confirmation returns, reconcile and persist annotation against the confirmed image id

This must be controlled by the Images feature orchestration layer.

⸻

14. Add Picture Button / Trigger Layout

Provide a reusable add-picture trigger component.

Default appearance:

* button or primitive box aligned with existing app style
* + Add picture label
* optional camera icon
* touch-friendly height
* parent can place it anywhere

Behavior:

* calls parent/controller openCamera
* does not directly own camera surface internals
* can be used independently from the preview grid

Example usage patterns:

* form renders Add Picture button above preview grid
* detail page renders Add Picture button inside an image section
* task documentation flow renders camera trigger as a primary action

⸻

15. Entity Image Interface

The Images feature should expose an entity-oriented interface.

At the controller boundary, consumers should provide:

entityType: "item" | "case" | "case_conversation_message";
entityClientId: string;

The actual enum values must come from backend schemas in image_tables_and_endpoints.md.

The controller should handle:

* fetching current images
* creating upload URLs
* confirming uploads
* deleting/unlinking images
* reordering images
* creating annotations
* opening camera/viewer/sheets
* optimistic state reconciliation

⸻

16. Delete and Unlink Semantics

The backend provides both:

* unlink image from entity
* soft-delete image

Claude should inspect current backend semantics from endpoint documentation and existing API patterns before deciding which action each UI should call.

General intention:

* deleting from a specific entity image collection should usually unlink from that entity
* full soft-delete may be used when the system intends to delete the image record globally

Do not guess this. Make the implementation plan explicitly decide based on backend contract and existing app conventions.

⸻

17. Performance Expectations

This feature is interaction-heavy. Prioritize:

* smooth camera stream
* low-latency capture
* fast optimistic preview
* GPU-friendly transitions
* minimal rerenders
* stable object URLs
* object URL cleanup
* lazy image loading
* avoiding unnecessary base64 conversion
* avoiding large images stored in React state
* avoiding memory leaks from media streams
* avoiding unnecessary canvas work

Important memory rules:

* use Blob/object URLs for local previews
* revoke object URLs when no longer needed
* stop media tracks when the controller decides the stream is no longer needed
* avoid storing raw image blobs in broad global state longer than necessary

⸻

18. Surface Integration Expectations

Use the existing surface/sheet architecture.

Expected surfaces:

* full-page camera surface
* full-page image viewer surface
* bottom sheet image metadata/actions surface

The Images feature may provide surface page components and controllers, but should remain aligned with the existing surface registry and navigation contracts.

Camera and viewer should not be normal routed pages unless current architecture requires that. They are interaction surfaces.

⸻

19. Validation and Testing Expectations

Implementation planning should include:

* TypeScript typecheck
* Zod runtime validation for API responses
* upload-url flow validation
* direct upload validation
* confirm-upload validation
* optimistic reconciliation validation
* delete-while-uploading validation
* reorder validation
* annotation creation validation
* full-screen viewer interaction validation
* carousel initial-index validation
* mobile camera permission handling
* camera unavailable fallback
* object URL cleanup validation
* media stream cleanup validation
* Playwright coverage for primary interactions where practical

Manual mobile testing should include:

* iPhone Safari
* Android Chrome if available
* camera permission first-run behavior
* repeated open/close camera behavior
* taking several pictures quickly
* deleting an uploading picture
* reordering pictures
* opening preview from grid
* opening preview from camera thumbnail
* entering and exiting edit mode

⸻

20. Phased Implementation Recommendation

Because this feature is large, implement it in phases.

Phase 1: Backend contract and schemas

* read image_tables_and_endpoints.md
* create DTO schemas
* create API clients
* create normalized image view model mapper
* create entity image query/mutation hooks

Phase 2: Preview grid and add-picture trigger skeleton

* render entity image list
* render add-picture button
* render upload states with mocked/local states if needed
* open full-screen viewer from tile

Phase 3: Upload lifecycle

* implement upload-url request
* direct upload to storage URL
* confirm upload
* optimistic image insertion
* reconcile confirmed image
* handle failures

Phase 4: Camera page

* implement media stream controller
* implement prewarming
* implement square capture
* implement haptics/flash
* connect capture to upload lifecycle

Phase 5: Full-screen viewer

* implement embla-carousel-react
* open at selected index
* render dots
* support preview-only and preview-edit mode
* connect metadata sheet

Phase 6: Reorder/delete mode

* implement long-press edit mode
* implement @dnd-kit sortable grid
* implement optimistic reorder
* persist reorder
* implement delete/unlink reconciliation

Phase 7: Annotation editor

* implement react-konva editor
* support initial tools
* save annotation through backend endpoint
* render saved annotation overlays
* support optimistic annotation persistence

⸻

21. Architecture Alignment Expectations

Follow and align implementation with:

* architecture/01_architecture.md
* architecture/05_server_state.md
* architecture/06_client_state.md
* architecture/07_components.md
* architecture/08_hooks.md
* architecture/09_forms.md
* architecture/14_styling.md
* architecture/15_feature_structure.md
* architecture/16_feature_workflow.md
* architecture/18_performance.md
* architecture/21_realtime.md
* architecture/23_providers.md
* architecture/24_dto.md
* architecture/27_responsive.md
* architecture/28_surfaces.md
* architecture/29_scroll.md
* architecture/30_dynamic_loading.md
* architecture/31_animations.md
* architecture/32_loading_skeletons.md
* architecture/33_vaul_drawer.md
* architecture/34_runtime_validation.md

Claude should inspect these contracts and produce a robust implementation plan consistent with the current app architecture.

⸻

22. Final Implementation Goal

The goal is to establish the shared image interaction system for the entire operational platform.

This feature should power:

* operational forms
* item image documentation
* task documentation
* restoration workflows
* customer/case communication
* evidence/documentation flows
* inventory imaging
* future AI-assisted image analysis systems

The implementation should prioritize:

* composability
* optimistic orchestration
* mobile-native feeling
* clear backend contract alignment
* strict schema validation
* scalable surface orchestration
* smooth camera and carousel interactions
* maintainable annotation architecture
* long-term feature independence

Main concrete choices added:
- **Image editing:** `konva` + `react-konva`
- **Carousel:** `embla-carousel-react`
- **Drag/reorder:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **Camera:** native browser APIs, not a heavy camera package
- **Backend schemas:** explicitly source from `image_tables_and_endpoints.md`
````

# Images Feature Implementation Plan Division

Break the Images feature into multiple implementation plans instead of one large plan. Each plan should be independently reviewable, testable, and implementable without forcing the whole image system to land at once.
The recommended division is:

---

## PLAN_01_images_contracts_dtos_and_api_client

Purpose:
Build the backend contract foundation for the Images feature.
Scope:

- read `image_tables_and_endpoints.md`
- define image-related DTOs
- define Zod schemas
- define backend enum schemas
- define request/response schemas
- define normalized frontend image view models
- create API client functions for all image endpoints
- create mapper functions from backend payloads to frontend view models
  Should include:
- `ImageDto`
- `ImageEventDto`
- `ImageAnnotationDto`
- `ImageLinkDto`
- `EntityImageDto`
- `ImageViewModel`
- upload-url request/response schema
- confirm-upload request/response schema
- reorder request/response schema
- unlink request/response schema
- delete response schema
- get/list image response schemas
- annotation request/response schemas
  Do not include:
- camera UI
- carousel UI
- drag-and-drop UI
- image editor UI
- optimistic upload orchestration
  Goal:
  Establish the type-safe contract layer that every later image plan depends on.

---

## PLAN_02_images_entity_queries_and_mutations

Purpose:
Build the TanStack Query / server-state layer for images.
Scope:

- list images for an entity
- get image by client id
- request upload URL
- confirm upload
- upload Blob to signed URL
- reorder images
- unlink image from entity
- soft-delete image
- create annotation
- get download URL if needed
  Should include:
- query keys
- query hooks
- mutation hooks
- invalidation strategy
- error handling conventions
- runtime response validation
- API warning handling
  Do not include:
- camera capture
- compression implementation
- preview grid UI
- full-screen viewer
- editor UI
  Goal:
  Create the reusable server-state layer consumed by the image controllers.

---

## PLAN_03_images_compression_and_upload_pipeline

Purpose:
Build the async image compression and upload orchestration pipeline.
Implementation note:
- Archived on `2026-05-21T21:30:33Z` after adding reusable compression and upload pipeline utilities in `apps/managers-app/ManagerBeyo-app-managers/src/features/images/lib/` and passing `npm run typecheck` in the managers app package.
Scope:

- raw captured Blob handling
- 1:1 crop normalization
- `.webp` conversion
- configurable compression options
- compressed metadata generation
- upload-url request after compression
- direct upload to signed URL
- confirm-upload call
- upload lifecycle states
  Should include:
- `compressImageForUpload`
- `normalizeCapturedImage`
- `createWebpImageBlob`
- `buildCompressedImageFileName`
- upload pipeline function/controller
- upload states:
  - `captured`
  - `compressing`
  - `requesting_upload_url`
  - `uploading`
  - `confirming`
  - `completed`
  - `failed`
  - `delete_requested`
  - `deleting`
    Important rule:
    The upload URL request must happen after compression, because the backend must receive the final `.webp` metadata.
    Do not include:
- camera page UI
- preview grid reorder UI
- carousel UI
- annotation editor
  Goal:
  Create a reusable async upload pipeline that can be used by camera capture now and file picker upload later.

---

## PLAN_04_images_optimistic_entity_controller

Purpose:
Build the client orchestration layer that owns optimistic images for a given entity.
Scope:

- `useEntityImagesController`
- normalized image collection state
- optimistic insertion
- upload reconciliation
- delete during upload
- failed upload state
- reorder state
- selected image index
- preview open actions
- camera open actions
- metadata sheet open actions
- annotation reconciliation for optimistic images
  Should include:
- stable optimistic client ids
- mapping optimistic images to confirmed backend images
- delete-requested handling while upload is still running
- optimistic reorder
- mutation integration from PLAN_02
- upload pipeline integration from PLAN_03
  Do not include:
- final camera UI
- final carousel UI
- final editor UI
  Goal:
  Create the central feature controller that future UI components can consume without duplicating image lifecycle logic.

---

## PLAN_05_images_preview_grid_and_add_picture_trigger

Purpose:
Build the reusable image preview grid and add-picture trigger UI.
Scope:

- `ImagePreviewGrid`
- `ImagePreviewTile`
- `ImageUploadOverlay`
- `ImageAddPictureButton`
- empty state
- uploading state
- failed state
- completed state
- tap-to-preview behavior
- long-press entry into reorder/delete mode skeleton
  Layout requirements:
- 3 columns
- max 2 visible rows by default
- square tiles
- rounded corners
- upload overlay with spinner
- delete `x` button in edit mode
- check button to exit edit mode
  Do not include:
- real drag-and-drop implementation yet, unless included as a small skeleton
- full carousel viewer implementation
- camera implementation
- annotation editor
  Goal:
  Make the main reusable image interface visible and usable inside forms/detail pages.

---

## PLAN_06_images_camera_page_and_camera_controller

Purpose:
Build the mobile-first camera capture page.
Scope:

- native browser camera APIs
- camera stream controller
- stream prewarming
- full-page camera surface page
- 1:1 capture frame
- bottom control layout
- capture button
- latest preview thumbnail
- back/close arrow
- haptic feedback
- flash animation
- capture Blob generation
- connect capture to upload controller
  Layout requirements:
- full-screen dark camera page
- video fills the screen
- 1:1 crop/capture behavior
- capture button centered bottom
- latest image preview button bottom-left
- close/back arrow bottom-right
  Do not include:
- image editor
- drag-and-drop grid
- metadata sheet
- backend DTO definitions
  Goal:
  Allow the user to take pictures and immediately send them into the optimistic upload pipeline.

---

## PLAN_07_images_fullscreen_carousel_viewer

Purpose:
Build the full-screen image preview viewer using `embla-carousel-react`.
Scope:

- full-screen viewer page
- Embla carousel integration
- open at initial index
- swipe navigation
- dot indicators
- dark background
- contain image behavior
- close/back action
- metadata button
- mode-aware edit button
  Viewer modes:
- `preview-only`
- `preview-edit`
- `image-edit`
  Important:
  The mode system should be custom lightweight TypeScript state, not a library.
  Do not include:
- annotation editor internals
- metadata sheet internals beyond trigger
- camera
- upload pipeline
  Goal:
  Create the smooth Instagram-like full-screen image preview experience.

---

## PLAN_08_images_metadata_actions_sheet

Purpose:
Build the image metadata and action bottom sheet.
Scope:

- bottom sheet page for current image
- image metadata rendering
- uploaded/created date
- created by / uploaded by when available
- file size
- dimensions
- upload/event state
- delete/unlink action when mode allows
- future action slots
  Do not include:
- full viewer implementation
- image editor
- drag-and-drop
- camera
  Goal:
  Provide the three-dot image actions/details sheet used by the full-screen viewer.

---

## PLAN_09_images_reorder_and_delete_mode

Purpose:
Build the reorder/delete behavior for the preview grid using `@dnd-kit`.
Scope:

- long-press activation
- shake/edit mode
- sortable grid
- drag sensors
- touch activation constraints
- optimistic reorder
- persist reorder through `POST /api/v1/images/reorder`
- delete `x` action
- delete while uploading reconciliation
- exit edit mode behavior
  Library:
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
  Do not include:
- camera
- carousel viewer
- annotation editor
  Goal:
  Make the image preview grid behave like a mobile app edit/reorder surface.

---

## PLAN_10_images_annotation_editor

Purpose:
Build the image annotation editor using `konva` and `react-konva`.
Scope:

- editor mode inside viewer or dedicated editor page
- image canvas rendering
- annotation overlay alignment
- freehand draw
- rectangle
- circle
- arrow
- text
- highlight
- selected tool state
- save annotation
- cancel editing
- render saved annotations
- persist through `POST /api/v1/images/{image_client_id}/annotations`
  Library:
- `konva`
- `react-konva`
  Annotation types should align with backend enums:
- `draw`
- `arrow`
- `circle`
- `rectangle`
- `text`
- `measurement`
- `highlight`
  Do not include:
- upload pipeline
- camera
- reorder grid
  Goal:
  Create the operational annotation system without building a heavy Photoshop-style editor.

---

## PLAN_11_images_surface_registration_and_integration

Purpose:
Wire the Images feature into the existing surface architecture.
Scope:

- register camera full-page surface
- register image viewer full-page surface
- register metadata bottom sheet
- register editor surface if separated
- expose controller methods for opening surfaces
- make sure surfaces work from any consuming feature
  Should include integration examples for:
- item form
- item detail/card
- future case page
  Do not include:
- core API implementation
- compression internals
- editor internals
  Goal:
  Make the Images feature usable by parent features through the established surface system.

---

## PLAN_12_images_final_integration_validation_and_tests

Purpose:
Validate the complete Images feature behavior end-to-end.
Scope:

- TypeScript validation
- build validation
- Zod response validation
- upload flow validation
- compression validation
- camera permission fallback
- preview grid behavior
- carousel initial index behavior
- delete while uploading
- reorder persistence
- annotation persistence
- object URL cleanup
- media stream cleanup
- mobile manual test checklist
- Playwright coverage where practical
  Goal:
  Confirm the full feature works reliably across the primary mobile workflows.

---

# Recommended Implementation Order

Implement in this order:

1. `PLAN_01_images_contracts_dtos_and_api_client`
2. `PLAN_02_images_entity_queries_and_mutations`
3. `PLAN_03_images_compression_and_upload_pipeline`
4. `PLAN_04_images_optimistic_entity_controller`
5. `PLAN_05_images_preview_grid_and_add_picture_trigger`
6. `PLAN_06_images_camera_page_and_camera_controller`
7. `PLAN_07_images_fullscreen_carousel_viewer`
8. `PLAN_08_images_metadata_actions_sheet`
9. `PLAN_09_images_reorder_and_delete_mode`
10. `PLAN_10_images_annotation_editor`
11. `PLAN_11_images_surface_registration_and_integration`
12. `PLAN_12_images_final_integration_validation_and_tests`

# Important Planning Rule

Each plan should produce a standalone implementation document with:

- objective
- files to inspect
- files to create/change
- implementation steps
- architecture constraints
- expected public API
- validation checklist
- out-of-scope section
  Do not allow one plan to silently implement another plan’s responsibility. The goal is controlled, reviewable implementation.
