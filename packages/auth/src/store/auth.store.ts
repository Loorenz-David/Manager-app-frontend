import { create } from 'zustand';
import type { UserId, WorkspaceId } from '@beyo/lib';
import type { AuthAppScope, AuthRole, WorkspaceRoleName } from '../roles';

type AuthUI = {
  apps: string[];
  pages: string[];
  buttons: string[];
  actions: string[];
  query_filters: string[];
};

export type AuthUser = {
  id: UserId;
  email: string;
  username: string;
  role: AuthRole;
  workspaceRoleId: string;
  workspaceRoleName: WorkspaceRoleName;
  appScope: AuthAppScope;
  timeZone: string;
  backend_permissions: string[];
  ui: AuthUI;
  jti: string;
  exp: number;
};

type AuthState = {
  user: AuthUser | null;
  workspaceId: WorkspaceId | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser, workspaceId: WorkspaceId) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspaceId: null,
  isAuthenticated: false,

  setUser: (user, workspaceId) => set({ user, workspaceId, isAuthenticated: true }),
  clearAuth: () => set({ user: null, workspaceId: null, isAuthenticated: false }),
}));

export const selectUser = (state: AuthState) => state.user;
export const selectWorkspaceId = (state: AuthState) => state.workspaceId;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUserRole = (state: AuthState) => state.user?.role ?? null;
export const selectWorkspaceRoleName = (state: AuthState) =>
  state.user?.workspaceRoleName ?? null;
export const selectAppScope = (state: AuthState) => state.user?.appScope ?? null;
export const selectTimeZone = (state: AuthState) => state.user?.timeZone ?? null;
