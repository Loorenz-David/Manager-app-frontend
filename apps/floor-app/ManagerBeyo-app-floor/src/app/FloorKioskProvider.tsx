import { selectUser, useAuthStore } from '@beyo/auth';
import {
  CLOCK_KIOSK_CONFIRM_SURFACE_ID,
  CLOCK_KIOSK_RESULT_SURFACE_ID,
  KioskProvider,
  type ClockKioskSurfaceOpeners,
} from '@beyo/clock-kiosk';
import { useSurfaceStore } from '@beyo/ui';
import type { ReactNode } from 'react';

import { useDeviceConfigStore } from '@/store/device-config.store';

const kioskAdapters = {};

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
