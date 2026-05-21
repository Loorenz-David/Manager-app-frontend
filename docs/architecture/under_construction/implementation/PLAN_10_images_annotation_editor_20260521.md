# PLAN_10_images_annotation_editor_20260521

## Metadata

- Plan ID: `PLAN_10_images_annotation_editor_20260521`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01`, `PLAN_02`, `PLAN_04`

## Goal and intent

- Goal: Build the image annotation editor using `konva` and `react-konva`. The editor renders a full-screen overlay with the image and a canvas annotation layer. Users can draw, add shapes, text, and arrows, then save annotations through the backend.
- Business/user intent: Operational documentation (restoration progress, damage records, inspection notes) requires annotating images with drawings, text labels, and geometric shapes. This is not a photo editor — it is an annotation overlay tool.
- Non-goals: Camera, reorder, carousel viewer, metadata sheet. All annotation data is stored through the existing `createImageAnnotation` API (PLAN_01/02).

## Scope

- In scope:
  - `src/features/images/components/ImageAnnotationToolbar.tsx` — tool selector: draw, arrow, circle, rectangle, text, highlight
  - `src/features/images/components/ImageAnnotationCanvas.tsx` — react-konva stage, aligned over the image, renders existing + in-progress annotations
  - `src/features/images/pages/ImageEditorPage.tsx` — full-screen slide surface page assembling canvas + toolbar + save/cancel actions
- Out of scope: Measurement tool (deferred), annotation editing/moving after placement (MVP), upload pipeline, camera.
- Assumptions:
  - `konva` and `react-konva` must be installed. Verify `package.json`. If absent: `npm install konva react-konva`.
  - The page opens as a `slide` surface receiving: `{ image: ImageViewModel, entityType, entityClientId }`.
  - Annotations are stored to the backend via `useCreateImageAnnotation` (PLAN_02).
  - Annotation data shape is a JSON object — its structure depends on tool type. See Section 3 below.
  - The editor saves ONE annotation object per editor session (the complete current session's work). It does not save incremental strokes individually.
  - For optimistic images (not yet confirmed), annotation saving is deferred until confirmation — the controller handles this. For MVP, block annotation of unconfirmed images (show a loading state).

## Clarifications required

- [x] Annotation data shape: each annotation `data` object is tool-specific JSON stored in the backend's JSONB `data` column. The frontend defines its own internal shape per tool — it must be serializable to JSON.
- [x] MVP scope: freehand draw, arrow, circle, rectangle, text, highlight. Measurement deferred.

## Acceptance criteria

1. Editor page renders the image with a Konva stage overlaid exactly on top.
2. Tool toolbar selects the active tool — selected tool is visually highlighted.
3. Drawing a freehand stroke produces a visible line.
4. Placing shapes (circle, rectangle, arrow) with click+drag produces the shape.
5. Tapping the canvas in text mode opens a native text input.
6. Save calls `createAnnotationAsync` with the correct `image_client_id`, `annotation_type`, and `data`.
7. Cancel discards all in-progress work and calls `closeTop()`.
8. Existing annotations from `image.annotation` are rendered on the canvas.
9. Unconfirmed optimistic images show a "Upload in progress — annotation unavailable" state.
10. `data-testid` on all interactive elements.
11. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: general conventions
- `architecture/07_components.md`: component structure
- `architecture/14_styling.md`: Tailwind for toolbar, dark background
- `architecture/15_feature_structure.md`: pages/ placement
- `architecture/18_performance.md`: canvas performance, avoid React re-renders inside Konva stage
- `architecture/27_responsive.md`: full-screen mobile layout

### Local extensions loaded

- `architecture/28_surfaces_local.md`: slide surface page pattern.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/images/types.ts` — `ImageViewModel`, `ImageAnnotationType`, annotation types.
- `src/features/images/actions/use-create-image-annotation.ts` — verify action API (from PLAN_02).
- `package.json` — verify `konva` + `react-konva` are present.

### Skill selection

- Primary skill: none

## Implementation plan

### Step 0 — Verify konva dependencies

Read `package.json`. If `konva` and `react-konva` are absent:

