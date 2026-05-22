# PLAN_image_annotation_overlay_display_20260522

## Metadata

- Plan ID: `PLAN_image_annotation_overlay_display_20260522`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T15:52:18Z`
- Related issue/ticket: `—`
- Intention plan: `—`

## Goal and intent

- Goal: Display saved image annotations visually on top of images in both the thumbnail preview grid and the fullscreen viewer carousel.
- Business/user intent: Users who have annotated an image (drawn on it, added text, shapes, etc.) must be able to see those annotations when browsing images — both as a small indicator on the grid tile and at full fidelity in the fullscreen viewer. Currently annotations exist in the API response but are never rendered.
- Non-goals: Allowing interaction with annotations in these views (tap/delete/edit — that belongs to the editor). Fetching additional data (annotations are already included in the list and detail query responses). Changing the annotation data model or any surface/controller logic.

## Scope

- In scope:
  - **New component `ImageAnnotationSvgLayer`**: a pure SVG overlay that renders all annotation items from an `ImageAnnotationViewModel[]` array using normalized coordinates. Used in both thumbnail and fullscreen contexts.
  - **Edit `ZoomableImage`**: add an `annotationOverlay?: ReactNode` prop. Render it inside the CSS-transform element (so annotations zoom and pan with the image in the fullscreen viewer).
  - **Edit `ImagePreviewTile`**: render `<ImageAnnotationSvgLayer>` as an absolute overlay on the thumbnail when the image has annotations.
  - **Edit `ImageFullscreenViewerPage`**: pass `<ImageAnnotationSvgLayer>` as the `annotationOverlay` to each `<ZoomableImage>` slide.
- Out of scope:
  - Tapping annotations to open action sheets in the viewer (Phase 2A of the editor, not the viewer).
  - Re-fetching annotation data — it is already populated in `ImageViewModel.annotations` from the list query and synced from the detail query in the fullscreen viewer.
  - Any changes to `ImageAnnotationCanvas`, editor pages, hooks, or surfaces.
- Assumptions:
  - `ImageViewModel.annotations: ImageAnnotationViewModel[]` is already populated by `toImageViewModel` (confirmed — `toImageViewModel` maps `image_annotations` to the view model).
  - `readImageAnnotationItems(annotation.data)` correctly returns all drawable items for both single-item and session-format annotations (confirmed in `types.ts`).
  - `widthPx` and `heightPx` on `ImageViewModel` may be `null` for older images. A `1000 × 1000` fallback viewBox is used when dimensions are unknown — annotations will render centered and proportionally correct only for approximately-square images. This is an acceptable known limitation.
  - The fullscreen viewer's `setImages` effect already merges live annotation updates from `useImageQuery`, so `image.annotations` in the viewer is always fresh.

## Clarifications required

_None._

## Acceptance criteria

1. An image with saved annotations shows a visible annotation overlay on its thumbnail tile in the preview grid.
2. The same image shows the same annotations overlaid on the fullscreen image in the carousel viewer.
3. In the fullscreen viewer, pinching to zoom causes the annotations to zoom and pan with the image (they are inside the transform element).
4. An image with no annotations shows no overlay (no empty SVG element is rendered).
5. Thumbnails with `object-cover` rendering: annotations appear in approximately the correct position (center-area annotations are pixel-accurate; edge annotations may be slightly clipped matching the image crop). This is the expected trade-off.
6. `npm run typecheck` passes with zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: `ImageAnnotationSvgLayer` is a pure/presentational component — it receives all data through props and has no hooks, no side effects.

### File read intent — pattern vs. relational

Permitted relational reads already done:
- `features/images/components/ZoomableImage.tsx` — to understand the transform div structure and confirm where `annotationOverlay` should render.
- `features/images/components/ImagePreviewTile.tsx` — to confirm the tile's DOM structure (`div.relative.aspect-square > button > img.object-cover`) and where to insert the overlay.
- `features/images/pages/ImageFullscreenViewerPage.tsx` — to confirm `ZoomableImage` usage and that `image.annotations` is in scope at the render site.
- `features/images/types.ts` — to confirm `readImageAnnotationItems` signature and all annotation item shapes.

## Implementation plan

---

### Step 1 — Create `ImageAnnotationSvgLayer`

New file: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/components/ImageAnnotationSvgLayer.tsx`

