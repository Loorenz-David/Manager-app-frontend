import { BackendImage } from '@beyo/ui';

export type CompletedItem = {
  name: string;
  imageUrl: string | null;
  units: number;
};

type Props = {
  items: CompletedItem[];
  totalUnits: number;
  lineCount: number;
};

function ProductFallback(): React.JSX.Element {
  return (
    <div className="grid h-full w-full place-items-center bg-kiosk-key">
      <svg
        aria-hidden="true"
        className="size-7 text-kiosk-tertiary"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <rect height="16" rx="2" width="18" x="3" y="4" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m5 18 5-5 3 3 3.5-3.5L21 17" />
      </svg>
    </div>
  );
}

/**
 * "ITEMS COMPLETED" — horizontal product carousel (image, name, units).
 * GAP-fed via SummaryExtrasAdapter.items: the host renders this only when
 * the adapter yields data; the component itself assumes a non-empty list.
 */
export function ItemsCompletedCarousel({
  items,
  totalUnits,
  lineCount,
}: Props): React.JSX.Element {
  return (
    <section data-testid="items-completed">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-kiosk-tertiary">
          Items completed
        </h2>
        <p className="font-kiosk-mono text-[13px] text-kiosk-secondary">
          {totalUnits} units · {lineCount} lines
        </p>
      </div>
      <div className="-mx-1 mt-3 flex snap-x gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <div
            key={item.name}
            className="w-[132px] shrink-0 snap-start sm:w-[148px]"
            data-testid="items-completed-card"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-[16px] border border-kiosk-line bg-kiosk-card">
              <BackendImage
                className="h-full w-full object-cover"
                fallback={<ProductFallback />}
                src={item.imageUrl}
              />
            </div>
            <p className="mt-2.5 truncate text-[14px] font-semibold text-kiosk-ink">
              {item.name}
            </p>
            <p className="mt-0.5 font-kiosk-mono text-[13px] text-kiosk-secondary">
              {item.units} units
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
