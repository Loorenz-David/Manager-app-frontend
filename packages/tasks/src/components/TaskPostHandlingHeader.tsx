import { cn } from "@beyo/lib";
import { SearchBar } from "@beyo/ui";

const FILTER_ROW_STYLE: React.CSSProperties = {
  transform:
    "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

type TaskPostHandlingHeaderProps = {
  q: string;
  isLoading: boolean;
  activeTab: "pending" | "filled";
  stateCounts?: Partial<Record<"pending" | "filled", number>>;
  isPillsDisabled: boolean;
  completedFilterCount: number;
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
  onQChange,
  onTabChange,
  onFilterPress,
}: TaskPostHandlingHeaderProps): React.JSX.Element {
  return (
    <div
      className="relative flex flex-col bg-background"
      data-testid="task-post-handling-header"
      style={
        {
          "--type-picker-height": "56px",
        } as React.CSSProperties
      }
    >
      <div className="relative z-10 flex items-center gap-2 bg-background px-4 py-2">
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

      <div
        className="absolute inset-x-0 bg-background px-4 pb-1"
        style={{ top: "100%", ...FILTER_ROW_STYLE }}
      >
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
