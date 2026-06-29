import type { ReactNode } from "react";
import type {
  AuthRole,
  WorkspaceRoleValue,
  WorkspaceSpecialization,
} from "../roles";
import { useRole } from "../hooks/use-role";

type RoleGuardProps = {
  role?: AuthRole;
  specialization?: WorkspaceSpecialization;
  workspaceRole?: WorkspaceRoleValue;
  fallback?: ReactNode;
  children: ReactNode;
};

export function RoleGuard({
  role,
  specialization,
  workspaceRole,
  fallback = null,
  children,
}: RoleGuardProps): React.JSX.Element {
  const { hasRole, hasSpecialization, isWorkspaceRole } = useRole();
  const allowed =
    (role === undefined || hasRole(role)) &&
    (specialization === undefined || hasSpecialization(specialization)) &&
    (workspaceRole === undefined || isWorkspaceRole(workspaceRole));

  return allowed ? <>{children}</> : <>{fallback}</>;
}
