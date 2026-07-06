import { lazy } from "react";
import type { PwaInstallSurfaceProps, PwaUpdateSurfaceProps } from "@beyo/pwa";
import type { SurfaceRegistrations } from "@/providers/SurfaceProvider";

export type { PwaInstallSurfaceProps, PwaUpdateSurfaceProps };

export const PWA_UPDATE_SURFACE_ID = "pwa-update";
export const PWA_INSTALL_SURFACE_ID = "pwa-install";

function loadPwaUpdateSheetPage() {
  return import("@/features/pwa/pages/PwaUpdateSheetPage").then((module) => ({
    default: module.PwaUpdateSheetPage,
  }));
}

function loadPwaInstallSheetPage() {
  return import("@/features/pwa/pages/PwaInstallSheetPage").then((module) => ({
    default: module.PwaInstallSheetPage,
  }));
}

export const pwaSurfaces: SurfaceRegistrations = {
  [PWA_UPDATE_SURFACE_ID]: {
    surface: "sheet",
    component: lazy(loadPwaUpdateSheetPage),
  },
  [PWA_INSTALL_SURFACE_ID]: {
    surface: "sheet",
    component: lazy(loadPwaInstallSheetPage),
  },
};
