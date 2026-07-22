import { useAuth } from "@beyo/auth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ROUTES } from "@/lib/routes";

export function ProtectedRoute(): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.signIn} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function GuestRoute(): React.JSX.Element {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Navigate to={ROUTES.home} replace /> : <Outlet />;
}
