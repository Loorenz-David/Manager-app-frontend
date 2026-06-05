import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { SCANNER_SLIDE_SURFACE_ID } from "@beyo/scanner";
import { lazyWithPreload } from "@beyo/ui";

function loadItemCategoryPickerSheetPage() {
  return import("@/features/items/pages/ItemCategoryPickerSheetPage").then(
    (module) => ({
      default: module.ItemCategoryPickerSheetPage,
    }),
  );
}

function loadScannerSlidePage() {
  return import("@beyo/scanner").then((module) => ({
    default: module.ScannerSlideRouteEntry,
  }));
}

const itemCategoryPicker = lazyWithPreload(loadItemCategoryPickerSheetPage);
const scannerSlide = lazyWithPreload(loadScannerSlidePage);

export const preloadItemCategoryPickerSurface = itemCategoryPicker.preload;
export const preloadScannerSlideSurface = scannerSlide.preload;

export const itemSurfaces: SurfaceRegistrations = {
  "item-category-picker": {
    surface: "sheet",
    component: itemCategoryPicker.Component,
  },
  [SCANNER_SLIDE_SURFACE_ID]: {
    surface: "slide",
    component: scannerSlide.Component,
  },
};
