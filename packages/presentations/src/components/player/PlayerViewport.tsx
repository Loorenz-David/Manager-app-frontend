import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type PlayerViewportProps = {
  /** Receives the measured box so the runtime renderer can scale to it. */
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
};

/** Fills its container, measures itself, and hands the size to the renderer.
 * Measurement is the only logic here — playback stays in the logic layer. */
export function PlayerViewport({
  children,
  className,
}: PlayerViewportProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () =>
      setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-testid="presentation-player-viewport"
      className={`relative h-full w-full overflow-hidden bg-[#1c1c1c] ${className ?? ""}`}
    >
      {size !== null && size.width > 0 && children(size)}
    </div>
  );
}
