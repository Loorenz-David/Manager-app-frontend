import { Plus } from "lucide-react";

import { cn } from "@beyo/lib";

import { DASHBOARD_FILTERS, type DashboardFilterKey } from "./types";

type DashboardFilterRowProps = {
  activeFilter: DashboardFilterKey;
  onFilterChange: (filter: DashboardFilterKey) => void;
  onNewAnnouncement: () => void;
  newAnnouncementDisabled?: boolean;
};

export function DashboardFilterRow({
  activeFilter,
  onFilterChange,
  onNewAnnouncement,
  newAnnouncementDisabled,
}: DashboardFilterRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div role="tablist" className="flex items-center gap-1">
        {DASHBOARD_FILTERS.map((filter) => {
          const isActive = filter.key === activeFilter;
          return (
            <button
              key={filter.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange(filter.key)}
              data-testid={`presentation-dashboard-filter-chip-${filter.key}`}
              className={cn(
                "rounded-lg px-3 py-[7px] text-[13px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8]",
                isActive
                  ? "border border-[#e0e0e0] bg-white font-semibold text-[#303030]"
                  : "border border-transparent text-[#767676] hover:text-[#303030]",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onNewAnnouncement}
        disabled={newAnnouncementDisabled}
        data-testid="presentation-dashboard-new-announcement-button"
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#303030] px-4 py-[9px] text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#1c1c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f78a8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={2.5} />
        New announcement
      </button>
    </div>
  );
}
