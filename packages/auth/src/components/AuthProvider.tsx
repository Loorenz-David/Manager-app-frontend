import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { PageSkeleton } from "@beyo/ui";
import {
  apiClient,
  ApiRequestError,
  decodeTokenClaims,
  initSession,
  SYSTEM_UNAVAILABLE_EVENT,
  UNAVAILABLE_ERROR_CODE,
  visibleDocumentActivity,
  type RefreshOutcome,
  type RequestActivity,
  type SystemUnavailableDetail,
} from "@beyo/api-client";
import { getSystemState, subscribeSystemState } from "@beyo/system-control";
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

const SELF_PROFILE_PATH = "/api/v1/users/me";
const REFRESH_PATH = "/api/v1/auth/refresh";

/**
 * Safety net of the "wait for READY" retry below, not its driver. The retry
 * normally runs when the system gate returns to READY; this timer covers the
 * two cases in which no such transition comes:
 *
 * - the gate never leaves READY: its status check may be answered while
 *   another request's success marks the backend as recovered, so the gate
 *   stays READY without publishing a change;
 * - no gate is mounted (the state stays BOOT), e.g. a host or a test that
 *   renders the provider on its own.
 *
 * It fires a `background` retry only while the gate is READY (or absent);
 * while the system sleeps or starts it re-arms instead of calling a backend
 * that is known to be down.
 */
const SESSION_RESTORE_FALLBACK_MS = 30_000;

/**
 * Calls `onReady` once the page's system gate is READY again after having
 * left READY (an outage the gate noticed and got over), or — see
 * `SESSION_RESTORE_FALLBACK_MS` — when the fallback timer finds it READY or
 * absent. Returns the canceller.
 */
function waitForSystemReady(onReady: () => void): () => void {
  let settled = false;
  let leftReady = getSystemState().state !== "READY";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = (): void => {
    settled = true;
    unsubscribe();
    if (timer !== undefined) clearTimeout(timer);
  };
  const finish = (): void => {
    if (settled) return;
    stop();
    onReady();
  };
  const unsubscribe = subscribeSystemState((snapshot) => {
    if (snapshot.state !== "READY") {
      leftReady = true;
    } else if (leftReady) {
      finish();
    }
  });
  const arm = (): void => {
    timer = setTimeout(() => {
      const { state } = getSystemState();
      if (state === "READY" || state === "BOOT") finish();
      else arm();
    }, SESSION_RESTORE_FALLBACK_MS);
  };
  arm();

  return () => {
    if (!settled) stop();
  };
}

/**
 * The session refresh is a raw fetch (not the api-client), so its outage is
 * not reported by the api-client: report it here, so the gate checks
 * `/system/status` (and wakes the system when a person opened the page).
 * `initSession` does not expose the HTTP status: `status` is 0.
 */
function reportSessionCheckUnavailable(activity: RequestActivity): void {
  window.dispatchEvent(
    new CustomEvent<SystemUnavailableDetail>(SYSTEM_UNAVAILABLE_EVENT, {
      detail: {
        status: 0,
        path: REFRESH_PATH,
        background: activity === "background",
      },
    }),
  );
}

function isUnavailableError(error: unknown): boolean {
  return (
    error instanceof ApiRequestError && error.code === UNAVAILABLE_ERROR_CODE
  );
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
    let attempt = 0;
    let cancelWait: (() => void) | null = null;

    /**
     * "signed-out" covers the 401 (the api-client already cleared the token
     * and announced `auth:session-expired`) and every other non-outage
     * failure; "unavailable" is an outage: the stored session is kept.
     */
    const loadSignedInUser = async (
      activity: RequestActivity,
    ): Promise<"loaded" | "signed-out" | "unavailable"> => {
      const claims = decodeTokenClaims();
      if (!claims) return "signed-out";

      let profile: z.infer<typeof SelfProfileResponseSchema>;
      try {
        profile = await apiClient.get(
          SELF_PROFILE_PATH,
          SelfProfileResponseSchema,
          undefined,
          { activity },
        );
      } catch (error) {
        return isUnavailableError(error) ? "unavailable" : "signed-out";
      }

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
      return "loaded";
    };

    /**
     * An outage: stay on the loading state (finishing unauthenticated would
     * redirect to sign-in; nothing is cleared) and try again once the system
     * gate is READY again.
     */
    const retryWhenSystemReady = (): void => {
      cancelWait = waitForSystemReady(() => {
        cancelWait = null;
        if (!cancelled) void restoreSession();
      });
    };

    const restoreSession = async (): Promise<void> => {
      // The first attempt is the page opening (`user` while visible, like
      // `initSession`'s default); a retry is nobody's doing.
      const activity: RequestActivity =
        attempt === 0 ? visibleDocumentActivity() : "background";
      attempt += 1;

      let outcome: RefreshOutcome;
      try {
        outcome = await initSession(appScope, { activity });
      } catch {
        outcome = "invalid";
      }
      if (cancelled) return;

      if (outcome === "unavailable") {
        reportSessionCheckUnavailable(activity);
        retryWhenSystemReady();
        return;
      }

      if (outcome === "ok") {
        let loaded: Awaited<ReturnType<typeof loadSignedInUser>>;
        try {
          loaded = await loadSignedInUser(activity);
        } catch {
          loaded = "signed-out";
        }
        if (cancelled) return;
        if (loaded === "unavailable") {
          // The api-client has already reported this outage to the gate.
          retryWhenSystemReady();
          return;
        }
      }

      setReady(true);
    };

    void restoreSession();

    return () => {
      cancelled = true;
      cancelWait?.();
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
