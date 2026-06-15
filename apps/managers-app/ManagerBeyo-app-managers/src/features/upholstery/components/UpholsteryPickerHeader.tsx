import { ChevronLeft } from "lucide-react";

import { BoxPicker, HorizontalScrollArea } from "@/components/primitives";
import { cn } from "@/lib/utils";

import type { UpholsteryQuickFilter } from "../types";
import { UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS } from "../types";
import { UpholsterySearch } from "./UpholsterySearch";

type UpholsteryPickerHeaderProps = {
  q: string;
  activeFilter: UpholsteryQuickFilter;
  isCompact: boolean;
  isFilterDisabled?: boolean;
  onBackPress: () => void;
  onQChange: (value: string) => void;
  onFilterChange: (filter: UpholsteryQuickFilter) => void;
};

export function UpholsteryPickerHeader({
  q,
  activeFilter,
  isCompact,
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
      className="sticky top-0 z-10 border-b border-border bg-background"
      data-testid="upholstery-picker-header"
    >
      <div className="px-4 pb-3.5 pt-3">
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

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isCompact
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
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
            />
          </HorizontalScrollArea>
        </div>
      </div>
    </div>
  );
}
