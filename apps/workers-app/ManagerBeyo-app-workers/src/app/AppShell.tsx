import { TabOutlet } from "@/app/TabOutlet";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NotificationBadge } from "@beyo/notifications";
import { BottomTabBar } from "@/components/shell/BottomTabBar";
import { ConnectionStatus } from "@/components/shell/ConnectionStatus";
import { RealtimeDebugPanel } from "@/components/shell/RealtimeDebugPanel";
import {
  LastActiveStepCard,
  LastActiveStepCardProvider,
} from "@/features/task_steps";
import { preloadPrimaryTabRoutes } from "@/lib/primary-tab-preload";
import { ROUTES } from "@/lib/routes";
import { AppScrollElementProvider } from "@/providers/AppScrollElementProvider";
import { TabBadgeCountsProvider } from "@/providers/TabBadgeCountsProvider";

const LAST_ACTIVE_STEP_CARD_HIDDEN_ROUTE_ROOTS = [
  ROUTES.stats,
  ROUTES.settings,
];

function isPathInHiddenCardSection(pathname: string): boolean {
  return LAST_ACTIVE_STEP_CARD_HIDDEN_ROUTE_ROOTS.some(
    (routeRoot) =>
      pathname === routeRoot || pathname.startsWith(`${routeRoot}/`),
  );
}

export function AppShell(): React.JSX.Element {
  const location = useLocation();

  useEffect(() => {
    preloadPrimaryTabRoutes();
  }, []);

  const shouldHideLastActiveStepCard = isPathInHiddenCardSection(
    location.pathname,
  );

  return (
    <AppScrollElementProvider>
      <TabBadgeCountsProvider>
        <LastActiveStepCardProvider>
          <div
            className="flex h-dvh flex-col overflow-hidden bg-background pt-[var(--safe-top)]"
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
            <LastActiveStepCard forceHidden={shouldHideLastActiveStepCard} />
            <BottomTabBar />
          </div>
        </LastActiveStepCardProvider>
      </TabBadgeCountsProvider>
    </AppScrollElementProvider>
  );
}
