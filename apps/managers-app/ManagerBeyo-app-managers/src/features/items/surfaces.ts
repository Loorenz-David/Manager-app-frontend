import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import {
  itemCategoryPickerSurfaces,
  preloadItemCategoryPickerSurface as preloadSharedItemCategoryPickerSurface,
} from "@beyo/item-categories";
import { SCANNER_SLIDE_SURFACE_ID } from "@beyo/scanner";
import { lazyWithPreload } from "@beyo/ui";

function loadScannerSlidePage() {
  return import("@beyo/scanner").then((module) => ({
    default: module.ScannerSlideRouteEntry,
  }));
}

const scannerSlide = lazyWithPreload(loadScannerSlidePage);

export const preloadItemCategoryPickerSurface =
  preloadSharedItemCategoryPickerSurface;
export const preloadScannerSlideSurface = scannerSlide.preload;

export const itemSurfaces: SurfaceRegistrations = {
  ...itemCategoryPickerSurfaces,
  [SCANNER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: scannerSlide.Component,
  },
};