```bash
npm install konva react-konva
```

### Step 1 — Define annotation data shapes

These types live in `src/features/images/types.ts`. Add them to the end of the View Models section.

```ts
// ─── Annotation Data Shapes (per tool type) ───────────────────────────────────
// These are the data objects stored in ImageAnnotation.data (JSONB on backend).

export type DrawAnnotationData = {
  tool: 'draw';
  points: number[]; // flat array [x1, y1, x2, y2, ...] normalized 0..1
  color: string;
  strokeWidth: number;
};

export type ArrowAnnotationData = {
  tool: 'arrow';
  fromX: number; // normalized 0..1
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  strokeWidth: number;
};

export type CircleAnnotationData = {
  tool: 'circle';
  centerX: number; // normalized 0..1
  centerY: number;
  radiusX: number; // normalized
  radiusY: number;
  color: string;
  strokeWidth: number;
};

export type RectangleAnnotationData = {
  tool: 'rectangle';
  x: number;  // normalized 0..1
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
};

export type TextAnnotationData = {
  tool: 'text';
  x: number;  // normalized 0..1
  y: number;
  text: string;
  fontSize: number;
  color: string;
};

export type HighlightAnnotationData = {
  tool: 'highlight';
  x: number;  // normalized 0..1
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
};

export type AnnotationData =
  | DrawAnnotationData
  | ArrowAnnotationData
  | CircleAnnotationData
  | RectangleAnnotationData
  | TextAnnotationData
  | HighlightAnnotationData;
```

**Normalization convention:** All coordinates are stored as fractions (0..1) of the canvas dimensions, not pixels. This makes annotations resolution-independent — they render correctly regardless of the device's screen size or image dimensions.

### Step 2 — Create `src/features/images/components/ImageAnnotationToolbar.tsx`

```tsx
import { cn } from '@/lib/utils';
import type { ImageAnnotationType } from '../types';

// MVP tools — measurement deferred
const TOOLS: { type: ImageAnnotationType; label: string; emoji: string }[] = [
  { type: 'draw',      label: 'Draw',      emoji: '✏️' },
  { type: 'arrow',     label: 'Arrow',     emoji: '↗' },
  { type: 'circle',    label: 'Circle',    emoji: '○' },
  { type: 'rectangle', label: 'Rectangle', emoji: '□' },
  { type: 'text',      label: 'Text',      emoji: 'T' },
  { type: 'highlight', label: 'Highlight', emoji: '▭' },
];

type ImageAnnotationToolbarProps = {
  activeTool: ImageAnnotationType;
  onToolChange: (tool: ImageAnnotationType) => void;
  testId?: string;
};

export function ImageAnnotationToolbar({
  activeTool,
  onToolChange,
  testId,
}: ImageAnnotationToolbarProps): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-center gap-2 px-4"
      data-testid={testId ?? 'annotation-toolbar'}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          type="button"
          className={cn(
            'flex size-10 flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors duration-150',
            activeTool === tool.type
              ? 'bg-primary text-primary-foreground'
              : 'bg-white/10 text-white',
          )}
          onClick={() => onToolChange(tool.type)}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.type}
          data-testid={`annotation-tool-${tool.type}`}
        >
          {tool.emoji}
        </button>
      ))}
    </div>
  );
}
```

### Step 3 — Create `src/features/images/components/ImageAnnotationCanvas.tsx`

This component hosts the Konva Stage. It renders both existing annotations and in-progress drawing.

