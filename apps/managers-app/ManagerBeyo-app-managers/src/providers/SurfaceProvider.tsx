import {
  Suspense,
  createContext,
  useEffect,
  useState,
  type ComponentType,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { AnimatePresence, m } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { create } from "zustand";
import { surfaceRegistry } from "@/app/surface-registry";
import { BottomSheetSurface } from "@/components/surfaces/BottomSheetSurface";
import { ModalSurface } from "@/components/surfaces/ModalSurface";
import { SlidePageSurface } from "@/components/surfaces/SlidePageSurface";
import { SurfaceSkeleton } from "@/components/ui/SurfaceSkeleton";
import { transitions } from "@/lib/animation";

export type SurfaceType = "page" | "slide" | "sheet" | "modal";

type SurfaceComponent = LazyExoticComponent<
  ComponentType<Record<string, never>>
>;

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
  hydrate: (id: string, props?: Record<string, unknown>) => void;
  close: (id: string) => void;
  closeMany: (ids: string[]) => void;
  closeTop: () => void;
  closeAll: () => void;
};

export const SurfacePropsContext = createContext<Record<string, unknown>>({});

export type SurfaceHeaderValue = {
  setTitle: (title: string) => void;
  setActions: (actions: ReactNode) => void;
  requestClose: () => void;
  setHeaderHidden: (hidden: boolean) => void;
  setCloseInterceptor: (fn: (() => void) | null) => void;
};

export const SurfaceHeaderContext = createContext<SurfaceHeaderValue | null>(
  null,
);

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

  hydrate: (id, props = {}) => {
    const { registry, stack } = get();
    const registration = registry[id];

    if (!registration) {
      if (import.meta.env.DEV) {
        console.warn(`[SurfaceManager] "${id}" is not registered.`);
      }
      return;
    }

    const existingIndex = stack.findIndex((surface) => surface.id === id);
    if (existingIndex >= 0) {
      const nextStack = [...stack];
      nextStack[existingIndex] = { id, ...registration, props };
      set({ stack: nextStack });
      return;
    }

    set((state) => ({
      stack: [...state.stack, { id, ...registration, props }],
    }));
  },

  close: (id) =>
    set((state) => ({
      stack: state.stack.filter((surface) => surface.id !== id),
    })),

  closeMany: (ids) => {
    if (ids.length === 0) {
      return;
    }

    const idsToClose = new Set(ids);
    set((state) => ({
      stack: state.stack.filter((surface) => !idsToClose.has(surface.id)),
    }));
  },

  closeTop: () =>
    set((state) => ({
      stack: state.stack.slice(0, -1),
    })),

  closeAll: () => set({ stack: [] }),
}));

type SurfaceShellProps = {
  onClose: () => void;
  onStartClose?: () => void;
  zIndex: number;
  isTopmost: boolean;
  showBackdrop?: boolean;
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
  const [closingSurfaceIds, setClosingSurfaceIds] = useState<Set<string>>(
    new Set(),
  );
  const stateOverlays = stack.filter((surface) => surface.surface !== "page");
  const interactiveOverlays = stateOverlays.filter(
    (surface) => !closingSurfaceIds.has(surface.id),
  );
  const topOverlay = interactiveOverlays.at(-1);
  const topSheet = [...stateOverlays]
    .reverse()
    .find((surface) => surface.surface === "sheet");
  const topSheetIndex = topSheet
    ? stateOverlays.findIndex((surface) => surface.id === topSheet.id)
    : -1;
  const topSheetZIndex = 50 + topSheetIndex * 10;
  const isTopSheetClosing = topSheet
    ? closingSurfaceIds.has(topSheet.id)
    : false;

  useEffect(() => {
    const activeIds = new Set(stack.map((surface) => surface.id));
    setClosingSurfaceIds((current) => {
      const next = new Set(
        [...current].filter((surfaceId) => activeIds.has(surfaceId)),
      );
      // next ⊆ current — equal size means identical sets; preserve reference to skip re-render
      if (next.size === current.size) return current;
      return next;
    });
  }, [stack]);

  return createPortal(
    <AnimatePresence>
      {topSheet ? (
        <m.div
          key="surface-shared-sheet-backdrop"
          animate={{ opacity: isTopSheetClosing ? 0 : 1 }}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-black/30 backdrop-blur-[2px]"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          style={{ zIndex: topSheetZIndex - 1 }}
          transition={transitions.surface}
        />
      ) : null}
      {stateOverlays.map((entry, index) => {
        const Shell = SURFACE_SHELLS[entry.surface];
        const Component = entry.component;
        const isTopmost = entry.id === topOverlay?.id;

        return (
          <Shell
            key={entry.id}
            isTopmost={isTopmost}
            onClose={() => close(entry.id)}
            onStartClose={() => {
              setClosingSurfaceIds((current) => {
                if (current.has(entry.id)) {
                  return current;
                }

                const next = new Set(current);
                next.add(entry.id);
                return next;
              });
            }}
            showBackdrop={entry.surface === "sheet" ? false : undefined}
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

export function SurfaceProvider({
  children,
}: SurfaceProviderProps): React.JSX.Element {
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
