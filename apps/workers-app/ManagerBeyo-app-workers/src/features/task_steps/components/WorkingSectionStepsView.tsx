import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { ImagePlaceholder, PullToRefresh, SearchBar } from "@beyo/ui";
import { usePreloadSurface } from "@beyo/hooks";
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import type { WorkingSectionViewModel } from "../../working_sections/types";
import { preloadStepStateFilterSheetSurface } from "../surfaces";
import { useWorkingSectionStepsContext } from "../providers/WorkingSectionStepsProvider";
import { TaskStepCard } from "./TaskStepCard";

type WorkingSectionStepsViewProps = {
  section: WorkingSectionViewModel;
  onBack: () => void;
};

export function WorkingSectionStepsView({
  section,
  onBack,
}: WorkingSectionStepsViewProps): React.JSX.Element {
  usePreloadSurface(preloadStepStateFilterSheetSurface);

  const {
    steps,
    nonTerminalCounts,
    isPending,
    isError,
    search,
    setSearch,
    activeFilterCount,
    refetch,
    handleTransition,
    handleOpenStateFilter,
    handleOpenTaskActions,
    handleOpenTaskDetail,
    handleOpenImageViewer,
    transitioningStepId,
  } = useWorkingSectionStepsContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const registerScrollElement = useRegisterScrollElement();

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    return registerScrollElement(element);
  }, [registerScrollElement]);

  const nonTerminalEntries = Object.entries(nonTerminalCounts).filter(
    ([, count]) => count > 0,
  );

  return (
    <div
      className="flex h-full flex-col"
      data-testid="working-section-steps-view"
    >
      <header className="flex flex-col gap-2 px-4 pb-2 pt-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Back"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            data-testid="working-section-steps-back"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full ">
              {section.imageUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  decoding="async"
                  draggable={false}
                  src={section.imageUrl}
                />
              ) : (
                <ImagePlaceholder iconClassName="size-3.5 text-muted-foreground/60" />
              )}
            </div>
            <span
              className="truncate text-lg font-semibold text-foreground"
              data-testid="working-section-steps-title"
            >
              {section.name}
            </span>
          </div>
        </div>

        {nonTerminalEntries.length > 0 ? (
          <div
            className="flex flex-wrap gap-1.5 pl-12"
            data-testid="working-section-steps-counts"
          >
            {nonTerminalEntries.map(([state, count]) => (
              <span
                key={state}
                className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground"
              >
                {count} {state.replace("_", " ")}
              </span>
            ))}
          </div>
        ) : null}

        <SearchBar
          showSortButton={false}
          activeFilterCount={activeFilterCount}
          data-testid="working-section-steps-search"
          placeholder="Search by article, SKU…"
          value={search}
          onChange={setSearch}
          onFilterPress={handleOpenStateFilter}
        />
      </header>

      <PullToRefresh
        className="flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={refetch}
      >
        {isPending ? (
          <div className="flex flex-col gap-3 py-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="mx-4 h-32 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="working-section-steps-error"
          >
            Could not load steps. Pull to refresh.
          </div>
        ) : steps.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="working-section-steps-empty"
          >
            No steps found
            {search ? ` matching "${search}"` : ""}
            {activeFilterCount > 0 && !search ? " with the active filter" : ""}.
          </div>
        ) : (
          <div
            className="flex flex-col gap-4 py-2 pb-10"
            data-testid="working-section-steps-list"
          >
            {steps.map((card) => (
              <TaskStepCard
                key={card.stepId}
                card={card}
                transitioningStepId={transitioningStepId}
                onTapActions={handleOpenTaskActions}
                onTapCard={handleOpenTaskDetail}
                onTapImage={handleOpenImageViewer}
                onTransition={handleTransition}
              />
            ))}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
