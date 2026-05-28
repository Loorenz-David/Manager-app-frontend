import { useCallback, useEffect, useRef } from 'react';

import { cn } from '@beyo/lib';

export type HorizontalScrollAreaProps = {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
  'data-testid'?: string;
};

export function HorizontalScrollArea({
  children,
  className,
  trackClassName,
  thumbClassName,
  'data-testid': testId,
}: HorizontalScrollAreaProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const updateThumb = useCallback(() => {
    const element = scrollRef.current;
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!element || !thumb || !track) {
      return;
    }

    const { clientWidth, scrollWidth, scrollLeft } = element;
    const ratio = clientWidth / scrollWidth;

    if (ratio >= 1) {
      track.style.visibility = 'hidden';
      return;
    }

    track.style.visibility = 'visible';
    const trackWidth = track.clientWidth;
    const thumbWidth = Math.max(ratio * trackWidth, 24);
    const maxScroll = scrollWidth - clientWidth;
    const thumbLeft = maxScroll > 0 ? (scrollLeft / maxScroll) * (trackWidth - thumbWidth) : 0;

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translateX(${thumbLeft}px)`;
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    updateThumb();
    element.addEventListener('scroll', updateThumb, { passive: true });

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        element.removeEventListener('scroll', updateThumb);
      };
    }

    const resizeObserver = new ResizeObserver(updateThumb);
    resizeObserver.observe(element);
    if (element.firstElementChild) {
      resizeObserver.observe(element.firstElementChild);
    }

    return () => {
      element.removeEventListener('scroll', updateThumb);
      resizeObserver.disconnect();
    };
  }, [updateThumb]);

  return (
    <div className="flex flex-col" data-testid={testId}>
      <div
        ref={scrollRef}
        className={cn(
          'overflow-x-auto overflow-y-hidden scrollbar-none [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {children}
      </div>

      <div
        ref={trackRef}
        className={cn('relative mx-4 mt-1.5 h-px rounded-full bg-muted/30', trackClassName)}
      >
        <div
          ref={thumbRef}
          className={cn(
            'absolute left-0 top-0 h-full rounded-full bg-muted-foreground/30',
            thumbClassName,
          )}
        />
      </div>
    </div>
  );
}
