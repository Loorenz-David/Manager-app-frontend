import { AuthProvider } from "@beyo/auth";
import { SurfaceProvider } from "@beyo/ui";
import { Outlet } from "react-router-dom";
import { ROUTES } from "@/lib/routes";

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider registry={{}}>
      <AuthProvider appScope="manager" signInRoute={ROUTES.signIn}>
        <Outlet />
      </AuthProvider>
    </SurfaceProvider>
  );
}
