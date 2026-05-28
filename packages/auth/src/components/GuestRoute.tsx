import { Navigate, Outlet } from "react-router-dom";
import { selectIsAuthenticated, useAuthStore } from "../store/auth.store";

type GuestRouteProps = {
  homePath: string;
};

export function GuestRoute({ homePath }: GuestRouteProps): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate replace to={homePath} />;
  }

  return <Outlet />;
}
