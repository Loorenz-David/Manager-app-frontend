import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  apiClient,
  decodeTokenClaims,
  setAccessToken,
  setAuthScope,
} from "@beyo/api-client";
import { useAuthStore } from "../store/auth.store";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { UserId, WorkspaceId } from "@beyo/lib";
import {
  AppScope,
  AuthRole,
  WorkspaceSpecialization,
  type AuthAppScope,
  type WorkspaceRoleName,
  type WorkspaceSpecializationName,
} from "../roles";

const AuthUISchema = z.object({
  apps: z.array(z.string()).default([]),
  pages: z.array(z.string()).default([]),
  buttons: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
  query_filters: z.array(z.string()).default([]),
});

const AuthRoleSchema = z.enum([
  AuthRole.Admin,
  AuthRole.Manager,
  AuthRole.Worker,
  AuthRole.Seller,
] as const);

const AppScopeSchema = z.enum([
  AppScope.Admin,
  AppScope.Manager,
  AppScope.Worker,
  AppScope.Seller,
] as const);

const WorkspaceSpecializationSchema = z.enum([
  WorkspaceSpecialization.WoodWorker,
  WorkspaceSpecialization.UpholsteryWorker,
  WorkspaceSpecialization.QualityControl,
] as const);

const WorkspaceRoleNameSchema = z
  .union([AuthRoleSchema, WorkspaceSpecializationSchema])
  .nullable();

const SignInResponseSchema = ApiEnvelopeSchema(
  z.object({
    access_token: z.string(),
    user: z.object({
      user_id: z.string().transform((value) => value as UserId),
      email: z.string(),
      username: z.string(),
      workspace_id: z
        .string()
        .transform((value) => value as WorkspaceId)
        .optional(),
      workspace_role_id: z.string().optional(),
      role_name: AuthRoleSchema,
      workspace_role_name: WorkspaceRoleNameSchema.optional(),
      workspace_specialization: WorkspaceSpecializationSchema.nullable().optional(),
      app_scope: AppScopeSchema.optional(),
      time_zone: z.string().optional(),
      backend_permissions: z.array(z.string()),
      ui: AuthUISchema,
    }),
    workspace_id: z
      .string()
      .transform((value) => value as WorkspaceId)
      .optional(),
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
  const claims = decodeTokenClaims();
  const roleName = result.data.user.role_name;
  const workspaceRoleName =
    result.data.user.workspace_role_name ??
    claims?.workspace_role_name ??
    roleName;
  const workspaceSpecialization =
    result.data.user.workspace_specialization ??
    claims?.workspace_specialization ??
    null;
  const workspaceId =
    result.data.workspace_id ??
    result.data.user.workspace_id ??
    (claims?.workspace_id as WorkspaceId | undefined);

  useAuthStore.getState().setUser(
    {
      id: result.data.user.user_id,
      email: result.data.user.email,
      username: result.data.user.username,
      role_name: roleName,
      role: roleName,
      workspaceRoleId:
        result.data.user.workspace_role_id ?? claims?.workspace_role_id ?? "",
      workspaceRoleName: workspaceRoleName as WorkspaceRoleName,
      workspaceSpecialization:
        workspaceSpecialization as WorkspaceSpecializationName,
      appScope:
        result.data.user.app_scope ??
        claims?.app_scope ??
        (appScope as AuthAppScope),
      timeZone: result.data.user.time_zone ?? claims?.time_zone ?? "UTC",
      backend_permissions: result.data.user.backend_permissions,
      ui: result.data.user.ui,
      jti: claims?.jti ?? "",
      exp: claims?.exp ?? 0,
    },
    workspaceId ?? ("" as WorkspaceId),
  );

  return result;
}

export function useSignInMutation() {
  return useMutation({ mutationFn: signIn });
}
