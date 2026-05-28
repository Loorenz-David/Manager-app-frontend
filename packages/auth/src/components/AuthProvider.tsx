import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { PageSkeleton } from "@beyo/ui";
import { apiClient, decodeTokenClaims, initSession } from "@beyo/api-client";
import { useAuthStore } from "../store/auth.store";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { UserId, WorkspaceId } from "@beyo/lib";

const SelfProfileResponseSchema = ApiEnvelopeSchema(
  z.object({
    user: z.object({
      client_id: z.string().transform((value) => value as UserId),
      email: z.string(),
      username: z.string(),
    }),
  }),
);

type AuthProviderProps = {
  children: ReactNode;
  signInRoute: string;
};

export function AuthProvider({
  children,
  signInRoute,
}: AuthProviderProps): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    initSession()
      .then(async (ok) => {
        if (!ok) return;

        const claims = decodeTokenClaims();
        if (!claims) return;

        try {
          const profile = await apiClient.get(
            "/api/v1/users/me",
            SelfProfileResponseSchema,
          );

          setUser(
            {
              id: profile.data.user.client_id,
              email: profile.data.user.email,
              username: profile.data.user.username,
              role: claims.role_name,
              backend_permissions: claims.backend_permissions,
              ui: claims.ui,
            },
            claims.workspace_id as WorkspaceId,
          );
        } catch {
          // /me failed — session will not be restored; user will be redirected to sign-in
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      clearAuth();
      queryClient.clear();
      navigate(signInRoute, { replace: true });
    };

    window.addEventListener("auth:session-expired", handleExpired);
    return () =>
      window.removeEventListener("auth:session-expired", handleExpired);
  }, [clearAuth, queryClient, navigate, signInRoute]);

  if (!ready) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
