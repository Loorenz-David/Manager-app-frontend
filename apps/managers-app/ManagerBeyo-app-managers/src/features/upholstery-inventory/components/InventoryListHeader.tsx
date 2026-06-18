import { cn } from "@beyo/lib";

import {
  BoxPicker,
  HorizontalScrollArea,
  SearchBar,
} from "@/components/primitives";

import {
  INVENTORY_QUICK_FILTER_OPTIONS,
  type InventoryQuickFilter,
} from "../types";

const COLLAPSE =
  "grid transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";

type InventoryListHeaderProps = {
  isCompact: boolean;
  isLoading: boolean;
  q: string;
  activeFilter: InventoryQuickFilter;
  onQChange: (value: string) => void;
  onFilterChange: (filter: InventoryQuickFilter) => void;
};

export function InventoryListHeader({
  isCompact,
  isLoading,
  q,
  activeFilter,
  onQChange,
  onFilterChange,
}: InventoryListHeaderProps): React.JSX.Element {
  return (
    <div
      className="flex flex-col bg-background"
      data-testid="upholstery-inventory-header"
    >
      <div className="px-4 py-2">
        <SearchBar
          activeFilterCount={0}
          data-testid="upholstery-inventory-search-bar"
          isLoading={isLoading}
          placeholder="Search upholstery..."
          value={q}
          wrapperClassName="bg-[var(--color-card)]"
          onChange={onQChange}
          onFilterPress={() => undefined}
          onSortPress={() => undefined}
        />
      </div>

      <div
        className={cn(
          COLLAPSE,
          isCompact
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <HorizontalScrollArea className="pb-1">
            <BoxPicker
              className="flex flex-nowrap flex-row gap-1.5 px-4"
              data-testid="upholstery-inventory-quick-filter-pills"
              layout="stack"
              mode="single"
              options={INVENTORY_QUICK_FILTER_OPTIONS}
              size="sm"
              showDescription={false}
              showIcon={false}
              value={activeFilter}
              visualVariant="pill"
              selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
              unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
              onValueChange={onFilterChange}
            />
          </HorizontalScrollArea>
        </div>
      </div>
    </div>
  );
}
