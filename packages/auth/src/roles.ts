// `as const` objects (NOT TS `enum` — package tsconfig sets erasableSyntaxOnly).
export const AuthRole = {
  Admin: "admin",
  Manager: "manager",
  Worker: "worker",
  Seller: "seller",
} as const;
export type AuthRole = (typeof AuthRole)[keyof typeof AuthRole];

export const AppScope = {
  Admin: "admin",
  Manager: "manager",
  Worker: "worker",
  Seller: "seller",
} as const;
export type AuthAppScope = (typeof AppScope)[keyof typeof AppScope];

// Non-null workspace-role values. `null` = standard system role.
export const WorkspaceRole = {
  WoodWorker: "wood_worker",
} as const;
export type WorkspaceRoleValue =
  (typeof WorkspaceRole)[keyof typeof WorkspaceRole];
export type WorkspaceRoleName = WorkspaceRoleValue | null;
