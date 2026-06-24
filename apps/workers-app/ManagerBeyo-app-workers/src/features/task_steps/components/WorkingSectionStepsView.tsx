import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { notify } from "@beyo/lib";
import type { TaskStepId } from "@beyo/lib";
import { ImagePlaceholder, PullToRefresh, SearchBar } from "@beyo/ui";
import { usePreloadSurface, useSurface } from "@beyo/hooks";
import {
  SCANNER_SESSION_ID,
  SCANNER_SLIDE_SURFACE_ID,
  type ScannerSlideSurfaceProps,
} from "@beyo/scanner";
import { preloadScannerSlideSurface } from "@beyo/task-creation";
import { useRegisterScrollElement } from "@/providers/AppScrollElementProvider";
import { useBatchSelectionOverlay } from "@/providers/BatchSelectionOverlayProvider";
import type { WorkingSectionViewModel } from "../../working_sections/types";
import { preloadStepStateFilterSheetSurface } from "../surfaces";
import { useWorkingSectionStepsContext } from "../providers/WorkingSectionStepsProvider";
import { useTransitionBatchStepStates } from "../actions/use-transition-batch-step-states";
import { canTransitionToWorking, getBatchTransitionItems } from "../types";
import { BatchSelectableTaskStepCard } from "./BatchSelectableTaskStepCard";
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
  usePreloadSurface(preloadScannerSlideSurface);

  const surface = useSurface();

  const {
    steps,
    rawSteps,
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

  // Batch selection state — only active when section.allowsBatchWorking
  const [selectedStepIds, setSelectedStepIds] = useState<Set<TaskStepId>>(
    () => new Set(),
  );

  // Sync selection visibility with AppShell overlay (hides LastActiveStepCard)
  const { setIsSelecting } = useBatchSelectionOverlay();
  useEffect(() => {
    setIsSelecting(selectedStepIds.size > 0);
    return () => setIsSelecting(false);
  }, [selectedStepIds.size, setIsSelecting]);

  // Prune stale selected IDs when rawSteps changes (refetch, socket events)
  useEffect(() => {
    if (rawSteps.length === 0) return;
    const existingIds = new Set(rawSteps.map((s) => s.client_id));
    setSelectedStepIds((prev) => {
      const pruned = new Set([...prev].filter((id) => existingIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [rawSteps]);

  // Steps that are selected AND can legally transition to working
  const eligibleSelectedSteps = useMemo(
    () =>
      rawSteps.filter(
        (s) => selectedStepIds.has(s.client_id) && canTransitionToWorking(s),
      ),
    [rawSteps, selectedStepIds],
  );

  function handleToggleSelect(stepId: TaskStepId) {
    setSelectedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }

  const { transitionBatch, isPending: isBatchTransitioning } =
    useTransitionBatchStepStates();

  function handleBatchStart() {
    const items = getBatchTransitionItems(eligibleSelectedSteps, "working");

    if (items.length === 0) return;

    if (items.length > 100) {
      notify.error(
        "Too many tasks selected",
        "Please select 100 or fewer tasks to start at once.",
      );
      return;
    }

    transitionBatch(
      {
        items,
        new_state: "working",
        reason: null,
        description: null,
        working_section_id: section.sectionId,
      },
      { onSuccess: () => setSelectedStepIds(new Set()) },
    );
  }

  function handleOpenScanner(): void {
    surface.open(SCANNER_SLIDE_SURFACE_ID, {
      sessionId: SCANNER_SESSION_ID,
      scanFormat: "barcode",
      onScan: (value: string) => {
        setSearch(value);
        surface.close(SCANNER_SLIDE_SURFACE_ID);
      },
    } satisfies ScannerSlideSurfaceProps);
  }

  return (
    <div
      className="relative flex h-full flex-col"
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

        {/* {nonTerminalEntries.length > 0 ? (
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
        ) : null} */}

        <SearchBar
          showSortButton={false}
          showScanButton
          scanDisabled={false}
          activeFilterCount={activeFilterCount}
          data-testid="working-section-steps-search"
          placeholder="Search by article, SKU…"
          value={search}
          onChange={setSearch}
          onFilterPress={handleOpenStateFilter}
          onScanPress={handleOpenScanner}
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
        ) : section.allowsBatchWorking ? (
          <div
            className="flex flex-col gap-4 py-2 pb-24"
            data-testid="batch-steps-list"
          >
            {steps.map((card) => (
              <BatchSelectableTaskStepCard
                key={card.stepId}
                card={card}
                selected={selectedStepIds.has(card.stepId)}
                onTapCard={handleOpenTaskDetail}
                onTapImage={handleOpenImageViewer}
                onToggleSelect={handleToggleSelect}
              />
            ))}
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

      {/* Floating "Start Tasks" button — batch mode only, shown when items selected */}
      {section.allowsBatchWorking && selectedStepIds.size > 0 ? (
        <div
          className="absolute bottom-[calc(var(--safe-bottom,0)+1rem)] left-0 right-0 z-20 px-4"
          data-testid="batch-start-button-container"
        >
          <button
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card shadow-lg transition-opacity disabled:opacity-60"
            data-testid="batch-start-button"
            disabled={
              isBatchTransitioning || eligibleSelectedSteps.length === 0
            }
            type="button"
            onClick={handleBatchStart}
          >
            {isBatchTransitioning
              ? "Starting…"
              : `Start Tasks (${eligibleSelectedSteps.length})`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
