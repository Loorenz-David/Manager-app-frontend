import { useCallback, useRef, type ReactNode } from 'react';

const MAX_SCALE = 4;
const MIN_SCALE = 1;
const SNAP_MS = 200;

type PointerPos = {
  x: number;
  y: number;
};

type PinchStart = {
  distance: number;
  scale: number;
  panX: number;
  panY: number;
};

type ZoomableEditorStageProps = {
  children: ReactNode;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
};

export function ZoomableEditorStage({
  children,
  onPinchStart,
  onPinchEnd,
}: ZoomableEditorStageProps): React.JSX.Element {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const transformElRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef(MIN_SCALE);
  const panRef = useRef({ x: 0, y: 0 });
  const activePointersRef = useRef(new Map<number, PointerPos>());
  const pinchStartRef = useRef<PinchStart | null>(null);
  const isPinchingRef = useRef(false);

  const applyTransform = useCallback((scale: number, panX: number, panY: number, animate = false) => {
    const element = transformElRef.current;

    if (!element) {
      return;
    }

    element.style.transition = animate ? `transform ${SNAP_MS}ms ease-out` : 'none';
    element.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }, []);

  const clampPan = useCallback((scale: number, panX: number, panY: number) => {
    const outer = outerRef.current;

    if (!outer || scale <= MIN_SCALE) {
      return { x: 0, y: 0 };
    }

    const maxX = ((scale - 1) * outer.clientWidth) / 2;
    const maxY = ((scale - 1) * outer.clientHeight) / 2;

    return {
      x: Math.min(Math.max(panX, -maxX), maxX),
      y: Math.min(Math.max(panY, -maxY), maxY),
    };
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointersRef.current.size < 2) {
      return;
    }

    if (!isPinchingRef.current) {
      onPinchStart?.();
    }

    isPinchingRef.current = true;

    for (const pointerId of activePointersRef.current.keys()) {
      try {
        outerRef.current?.setPointerCapture(pointerId);
      } catch {
        // Pointer may have been released already.
      }
    }

    const [pointA, pointB] = Array.from(activePointersRef.current.values());
    const distance = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y) || 1;

    pinchStartRef.current = {
      distance,
      scale: scaleRef.current,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
  }, [onPinchStart]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPinchingRef.current || !pinchStartRef.current) {
      return;
    }

    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointersRef.current.size < 2) {
      return;
    }

    const outer = outerRef.current;

    if (!outer) {
      return;
    }

    const [pointA, pointB] = Array.from(activePointersRef.current.values());
    const currentDistance = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y) || 1;
    const scaleChange = currentDistance / pinchStartRef.current.distance;
    const rawScale = pinchStartRef.current.scale * scaleChange;
    const scale = Math.min(Math.max(rawScale, 0.7), 5);

    const currentMidX = (pointA.x + pointB.x) / 2;
    const currentMidY = (pointA.y + pointB.y) / 2;
    const rect = outer.getBoundingClientRect();
    const localMidX = currentMidX - rect.left - rect.width / 2;
    const localMidY = currentMidY - rect.top - rect.height / 2;
    const scaleFactor = scale / pinchStartRef.current.scale;
    const rawPanX = localMidX - (localMidX - pinchStartRef.current.panX) * scaleFactor;
    const rawPanY = localMidY - (localMidY - pinchStartRef.current.panY) * scaleFactor;
    const clampedPan = clampPan(scale, rawPanX, rawPanY);

    scaleRef.current = scale;
    panRef.current = clampedPan;
    applyTransform(scale, clampedPan.x, clampedPan.y);
  }, [applyTransform, clampPan]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);

    if (activePointersRef.current.size >= 2 || !isPinchingRef.current) {
      return;
    }

    isPinchingRef.current = false;
    pinchStartRef.current = null;
    onPinchEnd?.();

    const clampedScale = Math.min(Math.max(scaleRef.current, MIN_SCALE), MAX_SCALE);
    const clampedPan = clampPan(clampedScale, panRef.current.x, panRef.current.y);

    scaleRef.current = clampedScale;
    panRef.current = clampedPan;
    applyTransform(clampedScale, clampedPan.x, clampedPan.y, true);
  }, [applyTransform, clampPan, onPinchEnd]);

  return (
    <div
      ref={outerRef}
      className="absolute inset-0 overflow-hidden"
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        ref={transformElRef}
        className="absolute inset-0"
        style={{ transformOrigin: 'center center', willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  );
}
