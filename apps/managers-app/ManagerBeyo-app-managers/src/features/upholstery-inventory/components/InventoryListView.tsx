import { useRef } from "react";

import {
  PullToRefresh,
  SlideStack,
  SlideStackPane,
  useCommittedPaneId,
} from "@beyo/ui";
import { cn } from "@beyo/lib";

import { UpholsteryCategoryCard } from "@/features/upholstery-category";
import type { UpholsteryInventoryId } from "@/types/common";

import { useInventoryListViewContext } from "../providers/InventoryListViewProvider";
import { deriveInventoryCondition } from "../lib/condition";
import { InventoryListCard } from "./InventoryListCard";
import { InventoryListHeader } from "./InventoryListHeader";

/**
 * Panes of the browse stack. Search is not one of them: it swaps the *content*
 * of the browse pane rather than navigating, so searching from the inventory
 * pane slides back to browse and shows results there — the same pane the user
 * would have landed on anyway.
 */
const PANE_IDS = ["browse", "inventory"] as const;
type BrowsePaneId = (typeof PANE_IDS)[number];

const BODY_CLASSES = cn(
  "flex flex-col gap-3 px-4 py-2",
  // Clears the creation FAB.
  "pb-[calc(var(--safe-bottom,0)+5.5rem)]",
  // Viewport minus the header, so a pane plus the header fills exactly one
  // screen and a short pane still covers the one it slid over.
  "min-h-[calc(100dvh-5rem)]",
);

