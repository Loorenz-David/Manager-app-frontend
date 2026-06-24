import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

import { ITEM_CATEGORY_PICKER_SURFACE_ID } from "./surface-ids";

function loadItemCategoryPickerSheetPage() {
  return import("./pages/ItemCategoryPickerSheetPage").then((module) => ({
    default: module.ItemCategoryPickerSheetPage,
  }));
}

const itemCategoryPickerSheet = lazyWithPreload(
  loadItemCategoryPickerSheetPage,
);

export const preloadItemCategoryPickerSurface =
  itemCategoryPickerSheet.preload;

export const itemCategoryPickerSurfaces: SurfaceRegistrations = {
  [ITEM_CATEGORY_PICKER_SURFACE_ID]: {
    surface: "sheet",
    component: itemCategoryPickerSheet.Component,
  },
};
