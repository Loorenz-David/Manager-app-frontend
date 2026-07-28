import { TabSlideStack } from "@/app/TabSlideStack";
import { TabNavigationProvider } from "@/app/TabNavigationProvider";
import { PresentationMount } from "@/app/PresentationMount";
import { useEffect } from "react";
import { SlideParallaxUnderlay } from "@beyo/ui";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
// import { NotificationBadge } from "@beyo/notifications";
// import { ConnectionStatus } from "@/components/shell/ConnectionStatus";
import {
  LastActiveStepCard,
  LastActiveStepCardProvider,
  ReassignmentAcknowledgmentPanel,
  ReassignmentAcknowledgmentsProvider,
} from "@/features/task_steps";
import { useTabNavigation } from "@/app/TabNavigationProvider";
import { preloadPrimaryTabRoutes } from "@/lib/primary-tab-preload";
import { useBootstrapPrefetch } from "@/hooks/use-bootstrap-prefetch";
import { ROUTES } from "@/lib/routes";
import { AppScrollElementProvider } from "@/providers/AppScrollElementProvider";
import {
  BatchSelectionOverlayProvider,
  useBatchSelectionOverlay,
} from "@/providers/BatchSelectionOverlayProvider";
import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";

const LAST_ACTIVE_STEP_CARD_HIDDEN_TABS: string[] = [
  ROUTES.stats,
  ROUTES.settings,
];

function AppShellInner(): React.JSX.Element {
  // The tab on screen, not the raw pathname: a surface opened over Stats keeps
  // Stats mounted underneath, and the card must stay hidden with it.
  const { activeTab } = useTabNavigation();
  const { isSelecting } = useBatchSelectionOverlay();
  useBootstrapPrefetch();

  useEffect(() => {
    preloadPrimaryTabRoutes();
  }, []);

  const shouldHideLastActiveStepCard =
    isSelecting || LAST_ACTIVE_STEP_CARD_HIDDEN_TABS.includes(activeTab);

  return (
    <AppScrollElementProvider>
      <TabBadgeCountsProvider>
        <LastActiveStepCardProvider>
          <ReassignmentAcknowledgmentsProvider>
            <div
              className="flex h-full flex-col overflow-hidden bg-background pt-(--safe-top)"
              data-testid="app-shell"
            >
              {/* The whole base screen — tab content AND shell chrome (tab
               * bar, step card, acknowledgment panel) — parks as one unit
               * under the slide-stack parallax, like iOS. The fixed-positioned
               * card/panel re-anchor to this transformed wrapper, whose box
               * matches the viewport edges they anchored to before. */}
              <SlideParallaxUnderlay className="flex flex-col">
                <main
                  className="relative flex-1 overflow-hidden"
                  id="main-content"
                >
                  {/* <div className="pointer-events-none absolute right-2 top-2 z-[40] flex items-center gap-2">
                    <div className="pointer-events-auto">
                      <ConnectionStatus />
                    </div>
                    <NotificationBadge className="pointer-events-auto" />
                  </div> */}
                  <TabSlideStack />
                </main>
                {/* <RealtimeDebugPanel /> */}
                <ReassignmentAcknowledgmentPanel
                  forceHidden={shouldHideLastActiveStepCard}
                />
                <LastActiveStepCard
                  forceHidden={shouldHideLastActiveStepCard}
                  scrollHideDelayMs={10}
                />
                <BottomTabBar />
              </SlideParallaxUnderlay>
            </div>
          </ReassignmentAcknowledgmentsProvider>
        </LastActiveStepCardProvider>
      </TabBadgeCountsProvider>
    </AppScrollElementProvider>
  );
}

export function AppShell(): React.JSX.Element {
  return (
    <PresentationMount>
      <BatchSelectionOverlayProvider>
        <TabNavigationProvider>
          <AppShellInner />
        </TabNavigationProvider>
      </BatchSelectionOverlayProvider>
    </PresentationMount>
  );
}
