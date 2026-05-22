# PLAN_images_viewer_pinch_zoom_20260522

## Metadata

- Plan ID: `PLAN_images_viewer_pinch_zoom_20260522`
- Status: `archived`
- Owner agent: `Codex`
- Created at (UTC): `2026-05-22T00:00:00Z`
- Last updated at (UTC): `2026-05-22T11:49:49Z`
- Related issue/ticket: —
- Intention plan: —
- Depends on: `PLAN_07_images_fullscreen_carousel_viewer_20260521` (archived)

## Goal and intent

- Goal: Add pinch-to-zoom and pan-while-zoomed gestures to each slide in `ImageFullscreenViewerPage`. Block the Embla carousel from swiping while a slide is zoomed in. Zoom bounces back to clamped limits [1 × – 4 ×] on release.
- Business/user intent: Users need to examine image detail (e.g. upholstery condition, item damage). The interaction should feel native — same as iOS Photos or Google Photos: smooth pinch zoom, free pan within bounds, must zoom out to swipe to the next image.
- Non-goals: Persisting zoom level between slide navigations. Double-tap to zoom. Zoom controls outside gesture input.

## Scope

- In scope:
  - New component `ZoomableImage` — handles pinch, pan, scale clamp, bounce-back animation.
  - Edit `ImageFullscreenViewerPage` — replace bare `<img>` in each slide with `<ZoomableImage>`, wire `watchDrag` on Embla to block carousel drag while any slide is zoomed.
- Out of scope: Camera page, editor page, preview grid, any other surface.
- Assumptions:
  - No new npm packages. All gesture logic is implemented with raw Pointer Events API.
  - The current `ImageFullscreenViewerPage.tsx` already has the smooth-swipe fix applied (the `reInit`+`scrollTo` feedback loop was removed in a prior session — the `select`-listener effect is the only Embla↔state sync). Do NOT restore the old `reInit` effect.
  - Embla v8 (`embla-carousel-react ^8.6.0`) does NOT call `setPointerCapture` internally. Our `ZoomableImage` calls `setPointerCapture` so captured events come to our element first and can be stopped before reaching Embla's viewport listener.

## File manifest

### Existing files to edit

| Path (relative to `src/`) | Change summary |
|---|---|
| `features/images/pages/ImageFullscreenViewerPage.tsx` | Add `isAnySlideZoomedRef`, pass `watchDrag` to Embla, replace `<img>` per slide with `<ZoomableImage>` |

### New files to create

| Path (relative to `src/`) |
|---|
| `features/images/components/ZoomableImage.tsx` |

## Clarifications required

_(none — architecture is fully defined below)_

## Acceptance criteria

1. Two-finger pinch zooms the active slide in/out. Scale is visually smooth during the gesture.
2. Scale is clamped to [1 ×, 4 ×]. On release, if scale is outside that range the transform animates back with a 200 ms ease-out bounce.
3. When zoomed in (scale > 1), a single finger pans the image. Pan is clamped so the image never shows empty space on any edge.
4. While any slide is zoomed in, swiping the Embla carousel does nothing. The user must pinch back to 1 × to regain swipe navigation.
5. Swiping at scale = 1 feels identical to the pre-zoom behavior (no regression in Embla smoothness).
6. `npm run typecheck` — zero TypeScript errors.

## Contracts and skills

### Contracts loaded

- `architecture/07_components.md`: leaf component structure, no context reads inside `ZoomableImage`
- `architecture/14_styling.md`: Tailwind utility classes, `touch-none`, `select-none`, `will-change-transform`
- `architecture/18_performance.md`: direct DOM mutation via refs for 60 fps transform updates (never `setState` on every frame)
- `architecture/27_responsive.md`: full-screen mobile layout, safe areas not affected
- `architecture/31_animations.md`: CSS transition for bounce-back; no heavy animation libraries

### Local extensions loaded

- `architecture/28_surfaces_local.md`: `slide` surface page pattern — `useSurfaceProps`, close via `useSurfaceStore.getState().closeTop()`

### File read intent — pattern vs. relational

Permitted reads before coding:
- `src/features/images/pages/ImageFullscreenViewerPage.tsx` — verify current Embla setup and slide JSX structure (relational: what exists).
- `src/features/images/components/ZoomableImage.tsx` — does not exist yet; CREATE from this plan.

