import {
  Suspense,
  createContext,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { create } from 'zustand';
import { surfaceRegistry } from '@/app/surface-registry';
import { BottomSheetSurface } from '@/components/surfaces/BottomSheetSurface';
import { ModalSurface } from '@/components/surfaces/ModalSurface';
import { SlidePageSurface } from '@/components/surfaces/SlidePageSurface';
import { SurfaceSkeleton } from '@/components/ui/SurfaceSkeleton';

export type SurfaceType = 'page' | 'slide' | 'sheet' | 'modal';

type SurfaceComponent = LazyExoticComponent<ComponentType<Record<string, never>>>;

export type SurfaceRegistration = {
  surface: SurfaceType;
  path?: (props: Record<string, unknown>) => string;
  component: SurfaceComponent;
};

export type SurfaceRegistrations = Record<string, SurfaceRegistration>;

type ActiveSurface = SurfaceRegistration & {
  id: string;
  props: Record<string, unknown>;
};

type SurfaceState = {
  registry: SurfaceRegistrations;
  stack: ActiveSurface[];
  navigate?: NavigateFunction;
  init: (registry: SurfaceRegistrations, navigate: NavigateFunction) => void;
  open: (id: string, props?: Record<string, unknown>) => void;
  close: (id: string) => void;
  closeTop: () => void;
  closeAll: () => void;
};

export const SurfacePropsContext = createContext<Record<string, unknown>>({});

export type SurfaceHeaderValue = {
  setTitle: (title: string) => void;
  setActions: (actions: ReactNode) => void;
  requestClose: () => void;
};

export const SurfaceHeaderContext = createContext<SurfaceHeaderValue | null>(null);

export const useSurfaceStore = create<SurfaceState>((set, get) => ({
  registry: {},
  stack: [],
  navigate: undefined,

  init: (registry, navigate) => set({ registry, navigate }),

  open: (id, props = {}) => {
    const { registry, stack, navigate } = get();
    const registration = registry[id];

    if (!registration) {
      if (import.meta.env.DEV) {
        console.warn(`[SurfaceManager] "${id}" is not registered.`);
      }
      return;
    }

    const isOpen = stack.some((surface) => surface.id === id);
    if (isOpen) {
      set((state) => ({
        stack: [
          ...state.stack.filter((surface) => surface.id !== id),
          { id, ...registration, props },
        ],
      }));
      return;
    }

    if (registration.path && navigate) {
      const path = registration.path(props);
      const currentLocation = window.location;
      navigate(path, {
        state: {
          surface: registration.surface,
          background: {
            pathname: currentLocation.pathname,
            search: currentLocation.search,
          },
        },
      });
    }

    set((state) => ({
      stack: [...state.stack, { id, ...registration, props }],
    }));
  },

  close: (id) =>
    set((state) => ({
      stack: state.stack.filter((surface) => surface.id !== id),
    })),

  closeTop: () =>
    set((state) => ({
      stack: state.stack.slice(0, -1),
    })),

  closeAll: () => set({ stack: [] }),
}));

type SurfaceShellProps = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  children: ReactNode;
};

const SURFACE_SHELLS: Record<SurfaceType, ComponentType<SurfaceShellProps>> = {
  page: ({ children }) => <>{children}</>,
  slide: SlidePageSurface,
  sheet: BottomSheetSurface,
  modal: ModalSurface,
};

function SurfaceRenderer(): React.JSX.Element {
  const stack = useSurfaceStore((state) => state.stack);
  const close = useSurfaceStore((state) => state.close);
  const stateOverlays = stack.filter((surface) => surface.surface !== 'page' && !surface.path);

  return createPortal(
    <AnimatePresence>
      {stateOverlays.map((entry, index) => {
        const Shell = SURFACE_SHELLS[entry.surface];
        const Component = entry.component;
        const isTopmost = index === stateOverlays.length - 1;

        return (
          <Shell
            key={entry.id}
            isTopmost={isTopmost}
            onClose={() => close(entry.id)}
            zIndex={50 + index * 10}
          >
            <SurfacePropsContext.Provider value={entry.props}>
              <Suspense fallback={<SurfaceSkeleton surface={entry.surface} />}>
                <Component />
              </Suspense>
            </SurfacePropsContext.Provider>
          </Shell>
        );
      })}
    </AnimatePresence>,
    document.body,
  );
}

type SurfaceProviderProps = {
  children: ReactNode;
};

export function SurfaceProvider({ children }: SurfaceProviderProps): React.JSX.Element {
  const navigate = useNavigate();
  const init = useSurfaceStore((state) => state.init);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    init(surfaceRegistry, navigate);
  }, []);

  return (
    <>
      {children}
      <SurfaceRenderer />
    </>
  );
}