This is a zero-state, pure presentational component. It takes annotation view models and renders them as SVG shapes in normalised [0,1] coordinate space. The parent is responsible for positioning it (absolute inset-0 over the image).

#### Props

```ts
type ImageAnnotationSvgLayerProps = {
  annotations: ImageAnnotationViewModel[];
  widthPx?: number | null;
  heightPx?: number | null;
  coverMode?: boolean;
  className?: string;
};
```

- `widthPx`/`heightPx`: the image's natural pixel dimensions, used as the SVG `viewBox`. When either is null, fall back to `1000`.
- `coverMode: true` → `preserveAspectRatio="xMidYMid slice"` (matches CSS `object-cover` used in thumbnails).
- `coverMode: false` (default) → `preserveAspectRatio="xMidYMid meet"` (matches CSS `object-contain` used in the fullscreen viewer).

#### SVG approach

- `viewBox="0 0 {W} {H}"` where `W = widthPx ?? 1000`, `H = heightPx ?? 1000`.
- All annotation coordinates are denormalized into the viewBox space: `x * W`, `y * H`.
- `vector-effect="non-scaling-stroke"` is applied to every stroked shape so the stroke width stays at a consistent screen pixel size regardless of zoom level or viewBox scale.
- `pointer-events: none` on the SVG element — the overlay is purely visual.

#### Collecting all items

Each `ImageAnnotationViewModel` can hold either a single item or a session-format payload with multiple items. Use `readImageAnnotationItems` to collect all drawable items from every annotation:

```ts
import { readImageAnnotationItems } from '../types';

const allItems = annotations.flatMap((annotation) =>
  readImageAnnotationItems(annotation.data ?? undefined),
);
```

If `allItems` is empty, return `null` — do not render an SVG at all.

#### Arrow marker definition

Arrows use an SVG `<marker>`. Define it once in `<defs>`. The marker uses `fill="context-stroke"` so it inherits the line color.

```svg
<defs>
  <marker
    id="img-ann-arrow"
    markerWidth="5"
    markerHeight="5"
    refX="4"
    refY="2.5"
    orient="auto"
    markerUnits="strokeWidth"
  >
    <path d="M0,0 L5,2.5 L0,5 Z" fill="context-stroke" />
  </marker>
</defs>
```

Use `markerEnd="url(#img-ann-arrow)"` on arrow lines. `context-stroke` is supported in all modern mobile browsers (iOS Safari 12+, Chrome 65+).

#### Rendering each annotation type

Use a `switch` on `item.tool`:

**`draw`** — polyline:
```tsx
<polyline
  key={key}
  points={item.points.map((v, i) => (i % 2 === 0 ? v * W : v * H)).join(' ')}
  stroke={item.color}
  strokeWidth={item.strokeWidth}
  fill="none"
  strokeLinecap="round"
  strokeLinejoin="round"
  vectorEffect="non-scaling-stroke"
/>
```

**`arrow`** — line with arrowhead marker:
```tsx
<line
  key={key}
  x1={item.fromX * W}
  y1={item.fromY * H}
  x2={item.toX * W}
  y2={item.toY * H}
  stroke={item.color}
  strokeWidth={item.strokeWidth}
  vectorEffect="non-scaling-stroke"
  markerEnd="url(#img-ann-arrow)"
/>
```

**`circle`** — ellipse:
```tsx
<ellipse
  key={key}
  cx={item.centerX * W}
  cy={item.centerY * H}
  rx={item.radiusX * W}
  ry={item.radiusY * H}
  stroke={item.color}
  strokeWidth={item.strokeWidth}
  fill="none"
  vectorEffect="non-scaling-stroke"
/>
```

