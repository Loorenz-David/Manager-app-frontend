import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { lazyWithPreload } from "@beyo/ui";

function loadItemCategoryPickerSheetPage() {
  return import("@/features/items/pages/ItemCategoryPickerSheetPage").then(
    (module) => ({
      default: module.ItemCategoryPickerSheetPage,
    }),
  );
}

const itemCategoryPicker = lazyWithPreload(loadItemCategoryPickerSheetPage);

export const preloadItemCategoryPickerSurface = itemCategoryPicker.preload;

export const itemSurfaces: SurfaceRegistrations = {
  "item-category-picker": {
    surface: "sheet",
    component: itemCategoryPicker.Component,
  },
};
