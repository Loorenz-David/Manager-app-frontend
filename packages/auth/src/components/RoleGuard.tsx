import type { ReactNode } from "react";
import type { AuthRole, WorkspaceRoleValue } from "../roles";
import { useRole } from "../hooks/use-role";

type RoleGuardProps = {
  role?: AuthRole;
  workspaceRole?: WorkspaceRoleValue;
  fallback?: ReactNode;
  children: ReactNode;
};

export function RoleGuard({
  role,
  workspaceRole,
  fallback = null,
  children,
}: RoleGuardProps): React.JSX.Element {
  const { hasRole, isWorkspaceRole } = useRole();
  const allowed =
    (role === undefined || hasRole(role)) &&
    (workspaceRole === undefined || isWorkspaceRole(workspaceRole));

  return allowed ? <>{children}</> : <>{fallback}</>;
}
