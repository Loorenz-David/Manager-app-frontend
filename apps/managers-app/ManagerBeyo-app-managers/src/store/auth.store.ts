import { create } from 'zustand';
import type { UserId } from '@/types/common';

type AuthState = {
  isAuthenticated: boolean;
  userId: UserId | null;
  token: string | null;
  signIn: (userId: UserId, token: string) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  token: null,

  signIn: (userId, token) => set({ isAuthenticated: true, userId, token }),
  signOut: () => set({ isAuthenticated: false, userId: null, token: null }),
}));

export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
