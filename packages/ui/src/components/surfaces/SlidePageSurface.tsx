import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  animate,
  m,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { transitions } from "@beyo/lib";
import { SurfaceHeaderContext } from "../../providers/SurfaceProvider";
import {
  registerSlidePanel,
  useSlideParallaxShift,
} from "./slide-parallax";
import {
  readPanelWidth,
  useSlideToDismiss,
} from "./use-slide-to-dismiss";

/** Peak dim of the backdrop revealed beneath the panel. */
const MAX_BACKDROP_OPACITY = 0.3;

type Props = {
  onClose: () => void;
  zIndex: number;
  isTopmost: boolean;
  /** Position among the open overlays; feeds the stack parallax pairing. */
  stackIndex?: number;
  children: ReactNode;
};

export function SlidePageSurface({
  onClose,
  zIndex,
  isTopmost,
  stackIndex,
  children,
}: Props): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [actions, setActions] = useState<ReactNode>(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [closeInterceptor, setCloseInterceptorState] = useState<
    (() => void) | null
  >(null);
  const [swipeDismissDisabled, setSwipeDismissDisabled] = useState(false);
  const [backdropHidden, setBackdropHidden] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();

  // Single source of truth for the panel's horizontal position (px):
  // enter animates width→0, the drag writes it live, exit animates →width.
  // Backdrop dim and the stack parallax of layers beneath derive from it.
  const panelX = useMotionValue(0);

  // Enter: start off-screen (before first paint) and slide in. Deliberately
  // NO run-once ref guard: StrictMode mounts effects twice (run → cleanup →
  // run), and a guard would leave the second run early-returning after the
  // cleanup stopped the animation — stranding the panel off-screen as an
  // invisible full-viewport layer. Re-running from scratch is idempotent.
  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      panelX.set(0);
      return;
    }
    panelX.set(readPanelWidth(panelRef));
    const controls = animate(panelX, 0, transitions.slide);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exit: AnimatePresence keeps us mounted (usePresence) until the slide-off
  // finishes. Every close path — drag commit, back arrow, OS/browser Back —
  // funnels through this same animation, from wherever the panel currently is.
  // `safeToRemove` goes through a latest-ref so identity churn during the exit
  // can't re-trigger the effect (its cleanup would stop the animation and
  // strand the surface mounted forever).
  const safeToRemoveRef = useRef(safeToRemove);
  safeToRemoveRef.current = safeToRemove;
  useEffect(() => {
    if (isPresent) return;
    const controls = animate(
      panelX,
      readPanelWidth(panelRef),
      prefersReducedMotion ? { duration: 0 } : transitions.slide,
    );
    void controls.then(() => safeToRemoveRef.current?.());
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  // Publish this panel's live position so layers beneath (a covered slide or
  // the app base via SlideParallaxUnderlay) can derive their parallax shift.
  // Registered for the full mount lifecycle, exit animation included.
  useEffect(() => {
    if (typeof stackIndex !== "number") return;
    return registerSlidePanel({
      order: stackIndex,
      x: panelX,
      getWidth: () => readPanelWidth(panelRef),
    });
  }, [stackIndex, panelX]);

  // This panel's own parallax when a slide is stacked above it.
  const parallaxShift = useSlideParallaxShift(stackIndex ?? 0, () =>
    readPanelWidth(panelRef),
  );
  const combinedX = useTransform(
    [panelX, parallaxShift] as const,
    ([position, shift]: number[]) => position + shift,
  );

  const backdropOpacity = useTransform(panelX, (value) => {
    const width = readPanelWidth(panelRef);
    const progress = width > 0 ? Math.min(1, Math.max(0, value / width)) : 0;
    return (1 - progress) * MAX_BACKDROP_OPACITY;
  });

  // A surface stacked underneath (e.g. the sheet this slide opened from) can
  // still be a mounted, "open" Vaul drawer that keeps reclaiming DOM focus.
  // Grabbing focus here the moment this slide becomes topmost breaks that
  // hold so taps on focusable content inside the slide (inputs, composers)
  // actually receive focus instead of silently no-oping.
  useEffect(() => {
    if (isTopmost) {
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [isTopmost]);

  const setCloseInterceptor = (fn: (() => void) | null) => {
    setCloseInterceptorState(() => fn);
  };

  // Returns true if the surface is actually closing, false if intercepted.
  const requestClose = (): boolean => {
    if (closeInterceptor) {
      closeInterceptor();
      return false;
    }

    onClose();
    return true;
  };

  const handleClose = () => {
    requestClose();
  };

  useSlideToDismiss({
    enabled:
      Boolean(isTopmost) &&
      isPresent &&
      !prefersReducedMotion &&
      !swipeDismissDisabled,
    panelRef,
    x: panelX,
    onDismiss: requestClose,
  });

  return (
    <SurfaceHeaderContext.Provider
      value={{
        setTitle,
        setActions,
        requestClose: onClose,
        setHeaderHidden,
        setCloseInterceptor,
        setSwipeDismissDisabled,
        setBackdropHidden,
      }}
    >
      {/* Dimming backdrop revealed beneath the panel — a pure derivation of
       * panelX, so it fades through enter, drag and exit with no extra
       * choreography. A page can suppress it (setBackdropHidden) when it renders
       * its own dark overlay on close, to avoid two dims stacking into a
       * flicker. */}
      {!backdropHidden ? (
        <m.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-black"
          style={{ opacity: backdropOpacity, zIndex }}
        />
      ) : null}
      {/* pointer-events-none on the full-viewport wrapper (re-enabled on the
       * panel): a panel that is off-screen — exiting, or stuck by any bug —
       * must never invisibly swallow the app's pointer events. */}
      <div
        className="pointer-events-none fixed inset-0 flex justify-center"
        style={{ zIndex }}
      >
        {/* The panel. `x` composes its own position (enter/drag/exit) with the
         * parallax shift applied when another slide stacks above it.
         * `touch-action: pan-y` keeps the browser from claiming horizontal
         * touches during the pre-lock phase (before the dismiss hook starts
         * calling preventDefault); vertical scrolling stays native.
         * `overscroll-behavior-x: contain` keeps a horizontal fling from
         * chaining into a browser back-navigation. Trade-off (accepted): an
         * ancestor `pan-y` disables native horizontal touch scrolling of
         * nested `overflow-x` scrollers. */}
        <m.div
          ref={panelRef}
          className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-background pt-(--safe-top) focus:outline-none transform-gpu will-change-transform"
          style={{
            x: combinedX,
            maxWidth: "var(--manager-shell-max-width)",
            touchAction: "pan-y",
            overscrollBehaviorX: "contain",
          }}
          tabIndex={-1}
        >
          {!headerHidden ? (
            <header className="flex min-h-14 shrink-0 items-center gap-3 px-4 py-3">
              <button
                aria-label="Go back"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                onClick={handleClose}
                type="button"
              >
                ‹
              </button>
              <h1
                className="flex-1 truncate text-base font-semibold"
                id="surface-slide-title"
              >
                {title}
              </h1>
              {actions ? (
                <div className="flex items-center gap-1">{actions}</div>
              ) : null}
            </header>
          ) : null}

          <div className="flex-1 overflow-hidden">{children}</div>
        </m.div>
      </div>
    </SurfaceHeaderContext.Provider>
  );
}
