import { cn } from "@beyo/lib";
import {
  BoxPicker,
  HorizontalScrollArea,
  SearchBar,
  type BoxPickerOptionType,
} from "@beyo/ui";

import type { CaseFilterPill } from "../types";

type CasesHeaderProps = {
  isCompact: boolean;
  activeFilter: CaseFilterPill;
  q: string;
  isLoading: boolean;
  activeFilterCount: number;
  pillCounts: { unread: number; active: number; inProgress: number };
  showPills: boolean;
  onFilterChange: (filter: CaseFilterPill) => void;
  onQChange: (value: string) => void;
  onSortPress: () => void;
  onFilterPress: () => void;
};

const COLLAPSE_SHELL =
  "overflow-hidden transition-[max-height,opacity] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[max-height,opacity]";
const COLLAPSE_CONTENT =
  "transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform";

function pillLabel(base: string, count: number): string {
  return count > 0 ? `${base} (${count})` : base;
}

function getOrdinalSuffix(day: number): string {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatHeaderDate(date: Date): string {
  const day = date.getDate();
  const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(
    date,
  );
  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(date);

  return `${day}${getOrdinalSuffix(day)} ${month}, ${weekday}`;
}

export function CasesHeader({
  isCompact,
  activeFilter,
  q,
  isLoading,
  activeFilterCount,
  pillCounts,
  showPills,
  onFilterChange,
  onQChange,
  onSortPress,
  onFilterPress,
}: CasesHeaderProps): React.JSX.Element {
  const showExpandedPills = showPills && !isCompact;
  const todayLabel = formatHeaderDate(new Date());
  const caseFilterOptions: BoxPickerOptionType<CaseFilterPill>[] = [
    { value: "unread", label: pillLabel("Unread", pillCounts.unread), testId: "cases-filter-unread" },
    { value: "active", label: pillLabel("Active", pillCounts.active), testId: "cases-filter-active" },
    { value: "in-progress", label: pillLabel("In-Progress", pillCounts.inProgress), testId: "cases-filter-in-progress" },
  ];

  return (
    <div className="flex flex-col bg-background" data-testid="cases-header">
      <div
        className={cn(
          COLLAPSE_SHELL,
          isCompact
            ? "max-h-0 opacity-0"
            : "max-h-16 opacity-100",
        )}
      >
        <div
          className={cn(
            COLLAPSE_CONTENT,
            isCompact ? "-translate-y-3" : "translate-y-0",
          )}
        >
          <div className="px-4 pb-2 pt-3">
            <p className="text-sm text-muted-foreground">{todayLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
        <SearchBar
          activeFilterCount={activeFilterCount}
          data-testid="cases-search-bar"
          isLoading={isLoading}
          placeholder="Search cases, articles, or people"
          value={q}
          wrapperClassName="bg-[var(--color-card)]"
          onChange={onQChange}
          onFilterPress={onFilterPress}
          onSortPress={onSortPress}
        />
      </div>

      <div
        className={cn(
          COLLAPSE_SHELL,
          showExpandedPills
            ? "max-h-14 opacity-100"
            : "max-h-0 opacity-0",
        )}
      >
        <div
          className={cn(
            COLLAPSE_CONTENT,
            showExpandedPills ? "translate-y-0" : "-translate-y-3",
          )}
        >
          <HorizontalScrollArea className="pb-1">
            <BoxPicker
              className="flex flex-nowrap flex-row gap-1.5 px-4"
              data-testid="cases-state-filter"
              layout="stack"
              mode="single"
              options={caseFilterOptions}
              showDescription={false}
              showIcon={false}
              size="sm"
              value={activeFilter}
              visualVariant="pill"
              onValueChange={onFilterChange}
              selectedOptionClassName="border-blue-400 bg-blue-100 text-blue-500"
              unselectedOptionClassName="border-slate-300 bg-white text-slate-700"
            />
          </HorizontalScrollArea>
        </div>
      </div>
    </div>
  );
}
