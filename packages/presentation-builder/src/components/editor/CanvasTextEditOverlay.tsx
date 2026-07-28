import { useLayoutEffect, useRef, type CSSProperties } from "react";

type CanvasTextEditOverlayProps = {
  centerXFraction: number;
  centerYFraction: number;
  widthFraction: number;
  heightFraction: number;
  canvasHeightPx: number;
  value: string;
  /**
   * The element's `compositionTextStyle` at this canvas width, applied verbatim so the
   * textarea breaks lines exactly where the renderer will. Never restyle text here —
   * every deviation is a wrap the author edits against but never gets.
   */
  textStyle: CSSProperties;
  onChange: (value: string) => void;
  onCommit: () => void;
  testId: string;
};

export function CanvasTextEditOverlay({
  centerXFraction,
  centerYFraction,
  widthFraction,
  heightFraction,
  canvasHeightPx,
  value,
  textStyle,
  onChange,
  onCommit,
  testId,
}: CanvasTextEditOverlayProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const boxHeightPx = Math.max(18, heightFraction * canvasHeightPx);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = `${boxHeightPx}px`;
    input.style.height = `${Math.max(input.scrollHeight, boxHeightPx)}px`;
  }, [boxHeightPx, value]);

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onCommit}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onCommit();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label="Edit text on canvas"
      data-testid={testId}
      // Outline, never border: a border would consume content width and shift every wrap.
      className="absolute z-50 -translate-x-1/2 -translate-y-1/2 resize-none overflow-hidden border-0 outline-1 outline-[#3f78a8] ring-2 ring-[#3f78a8]/30"
      style={{
        ...textStyle,
        left: `${centerXFraction * 100}%`,
        top: `${centerYFraction * 100}%`,
        width: `${widthFraction * 100}%`,
        minHeight: `${boxHeightPx}px`,
        backgroundColor: textStyle.backgroundColor ?? "transparent",
        color: textStyle.color ?? "inherit",
      }}
    />
  );
}
