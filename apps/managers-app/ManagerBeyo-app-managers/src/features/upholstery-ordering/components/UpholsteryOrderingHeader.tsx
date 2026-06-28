import { ChevronLeft } from "lucide-react";
import { SearchBar } from "@beyo/ui";

import { BoxPicker, HorizontalScrollArea } from "@/components/primitives";
import { formatCompactCount } from "@/features/pending-upholstery/lib/format-compact-count";

import type { OrderNeedsCount, OrdersCount } from "../types";

type Mode = "needs" | "orders";

type Props = {
  isLoading: boolean;
  mode: Mode;
  searchInput: string;
  needsCount: OrderNeedsCount | null;
  ordersCount: OrdersCount | null;
  countsError: boolean;
  onBack: () => void;
  onModeChange: (mode: Mode) => void;
  onSearchChange: (value: string) => void;
};

const SLIDE_HIDE_STYLE: React.CSSProperties = {
  transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

export function UpholsteryOrderingHeader({
  isLoading,
  mode,
  searchInput,
  needsCount,
  ordersCount,
  countsError,
  onBack,
  onModeChange,
  onSearchChange,
}: Props): React.JSX.Element {
  const needsLabel =
    needsCount && !countsError
      ? `Needs ordering (${formatCompactCount(needsCount.upholstery_count)})`
      : "Needs ordering";
  const ordersLabel =
    ordersCount && !countsError
      ? `Orders (${formatCompactCount(ordersCount.total)})`
      : "Orders";

  return (
    <div
      className="relative flex flex-col bg-background"
      data-testid="upholstery-ordering-header"
    >
      {/* Search bar row — z-10 bg-background acts as mask for the pills (Pattern C) */}
      <div className="relative z-10 flex items-center gap-2 bg-background px-4 py-2">
        <button
          aria-label="Close"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-foreground"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <SearchBar
          data-testid="upholstery-ordering-search"
          isLoading={isLoading}
          placeholder="Search upholstery..."
          showFilterButton={false}
          showSortButton={false}
          value={searchInput}
          wrapperClassName="flex-1 bg-card"
          onChange={onSearchChange}
        />
      </div>

      {/* Pills — absolute at top:100%, slides up behind search bar row (Pattern C) */}
      <div
        className="absolute inset-x-0 bg-background"
        style={{ top: "100%", ...SLIDE_HIDE_STYLE }}
      >
        <HorizontalScrollArea className="pb-1">
          <BoxPicker<Mode>
            className="flex flex-nowrap flex-row gap-1.5 px-4"
            data-testid="upholstery-ordering-modes"
            layout="stack"
            mode="single"
            options={[
              { value: "needs", label: needsLabel },
              { value: "orders", label: ordersLabel },
            ]}
            size="sm"
            showDescription={false}
            showIcon={false}
            value={mode}
            visualVariant="pill"
            onValueChange={onModeChange}
            selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
            unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
          />
        </HorizontalScrollArea>
      </div>
    </div>
  );
}