Prohibited (pattern reads — this plan already defines the structure):
- Reading other feature components to understand how to structure `ZoomableImage`.

## Implementation plan

### Step 1 — Create `src/features/images/components/ZoomableImage.tsx`

This component is a **pure DOM-ref component** — all gesture state lives in refs, all visual updates go directly to `el.style.transform`. React state is never set on every animation frame.

#### Types and constants

```tsx
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SNAP_MS = 200; // bounce-back animation duration

type PointerPos = { x: number; y: number };

type PinchStart = {
  distance: number;   // initial finger distance
  scale: number;      // scale at pinch start
  midX: number;       // client X of pinch midpoint
  midY: number;       // client Y of pinch midpoint
  panX: number;       // panRef.x at pinch start
  panY: number;       // panRef.y at pinch start
};

type PanStart = {
  pointerX: number;   // client X when pan started
  pointerY: number;   // client Y when pan started
  panX: number;       // panRef.x at pan start
  panY: number;       // panRef.y at pan start
};

type ZoomableImageProps = {
  src: string;
  onZoomChange?: (isZoomed: boolean) => void;
};
```

#### Ref layout

```
containerRef  → outer div  (receives pointer events, provides size for clamp math)
transformElRef → inner div  (receives style.transform)
scaleRef       → current scale (number, starts at 1)
panRef         → { x, y } in pixels from centre (starts at { 0, 0 })
isZoomedRef    → boolean (true when scale > MIN_SCALE)
activePointersRef → Map<pointerId, PointerPos>
pinchStartRef  → PinchStart | null
panStartRef    → PanStart | null
onZoomChangeRef → always-current copy of the onZoomChange prop
```

#### Helper functions (defined in component body — all read from refs only, no stale closure risk)

**`applyTransform(animated: boolean)`**
```ts
const el = transformElRef.current;
if (!el) return;
el.style.transition = animated ? `transform ${SNAP_MS}ms ease-out` : 'none';
el.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${scaleRef.current})`;
```

**`getMaxPan(scale: number): { x: number; y: number }`**
```ts
const c = containerRef.current;
if (!c) return { x: 0, y: 0 };
return {
  x: Math.max(0, (scale - 1) * c.clientWidth  / 2),
  y: Math.max(0, (scale - 1) * c.clientHeight / 2),
};
```

**`clampPan(pan: { x: number; y: number }, scale: number): { x: number; y: number }`**
```ts
const max = getMaxPan(scale);
return {
  x: Math.min(max.x, Math.max(-max.x, pan.x)),
  y: Math.min(max.y, Math.max(-max.y, pan.y)),
};
```

**`notifyZoom(zoomed: boolean)`**
```ts
if (isZoomedRef.current !== zoomed) {
  isZoomedRef.current = zoomed;
  onZoomChangeRef.current?.(zoomed);
}
```

**`snapToLimits()`** — called on all-pointers-up
```ts
const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current));
const clampedPan = clampedScale <= MIN_SCALE
  ? { x: 0, y: 0 }
  : clampPan(panRef.current, clampedScale);

const changed =
  clampedScale !== scaleRef.current ||
  clampedPan.x !== panRef.current.x ||
  clampedPan.y !== panRef.current.y;

scaleRef.current = clampedScale;
panRef.current   = clampedPan;
if (changed) applyTransform(/* animated */ true);

notifyZoom(clampedScale > MIN_SCALE);
```

#### Event handlers (each is `useCallback(fn, [])` — all state is in refs)

**`handlePointerDown(e: React.PointerEvent<HTMLDivElement>)`**

```
1. e.currentTarget.setPointerCapture(e.pointerId)
   → ensures subsequent moves/up for this pointer reach our element

2. activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

3. const size = activePointersRef.current.size

