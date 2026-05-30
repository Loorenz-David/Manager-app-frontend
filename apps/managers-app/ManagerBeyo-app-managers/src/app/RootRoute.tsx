import { Outlet } from "react-router-dom";
import { AuthProvider } from "@beyo/auth";
import { PwaProvider } from "@/features/pwa";
import { ROUTES } from "@/lib/routes";
import { SurfaceProvider } from "@/providers/SurfaceProvider";

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <PwaProvider>
        <AuthProvider signInRoute={ROUTES.signIn}>
          <Outlet />
        </AuthProvider>
      </PwaProvider>
    </SurfaceProvider>
  );
}
