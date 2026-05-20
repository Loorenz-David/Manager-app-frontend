import { useSignOutMutation } from '@/features/auth/api/use-sign-out';
import {
  selectIsAuthenticated,
  selectUser,
  selectWorkspaceId,
  useAuthStore,
} from '@/store/auth.store';

export function useAuth() {
  const user = useAuthStore(selectUser);
  const workspaceId = useAuthStore(selectWorkspaceId);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { mutate: signOut, isPending: isSigningOut } = useSignOutMutation();

  return { user, workspaceId, isAuthenticated, signOut, isSigningOut };
}
