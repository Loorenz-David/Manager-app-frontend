import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient, setAccessToken } from "@beyo/api-client";
import {
  resetNotificationToastTracking,
  unregisterCurrentDevicePush,
} from "@beyo/notifications";
import { AppScope, type AuthAppScope } from "../roles";
import { useAuthStore } from "../store/auth.store";
import { ApiEnvelopeSchema } from "@beyo/lib";

const SignOutResponseSchema = ApiEnvelopeSchema(z.object({}));

async function signOut() {
  await unregisterCurrentDevicePush();
  await apiClient.post("/api/v1/auth/logout", SignOutResponseSchema, {});
  setAccessToken(null);
  resetNotificationToastTracking();
  useAuthStore.getState().clearAuth();
}

async function signOutFloor() {
  try {
    try {
      await unregisterCurrentDevicePush();
    } catch {
      // Push teardown must not prevent the floor logout request.
    }
    await apiClient.post("/api/v1/auth/logout", SignOutResponseSchema, {});
  } finally {
    setAccessToken(null, AppScope.Floor);
    useAuthStore.getState().clearAuth();
    resetNotificationToastTracking();
  }
}

/** What a settings screen shows when a sign-out did not go through. */
export const SIGN_OUT_FAILED_MESSAGE = "Couldn't sign out — try again";

type SignOutOptions = {
  appScope?: AuthAppScope;
  onSignedOut?: () => void;
};

/**
 * Non-floor scopes: only a sign-out the backend confirmed signs the user out
 * locally. When the logout request fails (an outage — the backend keeps the
 * refresh cookie when it cannot revoke it — or any other error) the session
 * is still alive server-side, so nothing pretends otherwise: the token, the
 * auth store and the query cache are kept, `onSignedOut` is not called, and
 * the mutation's error state (`isError`, `error`) tells the caller to show
 * `SIGN_OUT_FAILED_MESSAGE`.
 *
 * Floor: the terminal is shared and its token is not refreshable, so it is
 * always revoked locally (see `signOutFloor`), whatever the backend answered.
 */
export function useSignOutMutation(options?: SignOutOptions) {
  const queryClient = useQueryClient();
  const isFloor = options?.appScope === AppScope.Floor;

  const signedOut = (): void => {
    queryClient.clear();
    options?.onSignedOut?.();
  };

  return useMutation({
    mutationFn: isFloor ? signOutFloor : signOut,
    onSuccess: isFloor ? undefined : signedOut,
    onSettled: isFloor ? signedOut : undefined,
  });
}
