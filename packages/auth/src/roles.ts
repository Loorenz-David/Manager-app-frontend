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

export const WorkspaceSpecialization = {
  WoodWorker: "wood_worker",
  UpholsteryWorker: "upholstery_worker",
  QualityControl: "quality_control",
} as const;
export type WorkspaceSpecialization =
  (typeof WorkspaceSpecialization)[keyof typeof WorkspaceSpecialization];
export type WorkspaceSpecializationName = WorkspaceSpecialization | null;

// Compatibility/display value returned by the backend. It is not authoritative
// for permission or scope decisions.
export type WorkspaceRoleName = AuthRole | WorkspaceSpecialization | null;

// Deprecated compatibility aliases. Prefer WorkspaceSpecialization.
export const WorkspaceRole = WorkspaceSpecialization;
export type WorkspaceRoleValue = WorkspaceSpecialization;
