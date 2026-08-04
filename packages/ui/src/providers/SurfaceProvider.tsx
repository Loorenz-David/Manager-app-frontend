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
import { BottomSheetSurface } from "../components/surfaces/BottomSheetSurface";
import { ModalSurface } from "../components/surfaces/ModalSurface";
import { RiseSurface } from "../components/surfaces/RiseSurface";
import { SlidePageSurface } from "../components/surfaces/SlidePageSurface";
import { SurfaceSkeleton } from "../components/ui/SurfaceSkeleton";
import { transitions } from "@beyo/lib";

export type SurfaceType = "page" | "slide" | "sheet" | "modal" | "rise";

type SurfaceComponent = LazyExoticComponent<
  ComponentType<Record<string, never>>
>;

export type SurfaceRegistration = {
  surface: SurfaceType;
  path?: (props: Record<string, unknown>) => string;
  component: SurfaceComponent;
  /**
   * Suspense fallback shown while this surface's own chunk loads. Defaults to
   * the generic `SurfaceSkeleton` for the surface type. Register a feature
   * skeleton here when the content is known ahead of the chunk load (e.g. a
   * fixed list of menu rows) so the fallback matches the real layout instead
   * of a content-agnostic placeholder.
   */
  skeleton?: ComponentType;
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
  /**
   * Reconcile the stack to a history-recorded depth without touching history.
   * Called by the popstate handler when the user navigates Back (browser,
   * Android system gesture, or hardware button) so a Back closes the topmost
   * overlay(s) instead of unwinding the app's route.
   */
  syncToDepth: (depth: number) => void;
};

/**
 * Each open overlay owns one same-URL history entry so a Back navigation closes
 * it. Same-URL keeps React Router's location unchanged, so the data router never
 * re-renders routes or desyncs off these phantom entries. The entry's state
 * records the overlay depth it corresponds to.
 */
const SURFACE_DEPTH_KEY = "__surfaceDepth";

function pushSurfaceHistory(depth: number): void {
  if (typeof window === "undefined") return;
  const current =
    (window.history.state as Record<string, unknown> | null) ?? {};
  window.history.pushState({ ...current, [SURFACE_DEPTH_KEY]: depth }, "");
}

// `history.go()` is asynchronous — its `popstate` lands on a later task, well
// after the synchronous `set({ stack })` above it has already applied. If a
// close is immediately followed by an open in the same tick (e.g. "skip this
// step, go straight to the next surface"), the open's synchronous `pushState`
// lands first, then the *stale* `popstate` from the pending `go()` arrives and
// — with nothing to say otherwise — looks exactly like a real Back press,
// so the popstate handler reconciles the stack down to the pre-close depth
// and silently closes the surface that had just been opened.
// Every `popstate` this module itself causes via `go()` is entirely redundant
// (the store already applied the equivalent stack change synchronously); only
// a `popstate` we did NOT cause — a real Back press — needs to reconcile
// anything. Track how many of our own `go()` calls haven't echoed back yet so
// the popstate handler can tell "our own delayed echo" apart from "the user
// actually pressed Back" and ignore the former.
let pendingProgrammaticPops = 0;

function popSurfaceHistory(count: number): void {
  if (typeof window === "undefined" || count <= 0) return;
  pendingProgrammaticPops += 1;
  window.history.go(-count);
}

/**
 * Returns true and consumes one pending self-triggered navigation if this
 * `popstate` is the delayed echo of our own `popSurfaceHistory()` call — the
 * caller should ignore the event in that case, since the stack it already
 * reflects is correct. Returns false for a `popstate` we didn't cause (a real
 * Back/Forward), which the caller should reconcile against as usual.
 */
function consumePendingProgrammaticPop(): boolean {
  if (pendingProgrammaticPops <= 0) return false;
  pendingProgrammaticPops -= 1;
  return true;
}

export function readSurfaceDepth(state: unknown): number {
  if (state && typeof state === "object") {
    const value = (state as Record<string, unknown>)[SURFACE_DEPTH_KEY];
    if (typeof value === "number") return value;
  }
  return 0;
}

export const SurfacePropsContext = createContext<Record<string, unknown>>({});

