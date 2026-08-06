import { useEffect, useRef, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  PullToRefresh,
  scheduleListCommit,
  SlideStack,
  SlideStackPane,
  useCommittedPaneId,
} from "@beyo/ui";
import { cn } from "@beyo/lib";

import { UpholsteryCard } from "../components/UpholsteryCard";
import { UpholsteryPickerHeader } from "../components/UpholsteryPickerHeader";
import { useUpholsteryPickerController } from "../controllers/use-upholstery-picker.controller";

type UpholsteryPickerSlidePageProps = {
  currentClientId?: string | null;
  /**
   * `null` means the user cleared the selection — the only route back from a
   * linked upholstery to "no upholstery chosen".
   */
  onSelect?: (clientId: string | null) => void;
};

const BODY_MIN_HEIGHT_CLASS = "min-h-[calc(100dvh-9rem)]";

export function UpholsteryPickerSlidePage(): React.JSX.Element {
  const { currentClientId, onSelect } =
    useSurfaceProps<UpholsteryPickerSlidePageProps>();
  const header = useSurfaceHeader();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [stagedClientId, setStagedClientId] = useState<string | null>(
    currentClientId ?? null,
  );
  const controller = useUpholsteryPickerController(debouncedQuery);
  const isSearchActive = searchQuery.trim().length > 0;
  // The quick-filter pills follow the finger: a committed swipe repaints them
  // at the release, one settle before the filter actually changes.
  const { paneId: displayedFilter, onCommit } = useCommittedPaneId({
    activeId: controller.activeFilter,
    paneIds: controller.filterOptions.map((option) => option.value),
  });
  // Any staged change offers a save — including clearing the current selection,
  // which is how an item gets back to having no upholstery at all.
  const shouldShowSaveButton = stagedClientId !== (currentClientId ?? null);
  const isRemoving = stagedClientId === null;
  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedQuery(searchQuery),
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setStagedClientId(currentClientId ?? null);
  }, [currentClientId]);

  function handleSelect(clientId: string): void {
    setStagedClientId((current) => (current === clientId ? null : clientId));
  }

  async function handleSaveSelection(): Promise<void> {
    if (stagedClientId === null) {
      // Nothing to resolve — removing a selection needs no upholstery record.
      header?.requestClose();
      scheduleListCommit(() => onSelect?.(null));
      return;
    }

    try {
      const resolvedClientId =
        await controller.selectUpholstery(stagedClientId);
      // Close first, then commit: the row starts animating out of the list
      // beneath as this slide closes (see LIST_COMMIT_DELAY_MS). Only the
      // refetch waits for both animations, which is what used to cause the lag.
      header?.requestClose();
      scheduleListCommit(() => onSelect?.(resolvedClientId));
    } catch {
      return;
    }
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-testid="upholstery-picker-slide-page"
    >
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none scrollbar-none [&::-webkit-scrollbar]:hidden"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div data-testid="upholstery-list-scroll">
          {/* Positioned container for the body stack: panes overlap during a
           * transition and drag ghosts pin inside it. The PullToRefresh scroll
           * container above already clips horizontal overflow. The header
           * renders through the stack (still in flow, still scrolling with
           * the body) so a slide whose landing reveals it previews it in the
           * ghost instead of popping it in after the swap. */}
          <div className="relative">
            <SlideStack
              activeId={controller.activeFilter}
              header={
                <UpholsteryPickerHeader
                  activeFilter={displayedFilter}
                  activeProviderFilterCount={
                    controller.activeProviderFilterCount
                  }
                  isFilterDisabled={isSearchActive}
                  isSearchLoading={
                    isSearchActive ? controller.isLoading : false
                  }
                  onBackPress={header?.requestClose ?? (() => {})}
                  q={searchQuery}
                  onFilterChange={controller.onFilterChange}
                  onQChange={setSearchQuery}
                  onProviderFilterPress={controller.openProviderFilterSheet}
                />
              }
              // Search overrides the quick filters (the pills are disabled),
              // so the drags stand down and the surface keeps its own
              // slide-to-close for the whole page.
              onBack={
                isSearchActive ? undefined : controller.goToPreviousFilter
              }
              onCommit={onCommit}
              onForward={isSearchActive ? undefined : controller.goToNextFilter}
            >
              {controller.filterOptions.map((option) => {
                const records = controller.upholsteriesByFilter[option.value];
                const isFilterLoading =
                  controller.isLoadingByFilter[option.value];

                return (
                  <SlideStackPane
                    key={option.value}
                    className={cn(
                      "flex flex-col gap-3 px-4 pt-4",
                      shouldShowSaveButton
                        ? "pb-[calc(var(--safe-bottom,0px)+6rem)]"
                        : "pb-[calc(var(--safe-bottom,0px)+1rem)]",
                      BODY_MIN_HEIGHT_CLASS,
                    )}
                    data-testid={`upholstery-picker-body-${option.value}`}
                    id={option.value}
                  >
                    {controller.selectionError ? (
                      <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                        {controller.selectionError}
                      </p>
                    ) : null}
                    {isFilterLoading && records.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Loading upholstery…
                      </p>
                    ) : records.length > 0 ? (
                      records.map((record) => (
                        <UpholsteryCard
                          key={record.client_id}
                          disabled={controller.isSelectionPending}
                          isSaving={
                            controller.selectingClientId === record.client_id
                          }
                          isSelected={record.client_id === stagedClientId}
                          record={record}
                          testId={`upholstery-card-${record.client_id}`}
                          onSelect={handleSelect}
                          onToggleFavorite={controller.toggleFavorite}
                        />
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No results.
                      </p>
                    )}
                  </SlideStackPane>
                );
              })}
            </SlideStack>
          </div>
        </div>
      </PullToRefresh>

      {shouldShowSaveButton ? (
        <div
          className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(var(--safe-bottom,0px)+0.75rem)]"
          data-testid="upholstery-picker-bottom-actions"
        >
          <button
            className="w-full rounded-2xl bg-primary py-3.5 text-card text-md shadow-sm disabled:opacity-50"
            disabled={controller.isSelectionPending}
            type="button"
            onClick={() => void handleSaveSelection()}
          >
            {isRemoving ? "Remove upholstery" : "Save selection"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
