import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useKioskFlowController, type KioskFlowController } from '../controllers/use-kiosk-flow.controller';
import { resolveKioskAdapters } from '../lib/kiosk-adapters';
import { createKioskFlowStore } from '../store/kiosk-flow.store';
import type { ClockKioskSurfaceOpeners } from '../surface-ids';
import type { KioskAdaptersInput } from '../types';

export type KioskProviderProps = {
  children: ReactNode;
  timeZone: string;
  autoReturnSeconds?: number;
  adapters?: KioskAdaptersInput;
  surfaceOpeners: ClockKioskSurfaceOpeners;
};

const KioskContext = createContext<KioskFlowController | null>(null);

export function KioskProvider({
  children,
  timeZone,
  autoReturnSeconds = 12,
  adapters,
  surfaceOpeners,
}: KioskProviderProps): React.JSX.Element {
  const storeRef = useRef<ReturnType<typeof createKioskFlowStore> | null>(null);
  storeRef.current ??= createKioskFlowStore();

  const resolvedAdapters = useMemo(
    () => resolveKioskAdapters(adapters),
    [adapters],
  );
  const controller = useKioskFlowController({
    store: storeRef.current,
    surfaceOpeners,
    adapters: resolvedAdapters,
    autoReturnSeconds,
    timeZone,
  });

  return (
    <KioskContext.Provider value={controller}>
      {children}
    </KioskContext.Provider>
  );
}

export function useKioskContext(): KioskFlowController {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKioskContext must be used within <KioskProvider>');
  }
  return context;
}
