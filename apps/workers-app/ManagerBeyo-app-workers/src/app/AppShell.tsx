import { TabOutlet } from '@/app/TabOutlet';
import { useEffect } from 'react';
import { BottomTabBar } from '@/components/shell/BottomTabBar';
import { preloadPrimaryTabRoutes } from '@/lib/primary-tab-preload';

export function AppShell(): React.JSX.Element {
  useEffect(() => {
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;
    const requestIdle = window.requestIdleCallback?.bind(window);
    const cancelIdle = window.cancelIdleCallback?.bind(window);

    if (requestIdle) {
      idleHandle = requestIdle(() => {
        preloadPrimaryTabRoutes();
      });
    } else {
      timeoutHandle = window.setTimeout(() => {
        preloadPrimaryTabRoutes();
      }, 150);
    }

    return () => {
      if (idleHandle !== null && cancelIdle) {
        cancelIdle(idleHandle);
      }

      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, []);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-background pt-[var(--safe-top)]"
      data-testid="app-shell"
    >
      <main className="relative flex-1 overflow-hidden" id="main-content">
        <TabOutlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