4. if size === 2:
     // Starting a two-finger pinch.
     e.stopPropagation()
     // Prevent Embla from processing this second pointer's down event.

     const pts = Array.from(activePointersRef.current.values()) // [p1, p2]
     pinchStartRef.current = {
       distance: Math.hypot(p2.x - p1.x, p2.y - p1.y),
       scale:    scaleRef.current,
       midX:     (p1.x + p2.x) / 2,
       midY:     (p1.y + p2.y) / 2,
       panX:     panRef.current.x,
       panY:     panRef.current.y,
     }
     panStartRef.current = null
     // Immediately mark as "zooming" so Embla's watchDrag returns false
     // for any pointer-down events Embla might still see.
     notifyZoom(true)

   else if size === 1 AND isZoomedRef.current:
     // Starting a pan on an already-zoomed slide.
     e.stopPropagation()
     // Prevent Embla from starting a carousel drag.

     panStartRef.current = {
       pointerX: e.clientX,
       pointerY: e.clientY,
       panX:     panRef.current.x,
       panY:     panRef.current.y,
     }
```

**`handlePointerMove(e: React.PointerEvent<HTMLDivElement>)`**

```
1. if !activePointersRef.current.has(e.pointerId): return

2. activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

3. const pts = Array.from(activePointersRef.current.values())

4. if pts.length === 2 AND pinchStartRef.current !== null:
     e.stopPropagation()
     // Block Embla from seeing the first pointer's move events during a pinch.

     const newDist  = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
     const ratio    = newDist / pinchStartRef.current.distance
     const newScale = pinchStartRef.current.scale * ratio

     // Zoom toward the initial pinch midpoint (container-relative):
     const rect       = containerRef.current.getBoundingClientRect()
     const lmx        = pinchStartRef.current.midX - rect.left  - rect.width  / 2
     const lmy        = pinchStartRef.current.midY - rect.top   - rect.height / 2
     const scaleFactor = newScale / pinchStartRef.current.scale

     panRef.current = {
       x: lmx - (lmx - pinchStartRef.current.panX) * scaleFactor,
       y: lmy - (lmy - pinchStartRef.current.panY) * scaleFactor,
     }
     scaleRef.current = newScale
     applyTransform(/* animated */ false)

   else if pts.length === 1 AND panStartRef.current !== null AND isZoomedRef.current:
     e.stopPropagation()

     const dx = e.clientX - panStartRef.current.pointerX
     const dy = e.clientY - panStartRef.current.pointerY
     panRef.current = clampPan(
       { x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy },
       scaleRef.current,
     )
     applyTransform(/* animated */ false)
```

**`handlePointerUp(e: React.PointerEvent<HTMLDivElement>)`**

```
1. activePointersRef.current.delete(e.pointerId)

2. const remaining = activePointersRef.current.size

3. if remaining === 0:
     pinchStartRef.current = null
     panStartRef.current   = null
     snapToLimits()

   else if remaining === 1:
     // One finger left from a two-finger pinch → switch to pan mode.
     pinchStartRef.current = null
     const [id, pos] = Array.from(activePointersRef.current.entries())[0]
     panStartRef.current = {
       pointerX: pos.x,
       pointerY: pos.y,
       panX:     panRef.current.x,
       panY:     panRef.current.y,
     }

   // NOTE: do NOT call e.stopPropagation() on pointerup.
   // Embla must see the pointerup to clean up any in-progress drag state it holds.
```

`onPointerCancel` → same handler as `handlePointerUp`.

#### JSX structure

```tsx
<div
  ref={containerRef}
  className="size-full touch-none select-none overflow-hidden"
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerCancel={handlePointerUp}
>
  <div
    ref={transformElRef}
    className="size-full"
    style={{ transformOrigin: 'center center', willChange: 'transform' }}
  >
    <img
      src={src}
      alt=""
      className="h-full w-full select-none object-contain"
      draggable={false}
      loading="lazy"
    />
  </div>
</div>
```

---

### Step 2 — Edit `src/features/images/pages/ImageFullscreenViewerPage.tsx`

Read the file first to confirm current state, then make these targeted changes.

#### 2a — Add `isAnySlideZoomedRef` and wire `watchDrag`

After the existing `useRef` / `useState` declarations, add:

```tsx
const isAnySlideZoomedRef = useRef(false);
```

Update the `useEmblaCarousel` call to add `watchDrag`:

```tsx
const [emblaRef, emblaApi] = useEmblaCarousel({
  align: 'start',
  loop: false,
  startIndex: fallbackInitialIndex,
  watchDrag: () => !isAnySlideZoomedRef.current,
});
```

`watchDrag` is evaluated on every drag-start attempt. Because it reads a ref (not state), it always returns the live value — no stale closure.

#### 2b — Replace `<img>` per slide with `<ZoomableImage>`

Import `ZoomableImage`:
```tsx
import { ZoomableImage } from '../components/ZoomableImage';
```

Current slide JSX (existing):
```tsx
<div
  key={image.clientId}
  className="flex min-w-0 flex-[0_0_100%] items-center justify-center"
  data-testid={`viewer-slide-${image.clientId}`}