export type SurfaceHeaderValue = {
  setTitle: (title: string) => void;
  setActions: (actions: ReactNode) => void;
  requestClose: () => void;
  setHeaderHidden: (hidden: boolean) => void;
  setCloseInterceptor: (fn: (() => void) | null) => void;
  /**
   * Turn the slide-to-close swipe gesture off for the whole page (e.g. a page
   * whose own left/right swipe interaction would collide with it). No-op on
   * sheet/modal surfaces, which have no swipe dismissal. For disabling only a
   * region, mark the element with `data-slide-dismiss-ignore` instead.
   */
  setSwipeDismissDisabled: (disabled: boolean) => void;
  /**
   * Suppress this slide's dark backdrop (the drag-reveal / close-fade dim).
   * Use when the page itself renders another dark overlay on close, so the two
   * dims don't stack into a flicker. No-op on sheet/modal surfaces.
   */
  setBackdropHidden: (hidden: boolean) => void;
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
      // Re-surface to the top; the overlay count is unchanged so history stays.
      set((state) => ({
        stack: [
          ...state.stack.filter((surface) => surface.id !== id),
          { id, ...registration, props },
        ],
      }));
      return;
    }

    if (registration.path && navigate) {
      // Route-backed surface: React Router's navigate owns the history entry.
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
      set((state) => ({
        stack: [...state.stack, { id, ...registration, props }],
      }));
      return;
    }

    const nextStack = [...stack, { id, ...registration, props }];
    set({ stack: nextStack });
    pushSurfaceHistory(nextStack.length);
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
      return;
    }

    const nextStack = [...stack, { id, ...registration, props }];
    set({ stack: nextStack });
    pushSurfaceHistory(nextStack.length);
  },

  close: (id) => {
    const { stack } = get();
    const nextStack = stack.filter((surface) => surface.id !== id);
    if (nextStack.length === stack.length) return;
    set({ stack: nextStack });
    popSurfaceHistory(stack.length - nextStack.length);
  },

  closeMany: (ids) => {
    if (ids.length === 0) {
      return;
    }

    const idsToClose = new Set(ids);
    const { stack } = get();
    const nextStack = stack.filter((surface) => !idsToClose.has(surface.id));
    const removed = stack.length - nextStack.length;
    if (removed === 0) return;
    set({ stack: nextStack });
    popSurfaceHistory(removed);
  },

  closeTop: () => {
    const { stack } = get();
    if (stack.length === 0) return;
    set({ stack: stack.slice(0, -1) });
    popSurfaceHistory(1);
  },

  closeAll: () => {
    const { stack } = get();
    if (stack.length === 0) return;
    set({ stack: [] });
    popSurfaceHistory(stack.length);
  },

  // Back navigation already moved history; only reconcile the stack (drop the
  // topmost overlays down to the recorded depth).
  syncToDepth: (depth) =>
    set((state) =>
      state.stack.length > depth
        ? { stack: state.stack.slice(0, Math.max(0, depth)) }
        : state,
    ),
}));

type SurfaceShellProps = {
  onClose: () => void;
  onStartClose?: () => void;
  zIndex: number;
  isTopmost: boolean;
  /** Position among the open overlays; slides use it for stack parallax. */
  stackIndex?: number;
  showBackdrop?: boolean;
  children: ReactNode;
};

const SURFACE_SHELLS: Record<SurfaceType, ComponentType<SurfaceShellProps>> = {
  page: ({ children }) => <>{children}</>,
  slide: SlidePageSurface,
  sheet: BottomSheetSurface,
  modal: ModalSurface,
  rise: RiseSurface,
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
          // Covered (non-topmost) overlays stay mounted so their close/exit
          // animation and stack-return state are preserved, but they must not
          // hold or reclaim DOM focus while covered — otherwise a still-open
          // Vaul drawer underneath keeps re-focusing its own last-focused
          // element and blocks focus from ever reaching the surface on top.
          <div key={entry.id} inert={!isTopmost || undefined}>
            <Shell
              isTopmost={isTopmost}
              stackIndex={index}
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
                <Suspense
                  fallback={
                    entry.skeleton ? (
                      <entry.skeleton />
                    ) : (
                      <SurfaceSkeleton surface={entry.surface} />
                    )
                  }
                >
                  <Component />
                </Suspense>
              </SurfacePropsContext.Provider>
            </Shell>
          </div>
        );
      })}
    </AnimatePresence>,
    document.body,
  );
}

type SurfaceProviderProps = {
  children: ReactNode;
  registry: SurfaceRegistrations;
};

export function SurfaceProvider({
  children,
  registry,
}: SurfaceProviderProps): React.JSX.Element {
  const navigate = useNavigate();
  const init = useSurfaceStore((state) => state.init);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    init(registry, navigate);
  }, []);

  // Back navigation (browser button, Android system gesture, hardware button)
  // fires popstate. Reconcile the overlay stack to the depth recorded on the
  // history entry we landed on, so Back closes the topmost overlay instead of
  // unwinding the underlying route. A programmatic close() also fires a
  // popstate once its own history.go() resolves, but the stack it already
  // reflects is correct — skip reconciling those (see consumePendingProgrammaticPop),
  // or a same-tick open() that ran before that echo arrived gets wiped out by it.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (consumePendingProgrammaticPop()) return;
      useSurfaceStore.getState().syncToDepth(readSurfaceDepth(event.state));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <>
      {children}
      <SurfaceRenderer />
    </>
  );
}
