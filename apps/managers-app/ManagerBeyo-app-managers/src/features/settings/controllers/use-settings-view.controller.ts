import { useNavigate } from "react-router-dom";
import { usePushSubscription } from "@beyo/notifications";

import { useSignOutMutation } from "@beyo/auth";
import { ROUTES } from "@/lib/routes";

import type { SettingsState } from "../types";

export type SettingsViewController = SettingsState;

export function useSettingsViewController(): SettingsViewController {
  const navigate = useNavigate();
  const { mutate: signOutMutate, isPending } = useSignOutMutation();
  const {
    status: pushStatus,
    enable: enablePush,
    disable: disablePush,
    isLoading: isPushLoading,
  } = usePushSubscription();

  function signOut() {
    signOutMutate(undefined, {
      onSuccess: () => navigate(ROUTES.signIn, { replace: true }),
    });
  }

  return {
    signOut,
    isSigningOut: isPending,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
  };
}
