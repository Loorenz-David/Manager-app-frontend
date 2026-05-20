import { create } from 'zustand';
import type { UserId, WorkspaceId } from '@/types/common';

type AuthUI = {
  apps: string[];
  pages: string[];
  buttons: string[];
  actions: string[];
  query_filters: string[];
};

type AuthUser = {
  id: UserId;
  email: string;
  username: string;
  role: string;
  backend_permissions: string[];
  ui: AuthUI;
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
