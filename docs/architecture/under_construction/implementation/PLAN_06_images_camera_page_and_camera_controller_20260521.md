# PLAN_06_images_camera_page_and_camera_controller_20260521

## Metadata

- Plan ID: `PLAN_06_images_camera_page_and_camera_controller_20260521`
- Status: `under_construction`
- Owner agent: `codex`
- Created at (UTC): `2026-05-21T00:00:00Z`
- Last updated at (UTC): `2026-05-21T00:00:00Z`
- Related issue/ticket: —
- Intention plan: `docs/architecture/under_construction/intention/images_feature_draft_2.md`
- Depends on: `PLAN_01`, `PLAN_04`

## Goal and intent

- Goal: Build the mobile-first camera capture page and the camera stream controller. The camera must feel instant and native — smooth live preview, square capture, haptics, flash animation.
- Business/user intent: Users take pictures of items, restorations, and documentation. The camera should open fast (stream prewarming), capture reliably in square format, and immediately hand the raw blob to the upload pipeline in the controller.
- Non-goals: Image compression (PLAN_03 handles this when called by PLAN_04), image upload lifecycle (PLAN_04), full-screen viewer (PLAN_07), annotation editor (PLAN_10).

## Scope

- In scope:
  - `src/features/images/hooks/use-camera-stream.ts` — utility hook: start/stop/prewarm the media stream, expose video ref
  - `src/features/images/pages/ImageCameraPage.tsx` — full-screen slide surface page: video preview, capture button, latest image thumbnail, close button, flash animation
- Out of scope: Compression (PLAN_03), upload pipeline (PLAN_04), carousel viewer, annotation, surface registration (PLAN_11).
- Assumptions:
  - Camera page is opened as a `slide` surface (full-page right-to-left). It receives props: `{ entityType, entityClientId, onCapture: (rawBlob: Blob) => void }`.
  - `onCapture` is the controller's `uploadImage` function — calling it hands off the blob immediately.
  - The camera stream is started on mount (or prewarmed before mount). It must be stopped when the page closes.
  - Square capture: the canvas crops the center 1:1 square from the video frame.
  - The latest image thumbnail shows the most recently captured preview (local object URL from the controller's `images` array if available).

## Clarifications required

- [x] Stream prewarming: `useCameraStream` exposes a `prewarm()` function that can be called from the surface's preload context. The stream then attaches when the camera page mounts, avoiding startup delay.
- [x] The camera page does NOT own upload state. It calls `onCapture(rawBlob)` and immediately receives the next frame — capture and upload are fully decoupled from the camera UI.

## Acceptance criteria

1. `useCameraStream` returns `{ videoRef, isReady, startStream, stopStream, prewarm, captureFrame }`.
2. `captureFrame` returns a `Blob` (raw square-cropped frame from canvas).
3. Camera page renders: full-screen dark background, video preview, 1:1 crop guide, capture button (bottom center), latest-image thumbnail (bottom left), close button (bottom right).
4. Tapping capture: `captureFrame()` → `onCapture(blob)` → haptic feedback → flash animation.
5. Close button calls `useSurfaceStore.getState().closeTop()`.
6. Stream is stopped when the page unmounts.
7. `data-testid` on all interactive elements.
8. No memory leaks: media tracks stopped on unmount, object URLs revoked.
9. `npm run typecheck` — zero errors.

## Contracts and skills

### Contracts loaded

- `architecture/01_architecture.md`: general conventions
- `architecture/07_components.md`: component structure
- `architecture/14_styling.md`: Tailwind, CSS-only flash animation
- `architecture/15_feature_structure.md`: `hooks/` for utility hooks, `pages/` for surface pages
- `architecture/18_performance.md`: GPU-friendly transforms, no heavy animation libraries, avoid memory leaks
- `architecture/27_responsive.md`: mobile-first, full-screen layout, safe-area awareness
- `architecture/31_animations.md`: CSS-only flash animation, no Framer Motion for this

### Local extensions loaded

- `architecture/28_surfaces_local.md`: slide surface page pattern — `useSurfaceProps`, `useSurfaceStore.getState().closeTop()`.

### File read intent — pattern vs. relational

Permitted reads:
- `src/features/upholstery/pages/UpholsteryPickerSlidePage.tsx` — verify `useSurfaceProps` and `useSurfaceStore.getState().closeTop()` pattern.
- `src/features/images/types.ts` — `ImageLinkEntityType`.
- `src/features/images/controllers/use-entity-images.controller.ts` — verify `EntityImagesController.images` shape to get latest image preview.
- `src/components/surfaces/SlidePageSurface.tsx` — verify header chrome and scroll container structure.

Prohibited reads:
- External camera library source — use native browser APIs only.

### Skill selection

- Primary skill: none (pure implementation)

## Implementation plan

### Step 1 — Create `src/features/images/hooks/use-camera-stream.ts`

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1920 },
  },
  audio: false,
};

