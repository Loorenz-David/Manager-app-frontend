import { useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "@beyo/lib";

type CanvasDraggableBoxProps = {
  /** Center-anchored position and box size, all fractions of the canvas (0..1),
   * computed by the logic layer (same values the runtime renderer uses). */
  centerXFraction: number;
  centerYFraction: number;
  widthFraction?: number;
  isSelected: boolean;
  /** Selected element currently outside its on-screen window: faint + dashed. */
  isOutsideWindow?: boolean;
  onSelect: () => void;
  /** Continuous while dragging: raw center fractions (unclamped — logic clamps). */
  onDrag: (centerXFraction: number, centerYFraction: number) => void;
  onDragEnd: () => void;
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
  isSelected,
  isOutsideWindow,
  onSelect,
  onDrag,
  onDragEnd,
  disabled,
  children,
  testId,
}: CanvasDraggableBoxProps): React.JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);

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
      }}
    >
      {children}
    </div>
  );
}
