import { useRef } from "react";

import { PullToRefresh } from "@beyo/ui";
import { AnimatePresence, m } from "framer-motion";

import { UpholsteryCategoryCard } from "@/features/upholstery-category";
import { transitions } from "@/lib/animation";
import type { UpholsteryInventoryId } from "@/types/common";

import { useInventoryListViewContext } from "../providers/InventoryListViewProvider";
import { deriveInventoryCondition } from "../lib/condition";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const searchRecordById = new Map(
    controller.searchUpholsteries.map((record) => [record.client_id, record] as const),
  );
  console.log("[InventoryListView] searchUpholsteries:", controller.searchUpholsteries.map((r) => ({ client_id: r.client_id, name: r.name, origin: r.origin })));

  return (
    <div
      className="relative flex-1 min-h-0"
      data-testid="upholstery-inventory-view"
    >
      <div className="absolute inset-x-0 top-0 z-10">
        <InventoryListHeader
          activePanelId={controller.activePanelId}
          direction={controller.direction}
          isSearchLoading={controller.isSearchLoading}
          isCategoriesFetching={controller.isCategoriesFetching}
          selectedCategory={controller.selectedCategory}
          upholsterySearchQ={controller.upholsterySearchQ}
          onBack={controller.goBack}
          onUpholsterySearchQChange={controller.setUpholsterySearchQ}
        />
      </div>

      <PullToRefresh
        className="absolute inset-0"
        indicatorOffset={80}
        scrollClassName="overflow-x-hidden overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        <div className="pt-20" data-testid="upholstery-inventory-list-scroll">
          <div className="relative flex min-h-[calc(100dvh-5rem)]">
            <AnimatePresence
              custom={controller.direction}
              initial={false}
              mode="sync"
            >
              {controller.activePanelId !== "inventory" ? (
                <m.div
                  key="categories-panel"
                  animate="center"
                  className="absolute inset-0 flex flex-col gap-3 px-4 py-2 pb-[calc(var(--safe-bottom,0)+5.5rem)]"
                  custom={controller.direction}
                  data-testid="upholstery-inventory-body-categories"
                  exit="exit"
                  initial="enter"
                  variants={bodyVariants}
                >
                  {controller.activePanelId === "search" ? (
                    <>
                      {controller.isSearchLoading &&
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
                              console.log("[InventoryListView] onTapAdd – inventoryId:", card.inventoryId, "found:", !!searchRecord, "origin:", searchRecord?.origin);
                              if (searchRecord) {
                                controller.openFromSearchAdd(searchRecord);
                              }
                            }}
                            onTapActions={(inventoryId) => {
                              const searchRecord = searchRecordById.get(inventoryId);
                              console.log("[InventoryListView] onTapActions – inventoryId:", inventoryId, "found:", !!searchRecord, "origin:", searchRecord?.origin);
                              if (searchRecord) {
                                controller.openFromSearchDetail(searchRecord);
                              }
                            }}
                            onTapCard={(inventoryId) => {
                              const searchRecord = searchRecordById.get(inventoryId);
                              console.log("[InventoryListView] onTapCard – inventoryId:", inventoryId, "found:", !!searchRecord, "origin:", searchRecord?.origin);
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
                      )}
                    </>
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
                </m.div>
              ) : (
                <m.div
                  key="inventory-panel"
                  animate="center"
                  className="absolute inset-0 flex flex-col gap-3 py-2 px-4 pb-[calc(var(--safe-bottom,0)+5.5rem)]"
                  custom={controller.direction}
                  data-testid="upholstery-inventory-body-inventory"
                  exit="exit"
                  initial="enter"
                  variants={bodyVariants}
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
                          className="mx-4 h-30 shrink-0 animate-pulse rounded-xl bg-muted"
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
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
