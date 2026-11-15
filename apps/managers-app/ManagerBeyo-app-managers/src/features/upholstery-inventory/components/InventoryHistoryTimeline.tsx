import { SectionLabel, Timeline } from "@beyo/ui";

import type { UpholsteryInventoryId } from "@/types/common";

import { useInventoryHistoryTimelineController } from "../controllers/use-inventory-history-timeline.controller";
import { InventoryHistoryEntry } from "./InventoryHistoryEntry";
import { HistoryDeltaChips } from "./InventoryHistoryParts";

type InventoryHistoryTimelineProps = {
  inventoryId: UpholsteryInventoryId;
};

/**
 * Self-fetching change history for one inventory. It owns its query, so it
 * can be dropped anywhere with only the inventory id.
 */
export function InventoryHistoryTimeline({
  inventoryId,
}: InventoryHistoryTimelineProps): React.JSX.Element {
  const controller = useInventoryHistoryTimelineController(inventoryId);
  const { entries, driftBanner } = controller;

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="upholstery-inventory-history-timeline"
    >
      <SectionLabel as="h3" tone="muted">
        History
      </SectionLabel>

      {controller.isPending ? (
        <p className="text-sm text-muted-foreground">Loading history…</p>
      ) : controller.isError ? (
        <p className="text-sm text-muted-foreground">
          Could not load history.
        </p>
      ) : (
        <>
          {driftBanner ? (
            <div
              className="rounded-xl border border-[#f0c36a] bg-[#fff4d6] p-3 text-[#8a5a00]"
              data-testid="inventory-history-drift-banner"
              role="status"
            >
              <p className="text-sm font-medium">{driftBanner.title}</p>
              <p className="mt-0.5 text-xs">{driftBanner.message}</p>
              <HistoryDeltaChips chips={driftBanner.chips} />
            </div>
          ) : null}

          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <Timeline>
              {entries.map((entry, index) => (
                <InventoryHistoryEntry
                  key={entry.id}
                  entry={entry}
                  isNewest={index === 0}
                  isLastEntry={index === entries.length - 1}
                  onOpenTask={controller.openTask}
                />
              ))}
            </Timeline>
          )}

          {controller.hasMore ? (
            <div className="flex justify-center pt-3">
              <button
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm disabled:opacity-50"
                data-testid="inventory-history-show-more"
                disabled={controller.isLoadingMore}
                type="button"
                onClick={controller.loadMore}
              >
                {controller.isLoadingMore ? "Loading…" : "Show more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
