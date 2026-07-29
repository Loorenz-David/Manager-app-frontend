import { lazy } from "react";
import type { SurfaceRegistrations } from "@beyo/ui";

export const DEVICE_SETTINGS_SURFACE_ID = "device-settings";

export const surfaceRegistry = {
  [DEVICE_SETTINGS_SURFACE_ID]: {
    surface: "rise",
    component: lazy(() =>
      import("@/pages/DeviceSettingsPage").then((module) => ({
        default: module.DeviceSettingsPage,
      })),
    ),
  },
} satisfies SurfaceRegistrations;