export function InventoryListView(): React.JSX.Element {
  const controller = useInventoryListViewContext();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchRecordById = new Map(
    controller.searchUpholsteries.map((record) => [record.client_id, record] as const),
  );

  const activePaneId: BrowsePaneId =
    controller.activePanelId === "inventory" ? "inventory" : "browse";
  // A committed drag only navigates once its settle animation finishes, so a
  // header painted from the controller would trail the finger by a whole
  // transition. This flips it at the release instead.
  const { paneId: displayedPaneId, onCommit } = useCommittedPaneId({
    activeId: activePaneId,
    paneIds: PANE_IDS,
  });
  const displayedPanelId =
    displayedPaneId === "inventory" ? "inventory" : controller.activePanelId;

  return (
    <div
      className="relative flex-1 min-h-0"
      data-testid="upholstery-inventory-view"
    >
      <PullToRefresh
        className="absolute inset-0"
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div data-testid="upholstery-inventory-list-scroll">
          {/* Positioned container for the panes: they overlap during a
           * transition and drag stand-ins pin inside it. The header renders
           * through the stack — still in flow, still scrolling with the body —
           * so a drag previews it along with the pane instead of leaving it to
           * pop in after the swap. */}
          <div className="relative">
            <SlideStack
              activeId={activePaneId}
              header={
                <InventoryListHeader
                  activePanelId={displayedPanelId}
                  activeProviderFilterCount={controller.activeProviderFilterCount}
                  // Derived from the pane the drag is heading for, not from the
                  // controller: on a swipe back the header flips at the release,
                  // one navigation before the controller's own flag updates.
                  direction={displayedPaneId === "inventory" ? 1 : -1}
                  isSearchLoading={controller.isSearchLoading}
                  selectedCategory={controller.selectedCategory}
                  upholsterySearchQ={controller.upholsterySearchQ}
                  onBack={controller.goBack}
                  onProviderFilterPress={controller.openProviderFilterSheet}
                  onUpholsterySearchQChange={controller.setUpholsterySearchQ}
                />
              }
              // Back only. Advancing needs a category to open, so it happens by
              // tapping a card — leaving the forward swipe to fall through to
              // the app shell's own tab stack.
              onBack={controller.goBack}
              onCommit={onCommit}
            >
              <SlideStackPane
                className={BODY_CLASSES}
                data-testid="upholstery-inventory-body-categories"
                id="browse"
              >
                {controller.activePanelId === "search" ? (
                  controller.isSearchLoading &&
                  controller.searchUpholsteries.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div
                          key={index}
                          className="h-28 shrink-0 animate-pulse rounded-xl bg-muted"
                        />
                      ))}
                    </div>
                  ) : controller.searchUpholsteries.length > 0 ? (
                    controller.searchUpholsteries.map((record) => (
                      <InventoryListCard
                        key={record.client_id}
                        card={{
                          inventoryId: record.client_id as UpholsteryInventoryId,
                          name: record.name,
                          code: record.code ?? "No code",
                          supplierName:
                            record.supplier_name ?? record.origin ?? null,
                          pageLink:
                            record.page_link ?? record.external_url ?? null,
                          imageUrl: record.image_url,
                          currentStoredAmountMeters:
                            record.current_stored_amount_meters,
                          availableDisplay: "0 m",
                          availableIsPositive: false,
                          availableIsNegative: false,
                          storedDisplay:
                            record.current_stored_amount_meters ?? "0 m",
                          orderedDisplay: null,
                          condition: deriveInventoryCondition({
                            inventory_condition:
                              record.inventory_condition ?? "out_of_stock",
                            hasActiveOrder: false,
                          }),
                        }}
                        onTapAdd={(card) => {
                          const searchRecord = searchRecordById.get(card.inventoryId);
                          if (searchRecord) {
                            controller.openFromSearchAdd(searchRecord);
                          }
                        }}
                        onTapActions={(inventoryId) => {
                          const searchRecord = searchRecordById.get(inventoryId);
                          if (searchRecord) {
                            controller.openFromSearchDetail(searchRecord);
                          }
                        }}
                        onTapCard={(inventoryId) => {
                          const searchRecord = searchRecordById.get(inventoryId);
                          if (searchRecord) {
                            controller.openFromSearchDetail(searchRecord);
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                      No upholstery found.
                    </div>
                  )
                ) : (
                  <>
                    {controller.categoryCards.map((category) => (
                      <UpholsteryCategoryCard
                        key={category.client_id}
                        category={category}
                        onPress={controller.selectCategory}
                      />
                    ))}

                    {controller.isCategoriesLoading &&
                    controller.categoryCards.length === 0 ? (
                      <div className="flex flex-col gap-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-16 shrink-0 animate-pulse rounded-2xl bg-muted"
                          />
                        ))}
                      </div>
                    ) : null}

                    {controller.isCategoriesFetched &&
                    controller.categoryCards.length === 0 ? (
                      <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                        No categories found.
                      </div>
                    ) : null}
                  </>
                )}
              </SlideStackPane>

              <SlideStackPane
                className={BODY_CLASSES}
                data-testid="upholstery-inventory-body-inventory"
                id="inventory"
              >
                {controller.inventoryCards.map((card) => (
                  <InventoryListCard
                    key={card.inventoryId}
                    card={card}
                    onTapAdd={controller.openAddAmount}
                    onTapActions={controller.openCardActions}
                    onTapCard={controller.openDetail}
                  />
                ))}

                {controller.isInventoryLoading &&
                controller.inventoryCards.length === 0 ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-30 shrink-0 rounded-xl bg-muted",
                          // Five independently-animated placeholders each get
                          // their own compositor layer; stacked on top of the
                          // two layers the slide transition itself is already
                          // animating, that's what was rasterizing during the
                          // stutter. A static block costs nothing and is only
                          // visible for the length of the slide anyway — the
                          // pulse only starts once the pane has actually
                          // settled and the fetch is still genuinely pending.
                          controller.isInventoryPaneSettled && "animate-pulse",
                        )}
                      />
                    ))}
                  </div>
                ) : null}

                {controller.isInventoryFetched &&
                controller.inventoryCards.length === 0 ? (
                  <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                    No upholstery inventories found.
                  </div>
                ) : null}
              </SlideStackPane>
            </SlideStack>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
