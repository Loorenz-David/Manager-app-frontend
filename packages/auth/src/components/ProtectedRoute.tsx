import { Navigate, Outlet } from "react-router-dom";
import { selectIsAuthenticated, useAuthStore } from "../store/auth.store";

type ProtectedRouteProps = {
  signInPath: string;
};

export function ProtectedRoute({
  signInPath,
}: ProtectedRouteProps): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate replace to={signInPath} />;
}
