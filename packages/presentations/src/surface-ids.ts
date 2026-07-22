import type { PresentationSurfaceProps } from "./surfaces/presentation-surface-props";

export const PRESENTATION_MODAL_SURFACE_ID = "presentation-player-modal";
export const PRESENTATION_FULL_SCREEN_SURFACE_ID = "presentation-player-full-screen";
export const PRESENTATION_SLIDE_PAGE_SURFACE_ID = "presentation-player-slide-page";

export type PresentationsSurfaceOpeners = {
  openPresentationModal?: (props: PresentationSurfaceProps) => void;
  openPresentationFullScreen?: (props: PresentationSurfaceProps) => void;
  openPresentationSlidePage?: (props: PresentationSurfaceProps) => void;
};

export function preloadPresentationModalSurface(): Promise<unknown> {
  return import("./surfaces/PresentationModalSurface");
}

export function preloadPresentationFullScreenSurface(): Promise<unknown> {
  return import("./surfaces/PresentationFullScreenSurface");
}

export function preloadPresentationSlidePageSurface(): Promise<unknown> {
  return import("./surfaces/PresentationSlidePageSurface");
}

