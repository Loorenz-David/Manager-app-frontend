import type { PresentationSurfaceProps } from "./surfaces/presentation-surface-props";

export const PRESENTATION_MODAL_SURFACE_ID = "presentation-player-modal";
export const PRESENTATION_FULL_SCREEN_SURFACE_ID = "presentation-player-full-screen";
export const PRESENTATION_SLIDE_PAGE_SURFACE_ID = "presentation-player-slide-page";

export type PresentationsSurfaceOpeners = {
  openPresentationModal?: (props: PresentationSurfaceProps) => void;
  openPresentationFullScreen?: (props: PresentationSurfaceProps) => void;
  openPresentationSlidePage?: (props: PresentationSurfaceProps) => void;
};

export function preloadPresentationModalSurface() {
  return import("./surfaces/PresentationModalSurface").then((module) => ({
    default: module.PresentationModalSurfaceEntry,
  }));
}

export function preloadPresentationFullScreenSurface() {
  return import("./surfaces/PresentationFullScreenSurface").then((module) => ({
    default: module.PresentationFullScreenSurfaceEntry,
  }));
}

export function preloadPresentationSlidePageSurface() {
  return import("./surfaces/PresentationSlidePageSurface").then((module) => ({
    default: module.PresentationSlidePageSurfaceEntry,
  }));
}
