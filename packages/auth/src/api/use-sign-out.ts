import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient, setAccessToken } from "@beyo/api-client";
import {
  resetNotificationToastTracking,
  unregisterCurrentDevicePush,
} from "@beyo/notifications";
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

type SignOutOptions = {
  onSignedOut?: () => void;
};

export function useSignOutMutation(options?: SignOutOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      options?.onSignedOut?.();
    },
  });
}
