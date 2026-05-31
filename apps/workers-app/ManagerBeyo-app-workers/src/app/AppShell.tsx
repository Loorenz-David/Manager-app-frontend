import { TabOutlet } from "@/app/TabOutlet";
import { useEffect } from "react";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import {
  LastActiveStepCard,
  LastActiveStepCardProvider,
} from "@/features/task_steps";
import { preloadPrimaryTabRoutes } from "@/lib/primary-tab-preload";
import { AppScrollElementProvider } from "@/providers/AppScrollElementProvider";
import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    preloadPrimaryTabRoutes();
  }, []);

  return (
    <AppScrollElementProvider>
      <TabBadgeCountsProvider>
        <LastActiveStepCardProvider>
          <div
            className="flex h-dvh flex-col overflow-hidden bg-background pt-[var(--safe-top)]"
            data-testid="app-shell"
          >
            <main className="relative flex-1 overflow-hidden" id="main-content">
              <TabOutlet />
            </main>
            <LastActiveStepCard />
            <BottomTabBar />
          </div>
        </LastActiveStepCardProvider>
      </TabBadgeCountsProvider>
    </AppScrollElementProvider>
  );
}
