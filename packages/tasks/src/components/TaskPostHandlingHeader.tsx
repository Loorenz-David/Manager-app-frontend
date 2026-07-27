import { ChevronLeft } from "lucide-react";

import { cn } from "@beyo/lib";
import { SearchBar } from "@beyo/ui";


type TaskPostHandlingHeaderProps = {
  q: string;
  isLoading: boolean;
  activeTab: "pending" | "filled";
  stateCounts?: Partial<Record<"pending" | "filled", number>>;
  isPillsDisabled: boolean;
  completedFilterCount: number;
  onBack: () => void;
  onQChange: (value: string) => void;
  onTabChange: (tab: "pending" | "filled") => void;
  onFilterPress: () => void;
};

export function TaskPostHandlingHeader({
  q,
  isLoading,
  activeTab,
  stateCounts,
  isPillsDisabled,
  completedFilterCount,
  onBack,
  onQChange,
  onTabChange,
  onFilterPress,
}: TaskPostHandlingHeaderProps): React.JSX.Element {
  // Scrolls away with the body: the page has no scroll-visibility behaviour,
  // so the search row and the filter row are plain in-flow content.
  return (
    <div
      className="flex flex-col bg-background"
      data-testid="task-post-handling-header"
      style={
        {
          "--type-picker-height": "56px",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center gap-2 bg-background px-4 py-2">
        {/* Page-native close: the slide surface renders no header here. */}
        <button
          aria-label="Go back"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors duration-150 hover:bg-muted"
          data-testid="task-post-handling-back-button"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <SearchBar
          activeFilterCount={completedFilterCount}
          data-testid="task-post-handling-search"
          isLoading={isLoading}
          onFilterPress={onFilterPress}
          placeholder="Search post-handling tasks..."
          showFilterButton={true}
          showSortButton={false}
          value={q}
          wrapperClassName="flex-1 bg-card"
          onChange={onQChange}
        />
      </div>

      <div className="bg-background px-4 pb-1">
        <div
          className="flex gap-2 pb-1"
          data-testid="task-post-handling-filters"
        >
          {(["pending", "filled"] as const).map((state) => {
            const isActive = activeTab === state;
            const count = stateCounts?.[state];
            const label = count != null ? `${state} (${count})` : state;

            return (
              <button
                aria-pressed={isActive}
                key={state}
                className={cn(
                  "min-w-0 flex-1 rounded-full border px-4 py-2 text-center text-sm font-medium capitalize transition",
                  isPillsDisabled && "cursor-not-allowed opacity-50",
                  isActive
                    ? "border-blue-400 bg-blue-100 text-blue-700"
                    : "border-slate-300 bg-card text-slate-700",
                )}
                data-testid={`task-post-handling-filter-${state}`}
                disabled={isPillsDisabled}
                type="button"
                onClick={() => onTabChange(state)}
              >
                <span className="block truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
