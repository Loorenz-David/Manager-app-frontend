import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient, setAccessToken, setAuthScope } from "@beyo/api-client";
import { useAuthStore } from "../store/auth.store";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { UserId, WorkspaceId } from "@beyo/lib";

const AuthUISchema = z.object({
  apps: z.array(z.string()),
  pages: z.array(z.string()),
  buttons: z.array(z.string()),
  actions: z.array(z.string()),
  query_filters: z.array(z.string()),
});

const SignInResponseSchema = ApiEnvelopeSchema(
  z.object({
    access_token: z.string(),
    user: z.object({
      client_id: z.string().transform((value) => value as UserId),
      email: z.string(),
      username: z.string(),
      role: z.string(),
      backend_permissions: z.array(z.string()),
      ui: AuthUISchema,
    }),
    workspace_id: z.string().transform((value) => value as WorkspaceId),
  }),
);

type SignInCredentials = {
  email: string;
  password: string;
  appScope: string;
};

async function signIn(credentials: SignInCredentials) {
  const { appScope, ...rest } = credentials;
  setAuthScope(appScope);

  const result = await apiClient.post(
    "/api/v1/auth/sign-in",
    SignInResponseSchema,
    {
      ...rest,
      app_scope: appScope,
    },
  );

  setAccessToken(result.data.access_token);
  useAuthStore.getState().setUser(
    {
      id: result.data.user.client_id,
      email: result.data.user.email,
      username: result.data.user.username,
      role: result.data.user.role,
      backend_permissions: result.data.user.backend_permissions,
      ui: result.data.user.ui,
    },
    result.data.workspace_id,
  );

  return result;
}

export function useSignInMutation() {
  return useMutation({ mutationFn: signIn });
}