type UseCameraStreamResult = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  hasError: boolean;
  startStream: () => Promise<void>;
  stopStream: () => void;
  prewarm: () => Promise<void>;
  captureFrame: () => Blob | null;
};

export function useCameraStream(): UseCameraStreamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const startStream = useCallback(async () => {
    // Re-use existing stream if already running (prewarmed)
    if (streamRef.current?.active) {
      if (videoRef.current && !videoRef.current.srcObject) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
        setIsReady(true);
      }
      return;
    }

    try {
      setHasError(false);
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
      }
    } catch (err) {
      setHasError(true);
      console.error('[useCameraStream] getUserMedia failed:', err);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  // Prewarm: start stream before the camera page is visible (called from preload context)
  const prewarm = useCallback(async () => {
    if (streamRef.current?.active) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      streamRef.current = stream;
    } catch {
      // Prewarm failure is silent — page will retry on mount
    }
  }, []);

  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    if (!video || !isReady) return null;

    // Square crop from center of video frame
    const size = Math.min(video.videoWidth, video.videoHeight);
    const x = Math.floor((video.videoWidth - size) / 2);
    const y = Math.floor((video.videoHeight - size) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, x, y, size, size, 0, 0, size, size);

    // Synchronous toDataURL fallback — captureFrame must be sync
    // Note: for async Blob creation, use compressImageForUpload in PLAN_03
    // This returns the raw frame as a PNG blob for immediate optimistic preview
    // The compression pipeline (PLAN_03) will produce the final WebP for upload
    let capturedBlob: Blob | null = null;
    canvas.toBlob((blob) => {
      capturedBlob = blob;
    }, 'image/png');

    // canvas.toBlob is async, but for the raw capture we use a synchronous approach:
    // Convert to data URL then back to Blob (acceptable for preview-only raw capture)
    const dataUrl = canvas.toDataURL('image/png');
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeType = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  }, [isReady]);

  // Stop stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return { videoRef, isReady, hasError, startStream, stopStream, prewarm, captureFrame };
}
```

**Important note for Codex:** The `captureFrame` implementation above uses a synchronous data URL approach because `canvas.toBlob` is async and we need the raw blob synchronously to create the optimistic preview URL. This raw PNG is passed to `onCapture`, which then passes it to `PLAN_03`'s `runImageUploadPipeline` — the pipeline handles async WebP conversion before upload. This is intentional: the raw capture is for the optimistic preview; the compressed WebP is for the actual upload.

An alternative cleaner approach: make `captureFrame` async and return `Promise<Blob>`. If Codex prefers this, update `ImageCameraPage` accordingly.

### Step 2 — Create `src/features/images/pages/ImageCameraPage.tsx`

This is the full-screen camera surface page.

**Props (received via `useSurfaceProps`):**

```ts
type ImageCameraPageProps = {
  entityType: ImageLinkEntityType;
  entityClientId: string;
  onCapture: (rawBlob: Blob) => void;
  latestImageUrl?: string | null; // most recent captured image — for thumbnail
};
```

**Layout structure (Codex implements with Tailwind):**

```
<div className="relative flex h-full flex-col bg-black" data-testid="image-camera-page">

  {/* Video preview — fills available space */}
  <div className="relative flex-1 overflow-hidden">
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      autoPlay
      playsInline
      muted
      data-testid="camera-video-preview"
    />

    {/* 1:1 crop guide overlay — visual indicator only */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="aspect-square w-full max-w-full border-2 border-white/30 rounded-sm" />
    </div>

    {/* Camera flash animation — brief white overlay on capture */}
    {/* Controlled by `isFlashing` state — add/remove CSS class */}
    {isFlashing && (
      <div className="absolute inset-0 bg-white animate-[cameraFlash_0.3s_ease-out_forwards]" />
    )}
  </div>

  {/* Bottom control bar — fixed to safe area bottom */}
  <div
    className="flex items-center justify-between px-8 pb-safe-area-inset-bottom pt-4"
    data-testid="camera-controls"
  >
    {/* Latest image thumbnail (bottom left) */}
    <button
      type="button"
      className="size-14 overflow-hidden rounded-xl border-2 border-white/40 bg-white/10"
      onClick={handleThumbnailPress}
      data-testid="camera-latest-thumbnail"
      aria-label="View latest image"
    >
      {latestImageUrl ? (
        <img src={latestImageUrl} alt="Latest capture" className="size-full object-cover" />
      ) : (
        <div className="size-full" /> // empty state
      )}
    </button>

    {/* Capture button (center) */}
    <button
      type="button"
      className="size-20 rounded-full border-4 border-white bg-white/20 active:scale-95 transition-transform duration-75"
      onClick={handleCapture}
      disabled={!isReady}
      data-testid="camera-capture-button"
      aria-label="Take photo"
    />

    {/* Close/back button (bottom right) */}
    <button
      type="button"
      className="flex size-14 items-center justify-center rounded-full bg-white/10"
      onClick={handleClose}
      data-testid="camera-close-button"
      aria-label="Close camera"
    >
      <ChevronLeft className="size-7 text-white" />
    </button>
  </div>

</div>
```

**Behavior implementation:**

```tsx
import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useSurfaceProps } from '@/hooks/use-surface-props';
import { useSurfaceStore } from '@/providers/SurfaceProvider';
import { useCameraStream } from '../hooks/use-camera-stream';
import type { ImageLinkEntityType } from '../types';

