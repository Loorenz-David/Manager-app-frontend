import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";

import { useUpholsteryPickerController } from "@beyo/upholstery";

import { UpholsteryCard } from "@/features/upholstery/components/UpholsteryCard";
import { UpholsteryPickerHeader } from "@/features/upholstery/components/UpholsteryPickerHeader";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";

import { transitions } from "@/lib/animation";

type UpholsteryPickerSlidePageProps = {
  currentClientId?: string | null;
  onSelect?: (clientId: string) => void;
};

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

export function UpholsteryPickerSlidePage(): React.JSX.Element {
  const { currentClientId, onSelect } =
    useSurfaceProps<UpholsteryPickerSlidePageProps>();
  const header = useSurfaceHeader();
  const { scrollRef, isHidden: isCompact } = useScrollVisibility({
    mode: "relative",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const controller = useUpholsteryPickerController(debouncedQuery);
  const isSearchActive = searchQuery.trim().length > 0;

  useEffect(() => {
    header?.setHeaderHidden(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // header omitted — SurfaceHeaderContext.Provider creates a new object every SlidePageSurface render, making header unstable; setHeaderHidden is safe to call with a stale reference

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebouncedQuery(searchQuery),
      300,
    );
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  function handleSelect(clientId: string): void {
    controller.prepareSelect(clientId);
    onSelect?.(clientId);
    header?.requestClose();
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-testid="upholstery-picker-slide-page"
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <UpholsteryPickerHeader
          activeFilter={controller.activeFilter}
          activeProviderFilterCount={controller.activeProviderFilterCount}
          isCompact={isCompact}
          isFilterDisabled={isSearchActive}
          isSearchLoading={isSearchActive ? controller.isLoading : false}
          onBackPress={header?.requestClose ?? (() => {})}
          q={searchQuery}
          onFilterChange={controller.onFilterChange}
          onQChange={setSearchQuery}
          onProviderFilterPress={controller.openProviderFilterSheet}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={144}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div className="pt-36" data-testid="upholstery-list-scroll">
          <div className="relative flex min-h-[calc(100dvh-9rem)]">
            <AnimatePresence
              custom={controller.direction}
              initial={false}
              mode="sync"
            >
              <m.div
                key={controller.activeFilter}
                animate="center"
                className="absolute inset-0 flex flex-col gap-3 px-4 py-4"
                custom={controller.direction}
                data-testid={`upholstery-picker-body-${controller.activeFilter}`}
                exit="exit"
                initial="enter"
                variants={bodyVariants}
              >
                {controller.isLoading &&
                controller.upholsteries.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Loading upholstery…
                  </p>
                ) : controller.upholsteries.length > 0 ? (
                  controller.upholsteries.map((record) => (
                    <UpholsteryCard
                      key={record.client_id}
                      isSelected={record.client_id === currentClientId}
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
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
