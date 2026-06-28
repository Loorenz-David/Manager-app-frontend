import { ChevronLeft } from "lucide-react";

import { BoxPicker, HorizontalScrollArea } from "@beyo/ui";
import { cn } from "@beyo/lib";

import type { UpholsteryQuickFilter } from "../types";
import { UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS } from "../types";
import { UpholsterySearch } from "./UpholsterySearch";

type UpholsteryPickerHeaderProps = {
  q: string;
  activeFilter: UpholsteryQuickFilter;
  isFilterDisabled?: boolean;
  onBackPress: () => void;
  onQChange: (value: string) => void;
  onFilterChange: (filter: UpholsteryQuickFilter) => void;
};

const SLIDE_HIDE_STYLE: React.CSSProperties = {
  transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

export function UpholsteryPickerHeader({
  q,
  activeFilter,
  isFilterDisabled = false,
  onBackPress,
  onQChange,
  onFilterChange,
}: UpholsteryPickerHeaderProps): React.JSX.Element {
  const filterOptions = UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS.map((option) => ({
    ...option,
    disabled: isFilterDisabled,
  }));

  return (
    <div
      className="relative flex flex-col bg-background"
      data-testid="upholstery-picker-header"
    >
      {/* Search bar row — z-10 bg-background acts as mask for the pills (Pattern C) */}
      <div className="relative z-10 border-b border-border bg-background px-4 pb-3.5 pt-3">
        <div className="flex items-center gap-2">
          <button
            aria-label="Go back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            type="button"
            onClick={onBackPress}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <UpholsterySearch value={q} onChange={onQChange} />
          </div>
        </div>
      </div>

      {/* Pills — absolute at top:100%, slides up behind search bar row (Pattern C) */}
      <div
        className="absolute inset-x-0 bg-background"
        style={{ top: "100%", ...SLIDE_HIDE_STYLE }}
      >
        <HorizontalScrollArea className="pb-1">
          <BoxPicker
            className={cn(
              "flex flex-nowrap flex-row gap-1.5 px-4 transition-opacity duration-150",
              isFilterDisabled && "pointer-events-none opacity-60",
            )}
            data-testid="upholstery-quick-filter-pills"
            disabledOptionClassName="opacity-60"
            layout="stack"
            mode="single"
            options={filterOptions}
            showDescription={false}
            showIcon={false}
            size="sm"
            value={activeFilter}
            visualVariant="pill"
            onValueChange={onFilterChange}
            selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
            unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
          />
        </HorizontalScrollArea>
      </div>
    </div>
  );
}
