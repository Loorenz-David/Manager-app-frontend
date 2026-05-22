import { useCallback, useEffect, useRef } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SNAP_MS = 200;

type PointerPos = { x: number; y: number };

type PinchStart = {
  distance: number;
  scale: number;
  midX: number;
  midY: number;
  panX: number;
  panY: number;
};

type PanStart = {
  pointerX: number;
  pointerY: number;
  panX: number;
  panY: number;
};

type PanPosition = {
  x: number;
  y: number;
};

type ZoomableImageProps = {
  src: string;
  onZoomChange?: (isZoomed: boolean) => void;
};

export function ZoomableImage({ src, onZoomChange }: ZoomableImageProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const transformElRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(MIN_SCALE);
  const panRef = useRef<PanPosition>({ x: 0, y: 0 });
  const isZoomedRef = useRef(false);
  const activePointersRef = useRef(new Map<number, PointerPos>());
  const pinchStartRef = useRef<PinchStart | null>(null);
  const panStartRef = useRef<PanStart | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);

  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  const applyTransform = useCallback((animated: boolean) => {
    const transformEl = transformElRef.current;
    if (!transformEl) {
      return;
    }

    transformEl.style.transition = animated ? `transform ${SNAP_MS}ms ease-out` : 'none';
    transformEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${scaleRef.current})`;
  }, []);

  const getMaxPan = useCallback((scale: number): PanPosition => {
    const container = containerRef.current;
    if (!container) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.max(0, ((scale - 1) * container.clientWidth) / 2),
      y: Math.max(0, ((scale - 1) * container.clientHeight) / 2),
    };
  }, []);

  const clampPan = useCallback(
    (pan: PanPosition, scale: number): PanPosition => {
      const maxPan = getMaxPan(scale);

      return {
        x: Math.min(maxPan.x, Math.max(-maxPan.x, pan.x)),
        y: Math.min(maxPan.y, Math.max(-maxPan.y, pan.y)),
      };
    },
    [getMaxPan],
  );

  const notifyZoom = useCallback((zoomed: boolean) => {
    if (isZoomedRef.current !== zoomed) {
      isZoomedRef.current = zoomed;
      onZoomChangeRef.current?.(zoomed);
    }
  }, []);

  const snapToLimits = useCallback(() => {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current));
    const clampedPan = clampedScale <= MIN_SCALE ? { x: 0, y: 0 } : clampPan(panRef.current, clampedScale);
    const changed =
      clampedScale !== scaleRef.current ||
      clampedPan.x !== panRef.current.x ||
      clampedPan.y !== panRef.current.y;

    scaleRef.current = clampedScale;
    panRef.current = clampedPan;

    if (changed) {
      applyTransform(true);
    }

    notifyZoom(clampedScale > MIN_SCALE);
  }, [applyTransform, clampPan, notifyZoom]);

  const resetTransform = useCallback(() => {
    activePointersRef.current.clear();
    pinchStartRef.current = null;
    panStartRef.current = null;
    scaleRef.current = MIN_SCALE;
    panRef.current = { x: 0, y: 0 };
    applyTransform(false);
    notifyZoom(false);
  }, [applyTransform, notifyZoom]);

  useEffect(() => {
    applyTransform(false);
  }, [applyTransform]);

  useEffect(() => {
    resetTransform();
  }, [resetTransform, src]);

  useEffect(() => {
    return () => {
      onZoomChangeRef.current?.(false);
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pointerCount = activePointersRef.current.size;

    if (pointerCount === 2) {
      event.stopPropagation();

      const points = Array.from(activePointersRef.current.values());
      const [pointA, pointB] = points;
      pinchStartRef.current = {
        distance: Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y),
        scale: scaleRef.current,
        midX: (pointA.x + pointB.x) / 2,
        midY: (pointA.y + pointB.y) / 2,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      panStartRef.current = null;
      notifyZoom(true);
      return;
    }

    if (pointerCount === 1 && isZoomedRef.current) {
      event.stopPropagation();
      panStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    }
  }, [notifyZoom]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!activePointersRef.current.has(event.pointerId)) {
        return;
      }

      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = Array.from(activePointersRef.current.values());

      if (points.length === 2 && pinchStartRef.current) {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        event.stopPropagation();

        const [pointA, pointB] = points;
        const pinchStart = pinchStartRef.current;
        const newDistance = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
        const ratio = newDistance / pinchStart.distance;
        const newScale = pinchStart.scale * ratio;
        const rect = container.getBoundingClientRect();
        const localMidX = pinchStart.midX - rect.left - rect.width / 2;
        const localMidY = pinchStart.midY - rect.top - rect.height / 2;
        const scaleFactor = newScale / pinchStart.scale;

        panRef.current = {
          x: localMidX - (localMidX - pinchStart.panX) * scaleFactor,
          y: localMidY - (localMidY - pinchStart.panY) * scaleFactor,
        };
        scaleRef.current = newScale;
        applyTransform(false);
        return;
      }

      if (points.length === 1 && panStartRef.current && isZoomedRef.current) {
        event.stopPropagation();

        const panStart = panStartRef.current;
        const deltaX = event.clientX - panStart.pointerX;
        const deltaY = event.clientY - panStart.pointerY;

        panRef.current = clampPan(
          {
            x: panStart.panX + deltaX,
            y: panStart.panY + deltaY,
          },
          scaleRef.current,
        );
        applyTransform(false);
      }
    },
    [applyTransform, clampPan],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);

    const remainingPointers = activePointersRef.current.size;

    if (remainingPointers === 0) {
      pinchStartRef.current = null;
      panStartRef.current = null;
      snapToLimits();
      return;
    }

    if (remainingPointers === 1) {
      pinchStartRef.current = null;
      const [, remainingPointer] = Array.from(activePointersRef.current.entries())[0];
      panStartRef.current = {
        pointerX: remainingPointer.x,
        pointerY: remainingPointer.y,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
    }
  }, [snapToLimits]);

  return (
    <div
      ref={containerRef}
      className="size-full touch-none select-none overflow-hidden"
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        ref={transformElRef}
        className="size-full"
        style={{ transformOrigin: 'center center', willChange: 'transform' }}
      >
        <img
          alt=""
          className="h-full w-full select-none object-contain"
          draggable={false}
          loading="lazy"
          src={src}
        />
      </div>
    </div>
  );
}
