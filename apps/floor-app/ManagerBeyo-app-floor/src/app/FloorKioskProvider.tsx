import { selectUser, useAuthStore } from '@beyo/auth';
import {
  CLOCK_KIOSK_CONFIRM_SURFACE_ID,
  CLOCK_KIOSK_RESULT_SURFACE_ID,
  KioskProvider,
  preloadClockKioskSurfaces,
  type ClockKioskSurfaceOpeners,
} from '@beyo/clock-kiosk';
import { showcaseKioskAdapters } from '@beyo/clock-kiosk/showcase';
import { useSurfaceStore } from '@beyo/ui';
import { useEffect, type ReactNode } from 'react';

import { useDeviceConfigStore } from '@/store/device-config.store';

const forceProductionAdaptersInTest =
  import.meta.env.MODE === 'test' &&
  new URLSearchParams(window.location.search).get('kiosk-adapters') ===
    'production';
const forceColdSurfaceLoadInTest =
  import.meta.env.MODE === 'test' &&
  new URLSearchParams(window.location.search).has('kiosk-cold-load');

const kioskAdapters =
  import.meta.env.DEV && import.meta.env.VITE_FLOOR_MOCKS === '1'
    && !forceProductionAdaptersInTest
    ? showcaseKioskAdapters
    : undefined;

const surfaceOpeners: ClockKioskSurfaceOpeners = {
  openIdentityConfirm: () => {
    useSurfaceStore.getState().open(CLOCK_KIOSK_CONFIRM_SURFACE_ID);
  },
  openResult: () => {
    useSurfaceStore.getState().open(CLOCK_KIOSK_RESULT_SURFACE_ID);
  },
  closeKioskSurfaces: () => {
    useSurfaceStore.getState().closeMany([
      CLOCK_KIOSK_CONFIRM_SURFACE_ID,
      CLOCK_KIOSK_RESULT_SURFACE_ID,
    ]);
  },
};

export function FloorKioskProvider({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const user = useAuthStore(selectUser);
  const autoReturnSeconds = useDeviceConfigStore(
    (state) => state.autoReturnSeconds,
  );

  useEffect(() => {
    if (!user || forceColdSurfaceLoadInTest) return;
    void preloadClockKioskSurfaces();
  }, [user]);

  return (
    <KioskProvider
      adapters={kioskAdapters}
      autoReturnSeconds={autoReturnSeconds}
      surfaceOpeners={surfaceOpeners}
      timeZone={user?.timeZone ?? 'UTC'}
    >
      {children}
    </KioskProvider>
  );
}
