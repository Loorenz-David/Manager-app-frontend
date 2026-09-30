import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { PageSkeleton } from "@beyo/ui";
import {
  apiClient,
  decodeTokenClaims,
  initSession,
  type RefreshOutcome,
} from "@beyo/api-client";
import { useAuthStore } from "../store/auth.store";
import { ApiEnvelopeSchema } from "@beyo/lib";
import type { UserId, WorkspaceId } from "@beyo/lib";
import { AuthRole, type AuthAppScope, type WorkspaceRoleName } from "../roles";

const SelfProfileResponseSchema = ApiEnvelopeSchema(
  z.object({
    user: z.object({
      client_id: z.string().transform((value) => value as UserId),
      email: z.string(),
      username: z.string(),
    }),
  }),
);

/**
 * While the session cannot be checked (`initSession` answered
 * `'unavailable'`), the provider keeps its loading state — no sign-out, no
 * redirect — and asks again after these delays (the last one repeats).
 */
const SESSION_RESTORE_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000] as const;

function sessionRestoreRetryDelay(attempt: number): number {
  const delays = SESSION_RESTORE_RETRY_DELAYS_MS;
  return delays[Math.min(attempt, delays.length - 1)];
}

type AuthProviderProps = {
  children: ReactNode;
  signInRoute: string;
  appScope: AuthAppScope;
  onSessionExpired?: () => void;
};

export function AuthProvider({
  children,
  signInRoute,
  appScope,
  onSessionExpired,
}: AuthProviderProps): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const loadSignedInUser = async (): Promise<void> => {
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
            role_name: claims.role_name,
            role: claims.role_name,
            workspaceRoleId: claims.workspace_role_id,
            workspaceName: claims.workspace_name,
            workspaceRoleName:
              (claims.workspace_role_name as WorkspaceRoleName | undefined) ??
              claims.role_name,
            workspaceSpecialization:
              (claims.workspace_specialization ??
                (claims.workspace_role_name === AuthRole.Admin ||
                claims.workspace_role_name === AuthRole.Manager ||
                claims.workspace_role_name === AuthRole.Worker ||
                claims.workspace_role_name === AuthRole.Seller
                  ? null
                  : claims.workspace_role_name)) ??
              null,
            appScope: claims.app_scope ?? (appScope as AuthAppScope),
            timeZone: claims.time_zone ?? "UTC",
            backend_permissions: claims.backend_permissions ?? [],
            ui: claims.ui ?? {
              apps: [],
              pages: [],
              buttons: [],
              actions: [],
              query_filters: [],
            },
            jti: claims.jti ?? "",
            exp: claims.exp ?? 0,
          },
          claims.workspace_id as WorkspaceId,
        );
      } catch {
        // /me failed — session will not be restored; user will be redirected to sign-in
      }
    };

    const restoreSession = async (): Promise<void> => {
      let outcome: RefreshOutcome;
      try {
        // The first attempt is the page opening (`user` while visible, the
        // `initSession` default); a timed retry is nobody's doing.
        outcome = await initSession(
          appScope,
          attempt === 0 ? {} : { activity: "background" },
        );
      } catch {
        outcome = "invalid";
      }
      if (cancelled) return;

      if (outcome === "unavailable") {
        // The session could not be checked and may still be valid: keep the
        // stored auth and stay in the loading state (finishing unauthenticated
        // would redirect to sign-in), then ask again.
        retryTimer = setTimeout(() => {
          void restoreSession();
        }, sessionRestoreRetryDelay(attempt));
        attempt += 1;
        return;
      }

      try {
        if (outcome === "ok") await loadSignedInUser();
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
    };
  }, [appScope]);

  useEffect(() => {
    const handleExpired = () => {
      onSessionExpired?.();
      clearAuth();
      queryClient.clear();
      navigate(signInRoute, { replace: true });
    };

    window.addEventListener("auth:session-expired", handleExpired);
    return () =>
      window.removeEventListener("auth:session-expired", handleExpired);
  }, [clearAuth, queryClient, navigate, onSessionExpired, signInRoute]);

  if (!ready) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
