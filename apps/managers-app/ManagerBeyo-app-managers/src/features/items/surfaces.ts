import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";
import { ITEM_FAST_ISSUE_SHEET_SURFACE_ID } from "@beyo/tasks";
import { lazyWithPreload } from "@beyo/ui";

function loadItemCategoryPickerSheetPage() {
  return import("@/features/items/pages/ItemCategoryPickerSheetPage").then(
    (module) => ({
      default: module.ItemCategoryPickerSheetPage,
    }),
  );
}

function loadItemIssueSeverityPickerSheetPage() {
  return import("@/features/items/pages/ItemIssueSeverityPickerSheetPage").then(
    (module) => ({
      default: module.ItemIssueSeverityPickerSheetPage,
    }),
  );
}

const itemCategoryPicker = lazyWithPreload(loadItemCategoryPickerSheetPage);
const itemIssueSeverityPicker = lazyWithPreload(
  loadItemIssueSeverityPickerSheetPage,
);
const itemFastIssueSheet = lazyWithPreload(() =>
  import("@beyo/tasks").then((module) => ({
    default: module.ItemFastIssueSheetPage,
  })),
);

export const preloadItemCategoryPickerSurface = itemCategoryPicker.preload;
export const preloadItemIssueSeverityPickerSurface =
  itemIssueSeverityPicker.preload;

export const itemSurfaces: SurfaceRegistrations = {
  "item-category-picker": {
    surface: "sheet",
    component: itemCategoryPicker.Component,
  },
  "item-issue-severity-picker": {
    surface: "sheet",
    component: itemIssueSeverityPicker.Component,
  },
  [ITEM_FAST_ISSUE_SHEET_SURFACE_ID]: {
    surface: "sheet",
    component: itemFastIssueSheet.Component,
  },
};
