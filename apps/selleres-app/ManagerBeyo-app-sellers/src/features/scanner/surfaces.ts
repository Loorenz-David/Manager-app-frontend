import { SCANNER_SLIDE_SURFACE_ID, loadScannerSlidePage } from "@beyo/scanner";
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

const scannerSlide = lazyWithPreload(loadScannerSlidePage);

export const preloadScannerSlideSurface = scannerSlide.preload;

export const scannerSurfaces: SurfaceRegistrations = {
  [SCANNER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: scannerSlide.Component,
  },
};
