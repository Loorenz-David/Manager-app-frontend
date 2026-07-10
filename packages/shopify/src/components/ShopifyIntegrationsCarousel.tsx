import { cn, durations, easings } from "@beyo/lib";

type ShopifyIntegrationsCarouselProps = {
  activeIndex: 0 | 1 | 2;
  listPane: React.ReactNode;
  detailPane: React.ReactNode;
  createPane: React.ReactNode;
  className?: string;
};

export function ShopifyIntegrationsCarousel({
  activeIndex,
  listPane,
  detailPane,
  createPane,
  className,
}: ShopifyIntegrationsCarouselProps): React.JSX.Element {
  return (
    <div
      className={cn("h-full overflow-hidden", className)}
      data-testid="shopify-integrations-carousel"
    >
      <div
        className="flex h-full w-[300%]"
        style={{
          transform: `translateX(${activeIndex * -33.333333}%)`,
          transition: `transform ${durations.slide}s cubic-bezier(${easings.slideIn.join(",")})`,
        }}
      >
        <div className="flex h-full w-1/3 min-w-0 flex-col">{listPane}</div>
        <div className="flex h-full w-1/3 min-w-0 flex-col">{detailPane}</div>
        <div className="flex h-full w-1/3 min-w-0 flex-col">{createPane}</div>
      </div>
    </div>
  );
}
