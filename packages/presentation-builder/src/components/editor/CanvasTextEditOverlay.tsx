import { useLayoutEffect, useRef } from "react";

type CanvasTextEditOverlayProps = {
  centerXFraction: number;
  centerYFraction: number;
  widthFraction: number;
  heightFraction: number;
  value: string;
  fontSizePx: number;
  fontWeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  textColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  padding?: number;
  onChange: (value: string) => void;
  onCommit: () => void;
  testId: string;
};

export function CanvasTextEditOverlay({
  centerXFraction,
  centerYFraction,
  widthFraction,
  heightFraction,
  value,
  fontSizePx,
  fontWeight,
  textAlign,
  textColor,
  backgroundColor,
  borderRadius,
  padding,
  onChange,
  onCommit,
  testId,
}: CanvasTextEditOverlayProps): React.JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = `${Math.max(18, heightFraction * 470)}px`;
    input.style.height = `${Math.max(input.scrollHeight, heightFraction * 470, 18)}px`;
  }, [heightFraction, value]);

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
      className="absolute z-50 -translate-x-1/2 -translate-y-1/2 resize-none overflow-hidden border border-[#3f78a8] outline-none ring-2 ring-[#3f78a8]/30"
      style={{
        left: `${centerXFraction * 100}%`,
        top: `${centerYFraction * 100}%`,
        width: `${widthFraction * 100}%`,
        minHeight: `${Math.max(18, heightFraction * 470)}px`,
        fontSize: fontSizePx,
        fontWeight,
        lineHeight: 1.2,
        textAlign,
        color: textColor,
        backgroundColor: backgroundColor ?? "transparent",
        borderRadius,
        padding,
      }}
    />
  );
}
