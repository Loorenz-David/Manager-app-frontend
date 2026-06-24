import { useCallback } from "react";
import {
  selectUserRole,
  selectWorkspaceRoleName,
  useAuthStore,
} from "../store/auth.store";
import type { AuthRole, WorkspaceRoleValue } from "../roles";

export function useRole() {
  const role = useAuthStore(selectUserRole);
  const workspaceRoleName = useAuthStore(selectWorkspaceRoleName);

  const hasRole = useCallback((value: AuthRole) => role === value, [role]);
  const isWorkspaceRole = useCallback(
    (value: WorkspaceRoleValue) => workspaceRoleName === value,
    [workspaceRoleName],
  );

  return { role, workspaceRoleName, hasRole, isWorkspaceRole };
}
