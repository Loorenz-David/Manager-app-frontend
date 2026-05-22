# PLAN_image_annotation_hide_toggle_20260522

## Metadata

- Plan ID: `PLAN_image_annotation_hide_toggle_20260522`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T15:59:25Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Add a "Hide annotations" / "Show annotations" toggle action to the image metadata bottom sheet in the fullscreen viewer.
- Business/user intent: A user reviewing an image sometimes wants to see the raw image without annotation overlays obscuring the content. The hide state is local to the current viewer session and per-image — closing the viewer resets all images to visible, and hiding annotations on one image does not affect other images in the carousel.
- Non-goals: Persisting the hidden state to the backend or across sessions. Hiding annotations in the thumbnail preview grid (only affects the fullscreen viewer). Any changes to the annotation data model, canvas, or editor.

## Scope

- In scope:
  - **Edit `ImageMetadataSurfaceProps`**: add `annotationsVisible?: boolean` and `onToggleAnnotations?: () => void` to the type.
  - **Edit `ImageFullscreenViewerPage`**: add a `hiddenAnnotationIds: Set<string>` state; pass `annotationsVisible` and `onToggleAnnotations` when opening the metadata surface; gate the `annotationOverlay` on the hidden state.
  - **Edit `ImageMetadataActionsSheetPage`**: read the two new props; add local toggle state; render a Hide/Show annotations button only when the image has annotations.
- Out of scope:
  - Any backend change or persistence.
  - Thumbnail grid annotation visibility.
  - Changes to `ImageAnnotationSvgLayer`, `ZoomableImage`, or any hook/action/API file.

## Clarifications required

_None._

## Acceptance criteria

1. Tapping the three-dot button while viewing an annotated image opens the metadata sheet with a "Hide annotations" action.
2. Tapping "Hide annotations" immediately removes the annotation overlay from that image in the viewer behind the sheet. The button label changes to "Show annotations" within the same sheet session.
3. Closing the sheet and reopening it on the same image shows "Show annotations" (the hidden state persisted while the viewer is open).
4. Tapping "Show annotations" restores the overlay. The button label returns to "Hide annotations".
5. Swiping to a different image that has annotations shows that image's annotations — the hide state does not bleed across images.
6. Closing the fullscreen viewer and reopening it resets all images to visible (annotations shown).
7. Images with no annotations do not show the hide/show button in the metadata sheet.
8. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: `ImageMetadataActionsSheetPage` is a sheet surface — it reads props via `useSurfaceProps` and has no data-fetching.
- `architecture/08_hooks.md`: surface props are frozen at open time; callbacks passed as props must use either a ref-forwarding pattern or a stable updater function so they do not become stale.

### File read intent — pattern vs. relational

Permitted relational reads already done:
- `pages/ImageFullscreenViewerPage.tsx` — confirmed existing `hiddenAnnotationIds`-free state, how `handleMetadataPress` opens the sheet, and how `annotationOverlay` is currently rendered.
- `pages/ImageMetadataActionsSheetPage.tsx` — confirmed existing actions (Download, Delete) and JSX structure for adding a new action row.
- `controllers/use-entity-images.controller.ts` — confirmed `ImageMetadataSurfaceProps` type and where it is defined.
- `surfaces.ts` — confirmed `IMAGE_METADATA_SURFACE_ID` surface registration (sheet).

## Implementation plan

---

### Step 1 — Extend `ImageMetadataSurfaceProps`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/controllers/use-entity-images.controller.ts`

Add two optional fields to `ImageMetadataSurfaceProps`:

```ts
export type ImageMetadataSurfaceProps = {
  image: ImageViewModel;
  entityType: ImageLinkEntityType;
  entityClientId: string;
  mode: ImageViewerMode;
  onDelete?: (imageClientId: string) => void;
  annotationsVisible?: boolean;
  onToggleAnnotations?: () => void;
};
```

No other changes to this file.

---

### Step 2 — Add hide state and toggle to `ImageFullscreenViewerPage`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageFullscreenViewerPage.tsx`

#### 2a — Add `hiddenAnnotationIds` state

After the existing `const isAnySlideZoomedRef = useRef(false);` line, add:

```ts
const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState<Set<string>>(new Set());
```

No import changes needed — `useState` is already imported.

#### 2b — Add `handleToggleAnnotation`

Add a new `useCallback` after the existing `handleClose`:

```ts
const handleToggleAnnotation = useCallback((imageClientId: string) => {
  setHiddenAnnotationIds((previous) => {
    const next = new Set(previous);
    if (next.has(imageClientId)) {
      next.delete(imageClientId);
    } else {
      next.add(imageClientId);
    }
    return next;
  });
}, []);
```

Using a Set updater function (creates new Set each time) so React detects the state change and re-renders. The `useCallback` has `[]` deps because `setHiddenAnnotationIds` is stable.

#### 2c — Pass hide props to `handleMetadataPress`

Update `handleMetadataPress` to include the two new props and add `hiddenAnnotationIds` to the dependency array:

```ts
const handleMetadataPress = useCallback(() => {
  if (!currentImage || !entityType || !entityClientId) {
    return;
  }

  surface.open(IMAGE_METADATA_SURFACE_ID, {
    image: currentImage,
    entityType,
    entityClientId,
    mode,
    onDelete: mode === 'preview-edit' ? handleDelete : undefined,
    annotationsVisible: !hiddenAnnotationIds.has(currentImage.clientId),
    onToggleAnnotations: () => handleToggleAnnotation(currentImage.clientId),
  } satisfies ImageMetadataSurfaceProps);
}, [currentImage, entityClientId, entityType, handleDelete, handleToggleAnnotation, hiddenAnnotationIds, mode, surface]);
```