export function ImageCameraPage(): React.JSX.Element {
  const { entityType, entityClientId, onCapture, latestImageUrl } =
    useSurfaceProps<ImageCameraPageProps>();

  const { videoRef, isReady, hasError, startStream, captureFrame } = useCameraStream();
  const [isFlashing, setIsFlashing] = useState(false);

  // Start stream on mount
  useEffect(() => {
    void startStream();
  }, [startStream]);

  const handleCapture = useCallback(() => {
    const blob = captureFrame();
    if (!blob) return;

    // Trigger flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);

    // Haptic feedback (non-breaking)
    navigator.vibrate?.(10);

    // Hand blob to controller — upload starts immediately
    onCapture(blob);
  }, [captureFrame, onCapture]);

  const handleClose = useCallback(() => {
    useSurfaceStore.getState().closeTop();
  }, []);

  const handleThumbnailPress = useCallback(() => {
    // Opens viewer at the latest image — implemented by the parent controller
    // For now, close camera (viewer is opened by the parent)
    // Full integration in PLAN_11
  }, []);

  if (hasError) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center bg-black text-white"
        data-testid="image-camera-error"
      >
        <p className="text-sm text-white/70">Camera unavailable.</p>
        <button
          type="button"
          className="mt-4 text-sm underline"
          onClick={handleClose}
          data-testid="camera-error-close"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    // ... layout from above
  );
}
```

**CSS animation for flash** — add to `src/index.css` or global styles:

```css
@keyframes cameraFlash {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
```

### Step 3 — Typecheck

Run `npm run typecheck`. Resolve any errors.

## Risks and mitigations

- Risk: `navigator.mediaDevices.getUserMedia` is unavailable on HTTP (non-HTTPS) in production browsers.
  Mitigation: App should be served over HTTPS in production. The `hasError` state shows a graceful fallback.

- Risk: Safari on iOS may require `playsinline` attribute on the video element to avoid fullscreen takeover.
  Mitigation: Always include `playsInline` (note: JSX camelCase). Already in the layout above.

- Risk: Memory leak if the user navigates away while the stream is running.
  Mitigation: `useCameraStream`'s `useEffect` cleanup calls `stopStream()` on unmount. The slide surface unmounts the page when it is closed.

- Risk: `captureFrame` synchronous base64 approach for large resolution frames may be slow.
  Mitigation: The capture is from a live video element — even at 1920px, the canvas draw + dataURL is typically < 50ms on modern mobile. The compression in PLAN_03 happens async afterward. If performance is an issue post-testing, switch to async `canvas.toBlob`.

## Validation plan

- `npm run typecheck`: zero errors.
- Manual mobile test (iPhone Safari): camera opens, preview is live, tapping capture produces a visible flash + haptic.
- Manual mobile test: rapid capture (5 photos quickly) — each appears as an optimistic tile in the grid.
- Unit tests (PLAN_12): `useCameraStream` — verify `stopStream` called on unmount.
- Playwright (PLAN_12): camera open on item form, capture button visible and testable.

## Review log

- `2026-05-21` Claude Sonnet 4.6: Plan authored.

## Lifecycle transition

- Current state: `under_construction`
- Next state: `approved`
- Transition owner: `David`
