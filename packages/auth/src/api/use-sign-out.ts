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

type SignOutOptions = {
  appScope?: AuthAppScope;
  onSignedOut?: () => void;
};

export function useSignOutMutation(options?: SignOutOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options?.appScope === AppScope.Floor ? signOutFloor : signOut,
    onSettled: () => {
      queryClient.clear();
      options?.onSignedOut?.();
    },
  });
}