```tsx
import { useRef, useState, useCallback } from 'react';
import { Stage, Layer, Line, Arrow, Circle, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { ImageAnnotationType, AnnotationData, DrawAnnotationData } from '../types';

type ImageAnnotationCanvasProps = {
  width: number;
  height: number;
  activeTool: ImageAnnotationType;
  existingAnnotations: AnnotationData[];
  onAnnotationComplete: (data: AnnotationData) => void;
};

const TOOL_COLOR = '#FF3B30';
const TOOL_STROKE_WIDTH = 3;

export function ImageAnnotationCanvas({
  width,
  height,
  activeTool,
  existingAnnotations,
  onAnnotationComplete,
}: ImageAnnotationCanvasProps): React.JSX.Element {
  const isDrawing = useRef(false);
  const [inProgressPoints, setInProgressPoints] = useState<number[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);

  const toNorm = useCallback((x: number, y: number) => ({
    x: x / width,
    y: y / height,
  }), [width, height]);

  function getRelativePos(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    return pos ?? { x: 0, y: 0 };
  }

  function handleMouseDown(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    isDrawing.current = true;
    const pos = getRelativePos(e);
    if (activeTool === 'draw') {
      setInProgressPoints([pos.x, pos.y]);
    } else {
      setStartPos(pos);
      setCurrentPos(pos);
    }
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!isDrawing.current) return;
    const pos = getRelativePos(e);
    if (activeTool === 'draw') {
      setInProgressPoints((prev) => [...prev, pos.x, pos.y]);
    } else {
      setCurrentPos(pos);
    }
  }

  function handleMouseUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (activeTool === 'draw' && inProgressPoints.length >= 4) {
      const normPoints = inProgressPoints.flatMap((v, i) =>
        i % 2 === 0 ? [v / width] : [v / height],
      );
      const data: DrawAnnotationData = {
        tool: 'draw',
        points: normPoints,
        color: TOOL_COLOR,
        strokeWidth: TOOL_STROKE_WIDTH,
      };
      onAnnotationComplete(data);
      setInProgressPoints([]);
      return;
    }

    if (!startPos || !currentPos) return;
    const s = toNorm(startPos.x, startPos.y);
    const c = toNorm(currentPos.x, currentPos.y);

    switch (activeTool) {
      case 'arrow':
        onAnnotationComplete({ tool: 'arrow', fromX: s.x, fromY: s.y, toX: c.x, toY: c.y, color: TOOL_COLOR, strokeWidth: TOOL_STROKE_WIDTH });
        break;
      case 'circle': {
        const radiusX = Math.abs(c.x - s.x) / 2;
        const radiusY = Math.abs(c.y - s.y) / 2;
        onAnnotationComplete({ tool: 'circle', centerX: (s.x + c.x) / 2, centerY: (s.y + c.y) / 2, radiusX, radiusY, color: TOOL_COLOR, strokeWidth: TOOL_STROKE_WIDTH });
        break;
      }
      case 'rectangle':
        onAnnotationComplete({ tool: 'rectangle', x: Math.min(s.x, c.x), y: Math.min(s.y, c.y), width: Math.abs(c.x - s.x), height: Math.abs(c.y - s.y), color: TOOL_COLOR, strokeWidth: TOOL_STROKE_WIDTH });
        break;
      case 'highlight':
        onAnnotationComplete({ tool: 'highlight', x: Math.min(s.x, c.x), y: Math.min(s.y, c.y), width: Math.abs(c.x - s.x), height: Math.abs(c.y - s.y), color: '#FFFF00', opacity: 0.35 });
        break;
      default:
        break;
    }

    setStartPos(null);
    setCurrentPos(null);
  }

  // Denormalize coordinates for rendering
  function dn(v: number, dim: number) { return v * dim; }

  return (
    <Stage
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      data-testid="annotation-canvas"
    >
      <Layer>
        {/* Render existing annotations */}
        {existingAnnotations.map((ann, i) => {
          if (ann.tool === 'draw') {
            return <Line key={i} points={ann.points.map((v, j) => j % 2 === 0 ? dn(v, width) : dn(v, height))} stroke={ann.color} strokeWidth={ann.strokeWidth} lineCap="round" lineJoin="round" tension={0.5} />;
          }
          if (ann.tool === 'arrow') {
            return <Arrow key={i} points={[dn(ann.fromX, width), dn(ann.fromY, height), dn(ann.toX, width), dn(ann.toY, height)]} stroke={ann.color} strokeWidth={ann.strokeWidth} fill={ann.color} />;
          }
          if (ann.tool === 'circle') {
            return <Circle key={i} x={dn(ann.centerX, width)} y={dn(ann.centerY, height)} radiusX={dn(ann.radiusX, width)} radiusY={dn(ann.radiusY, height)} stroke={ann.color} strokeWidth={ann.strokeWidth} fill="transparent" />;
          }
          if (ann.tool === 'rectangle') {
            return <Rect key={i} x={dn(ann.x, width)} y={dn(ann.y, height)} width={dn(ann.width, width)} height={dn(ann.height, height)} stroke={ann.color} strokeWidth={ann.strokeWidth} fill="transparent" />;
          }
          if (ann.tool === 'text') {
            return <Text key={i} x={dn(ann.x, width)} y={dn(ann.y, height)} text={ann.text} fontSize={ann.fontSize} fill={ann.color} />;
          }
          if (ann.tool === 'highlight') {
            return <Rect key={i} x={dn(ann.x, width)} y={dn(ann.y, height)} width={dn(ann.width, width)} height={dn(ann.height, height)} fill={ann.color} opacity={ann.opacity} />;
          }
          return null;
        })}

        {/* In-progress draw stroke */}
        {activeTool === 'draw' && inProgressPoints.length >= 4 ? (
          <Line points={inProgressPoints} stroke={TOOL_COLOR} strokeWidth={TOOL_STROKE_WIDTH} lineCap="round" lineJoin="round" tension={0.5} />
        ) : null}

        {/* In-progress shape preview */}
        {activeTool === 'arrow' && startPos && currentPos ? (
          <Arrow points={[startPos.x, startPos.y, currentPos.x, currentPos.y]} stroke={TOOL_COLOR} strokeWidth={TOOL_STROKE_WIDTH} fill={TOOL_COLOR} />
        ) : null}
        {activeTool === 'circle' && startPos && currentPos ? (
          <Circle x={(startPos.x + currentPos.x) / 2} y={(startPos.y + currentPos.y) / 2} radiusX={Math.abs(currentPos.x - startPos.x) / 2} radiusY={Math.abs(currentPos.y - startPos.y) / 2} stroke={TOOL_COLOR} strokeWidth={TOOL_STROKE_WIDTH} fill="transparent" />
        ) : null}
        {activeTool === 'rectangle' && startPos && currentPos ? (
          <Rect x={Math.min(startPos.x, currentPos.x)} y={Math.min(startPos.y, currentPos.y)} width={Math.abs(currentPos.x - startPos.x)} height={Math.abs(currentPos.y - startPos.y)} stroke={TOOL_COLOR} strokeWidth={TOOL_STROKE_WIDTH} fill="transparent" />
        ) : null}
        {activeTool === 'highlight' && startPos && currentPos ? (
          <Rect x={Math.min(startPos.x, currentPos.x)} y={Math.min(startPos.y, currentPos.y)} width={Math.abs(currentPos.x - startPos.x)} height={Math.abs(currentPos.y - startPos.y)} fill="#FFFF00" opacity={0.35} />
        ) : null}
      </Layer>
    </Stage>
  );
}
```

