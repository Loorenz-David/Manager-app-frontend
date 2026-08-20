import { useEffect } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import type { TaskId } from "@beyo/lib";
import { PullToRefresh } from "@beyo/ui";

import {
  ItemValuationEmptyState,
  ItemValuationFooter,
  ItemValuationFrame,
  ItemValuationProvenanceRow,
  ItemValuationSkeleton,
  PriceCoverageChip,
  PriceHeadline,
  PriceSlider,
  PurchaseBootstrapCard,
  WorkImpactTable,
} from "../components/price-editor";
import {
  ItemValuationProvider,
  useItemValuationContext,
} from "../providers/ItemValuationProvider";
import type { ItemValuationSlideSurfaceProps } from "../surface-ids";

/**
 * The expected sold price screen (intention §3.4). It composes phase-1's
 * presentational components from the controller's view model and owns nothing
 * else: every string, tone and fraction below arrives already formatted.
 */

function ItemValuationBody(): React.JSX.Element {
  const view = useItemValuationContext();

  if (view.screenState === "loading") {
    return <ItemValuationSkeleton />;
  }

  if (view.screenState === "error") {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <p className="max-w-md text-lg text-muted-foreground">
          {view.errorMessage}
        </p>
        <button
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground"
          type="button"
          onClick={() => {
            void view.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8">
      {/*
        The price region owns its horizontal gestures (owner correction
        2026-08-20): a slider drag must never escalate into the surface's
        slide-to-close. Stopping propagation on the whole region — not just
        the handle — keeps taps that start on the padding from sliding the
        page either.
      */}
      <div
        className="flex flex-col gap-6"
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        {view.headline ? <PriceHeadline {...view.headline} /> : null}
        {view.chip ? (
          <div className="flex justify-center">
            <PriceCoverageChip {...view.chip} />
          </div>
        ) : null}
        {view.slider ? (
          // 22g: assistive tech announces the price, never the raw step index.
          <PriceSlider {...view.slider} ariaValueText={view.sliderValueText} />
        ) : null}
      </div>
      {view.table ? <WorkImpactTable {...view.table} /> : null}
      {view.bootstrap ? <PurchaseBootstrapCard {...view.bootstrap} /> : null}
      {view.empty ? <ItemValuationEmptyState {...view.empty} /> : null}
      {view.footer ? <ItemValuationFooter {...view.footer} /> : null}
    </div>
  );
}

function ItemValuationView(): React.JSX.Element {
  const view = useItemValuationContext();
  const header = useSurfaceHeader();

  // The title lives in the surface header, beside the back arrow — the page
  // is the editor itself, not a card with its own heading (owner redesign
  // 2026-08-20).
  useEffect(() => {
    header?.setTitle(view.frame.title);
    header?.setActions(null);
  }, [header, view.frame.title]);

  return (
    <PullToRefresh
      className="min-h-0 flex-1"
      scrollClassName="overflow-y-auto overscroll-y-none"
      onRefresh={view.refetch}
    >
      <div className="flex min-h-full flex-col pb-[calc(var(--safe-bottom,0px)+1.5rem)]">
        <ItemValuationFrame
          headerExtra={
            view.provenance ? (
              <ItemValuationProvenanceRow {...view.provenance} />
            ) : undefined
          }
          subtitle={view.frame.subtitle}
        >
          <ItemValuationBody />
        </ItemValuationFrame>
      </div>
    </PullToRefresh>
  );
}

export function ItemValuationSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<ItemValuationSlideSurfaceProps>();

  if (!taskId) {
    return (
      <div
        className="p-6 text-sm text-muted-foreground"
        data-testid="item-valuation-page"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-card"
      data-testid="item-valuation-page"
    >
      <ItemValuationProvider taskId={taskId as TaskId}>
        <ItemValuationView />
      </ItemValuationProvider>
    </div>
  );
}