`annotationsVisible` is read at the moment the sheet opens (always fresh because `currentImage` and `hiddenAnnotationIds` are both in deps). `onToggleAnnotations` closes over `currentImage.clientId` (the image active at open time — correct, since the toggle should affect exactly that image) and calls the stable `handleToggleAnnotation`. Using `setHiddenAnnotationIds` with an updater function inside `handleToggleAnnotation` means the callback does not need to be re-created on each toggle.

#### 2d — Gate `annotationOverlay` on hidden state

In the `images.map()` render block, update the `annotationOverlay` prop on `<ZoomableImage>`:

```tsx
<ZoomableImage
  annotationOverlay={
    hiddenAnnotationIds.has(image.clientId) ? null : (
      <ImageAnnotationSvgLayer
        annotations={image.annotations}
        heightPx={image.heightPx}
        markerId={`img-ann-arrow-${image.clientId}`}
        testId={`viewer-annotation-overlay-${image.clientId}`}
        widthPx={image.widthPx}
      />
    )
  }
  src={displayUrl}
  onZoomChange={(isZoomed) => {
    isAnySlideZoomedRef.current = isZoomed;
  }}
/>
```

When `hiddenAnnotationIds.has(image.clientId)` is true, `null` is passed — `ZoomableImage` renders no overlay for that slide. All other slides are unaffected.

---

### Step 3 — Add toggle button to `ImageMetadataActionsSheetPage`

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageMetadataActionsSheetPage.tsx`

#### 3a — Update imports

Add `Eye` and `EyeOff` to the lucide-react import:

```ts
import { Download, Eye, EyeOff, Trash2 } from 'lucide-react';
```

#### 3b — Read new props from surface

Update the `useSurfaceProps` destructure:

```ts
const { image, mode = 'preview-only', onDelete, annotationsVisible, onToggleAnnotations } =
  useSurfaceProps<ImageMetadataSurfaceProps>();
```

#### 3c — Add local visible state

Add local state for real-time toggle feedback within the same sheet session. Add directly after the existing `const [isDownloading, setIsDownloading] = useState(false);` line:

```ts
const [localAnnotationsVisible, setLocalAnnotationsVisible] = useState(
  annotationsVisible ?? true,
);
```

Initialized from `annotationsVisible` (the frozen prop value at open time). Changes are tracked locally so the button label updates immediately without requiring the sheet to close and reopen.

#### 3d — Add `handleToggleAnnotations`

Add after `handleDelete`:

```ts
const handleToggleAnnotations = useCallback(() => {
  setLocalAnnotationsVisible((previous) => !previous);
  onToggleAnnotations?.();
}, [onToggleAnnotations]);
```

Two effects on tap: updates local state (immediate UI label flip) and notifies the viewer (updates `hiddenAnnotationIds` in the parent). Both are side-effect free when `onToggleAnnotations` is undefined (images with no annotations will never show the button anyway).

#### 3e — Render the toggle button

Add the new action button inside `data-testid="metadata-sheet-actions"`, between the Download button and the Delete button:

```tsx
{image?.annotations && image.annotations.length > 0 ? (
  <button
    aria-label={localAnnotationsVisible ? 'Hide annotations' : 'Show annotations'}
    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-foreground transition-colors duration-150 hover:bg-muted"
    data-testid="metadata-sheet-toggle-annotations-button"
    type="button"
    onClick={handleToggleAnnotations}
  >
    {localAnnotationsVisible ? (
      <EyeOff className="size-4 shrink-0" aria-hidden="true" />
    ) : (
      <Eye className="size-4 shrink-0" aria-hidden="true" />
    )}
    <span className="text-sm font-medium">
      {localAnnotationsVisible ? 'Hide annotations' : 'Show annotations'}
    </span>
  </button>
) : null}
```

The button only renders when `image.annotations.length > 0` — images with no annotations do not show the toggle. Icon: `EyeOff` when annotations are visible (action = hide), `Eye` when annotations are hidden (action = show). This follows the convention of showing the action the button will perform, not the current state.

---

## Risks and mitigations

- Risk: `onToggleAnnotations` is frozen at sheet-open time. If the user somehow opened the sheet, toggled, and then (without closing the sheet) the `hiddenAnnotationIds` state changed from outside, `annotationsVisible` would be stale.
  Mitigation: There is no other path that mutates `hiddenAnnotationIds` — only the toggle callback does. The local state in the sheet is the source of truth for the button label during a session, so this is not a real risk.

- Risk: `hiddenAnnotationIds` added to `handleMetadataPress` dep array will cause the callback to be recreated on every toggle. This means opening the three-dot sheet re-creates the function.
  Mitigation: Recreation is cheap (no side effects) and only happens when `hiddenAnnotationIds` actually changes. The sheet is re-opened each time anyway, so no surface stale-closure issue exists here.

- Risk: `useState<Set<string>>(new Set())` — if the component re-renders for an unrelated reason, the initial `new Set()` expression is evaluated but discarded (React only uses it once). No memory or performance issue.
  Mitigation: None needed; this is expected React behavior.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `apps/managers-app/ManagerBeyo-app-managers`
- Manual — annotated image: open fullscreen viewer on an image with saved annotations → tap three-dot button → "Hide annotations" action is visible.
- Manual — hide: tap "Hide annotations" → sheet label changes to "Show annotations" → annotations disappear from the image visible behind/under the sheet.
- Manual — persist in session: close sheet → tap three-dot again → button shows "Show annotations" (hidden state persisted).
- Manual — show: tap "Show annotations" → annotations reappear on the image.
- Manual — cross-image isolation: hide annotations on image A → swipe to image B → image B annotations still visible.
- Manual — session reset: close viewer → reopen → annotations visible again on all images.
- Manual — unannotated image: open metadata sheet for an image with no annotations → "Hide annotations" button is not rendered.

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