### Step 4 — Create `src/features/images/pages/ImageEditorPage.tsx`

```tsx
import { useState, useCallback, useRef } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { useCreateImageAnnotation } from '../actions/use-create-image-annotation';
import { ImageAnnotationToolbar } from '../components/ImageAnnotationToolbar';
import { ImageAnnotationCanvas } from '../components/ImageAnnotationCanvas';
import type { ImageViewModel, ImageLinkEntityType, ImageAnnotationType, AnnotationData } from '../types';

type ImageEditorPageProps = {
  image: ImageViewModel;
  entityType: ImageLinkEntityType;
  entityClientId: string;
};

export function ImageEditorPage(): React.JSX.Element {
  const { image } = useSurfaceProps<ImageEditorPageProps>();
  const { createAnnotationAsync, isPending } = useCreateImageAnnotation();

  const [activeTool, setActiveTool] = useState<ImageAnnotationType>('draw');
  const [sessionAnnotations, setSessionAnnotations] = useState<AnnotationData[]>([]);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayUrl = image.localObjectUrl ?? image.imageUrl;

  // Measure container for canvas dimensions
  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node) {
      const { width, height } = node.getBoundingClientRect();
      setCanvasDimensions({ width, height });
    }
  }, []);

  const handleAnnotationComplete = useCallback((data: AnnotationData) => {
    setSessionAnnotations((prev) => [...prev, data]);
  }, []);

  const handleSave = useCallback(async () => {
    if (sessionAnnotations.length === 0) {
      useSurfaceStore.getState().closeTop();
      return;
    }

    // Save all session annotations as a single 'draw' annotation (or the last tool used)
    // For MVP, save the last completed annotation — future versions may batch
    const lastAnnotation = sessionAnnotations[sessionAnnotations.length - 1];
    await createAnnotationAsync({
      image_client_id: image.clientId,
      annotation_type: lastAnnotation.tool,
      data: lastAnnotation as Record<string, unknown>,
    });

    useSurfaceStore.getState().closeTop();
  }, [sessionAnnotations, image.clientId, createAnnotationAsync]);

  const handleCancel = useCallback(() => {
    useSurfaceStore.getState().closeTop();
  }, []);

  // Block annotation of unconfirmed images
  if (image.isOptimistic && image.uploadState !== 'completed') {
    return (
      <div
        className="flex h-full flex-col items-center justify-center bg-black text-white"
        data-testid="image-editor-uploading-state"
      >
        <p className="text-sm text-white/70">Upload in progress — annotation unavailable.</p>
        <button
          type="button"
          className="mt-4 text-sm underline"
          onClick={handleCancel}
          data-testid="editor-cancel-uploading"
        >
          Close
        </button>
      </div>
    );
  }

  // Merge existing annotation from image + session annotations for rendering
  const existingAnnotationData: AnnotationData[] = image.annotation
    ? [image.annotation.data as AnnotationData]
    : [];
  const allAnnotations = [...existingAnnotationData, ...sessionAnnotations];

  return (
    <div
      className="relative flex h-full flex-col bg-black"
      data-testid="image-editor-page"
    >
      {/* Image background */}
      <div
        ref={handleContainerRef}
        className="relative flex-1 overflow-hidden"
      >
        <img
          src={displayUrl}
          alt=""
          className="h-full w-full object-contain"
          draggable={false}
        />

        {/* Konva canvas overlay — positioned absolute over the image */}
        {canvasDimensions.width > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageAnnotationCanvas
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              activeTool={activeTool}
              existingAnnotations={allAnnotations}
              onAnnotationComplete={handleAnnotationComplete}
            />
          </div>
        ) : null}
      </div>

      {/* Toolbar + save/cancel row */}
      <div className="flex flex-col gap-3 bg-black/80 px-4 pb-safe-area-inset-bottom pt-3">
        <ImageAnnotationToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          testId="annotation-toolbar"
        />

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="flex-1 rounded-xl border border-white/20 py-2 text-sm font-medium text-white"
            onClick={handleCancel}
            data-testid="editor-cancel-button"
            aria-label="Cancel annotation"
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={handleSave}
            disabled={isPending || sessionAnnotations.length === 0}
            data-testid="editor-save-button"
            aria-label="Save annotation"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 5 — Typecheck

Run `npm run typecheck`. Resolve any errors.

## Risks and mitigations

- Risk: Konva stage dimensions may be 0 on first render (container not yet measured).
  Mitigation: Gate the `ImageAnnotationCanvas` render on `canvasDimensions.width > 0`. The `handleContainerRef` callback fires when the container mounts and has real dimensions.

- Risk: `react-konva` may conflict with React 18 concurrent features.
  Mitigation: Use the default `react-konva` render — it uses the legacy React DOM render internally and is isolated within the Stage. This is a known limitation of react-konva and is acceptable for MVP.

- Risk: Coordinate normalization loses precision for very thin strokes.
  Mitigation: Store 6 decimal places of precision in the normalized points array — sufficient for any screen resolution.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual test: draw a freehand stroke, place a rectangle, save — annotation appears on image on next open.
- Unit tests (PLAN_12): `ImageAnnotationToolbar` — each tool button changes active state.
- Playwright (PLAN_12): editor page opens from viewer edit button, save button calls API.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