**`rectangle`** — rect (stroke only):
```tsx
<rect
  key={key}
  x={item.x * W}
  y={item.y * H}
  width={item.width * W}
  height={item.height * H}
  stroke={item.color}
  strokeWidth={item.strokeWidth}
  fill="none"
  vectorEffect="non-scaling-stroke"
/>
```

**`text`** — text element:
```tsx
<text
  key={key}
  x={item.x * W}
  y={item.y * H}
  fill={item.color}
  fontSize={item.fontSize * H}
  dominantBaseline="hanging"
>
  {item.text}
</text>
```

`dominantBaseline="hanging"` makes the y coordinate the top of the text, matching the Konva canvas rendering where `y` is the text's top-left origin.

**`highlight`** — filled semi-transparent rect:
```tsx
<rect
  key={key}
  x={item.x * W}
  y={item.y * H}
  width={item.width * W}
  height={item.height * H}
  fill={item.color}
  opacity={item.opacity}
/>
```

#### Full component shell

```tsx
import type { ImageAnnotationViewModel } from '../types';
import { readImageAnnotationItems } from '../types';

type ImageAnnotationSvgLayerProps = {
  annotations: ImageAnnotationViewModel[];
  widthPx?: number | null;
  heightPx?: number | null;
  coverMode?: boolean;
  className?: string;
};

export function ImageAnnotationSvgLayer({
  annotations,
  widthPx,
  heightPx,
  coverMode = false,
  className,
}: ImageAnnotationSvgLayerProps): React.JSX.Element | null {
  const W = widthPx ?? 1000;
  const H = heightPx ?? 1000;
  const allItems = annotations.flatMap((annotation) =>
    readImageAnnotationItems(annotation.data ?? undefined),
  );

  if (allItems.length === 0) {
    return null;
  }

  const preserveAspectRatio = coverMode ? 'xMidYMid slice' : 'xMidYMid meet';

  return (
    <svg
      aria-hidden="true"
      className={className}
      preserveAspectRatio={preserveAspectRatio}
      style={{ pointerEvents: 'none' }}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker
          id="img-ann-arrow"
          markerHeight="5"
          markerUnits="strokeWidth"
          markerWidth="5"
          orient="auto"
          refX="4"
          refY="2.5"
        >
          <path d="M0,0 L5,2.5 L0,5 Z" fill="context-stroke" />
        </marker>
      </defs>

      {allItems.map((item, index) => {
        const key = `ann-${index}`;
        switch (item.tool) {
          case 'draw':
            return (
              <polyline
                key={key}
                fill="none"
                points={item.points.map((v, i) => (i % 2 === 0 ? v * W : v * H)).join(' ')}
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={item.strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            );
          case 'arrow':
            return (
              <line
                key={key}
                markerEnd="url(#img-ann-arrow)"
                stroke={item.color}
                strokeWidth={item.strokeWidth}
                vectorEffect="non-scaling-stroke"
                x1={item.fromX * W}
                x2={item.toX * W}
                y1={item.fromY * H}
                y2={item.toY * H}
              />
            );
          case 'circle':
            return (
              <ellipse
                key={key}
                cx={item.centerX * W}
                cy={item.centerY * H}
                fill="none"
                rx={item.radiusX * W}
                ry={item.radiusY * H}
                stroke={item.color}
                strokeWidth={item.strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            );
          case 'rectangle':
            return (
              <rect
                key={key}
                fill="none"
                height={item.height * H}
                stroke={item.color}
                strokeWidth={item.strokeWidth}
                vectorEffect="non-scaling-stroke"
                width={item.width * W}
                x={item.x * W}
                y={item.y * H}
              />
            );
          case 'text':
            return (
              <text
                key={key}
                dominantBaseline="hanging"
                fill={item.color}
                fontSize={item.fontSize * H}
                x={item.x * W}
                y={item.y * H}
              >
                {item.text}
              </text>
            );
          case 'highlight':
            return (
              <rect
                key={key}
                fill={item.color}
                height={item.height * H}
                opacity={item.opacity}
                width={item.width * W}
                x={item.x * W}
                y={item.y * H}
              />
            );
          default:
            return null;
        }
      })}
    </svg>
  );
}
```

