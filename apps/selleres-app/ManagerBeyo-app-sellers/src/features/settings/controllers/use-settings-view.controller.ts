import { useNavigate } from "react-router-dom";
import { usePushSubscription } from "@beyo/notifications";

import { SIGN_OUT_FAILED_MESSAGE, useSignOutMutation } from "@beyo/auth";
import { ROUTES } from "@/lib/routes";

import type { SettingsState } from "../types";

export type SettingsViewController = SettingsState;

export function useSettingsViewController(): SettingsViewController {
  const navigate = useNavigate();
  const {
    mutate: signOutMutate,
    isPending,
    isError: signOutFailed,
  } = useSignOutMutation();
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
    signOutError: signOutFailed ? SIGN_OUT_FAILED_MESSAGE : null,
    pushStatus,
    isPushLoading,
    enablePush,
    disablePush,
  };
}
