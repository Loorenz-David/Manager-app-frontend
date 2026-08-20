import { useEffect, useRef } from "react";

import { useHeaderlessSlidePage, useSurfaceProps } from "@beyo/hooks";
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

/**
 * The two a11y repairs of criterion 22g, applied from the page because both
 * targets live inside phase-1 components that are closed under an approval gate
 * (see the handoff's fold-back request — the durable form is one prop on
 * `PriceSlider` and one on `ItemValuationFrame`).
 *
 * Both attributes are ones React never writes on these elements, so there is
 * nothing for it to fight over on re-render.
 */
function useItemValuationA11yPatches(
  rootRef: React.RefObject<HTMLDivElement | null>,
  sliderValueText: string | null,
): void {
  useEffect(() => {
    const root = rootRef.current;

    if (root === null) {
      return;
    }

    // The three-dot button is decorative this iteration — it must not be a
    // keyboard stop until it gains an action.
    root
      .querySelector<HTMLElement>('[data-testid="item-valuation-menu-button"]')
      ?.setAttribute("tabindex", "-1");

    const sliderInput = root.querySelector<HTMLElement>(
      '[data-testid="item-valuation-slider-input"]',
    );

    if (sliderInput === null) {
      return;
    }

    if (sliderValueText === null) {
      sliderInput.removeAttribute("aria-valuetext");
      return;
    }

    // A range input announces its raw value — here a step index, which means
    // nothing. The price is what the user is choosing.
    sliderInput.setAttribute("aria-valuetext", sliderValueText);
  });
}

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
      {view.headline ? <PriceHeadline {...view.headline} /> : null}
      {view.chip ? (
        <div className="flex justify-center">
          <PriceCoverageChip {...view.chip} />
        </div>
      ) : null}
      {view.slider ? <PriceSlider {...view.slider} /> : null}
      {view.table ? <WorkImpactTable {...view.table} /> : null}
      {view.bootstrap ? <PurchaseBootstrapCard {...view.bootstrap} /> : null}
      {view.empty ? <ItemValuationEmptyState {...view.empty} /> : null}
      {view.footer ? <ItemValuationFooter {...view.footer} /> : null}
    </div>
  );
}

function ItemValuationView(): React.JSX.Element {
  const view = useItemValuationContext();
  const rootRef = useRef<HTMLDivElement>(null);

  useItemValuationA11yPatches(rootRef, view.sliderValueText);

  return (
    <PullToRefresh
      className="min-h-0 flex-1"
      scrollClassName="overflow-y-auto overscroll-y-none"
      onRefresh={view.refetch}
    >
      <div
        className="flex flex-col px-4 pb-[calc(var(--safe-bottom,0px)+1.5rem)] pt-4"
        ref={rootRef}
      >
        <ItemValuationFrame
          headerExtra={
            view.provenance ? (
              <ItemValuationProvenanceRow {...view.provenance} />
            ) : undefined
          }
          subtitle={view.frame.subtitle}
          title={view.frame.title}
        >
          <ItemValuationBody />
        </ItemValuationFrame>
      </div>
    </PullToRefresh>
  );
}

export function ItemValuationSlidePage(): React.JSX.Element {
  const { taskId } = useSurfaceProps<ItemValuationSlideSurfaceProps>();

  // The slide closes by the app-wide gesture; on desktop the surface header
  // stays, because that is where the only visible close control lives.
  useHeaderlessSlidePage();

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
      className="flex h-full min-h-0 flex-col bg-background"
      data-testid="item-valuation-page"
    >
      <ItemValuationProvider taskId={taskId as TaskId}>
        <ItemValuationView />
      </ItemValuationProvider>
    </div>
  );
}
