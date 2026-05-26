import { History } from "lucide-react";

import { SearchBar } from "@/components/primitives";

import { useCasesViewContext } from "../providers/CasesViewProvider";
import { CasesSectionGroup } from "./CasesSectionGroup";

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

export function CasesView(): React.JSX.Element {
  const controller = useCasesViewContext();
  const todayLabel = formatHeaderDate(new Date());

  return (
    <div
      className="flex h-full flex-col bg-background"
      data-testid="cases-page"
    >
      <div
        className="border-b border-border/70 bg-background px-4 pb-4 pt-5"
        data-testid="cases-header"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
              Cases
            </h1>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm border-[color:var(--color-light-border)]"
            type="button"
          >
            <History className="size-4" />
            <span>History</span>
          </button>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">{todayLabel}</p>

        <div className="mt-4">
          <SearchBar
            activeFilterCount={0}
            data-testid="cases-search-bar"
            isLoading={controller.isLoading}
            placeholder="Search cases, articles, or people"
            value={controller.searchQuery}
            onChange={controller.setSearchQuery}
            onFilterPress={() => {}}
            onSortPress={() => {}}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(var(--safe-bottom,0)+5rem)] pt-4">
        <div className="flex flex-col gap-6">
          <CasesSectionGroup
            group={controller.newGroup}
            sectionTestId="cases-section-new"
            unreadCounts={controller.unreadCounts}
            typingByCaseId={controller.typingByCaseId}
            onOpenCase={controller.openCase}
          />
          <CasesSectionGroup
            group={controller.activeGroup}
            sectionTestId="cases-section-active"
            unreadCounts={controller.unreadCounts}
            typingByCaseId={controller.typingByCaseId}
            onOpenCase={controller.openCase}
          />
          <CasesSectionGroup
            group={controller.resolvingGroup}
            sectionTestId="cases-section-resolving"
            unreadCounts={controller.unreadCounts}
            typingByCaseId={controller.typingByCaseId}
            onOpenCase={controller.openCase}
          />
        </div>
      </div>
    </div>
  );
}
