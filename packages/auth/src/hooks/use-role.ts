import { useCallback } from "react";
import {
  selectUserRole,
  selectWorkspaceSpecialization,
  selectWorkspaceRoleName,
  useAuthStore,
} from "../store/auth.store";
import {
  AuthRole,
  type WorkspaceRoleValue,
  type WorkspaceSpecialization,
} from "../roles";

type RoleUser = {
  role_name?: AuthRole | null;
  role?: AuthRole | null;
  workspaceSpecialization?: WorkspaceSpecialization | null;
};

const getUserRole = (user: RoleUser | null | undefined) =>
  user?.role_name ?? user?.role ?? null;

export const isAdmin = (user: RoleUser | null | undefined): boolean =>
  getUserRole(user) === AuthRole.Admin;

export const isManager = (user: RoleUser | null | undefined): boolean =>
  getUserRole(user) === AuthRole.Manager;

export const isWorker = (user: RoleUser | null | undefined): boolean =>
  getUserRole(user) === AuthRole.Worker;

export const isSeller = (user: RoleUser | null | undefined): boolean =>
  getUserRole(user) === AuthRole.Seller;

export const hasWorkspaceSpecialization = (
  user: RoleUser | null | undefined,
  value: WorkspaceSpecialization,
): boolean => user?.workspaceSpecialization === value;

export function useRole() {
  const role = useAuthStore(selectUserRole);
  const workspaceRoleName = useAuthStore(selectWorkspaceRoleName);
  const workspaceSpecialization = useAuthStore(selectWorkspaceSpecialization);

  const hasRole = useCallback((value: AuthRole) => role === value, [role]);
  const hasSpecialization = useCallback(
    (value: WorkspaceSpecialization) => workspaceSpecialization === value,
    [workspaceSpecialization],
  );
  const isWorkspaceRole = useCallback(
    (value: WorkspaceRoleValue) => workspaceSpecialization === value,
    [workspaceSpecialization],
  );

  return {
    role,
    workspaceRoleName,
    workspaceSpecialization,
    hasRole,
    hasSpecialization,
    isWorkspaceRole,
  };
}
