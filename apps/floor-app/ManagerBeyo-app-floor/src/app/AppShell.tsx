import { useSurface } from "@beyo/hooks";
import { Outlet } from "react-router-dom";

import { DEVICE_SETTINGS_SURFACE_ID } from "@/app/surface-registry";
import { FloorKioskFrame } from "@/components/FloorKioskFrame";
import { useDeviceSettingsLongPress } from "@/hooks/use-device-settings-long-press";

export function AppShell(): React.JSX.Element {
  const surface = useSurface();
  const identitySlotProps = useDeviceSettingsLongPress(() => {
    surface.open(DEVICE_SETTINGS_SURFACE_ID);
  });

  return (
    <FloorKioskFrame identitySlotProps={identitySlotProps}>
      <Outlet />
    </FloorKioskFrame>
  );
}
