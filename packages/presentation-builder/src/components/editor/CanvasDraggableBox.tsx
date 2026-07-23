import { useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "@beyo/lib";

import type { CanvasResizeGesture, CanvasResizeHandle } from "./types";

/** Handle anchor points (percent of the box) and their resize cursors. */
const RESIZE_HANDLES: Array<{ handle: CanvasResizeHandle; left: number; top: number; cursor: string }> = [
  { handle: "nw", left: 0, top: 0, cursor: "cursor-nwse-resize" },
  { handle: "n", left: 50, top: 0, cursor: "cursor-ns-resize" },
  { handle: "ne", left: 100, top: 0, cursor: "cursor-nesw-resize" },
  { handle: "e", left: 100, top: 50, cursor: "cursor-ew-resize" },
  { handle: "se", left: 100, top: 100, cursor: "cursor-nwse-resize" },
  { handle: "s", left: 50, top: 100, cursor: "cursor-ns-resize" },
  { handle: "sw", left: 0, top: 100, cursor: "cursor-nesw-resize" },
  { handle: "w", left: 0, top: 50, cursor: "cursor-ew-resize" },
];

type CanvasDraggableBoxProps = {
  /** Center-anchored position and box size, all fractions of the canvas (0..1),
   * computed by the logic layer (same values the runtime renderer uses). */
  centerXFraction: number;
  centerYFraction: number;
  widthFraction?: number;
  heightFraction?: number;
  isSelected: boolean;
  /** Selected element currently outside its on-screen window: faint + dashed. */
  isOutsideWindow?: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
  /** Continuous while dragging: raw center fractions (unclamped — logic clamps). */
  onDrag: (centerXFraction: number, centerYFraction: number) => void;
  onDragEnd: () => void;
  /** Shows resize handles when selected. Continuous while resizing: raw delta
   * fractions per handle (unclamped — the logic layer's geometry module applies
   * aspect lock, minimum size, and canvas clamping). */
  onResize?: (gesture: CanvasResizeGesture) => void;
  onResizeEnd?: () => void;
  disabled?: boolean;
  children: ReactNode;
  testId: string;
};

/** Interactive overlay for one canvas element: positions the rendered content and
 * reports drag as canvas fractions. No clamping/time math here. */
export function CanvasDraggableBox({
  centerXFraction,
  centerYFraction,
  widthFraction,
  heightFraction,
  isSelected,
  isOutsideWindow,
  onSelect,
  onDoubleClick,
  onDrag,
  onDragEnd,
  onResize,
  onResizeEnd,
  disabled,
  children,
  testId,
}: CanvasDraggableBoxProps): React.JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);

  const handleResizePointerDown = (event: React.PointerEvent, handle: CanvasResizeHandle) => {
    if (disabled || !onResize) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = boxRef.current?.parentElement;
    const rect = canvas?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const startX = event.clientX;
    const startY = event.clientY;

    const handleMove = (moveEvent: PointerEvent) => {
      onResize({
        handle,
        deltaXFraction: (moveEvent.clientX - startX) / rect.width,
        deltaYFraction: (moveEvent.clientY - startY) / rect.height,
      });
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      onResizeEnd?.();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    onSelect();
    if (disabled) return;
    event.preventDefault();
    const canvas = boxRef.current?.parentElement;
    const rect = canvas?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = centerXFraction;
    const originY = centerYFraction;

    const handleMove = (moveEvent: PointerEvent) => {
      onDrag(
        originX + (moveEvent.clientX - startX) / rect.width,
        originY + (moveEvent.clientY - startY) / rect.height,
      );
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      onDragEnd();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      ref={boxRef}
      onPointerDown={handlePointerDown}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDoubleClick?.();
      }}
      data-testid={testId}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none active:cursor-grabbing",
        isSelected && "outline-2 outline-offset-2 outline-[#3f78a8]",
        isOutsideWindow && "opacity-25 outline-dashed outline-1 outline-white/70",
        disabled && "cursor-default active:cursor-default",
      )}
      style={{
        left: `${centerXFraction * 100}%`,
        top: `${centerYFraction * 100}%`,
        width: widthFraction === undefined ? undefined : `${widthFraction * 100}%`,
        height: heightFraction === undefined ? undefined : `${heightFraction * 100}%`,
      }}
    >
      {children}
      {isSelected && !disabled && onResize && (
        <>
          {RESIZE_HANDLES.map(({ handle, left, top, cursor }) => (
            <span
              key={handle}
              onPointerDown={(event) => handleResizePointerDown(event, handle)}
              data-testid={`${testId}-resize-${handle}`}
              className={cn(
                "absolute z-10 size-2.25 -translate-x-1/2 -translate-y-1/2 rounded-xs border-[1.5px] border-[#3f78a8] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]",
                cursor,
              )}
              style={{ left: `${left}%`, top: `${top}%` }}
            />
          ))}
        </>
      )}
    </div>
  );
}
