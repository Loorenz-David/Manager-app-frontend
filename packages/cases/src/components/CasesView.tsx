import { AnimatePresence, m } from "framer-motion";
import { Plus } from "lucide-react";

import { cn, transitions } from "@beyo/lib";
import { PullToRefresh, useScrollHide } from "@beyo/ui";

import { useCasesViewContext } from "../providers/CasesViewProvider";
import { CaseCard } from "./CaseCard";
import { CasesHeader } from "./CasesHeader";

const bodyVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: transitions.slide,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: transitions.slide,
  }),
} as const;

export function CasesView(): React.JSX.Element {
  const controller = useCasesViewContext();
  const { scrollRef, isHidden, hideProgressContainerRef } = useScrollHide();

  return (
    <div
      ref={hideProgressContainerRef}
      className="relative flex-1 min-h-0 bg-background"
      data-testid="cases-page"
    >
      {/* Pattern B — whole header slides up by date section height */}
      <div
        className="absolute inset-x-0 top-0 z-10"
        style={{
          transform:
            "translateY(calc(-1 * var(--date-section-height, 40px) * var(--scroll-hide-progress, 0)))",
          transition: "transform var(--scroll-snap-duration, 0ms) ease-out",
          pointerEvents: isHidden ? "none" : undefined,
        }}
      >
        <CasesHeader
          activeFilter={controller.activeFilter}
          activeFilterCount={controller.activeFilterCount}
          isLoading={controller.isLoading}
          pillCounts={controller.pillCounts}
          q={controller.searchQuery}
          showPills={controller.showPills}
          onFilterChange={controller.onFilterChange}
          onFilterPress={controller.openFilters}
          onQChange={controller.setSearchQuery}
          onSortPress={() => {}}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={176}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div className={controller.showPills ? "pt-44" : "pt-32"} data-testid="cases-list-scroll">
          <div className="relative min-h-[calc(100dvh-11rem)] overflow-hidden">
            <AnimatePresence
              custom={controller.direction}
              initial={false}
              mode="wait"
            >
              <m.div
                key={controller.showPills ? controller.activeFilter : "resolved"}
                animate="center"
                className="flex min-h-[calc(100dvh-11rem)] flex-col gap-3 px-4 pb-[calc(var(--safe-bottom,0)+5.5rem)] pt-2"
                custom={controller.direction}
                data-testid={`cases-list-body-${controller.showPills ? controller.activeFilter : "resolved"}`}
                exit="exit"
                initial="enter"
                variants={bodyVariants}
              >
                {controller.cases.map((card) => (
                  <CaseCard
                    key={card.client_id}
                    card={card}
                    typingText={controller.typingByCaseId[card.client_id] ?? null}
                    unreadCount={controller.unreadCounts[card.client_id] ?? 0}
                    onOpen={controller.openCase}
                  />
                ))}

                {controller.isLoading && controller.cases.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-16 animate-pulse rounded-2xl bg-muted"
                      />
                    ))}
                  </div>
                ) : null}

                {!controller.isLoading && controller.cases.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-4 py-5 text-sm text-muted-foreground">
                    No cases in this view.
                  </div>
                ) : null}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </PullToRefresh>

      <button
        aria-label="New case"
        className={cn(
          "absolute right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-card shadow-md transition-transform active:scale-95",
          controller.createFabBottomOffsetClassName ??
            "bottom-[calc(var(--safe-bottom,0px)+0.75rem)]",
        )}
        data-testid="cases-view-create-fab"
        type="button"
        onClick={controller.openCaseCreation}
      >
        <Plus aria-hidden="true" className="size-6" />
      </button>
    </div>
  );
}
