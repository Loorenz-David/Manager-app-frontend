import {
  CLOCK_KIOSK_CONFIRM_SURFACE_ID,
  CLOCK_KIOSK_RESULT_SURFACE_ID,
  clockKioskSurfaces,
} from "@beyo/clock-kiosk";
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import { createElement, type ComponentType } from "react";

import { FloorKioskFrame } from "@/components/FloorKioskFrame";

export const DEVICE_SETTINGS_SURFACE_ID = "device-settings";

const deviceSettings = lazyWithPreload(() =>
  import("@/pages/DeviceSettingsPage").then((module) => ({
    default: module.DeviceSettingsPage,
  })),
);

function withFloorKioskFrame(
  Component: ComponentType,
): ComponentType {
  return function FloorComposedKioskSurface(): React.JSX.Element {
    return createElement(
      FloorKioskFrame,
      null,
      createElement(Component),
    );
  };
}

const identityConfirm = lazyWithPreload(async () => ({
  default: withFloorKioskFrame(
    clockKioskSurfaces[CLOCK_KIOSK_CONFIRM_SURFACE_ID].component,
  ),
}));
const result = lazyWithPreload(async () => ({
  default: withFloorKioskFrame(
    clockKioskSurfaces[CLOCK_KIOSK_RESULT_SURFACE_ID].component,
  ),
}));

export const surfaceRegistry: SurfaceRegistrations = {
  [DEVICE_SETTINGS_SURFACE_ID]: {
    surface: "rise",
    component: deviceSettings.Component,
  },
  [CLOCK_KIOSK_CONFIRM_SURFACE_ID]: {
    surface: "rise",
    component: identityConfirm.Component,
  },
  [CLOCK_KIOSK_RESULT_SURFACE_ID]: {
    surface: "rise",
    component: result.Component,
  },
};
