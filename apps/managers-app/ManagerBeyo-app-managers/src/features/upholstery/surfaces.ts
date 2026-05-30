import { lazy } from "react";

import { lazyWithPreload } from "@beyo/ui";
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

const upholsteryReorderSheet = lazyWithPreload(loadUpholsteryReorderSheetPage);

export const upholsterySurfaces: SurfaceRegistrations = {
  [UPHOLSTERY_PICKER_SLIDE_ID]: {
    surface: "slide",
    component: lazy(loadUpholsteryPickerSlidePage),
  },
  [UPHOLSTERY_PICKER_REORDER_SHEET_ID]: {
    surface: "sheet",
    component: upholsteryReorderSheet.Component,
  },
};
