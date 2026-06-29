import { AnimatePresence, m } from "framer-motion";
import { ChevronLeft } from "lucide-react";

import { SearchBar } from "@/components/primitives";
import type { UpholsteryCategory } from "@/features/upholstery-category";
import { transitions } from "@/lib/animation";

import type { InventoryPanelId } from "../controllers/use-inventory-list.controller";

const headerVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: transitions.slide,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: transitions.slide,
  }),
} as const;

type InventoryListHeaderProps = {
  activePanelId: InventoryPanelId;
  direction: 1 | -1;
  selectedCategory: UpholsteryCategory | null;
  upholsterySearchQ: string;
  isSearchLoading: boolean;
  activeProviderFilterCount: number;
  onUpholsterySearchQChange: (value: string) => void;
  onProviderFilterPress: () => void;
  onBack: () => void;
};

export function InventoryListHeader({
  activePanelId,
  direction,
  selectedCategory,
  upholsterySearchQ,
  isSearchLoading,
  activeProviderFilterCount,
  onUpholsterySearchQChange,
  onProviderFilterPress,
  onBack,
}: InventoryListHeaderProps): React.JSX.Element {
  const isSearchLikeBrowseHeader =
    activePanelId === "categories" || activePanelId === "search";

  return (
    <div
      className="relative h-20 overflow-hidden bg-background"
      data-testid="upholstery-inventory-header"
    >
      <AnimatePresence custom={direction} initial={false} mode="sync">
        {isSearchLikeBrowseHeader ? (
          <m.div
            key="category-browse-header"
            animate="center"
            className="absolute inset-x-0 bottom-0 top-6 flex flex-col justify-center px-4"
            custom={direction}
            exit="exit"
            initial="enter"
            variants={headerVariants}
          >
            <SearchBar
              activeFilterCount={activeProviderFilterCount}
              data-testid="upholstery-inventory-category-search-bar"
              isLoading={activePanelId === "search" ? isSearchLoading : false}
              placeholder="Search upholstery..."
              value={upholsterySearchQ}
              wrapperClassName="bg-[var(--color-card)]"
              onChange={onUpholsterySearchQChange}
              onFilterPress={onProviderFilterPress}
            />
          </m.div>
        ) : selectedCategory ? (
          <m.div
            key="inventory-category-detail-header"
            animate="center"
            className="absolute inset-x-0 bottom-0 top-6 flex items-center gap-3 px-4"
            custom={direction}
            exit="exit"
            initial="enter"
            variants={headerVariants}
          >
            <button
              aria-label="Go back to categories"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground"
              type="button"
              onClick={onBack}
            >
              <ChevronLeft className="size-5" />
            </button>

            {selectedCategory.image_url ? (
              <img
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
                src={selectedCategory.image_url}
              />
            ) : (
              <div className="size-9 shrink-0 rounded-full bg-muted" />
            )}

            <p className="min-w-0 flex-1 truncate font-medium text-foreground">
              {selectedCategory.name}
            </p>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
