import { cn } from '@/lib/utils';

type ImageCarouselIndicatorsProps = {
  count: number;
  activeIndex: number;
  testId?: string;
};

export function ImageCarouselIndicators({
  count,
  activeIndex,
  testId = 'image-carousel-indicators',
}: ImageCarouselIndicatorsProps): React.JSX.Element | null {
  if (count <= 1) {
    return null;
  }

  return (
    <div
      aria-label="Image indicators"
      className="flex items-center justify-center gap-1.5"
      data-testid={testId}
      role="tablist"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          aria-selected={index === activeIndex}
          className={cn(
            'h-1.5 rounded-full transition-all duration-200',
            index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40',
          )}
          data-testid={`carousel-dot-${index}`}
          role="tab"
        />
      ))}
    </div>
  );
}
