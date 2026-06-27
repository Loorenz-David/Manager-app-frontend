import { useCallback, useEffect, useRef } from "react";

import { cn } from "@beyo/lib";

export type VerticalScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
  style?: React.CSSProperties;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  "data-testid"?: string;
};

export function VerticalScrollArea({
  children,
  className,
  trackClassName,
  thumbClassName,
  style,
  scrollRef: externalScrollRef,
  "data-testid": testId,
}: VerticalScrollAreaProps): React.JSX.Element {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const updateThumb = useCallback(() => {
    const element = scrollRef.current;
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!element || !thumb || !track) {
      return;
    }

    const { clientHeight, scrollHeight, scrollTop } = element;
    const ratio = clientHeight / scrollHeight;

    if (ratio >= 1) {
      track.style.visibility = "hidden";
      return;
    }

    track.style.visibility = "visible";
    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(ratio * trackHeight, 24);
    const maxScroll = scrollHeight - clientHeight;
    const thumbTop =
      maxScroll > 0 ? (scrollTop / maxScroll) * (trackHeight - thumbHeight) : 0;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  }, [scrollRef]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    updateThumb();
    element.addEventListener("scroll", updateThumb, { passive: true });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        element.removeEventListener("scroll", updateThumb);
      };
    }

    const resizeObserver = new ResizeObserver(updateThumb);
    resizeObserver.observe(element);
    if (element.firstElementChild) {
      resizeObserver.observe(element.firstElementChild);
    }

    return () => {
      element.removeEventListener("scroll", updateThumb);
      resizeObserver.disconnect();
    };
  }, [scrollRef, updateThumb]);

  return (
    <div className="flex flex-row" data-testid={testId} style={style}>
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 min-w-0 overflow-x-hidden overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
      </div>

      <div
        ref={trackRef}
        className={cn(
          "relative my-2 mr-0.5 w-px flex-shrink-0 rounded-full bg-muted/30",
          trackClassName,
        )}
      >
        <div
          ref={thumbRef}
          className={cn(
            "absolute left-0 top-0 w-full rounded-full bg-muted-foreground/30",
            thumbClassName,
          )}
        />
      </div>
    </div>
  );
}
