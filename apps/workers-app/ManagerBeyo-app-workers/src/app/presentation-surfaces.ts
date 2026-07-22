import {
  createElement,
  useContext,
  useMemo,
  useRef,
  type ComponentType,
  type ContextType,
  type ReactNode,
} from "react";
import {
  PRESENTATION_FULL_SCREEN_SURFACE_ID,
  PRESENTATION_MODAL_SURFACE_ID,
  PRESENTATION_SLIDE_PAGE_SURFACE_ID,
  preloadPresentationFullScreenSurface,
  preloadPresentationModalSurface,
  preloadPresentationSlidePageSurface,
} from "@beyo/presentations";
import { lazyWithPreload } from "@beyo/ui";

import {
  SurfaceHeaderContext,
  type SurfaceRegistrations,
} from "@/providers/SurfaceProvider";

type SurfaceEntryModule = {
  default: ComponentType<Record<string, never>>;
};

function StableSurfaceContextBoundary({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const hostSurface = useContext(SurfaceHeaderContext);
  const hostSurfaceRef = useRef(hostSurface);
  hostSurfaceRef.current = hostSurface;
  const hasHostSurface = hostSurface !== null;
  const stableSurface = useMemo<ContextType<typeof SurfaceHeaderContext>>(
    () =>
      hasHostSurface
        ? {
            setTitle: (title) => hostSurfaceRef.current?.setTitle(title),
            setActions: (actions) => hostSurfaceRef.current?.setActions(actions),
            requestClose: () => hostSurfaceRef.current?.requestClose(),
            setHeaderHidden: (hidden) =>
              hostSurfaceRef.current?.setHeaderHidden(hidden),
            setCloseInterceptor: (interceptor) =>
              hostSurfaceRef.current?.setCloseInterceptor(interceptor),
            setSwipeDismissDisabled: (disabled) =>
              hostSurfaceRef.current?.setSwipeDismissDisabled(disabled),
            setBackdropHidden: (hidden) =>
              hostSurfaceRef.current?.setBackdropHidden(hidden),
          }
        : null,
    [hasHostSurface],
  );

  return createElement(
    SurfaceHeaderContext.Provider,
    { value: stableSurface },
    children,
  );
}

function preloadHostedModalSurface(): Promise<SurfaceEntryModule> {
  return preloadPresentationModalSurface().then(({ default: Entry }) => ({
    default: function HostedPresentationModalEntry() {
      return createElement(
        StableSurfaceContextBoundary,
        null,
        createElement(
          "div",
          { className: "relative min-h-[80dvh]" },
          createElement(Entry),
        ),
      );
    },
  }));
}

function preloadHostedSlidePageSurface(): Promise<SurfaceEntryModule> {
  return preloadPresentationSlidePageSurface().then(({ default: Entry }) => ({
    default: function HostedPresentationSlidePageEntry() {
      return createElement(
        StableSurfaceContextBoundary,
        null,
        createElement(Entry),
      );
    },
  }));
}

const modalSurface = lazyWithPreload(preloadHostedModalSurface);
const fullScreenSurface = lazyWithPreload(
  preloadPresentationFullScreenSurface,
);
const slidePageSurface = lazyWithPreload(preloadHostedSlidePageSurface);

export const presentationSurfaces = {
  [PRESENTATION_MODAL_SURFACE_ID]: {
    surface: "modal",
    component: modalSurface.Component,
  },
  [PRESENTATION_FULL_SCREEN_SURFACE_ID]: {
    surface: "slide",
    component: fullScreenSurface.Component,
  },
  [PRESENTATION_SLIDE_PAGE_SURFACE_ID]: {
    surface: "slide",
    component: slidePageSurface.Component,
  },
} satisfies SurfaceRegistrations;
