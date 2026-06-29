// Capability layer registry — dormant until the backend populates backend_permissions.
// The specialization layer (`useRole().workspaceSpecialization`) selects worker interfaces today.
import type { FeaturePermissionMap } from "@beyo/auth";

export const permissionRegistry = {} as const satisfies Record<
  string,
  FeaturePermissionMap
>;

type PermissionRegistry = typeof permissionRegistry;
export type PermissionKey = PermissionRegistry extends Record<string, never>
  ? never
  : {
      [Feature in keyof PermissionRegistry]: PermissionRegistry[Feature][keyof PermissionRegistry[Feature]];
    }[keyof PermissionRegistry];
