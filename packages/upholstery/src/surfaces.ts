import { lazy } from "react";

import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";

import type { ExternalUpholsteryProvider } from "./types";

export const UPHOLSTERY_PICKER_SURFACE_ID = "upholstery-picker";
export const UPHOLSTERY_PICKER_SLIDE_ID = UPHOLSTERY_PICKER_SURFACE_ID;
export const UPHOLSTERY_PICKER_REORDER_SHEET_ID =
  "upholstery-picker-reorder-sheet";
export const UPHOLSTERY_PROVIDER_FILTER_SHEET_ID =
  "upholstery-provider-filter-sheet";

export type UpholsteryProviderFilterSheetSurfaceProps = {
  selectedProviders: ExternalUpholsteryProvider[];
  onApply: (providers: ExternalUpholsteryProvider[]) => void;
};

function loadUpholsteryPickerSlidePage() {
  return import("./pages/UpholsteryPickerSlidePage").then((module) => ({
    default: module.UpholsteryPickerSlidePage,
  }));
}

function loadUpholsteryReorderSheetPage() {
  return import("./pages/UpholsteryReorderSheetPage").then((module) => ({
    default: module.UpholsteryReorderSheetPage,
  }));
}

function loadUpholsteryProviderFilterSheetPage() {
  return import("./pages/UpholsteryProviderFilterSheetPage").then((module) => ({
    default: module.UpholsteryProviderFilterSheetPage,
  }));
}

const upholsteryPicker = lazyWithPreload(loadUpholsteryPickerSlidePage);
const upholsteryReorderSheet = lazyWithPreload(loadUpholsteryReorderSheetPage);
const upholsteryProviderFilterSheet = lazyWithPreload(
  loadUpholsteryProviderFilterSheetPage,
);

export const preloadUpholsteryPickerSurface = upholsteryPicker.preload;
export const preloadUpholsteryReorderSheetSurface =
  upholsteryReorderSheet.preload;

export const upholsterySurfaces: SurfaceRegistrations = {
  [UPHOLSTERY_PICKER_SURFACE_ID]: {
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
