import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import {
  itemCategoryPickerSurfaces,
  preloadItemCategoryPickerSurface as preloadSharedItemCategoryPickerSurface,
} from "@beyo/item-categories";
import { SCANNER_SLIDE_SURFACE_ID, loadScannerSlidePage } from "@beyo/scanner";
import { lazyWithPreload } from "@beyo/ui";

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
