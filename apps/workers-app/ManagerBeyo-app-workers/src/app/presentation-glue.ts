import {
  PRESENTATION_FULL_SCREEN_SURFACE_ID,
  PRESENTATION_MODAL_SURFACE_ID,
  PRESENTATION_SLIDE_PAGE_SURFACE_ID,
  type PresentationsSurfaceOpeners,
  type PresentationSurfaceProps,
} from "@beyo/presentations";

import { ROUTES } from "@/lib/routes";

export const WORKER_PRESENTATION_APP_KEY = "worker";

type OpenSurface = (id: string, props: PresentationSurfaceProps) => void;
type CloseSurface = (id: string) => void;

export function isWorkerPresentationHome(pathname: string): boolean {
  return pathname === ROUTES.home;
}

export function createWorkerPresentationSurfaceOpeners(
  open: OpenSurface,
  close: CloseSurface,
): PresentationsSurfaceOpeners {
  const openPresentation = (id: string, props: PresentationSurfaceProps) =>
    open(id, {
      ...props,
      onRequestClose: () => close(id),
    });

  return {
    openPresentationModal: (props) =>
      openPresentation(PRESENTATION_MODAL_SURFACE_ID, props),
    openPresentationFullScreen: (props) =>
      openPresentation(PRESENTATION_FULL_SCREEN_SURFACE_ID, props),
    openPresentationSlidePage: (props) =>
      openPresentation(PRESENTATION_SLIDE_PAGE_SURFACE_ID, props),
  };
}
