import { useNavigate } from 'react-router-dom';

import { useSignOutMutation } from '@/features/auth';
import { ROUTES } from '@/lib/routes';

import type { SettingsState } from '../types';

export type SettingsViewController = SettingsState;

export function useSettingsViewController(): SettingsViewController {
  const navigate = useNavigate();
  const { mutate: signOutMutate, isPending } = useSignOutMutation();

  function signOut() {
    signOutMutate(undefined, {
      onSuccess: () => navigate(ROUTES.signIn, { replace: true }),
    });
  }

  return {
    signOut,
    isSigningOut: isPending,
  };
}
