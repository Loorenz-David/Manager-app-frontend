import { Navigate, Outlet } from "react-router-dom";
import { usePermission } from "../hooks/use-permission";

type RequirePermissionProps = {
  permission: string;
  redirectTo?: string;
};

export function RequirePermission({
  permission,
  redirectTo = "/",
}: RequirePermissionProps): React.JSX.Element {
  return usePermission(permission) ? (
    <Outlet />
  ) : (
    <Navigate to={redirectTo} replace />
  );
}
