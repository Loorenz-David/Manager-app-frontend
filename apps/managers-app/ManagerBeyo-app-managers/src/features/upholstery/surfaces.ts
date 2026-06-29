import { lazy } from "react";

import { lazyWithPreload } from "@beyo/ui";
import { UPHOLSTERY_PROVIDER_FILTER_SHEET_ID } from "@beyo/upholstery";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export const UPHOLSTERY_PICKER_SLIDE_ID = "upholstery-picker";
export const UPHOLSTERY_PICKER_REORDER_SHEET_ID =
  "upholstery-picker-reorder-sheet";

function loadUpholsteryPickerSlidePage() {
  return import("@/features/upholstery/pages/UpholsteryPickerSlidePage").then(
    (module) => ({
      default: module.UpholsteryPickerSlidePage,
    }),
  );
}

function loadUpholsteryReorderSheetPage() {
  return import("@/features/upholstery/pages/UpholsteryReorderSheetPage").then(
    (module) => ({
      default: module.UpholsteryReorderSheetPage,
    }),
  );
}

function loadUpholsteryProviderFilterSheetPage() {
  return import("@beyo/upholstery").then((module) => ({
    default: module.UpholsteryProviderFilterSheetPage,
  }));
}

const upholsteryReorderSheet = lazyWithPreload(loadUpholsteryReorderSheetPage);
const upholsteryProviderFilterSheet = lazyWithPreload(
  loadUpholsteryProviderFilterSheetPage,
);

export const upholsterySurfaces: SurfaceRegistrations = {
  [UPHOLSTERY_PICKER_SLIDE_ID]: {
    surface: "slide",
    component: lazy(loadUpholsteryPickerSlidePage),
  },
  [UPHOLSTERY_PICKER_REORDER_SHEET_ID]: {
    surface: "sheet",
    component: upholsteryReorderSheet.Component,
  },
  [UPHOLSTERY_PROVIDER_FILTER_SHEET_ID]: {
    surface: "sheet",
    component: upholsteryProviderFilterSheet.Component,
  },
};
