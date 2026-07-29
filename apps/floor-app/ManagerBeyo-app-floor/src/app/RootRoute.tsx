import { AuthProvider } from "@beyo/auth";
import { SurfaceProvider } from "@beyo/ui";
import { Outlet } from "react-router-dom";

import { ROUTES } from "@/lib/routes";
import { markFloorSessionExpired } from "@/lib/floor-session-expired";
import { surfaceRegistry } from "@/app/surface-registry";

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider registry={surfaceRegistry}>
      <AuthProvider
        appScope="floor"
        onSessionExpired={markFloorSessionExpired}
        signInRoute={ROUTES.signIn}
      >
        <Outlet />
      </AuthProvider>
    </SurfaceProvider>
  );
}
