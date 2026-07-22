import { TabOutlet } from "@/app/TabOutlet";
import { PresentationMount } from "@/app/PresentationMount";
import { useEffect } from "react";
import { SlideParallaxUnderlay } from "@beyo/ui";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
// import { NotificationBadge } from "@beyo/notifications";
// import { ConnectionStatus } from "@/components/shell/ConnectionStatus";
import { preloadPrimaryTabRoutes } from "@/lib/primary-tab-preload";
import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    preloadPrimaryTabRoutes();
  }, []);

  return (
    <PresentationMount>
      <TabBadgeCountsProvider>
        <div
          className="mx-auto flex h-full w-full flex-col overflow-hidden bg-background pt-(--safe-top) min-[600px]:border min-[600px]:border-between-border min-[600px]:shadow-sm"
          data-testid="app-shell"
          style={{ maxWidth: "var(--manager-shell-max-width)" }}
        >
          {/* The whole base screen — tab content AND shell chrome (tab bar) —
           * parks as one unit under the slide-stack parallax, like iOS. */}
          <SlideParallaxUnderlay className="flex flex-col">
            <main className="relative flex-1 overflow-hidden" id="main-content">
              {/* <div className="pointer-events-none absolute right-2 top-2 z-[40] flex items-center gap-2">
                <div className="pointer-events-auto">
                  <ConnectionStatus />
                </div>
                <NotificationBadge className="pointer-events-auto" />
              </div> */}
              <TabOutlet />
            </main>
            {/* <RealtimeDebugPanel /> */}
            <BottomTabBar />
          </SlideParallaxUnderlay>
        </div>
      </TabBadgeCountsProvider>
    </PresentationMount>
  );
}
