import { ChevronLeft } from "lucide-react";
import { cn } from "@beyo/lib";

import {
  BoxPicker,
  HorizontalScrollArea,
  SearchBar,
} from "@/components/primitives";

import { formatCompactCount } from "../lib/format-compact-count";
import type { PendingSeatCounts } from "../types";

type FilterValue = "missing_selection" | "missing_quantity";

type PendingUpholsteryHeaderProps = {
  isCompact: boolean;
  searchInput: string;
  missingSelection: boolean;
  missingQuantity: boolean;
  counts: PendingSeatCounts | null;
  countsError: boolean;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onFiltersChange: (value: FilterValue) => void;
  onBack: () => void;
};

const COLLAPSE =
  "grid transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";
const SLIDE =
  "transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";

export function PendingUpholsteryHeader({
  isCompact,
  searchInput,
  missingSelection,
  counts,
  countsError,
  isLoading,
  onSearchChange,
  onFiltersChange,
  onBack,
}: PendingUpholsteryHeaderProps): React.JSX.Element {
  const activeFilter: FilterValue = missingSelection
    ? "missing_selection"
    : "missing_quantity";
  const selectionLabel =
    counts && !countsError
      ? `Missing selection (${formatCompactCount(counts.missing_selection_total)})`
      : "Missing selection";
  const quantityLabel =
    counts && !countsError
      ? `Missing quantity (${formatCompactCount(counts.missing_quantity_total)})`
      : "Missing quantity";

  function handleFilterChange(next: FilterValue): void {
    onFiltersChange(next);
  }

  return (
    <div
      className="flex flex-col overflow-hidden bg-background"
      data-testid="pending-upholstery-header"
    >
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
          data-testid="pending-upholstery-search"
          isLoading={isLoading}
          placeholder="Search pending tasks..."
          value={searchInput}
          wrapperClassName="flex-1 bg-card"
          onChange={onSearchChange}
        />
      </div>
      <div
        className={cn(
          COLLAPSE,
          "relative z-0",
          isCompact
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              SLIDE,
              isCompact ? "-translate-y-full" : "translate-y-0",
            )}
          >
            <HorizontalScrollArea className="pb-1">
              <BoxPicker<FilterValue>
                className="flex flex-nowrap flex-row gap-1.5 px-4"
                data-testid="pending-upholstery-filters"
                layout="stack"
                mode="single"
                options={[
                  { value: "missing_selection", label: selectionLabel },
                  { value: "missing_quantity", label: quantityLabel },
                ]}
                size="sm"
                showDescription={false}
                showIcon={false}
                value={activeFilter}
                visualVariant="pill"
                onValueChange={handleFilterChange}
                selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
                unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
              />
            </HorizontalScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
