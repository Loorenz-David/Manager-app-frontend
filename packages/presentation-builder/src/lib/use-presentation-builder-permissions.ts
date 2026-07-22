import { AuthRole, useRole } from "@beyo/auth";

export function usePresentationBuilderPermissions() {
  const { hasRole } = useRole();
  return {
    canManagePresentations: hasRole(AuthRole.Admin) || hasRole(AuthRole.Manager),
  };
}
