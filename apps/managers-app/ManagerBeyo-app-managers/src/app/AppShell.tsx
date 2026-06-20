import { TabOutlet } from "@/app/TabOutlet";
import { useEffect } from "react";
import { NotificationBadge } from "@beyo/notifications";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { ConnectionStatus } from "@/components/shell/ConnectionStatus";
import { RealtimeDebugPanel } from "@/components/shell/RealtimeDebugPanel";
import { preloadPrimaryTabRoutes } from "@/lib/primary-tab-preload";
import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    preloadPrimaryTabRoutes();
  }, []);

  return (
    <TabBadgeCountsProvider>
      <div
        className="flex h-full flex-col overflow-hidden bg-background pt-(--safe-top)"
        data-testid="app-shell"
      >
        <main className="relative flex-1 overflow-hidden" id="main-content">
          <div className="pointer-events-none absolute right-2 top-2 z-[40] flex items-center gap-2">
            <div className="pointer-events-auto">
              <ConnectionStatus />
            </div>
            <NotificationBadge className="pointer-events-auto" />
          </div>
          <TabOutlet />
        </main>
        <RealtimeDebugPanel />
        <BottomTabBar />
      </div>
    </TabBadgeCountsProvider>
  );
}
