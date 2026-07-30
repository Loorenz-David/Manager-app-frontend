import { AuthProvider } from "@beyo/auth";
import { SurfaceProvider } from "@beyo/ui";
import { Outlet } from "react-router-dom";

import { ROUTES } from "@/lib/routes";
import { markFloorSessionExpired } from "@/lib/floor-session-expired";
import { surfaceRegistry } from "@/app/surface-registry";
import { FloorKioskProvider } from "@/app/FloorKioskProvider";

export function RootRoute(): React.JSX.Element {
  return (
    <AuthProvider
      appScope="floor"
      onSessionExpired={markFloorSessionExpired}
      signInRoute={ROUTES.signIn}
    >
      <Outlet />
    </AuthProvider>
  );
}

export function FloorKioskRoute(): React.JSX.Element {
  return (
    <FloorKioskProvider>
      <SurfaceProvider registry={surfaceRegistry}>
        <Outlet />
      </SurfaceProvider>
    </FloorKioskProvider>
  );
}
