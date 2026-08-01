import { useEffect, useMemo, useState } from "react";
import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import {
  BackendImage,
  ImagePlaceholder,
  PullToRefresh,
  SearchBar,
} from "@beyo/ui";
import { usePaginatedReassignedStepsQuery } from "../api/use-reassigned-steps-query";
import { groupReassignedSteps } from "../lib/group-reassigned-steps";
import type { ReassignedStepsSlideSurfaceProps } from "../surface-ids";
import type { ListReassignedStepsParams } from "../types";

// Same feel as the working-section steps list.
const SEARCH_DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function ReassignedStepsSkeleton(): React.JSX.Element {
  return (
    <div
      aria-busy="true"
      className="flex flex-col gap-3 py-2"
      data-testid="reassigned-steps-loading"
    >
      {[0, 1, 2, 3].map((index) => (
        <div
          aria-hidden="true"
          className="skeleton-shimmer mx-4 h-32 rounded-xl"
          key={index}
        />
      ))}
    </div>
  );
}

export function ReassignedStepsSlidePage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { adapter } = useSurfaceProps<ReassignedStepsSlideSurfaceProps>();

  // Deliberately local: the app-global task-steps UI store is section-scoped
  // app land, which a package must not reach into (06_client_state.md).
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    header?.setTitle("Re-Assigned");
    header?.setActions(null);
  }, [header]);

  const queryParams = useMemo<ListReassignedStepsParams>(
    () => ({ q: debouncedSearch.trim() || undefined }),
    [debouncedSearch],
  );

  const {
    items,
    workingSections,
    isPending,
    isError,
    hasMore,
    isFetchingMore,
    loadMore,
    refetch,
  } = usePaginatedReassignedStepsQuery(queryParams);

  const groups = useMemo(
    () => groupReassignedSteps(items, workingSections),
    [items, workingSections],
  );

  const StepRow = adapter?.StepRow ?? null;
  const hasSearch = debouncedSearch.trim().length > 0;

  return (
    <div
      className="flex h-full flex-col"
      data-testid="reassigned-steps-slide-page"
    >
      {/* PullToRefresh owns the scroll ref here — packages must never call
          useRegisterScrollElement (36_scroll_visibility.md, mechanism A). */}
      <PullToRefresh
        className="flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        onRefresh={refetch}
      >
        <header className="px-4 pb-2 pt-3">
          <SearchBar
            data-testid="reassigned-steps-search"
            placeholder="Search by article, SKU…"
            showFilterButton={false}
            showSortButton={false}
            value={search}
            onChange={setSearch}
          />
        </header>

        {isPending ? (
          <ReassignedStepsSkeleton />
        ) : isError ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="reassigned-steps-error"
          >
            Could not load reassigned tasks. Pull to refresh.
          </div>
        ) : groups.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-sm text-muted-foreground"
            data-testid="reassigned-steps-empty"
          >
            {hasSearch
              ? // Handoff §3.5: a step whose task has no primary item is dropped
                // by any non-empty q, so "nothing matches" is not the whole story.
                `No reassigned tasks match “${debouncedSearch.trim()}”. Tasks without an item are hidden while searching.`
              : "No tasks have been reassigned to your sections."}
          </div>
        ) : (
          <div
            className="flex flex-col gap-6 py-2 pb-10"
            data-testid="reassigned-steps-list"
          >
            {groups.map((group) => (
              <section
                key={group.workingSectionId}
                data-testid={`reassigned-steps-group-${group.workingSectionId}`}
              >
                <div className="mb-3 flex items-center gap-2 px-4">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
                    <BackendImage
                      className="size-full object-cover"
                      fallback={
                        <ImagePlaceholder iconClassName="size-3.5 text-muted-foreground/60" />
                      }
                      src={group.imageUrl}
                    />
                  </div>
                  <span
                    className="truncate text-base font-semibold text-foreground"
                    data-testid={`reassigned-steps-group-name-${group.workingSectionId}`}
                  >
                    {group.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  {group.items.map((step) =>
                    StepRow ? (
                      <StepRow key={step.client_id} step={step} />
                    ) : null,
                  )}
                </div>
              </section>
            ))}

            {hasMore ? (
              <button
                className="mx-4 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="reassigned-steps-show-more"
                disabled={isFetchingMore}
                type="button"
                onClick={() => void loadMore()}
              >
                {isFetchingMore ? "Loading…" : "Show more"}
              </button>
            ) : null}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