---

### Step 2 — Edit `ZoomableImage` to accept annotationOverlay

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/components/ZoomableImage.tsx`

#### 2a — Add import and prop

Add `import type { ReactNode } from 'react';` to imports.

Add `annotationOverlay?: ReactNode` to `ZoomableImageProps`:

```ts
type ZoomableImageProps = {
  src: string;
  annotationOverlay?: ReactNode;
  onZoomChange?: (isZoomed: boolean) => void;
};
```

Destructure it in the function signature.

#### 2b — Add `position: relative` to the transform div and render the overlay

The `transformElRef` div currently has `className="size-full"`. The annotation overlay will be absolutely positioned inside it, so the div needs `position: relative`:

```tsx
// Before:
<div
  ref={transformElRef}
  className="size-full"
  style={{ transformOrigin: 'center center', willChange: 'transform' }}
>
  <img ... />
</div>

// After:
<div
  ref={transformElRef}
  className="relative size-full"
  style={{ transformOrigin: 'center center', willChange: 'transform' }}
>
  <img ... />
  {annotationOverlay}
</div>
```

The overlay is rendered after the `<img>` so it appears above it. Because it is inside `transformElRef`, it participates in the same CSS transform (pinch-zoom and pan) as the image — annotations move and scale with the image. ✓

**Why inside the transform div and not the container div**: The container div clips to its bounds (`overflow-hidden`) and does not transform. Any overlay placed there would remain fixed while the image pans and zooms — annotations would visually drift from the image content. Placing inside `transformElRef` ensures they are always locked to image space.

---

### Step 3 — Edit `ImagePreviewTile` to show annotation overlay

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/components/ImagePreviewTile.tsx`

#### 3a — Add import

```ts
import { ImageAnnotationSvgLayer } from './ImageAnnotationSvgLayer';
```

#### 3b — Add overlay after the button

The tile root div is `div.relative.aspect-square.overflow-hidden`. The `<button>` with `<img class="size-full object-cover">` is a direct child. The annotation overlay should be absolutely positioned over the image but below any interactive controls (the edit-mode delete button).

Thumbnails show only the primary annotation (`image.annotation` — the most recent save session) to avoid cluttering the small tile. The full annotation list is reserved for the fullscreen viewer.

Insert after the closing `</button>` tag, before `<ImageUploadOverlay>`:

```tsx
{image.annotation ? (
  <ImageAnnotationSvgLayer
    annotations={[image.annotation]}
    className="pointer-events-none absolute inset-0 size-full"
    coverMode
    heightPx={image.heightPx}
    widthPx={image.widthPx}
  />
) : null}
```

`image.annotation` is the singular primary annotation already present on `ImageViewModel` — no slice or index logic needed. Passing it as a single-element array matches the `annotations: ImageAnnotationViewModel[]` prop type.

`coverMode` is `true` because the thumbnail uses `object-cover` — the SVG uses `preserveAspectRatio="xMidYMid slice"` to match, so annotation positions align with the visible cropped image area.

`pointer-events-none` ensures the overlay does not intercept tap/long-press events on the tile.

The overlay sits on top of the image but below the delete button (which is absolutely positioned with `z-index` via natural stacking order, rendered later in the JSX).

---

### Step 4 — Edit `ImageFullscreenViewerPage` to pass annotation overlay

File: `apps/managers-app/ManagerBeyo-app-managers/src/features/images/pages/ImageFullscreenViewerPage.tsx`

#### 4a — Add import