>
  <img
    alt=""
    className="h-full w-full select-none object-contain"
    draggable={false}
    loading="lazy"
    src={displayUrl}
  />
</div>
```

Replace with:
```tsx
<div
  key={image.clientId}
  className="flex min-w-0 flex-[0_0_100%] items-center justify-center"
  data-testid={`viewer-slide-${image.clientId}`}
>
  <ZoomableImage
    src={displayUrl}
    onZoomChange={(isZoomed) => {
      isAnySlideZoomedRef.current = isZoomed;
    }}
  />
</div>
```

The `onZoomChange` callback is an inline arrow function. Since `isAnySlideZoomedRef` is a stable ref, this callback writing to `.current` is safe and does not cause re-renders.

---

### Step 3 — Typecheck

```bash
cd apps/managers-app/ManagerBeyo-app-managers && npx tsc --noEmit
```

Resolve any errors before marking done.

## Risks and mitigations

- **Risk:** Embla calls `setPointerCapture` internally, overriding ours. Then our element would not receive subsequent pointer events for the first finger during a carousel drag that started before pinch.
  **Mitigation:** In practice, Embla v8 does not call `setPointerCapture`. If this assumption is wrong, the symptom is "pinch doesn't start from scale=1". Fix: remove `setPointerCapture` from our handler and add native capture-phase listeners via `useEffect` + `addEventListener(..., { capture: true })` instead of React synthetic events. This is a known fallback — apply it only if the symptom is observed.

- **Risk:** During a pinch that starts from scale=1, the first pointer reaches Embla (before the second arrives) and Embla starts a drag. If our `stopPropagation` on subsequent pointermove events works, Embla's drag receives no moves and snaps back on pointerup (zero-velocity settle). If it does NOT work, the carousel might scroll.
  **Mitigation:** `stopPropagation` in React synthetic handlers does call `nativeEvent.stopPropagation()`. Embla's bubble-phase native listener on the viewport will not fire. This is the standard mechanism and should be reliable.

- **Risk:** The `onZoomChange` inline arrow in JSX creates a new function reference on every render, but Embla's `watchDrag` option is set once at `useEmblaCarousel` init time and reads `isAnySlideZoomedRef.current` directly — not the callback. So function identity on `onZoomChange` is irrelevant to Embla.
  **Mitigation:** N/A — already handled by the ref pattern.

- **Risk:** Fast sequence: user pinches to zoom > 4 × and quickly releases — `snapToLimits` clamps and animates. During the animation, if the user immediately touches again, `scaleRef.current` is already at the clamped value (set synchronously in `snapToLimits`), but the CSS transition is still running. A new pinch-start would capture the final clamped value, which is correct.
  **Mitigation:** No action needed — refs hold post-clamp values immediately; the visual animation is cosmetic.

## Validation plan

- `npx tsc --noEmit` from within `apps/managers-app/ManagerBeyo-app-managers`: zero errors.
- Manual device test (mobile browser or Chrome DevTools touch emulation):
  1. Open viewer → pinch in → image zooms in smoothly.
  2. Pinch beyond 4 × → on release, bounces back to 4 ×.
  3. Pinch below 1 × → on release, bounces back to 1 × and pan resets.
  4. While zoomed in → single-finger drag pans the image, clipped to bounds.
  5. While zoomed in → horizontal swipe does NOT advance the carousel.
  6. Zoom back to 1 × → horizontal swipe advances carousel normally.
  7. No regression: at scale 1, carousel swipe is as smooth as before this plan.

## Review log

- `2026-05-22` Claude Sonnet 4.6: Plan authored based on architecture research in prior session.

## Lifecycle transition

- Current state: `archived`
- Next state: `—`
- Transition owner: `Codex`
