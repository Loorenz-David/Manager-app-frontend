import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@beyo/lib";
import {
  PageSkeleton,
  RouteErrorBoundary,
  SlideStack,
  SlideStackPane,
  type SlideStackDragType,
} from "@beyo/ui";

import { useTabNavigation } from "@/app/TabNavigationProvider";
import { TAB_ROUTE_COMPONENTS } from "@/lib/primary-tab-preload";
import { TAB_ORDER } from "@/lib/routes";

/**
 * The app's main pages as one slide stack: the nav bar and a horizontal swipe
 * are two ways of moving through the same TAB_ORDER, and both animate with the
 * shared stacked-pane transition (later tab covers the earlier one, earlier
 * tab is revealed from underneath).
 *
 * Only the active pane is mounted; during a swipe the stack additionally
 * mounts the neighbouring tab as its drag ghost, which is why the tab
 * components live in a registry here rather than behind the router's Outlet —
 * the router can only ever render the matched route.
 *
 * Routes that are not tabs (surface hydrators, deep-linked pages) render in a
 * layer above the stack, leaving the tab that opened them mounted underneath.
 */
export function TabSlideStack(): React.JSX.Element {
  const { activeTab, isTabRoute, stepTab, adjacentTab, previewTab } =
    useTabNavigation();

  function handleCommit(type: SlideStackDragType): void {
    const next = adjacentTab(type === "forward" ? 1 : -1);
    if (next) previewTab(next);
  }

  return (
    <>
      <SlideStack
        activeId={activeTab}
        // The router owns `activeTab`, and its navigation lands a tick after
        // the drag commits — the stack has to hold its stand-in until then.
        awaitNavigation
        onBack={() => stepTab(-1)}
        onCommit={handleCommit}
        onForward={() => stepTab(1)}
      >
        {TAB_ORDER.map((path) => {
          const TabComponent = TAB_ROUTE_COMPONENTS[path];

          return (
            <SlideStackPane
              key={path}
              // contain:paint makes the pane the containing block for the
              // `fixed` chrome tab pages render (FABs, bottom action bars), so
              // it anchors to the tab area above the nav bar — the anchor the
              // old TabOutlet layer provided. Stated explicitly rather than
              // left to the pane's transform, which only exists mid-drag.
              className="h-full overflow-hidden contain-[paint]"
              id={path}
            >
              <div className="h-full overflow-y-auto pb-(--keyboard-inset)">
                <RouteErrorBoundary>
                  <Suspense fallback={<PageSkeleton />}>
                    <TabComponent />
                  </Suspense>
                </RouteErrorBoundary>
              </div>
            </SlideStackPane>
          );
        })}
      </SlideStack>

      {isTabRoute ? null : <RouteLayer />}
    </>
  );
}

/**
 * Non-tab routes. Opaque when they are a page in their own right; transparent
 * when a surface opened them (the surface renders its own chrome on top, and
 * the tab underneath should stay visible behind a sheet or modal).
 */
function RouteLayer(): React.JSX.Element {
  const location = useLocation();
  const hasBackgroundTab = Boolean(
    (location.state as { background?: unknown } | null)?.background,
  );

  return (
    <div
      className={cn(
        "absolute inset-0 z-4 overflow-hidden",
        !hasBackgroundTab && "bg-background",
      )}
      data-testid="route-layer"
    >
      <div className="h-full overflow-y-auto pb-(--keyboard-inset)">
        <Outlet />
      </div>
    </div>
  );
}