```ts
import { ImageAnnotationSvgLayer } from '../components/ImageAnnotationSvgLayer';
```

#### 4b — Pass annotationOverlay to each ZoomableImage slide

Find the `{images.map((image) => ...)}` render block. The current slide content is:

```tsx
<ZoomableImage
  src={displayUrl}
  onZoomChange={(isZoomed) => {
    isAnySlideZoomedRef.current = isZoomed;
  }}
/>
```

Replace with:

```tsx
<ZoomableImage
  annotationOverlay={
    image.annotations.length > 0 ? (
      <ImageAnnotationSvgLayer
        annotations={image.annotations}
        className="pointer-events-none absolute inset-0 size-full"
        heightPx={image.heightPx}
        widthPx={image.widthPx}
      />
    ) : null
  }
  src={displayUrl}
  onZoomChange={(isZoomed) => {
    isAnySlideZoomedRef.current = isZoomed;
  }}
/>
```

`coverMode` is **not** passed (defaults to `false`) because the fullscreen viewer uses `object-contain`. The SVG uses `preserveAspectRatio="xMidYMid meet"` — the same algorithm as `object-contain` — so annotations align exactly with the image content area. ✓

---

## Risks and mitigations

- Risk: `widthPx`/`heightPx` are null for some images (backend does not always set these). When null, the viewBox falls back to `1000 × 1000`. For non-square images, annotation positions will be proportionally correct within the [0,1] coordinate system but the aspect ratio of the viewBox will not match the image, causing slight letterbox mismatch. Annotations near the center are unaffected; annotations near edges drift.
  Mitigation: This is a known limitation documented in the plan. A future improvement could add an `onLoad` handler to `ZoomableImage` that exposes `naturalWidth/Height`, allowing the fullscreen viewer to supply correct dimensions even when the API omits them. For thumbnails (object-cover), this is less noticeable.

- Risk: Multiple `ImageAnnotationSvgLayer` components on the same page each define `<marker id="img-ann-arrow">`. Duplicate `id` values in a single HTML document cause the first definition to win, which is fine since all arrow markers are identical. However, it is technically invalid HTML.
  Mitigation: Acceptable for a production mobile app where the SVG markers are visually identical and the behaviour is correct. If strict validation is needed, move the `<defs>` to a single top-level SVG sprite, but this requires a global provider and is out of scope here.

- Risk: `context-stroke` for arrowhead fill is not supported in very old browsers (pre-2019). Arrow shapes on those browsers will render as lines without an arrowhead.
  Mitigation: This app targets modern mobile browsers (iOS Safari 14+, Android Chrome). `context-stroke` is supported. The fallback (arrowhead-less line) is still clearly visible as an arrow direction indicator.

- Risk: `vector-effect="non-scaling-stroke"` keeps stroke width constant in screen pixels. In a fullscreen viewer at 1× zoom, strokes appear identical to the editor canvas. At 4× zoom, strokes remain thin (3px) while the image content is zoomed — this may look slightly different from the editor where strokes are drawn at a fixed canvas pixel scale. This is expected and preferred behaviour for an overlay: stroke weight stays readable at all zoom levels.
  Mitigation: No action needed; this is the correct UX.

## Validation plan

- `npm run typecheck`: zero TypeScript errors in `apps/managers-app/ManagerBeyo-app-managers`
- Manual — thumbnail with annotations: open the image list page; images that have been annotated in the editor should show their annotations overlaid on the grid tile.
- Manual — thumbnail without annotations: images with no annotations show no overlay.
- Manual — fullscreen viewer: open the fullscreen carousel; navigate to an annotated image; annotations appear overlaid on the image.
- Manual — fullscreen pinch-zoom: pinch to zoom on an annotated image; annotations zoom and pan with the image, maintaining their visual position relative to image content.
- Manual — fullscreen slide change: swipe to a non-annotated image; no annotation overlay is visible. Swipe back; annotations reappear.

## Review log

_None yet._

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
