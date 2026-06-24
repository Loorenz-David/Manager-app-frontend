export { AuthProvider } from './components/AuthProvider';
export { Guard } from './components/Guard';
export { GuestRoute } from './components/GuestRoute';
export { ProtectedRoute } from './components/ProtectedRoute';
export { RequirePermission } from './components/RequirePermission';
export { RoleGuard } from './components/RoleGuard';
export { SignInForm } from './components/SignInForm';
export { AppScope, AuthRole, WorkspaceRole } from './roles';
export { useAuth } from './hooks/use-auth';
export { usePermission } from './hooks/use-permission';
export { usePermissions } from './hooks/use-permissions';
export { useRole } from './hooks/use-role';
export { useSignInMutation } from './api/use-sign-in';
export { useSignOutMutation } from './api/use-sign-out';
export {
  useAuthStore,
  selectUser,
  selectWorkspaceId,
  selectIsAuthenticated,
  selectUserRole,
  selectWorkspaceRoleName,
  selectAppScope,
  selectTimeZone,
} from './store/auth.store';
export { SignInFormSchema } from './types';
export type { AuthUser } from './store/auth.store';
export type { FeaturePermissionMap, PermissionContext } from './permission-types';
export type {
  AuthAppScope,
  WorkspaceRoleName,
  WorkspaceRoleValue,
} from './roles';
export type { SignInFormInput } from './types';
