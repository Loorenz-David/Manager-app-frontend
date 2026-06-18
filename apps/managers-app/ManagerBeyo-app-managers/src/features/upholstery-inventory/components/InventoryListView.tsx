import { AnimatePresence, m } from "framer-motion";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";

import { transitions } from "@/lib/animation";

import { useInventoryListViewContext } from "../providers/InventoryListViewProvider";
import { InventoryListCard } from "./InventoryListCard";
import { InventoryListHeader } from "./InventoryListHeader";

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

export function InventoryListView(): React.JSX.Element {
  const controller = useInventoryListViewContext();
  const { scrollRef, isHidden: isCompact } = useScrollVisibility({
    mode: "relative",
  });

  return (
    <div
      className="relative flex-1 min-h-0"
      data-testid="upholstery-inventory-view"
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <InventoryListHeader
          activeFilter={controller.activeFilter}
          isCompact={isCompact}
          isFilterDisabled={controller.isFilterDisabled}
          isLoading={controller.isLoading}
          q={controller.q}
          onFilterChange={controller.onFilterChange}
          onQChange={controller.setQ}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={128}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div className="pt-28" data-testid="upholstery-inventory-list-scroll">
          <div className="relative flex min-h-[calc(100dvh-7rem)]">
            <AnimatePresence
              custom={controller.direction}
              initial={false}
              mode="sync"
            >
              <m.div
                key={controller.activeFilter}
                animate="center"
                className="absolute inset-0 flex flex-col gap-3 py-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]"
                custom={controller.direction}
                data-testid={`upholstery-inventory-body-${controller.activeFilter}`}
                exit="exit"
                initial="enter"
                variants={bodyVariants}
              >
                {controller.cards.map((card) => (
                  <InventoryListCard
                    key={card.inventoryId}
                    card={card}
                    onTapActions={controller.openCardActions}
                    onTapCard={controller.openDetail}
                  />
                ))}

                {controller.isLoading && controller.cards.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="mx-4 h-30 animate-pulse rounded-xl bg-muted"
                      />
                    ))}
                  </div>
                ) : null}

                {controller.isFetched && controller.cards.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                    No upholstery inventories found.
                  </div>
                ) : null}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
