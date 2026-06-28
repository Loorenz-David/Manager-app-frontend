import {
  BoxPicker,
  HorizontalScrollArea,
  SearchBar,
  type BoxPickerOptionType,
} from "@beyo/ui";

import type { CaseFilterPill } from "../types";

type CasesHeaderProps = {
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

const HIDE_STYLE: React.CSSProperties = {
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition: "opacity var(--scroll-snap-duration, 0ms) ease-out",
};

const SLIDE_HIDE_STYLE: React.CSSProperties = {
  transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

function pillLabel(base: string, count: number): string {
  return count > 0 ? `${base} (${count})` : base;
}

function getOrdinalSuffix(day: number): string {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatHeaderDate(date: Date): string {
  const day = date.getDate();
  const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(date);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  return `${day}${getOrdinalSuffix(day)} ${month}, ${weekday}`;
}

export function CasesHeader({
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
  const todayLabel = formatHeaderDate(new Date());
  const caseFilterOptions: BoxPickerOptionType<CaseFilterPill>[] = [
    { value: "unread", label: pillLabel("Unread", pillCounts.unread), testId: "cases-filter-unread" },
    { value: "active", label: pillLabel("Active", pillCounts.active), testId: "cases-filter-active" },
    { value: "in-progress", label: pillLabel("In-Progress", pillCounts.inProgress), testId: "cases-filter-in-progress" },
  ];

  return (
    <div className="relative flex flex-col bg-background" data-testid="cases-header">
      {/* Date section — fades as the whole wrapper slides up (Pattern B) */}
      <div className="px-4 pb-2 pt-3" style={HIDE_STYLE}>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      {/* Search bar — z-10 bg-background so it acts as mask for the pills (Pattern C) */}
      <div className="relative z-10 bg-background px-4 py-2">
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

      {/* Pills — absolute at top:100%, slides up behind search bar (Pattern C) */}
      {showPills ? (
        <div
          className="absolute inset-x-0 bg-background"
          style={{ top: "100%", ...SLIDE_HIDE_STYLE }}
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
      ) : null}
    </div>
  );
}
