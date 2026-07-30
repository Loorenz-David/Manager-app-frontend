import {
  CLOCK_KIOSK_CONFIRM_SURFACE_ID,
  CLOCK_KIOSK_RESULT_SURFACE_ID,
  KioskSurfaceSkeleton,
  clockKioskSurfaces,
} from "@beyo/clock-kiosk";
import { lazyWithPreload, type SurfaceRegistrations } from "@beyo/ui";
import {
  Suspense,
  createElement,
  type ComponentType,
} from "react";

import { FloorKioskFrame } from "@/components/FloorKioskFrame";

export const DEVICE_SETTINGS_SURFACE_ID = "device-settings";

const deviceSettings = lazyWithPreload(() =>
  import("@/pages/DeviceSettingsPage").then((module) => ({
    default: module.DeviceSettingsPage,
  })),
);

function withFloorKioskFrame(
  Component: ComponentType,
  variant: "confirm" | "result" | "summary",
): ComponentType {
  return function FloorComposedKioskSurface(): React.JSX.Element {
    return createElement(
      FloorKioskFrame,
      null,
      createElement(
        Suspense,
        {
          fallback: createElement(KioskSurfaceSkeleton, {
            variant,
          }),
        },
        createElement(Component),
      ),
    );
  };
}

const IdentityConfirm = withFloorKioskFrame(
  clockKioskSurfaces[CLOCK_KIOSK_CONFIRM_SURFACE_ID].component,
  "confirm",
);
const Result = withFloorKioskFrame(
  clockKioskSurfaces[CLOCK_KIOSK_RESULT_SURFACE_ID].component,
  "result",
);
const identityConfirm = lazyWithPreload(() =>
  Promise.resolve({ default: IdentityConfirm }),
);
const result = lazyWithPreload(() =>
  Promise.resolve({ default: Result }),
);

// The host wrappers are intentionally tiny and warmed with the registry so
// only the package-owned page chunks can suspend, inside FloorKioskFrame.
void identityConfirm.preload();
void result.preload();

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
