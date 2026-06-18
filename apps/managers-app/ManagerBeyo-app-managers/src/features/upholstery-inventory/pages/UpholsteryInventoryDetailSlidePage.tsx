import { useEffect } from "react";
import { PullToRefresh, useScrollVisibility } from "@beyo/ui";

import { ContentCard } from "@/components/primitives";
import { useSurfaceHeader } from "@/hooks/use-surface-header";
import { useSurfaceProps } from "@/hooks/use-surface-props";
import type { UpholsteryInventoryId } from "@/types/common";

import {
  InventoryDetailProvider,
  useInventoryDetailContext,
} from "../providers/InventoryDetailProvider";
import type { InventoryDetailSurfaceProps } from "../surfaces";
import { InventoryDetailFooter } from "../components/InventoryDetailFooter";
import { InventoryDetailHeader } from "../components/InventoryDetailHeader";
import { InventoryHistorySection } from "../components/InventoryHistorySection";
import { InventoryQuantityOverview } from "../components/InventoryQuantityOverview";

function DetailContent(): React.JSX.Element {
  const header = useSurfaceHeader();
  const controller = useInventoryDetailContext();
  const { scrollRef, isHidden } = useScrollVisibility({
    mode: "relative",
    hideThreshold: 40,
    showThreshold: 24,
  });

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  let scrollContent: React.ReactNode;

  if (controller.isPending) {
    scrollContent = (
      <div className="p-6 text-sm text-muted-foreground">
        Loading inventory...
      </div>
    );
  } else if (controller.isError || !controller.detail) {
    scrollContent = (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inventory details could not be loaded.
        </p>
        <button
          className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          type="button"
          onClick={() => {
            void controller.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  } else {
    scrollContent = (
      <div className="flex flex-col gap-4 pb-[calc(var(--safe-bottom,0)+9.5rem)] pt-2">
        <InventoryDetailHeader />
        <div className="mx-4">
          <ContentCard>
            <InventoryQuantityOverview />
            <div className="h-px bg-border" />
            <InventoryHistorySection />
          </ContentCard>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <PullToRefresh
        className="min-h-0 flex-1"
        scrollClassName="overflow-y-auto overscroll-y-none"
        scrollRef={scrollRef}
        onRefresh={controller.refetch}
      >
        {scrollContent}
      </PullToRefresh>
      <InventoryDetailFooter isHidden={isHidden} onEdit={controller.openEdit} />
    </div>
  );
}

export function UpholsteryInventoryDetailSlidePage(): React.JSX.Element {
  const { inventoryId } = useSurfaceProps<InventoryDetailSurfaceProps>();

  if (!inventoryId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Inventory id is missing.
      </div>
    );
  }

  return (
    <div
      className="h-full bg-background"
      data-testid="upholstery-inventory-detail-slide"
    >
      <InventoryDetailProvider
        inventoryId={inventoryId as UpholsteryInventoryId}
      >
        <DetailContent />
      </InventoryDetailProvider>
    </div>
  );
}
