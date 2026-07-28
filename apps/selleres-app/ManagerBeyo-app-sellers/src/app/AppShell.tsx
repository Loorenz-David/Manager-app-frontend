import { TabSlideStack } from "@/app/TabSlideStack";
import { TabNavigationProvider } from "@/app/TabNavigationProvider";
import { PresentationMount } from "@/app/PresentationMount";
import { useEffect } from "react";
import { SlideParallaxUnderlay } from "@beyo/ui";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { preloadPrimaryTabRoutes } from "@/lib/primary-tab-preload";
import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    preloadPrimaryTabRoutes();
  }, []);

  return (
    <PresentationMount>
      <TabBadgeCountsProvider>
        <TabNavigationProvider>
          <div
            className="flex h-full flex-col overflow-hidden bg-background pt-(--safe-top)"
            data-testid="app-shell"
          >
            {/* The whole base screen — tab content AND shell chrome (tab bar) —
             * parks as one unit under the slide-stack parallax, like iOS. */}
            <SlideParallaxUnderlay className="flex flex-col">
              <main
                className="relative flex-1 overflow-hidden"
                id="main-content"
              >
                <TabSlideStack />
              </main>
              <BottomTabBar />
            </SlideParallaxUnderlay>
          </div>
        </TabNavigationProvider>
      </TabBadgeCountsProvider>
    </PresentationMount>
  );
}
