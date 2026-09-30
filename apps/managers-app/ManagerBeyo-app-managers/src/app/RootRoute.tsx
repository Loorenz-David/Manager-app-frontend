import { Outlet } from "react-router-dom";
import { PwaProvider, type PwaSurfaceOpeners } from "@beyo/pwa";
import { RealtimeProvider } from "@beyo/realtime";
import {
  AuthProvider,
  selectIsAuthenticated,
  useAuthStore,
} from "@beyo/auth";
import { NotificationDeepLinkMount } from "@/app/NotificationDeepLinkMount";
import { NotificationRealtimeMount } from "@/app/NotificationRealtimeMount";
import { PushMount } from "@/app/PushMount";
import { socketRegistry } from "@/app/socket-registry";
import {
  PWA_INSTALL_SURFACE_ID,
  PWA_UPDATE_SURFACE_ID,
} from "@/features/pwa/surfaces";
import { ROUTES } from "@/lib/routes";
import { SurfaceProvider, useSurfaceStore } from "@/providers/SurfaceProvider";

const pwaSurfaceOpeners: PwaSurfaceOpeners = {
  openUpdatePrompt: (props) =>
    useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, props),
  openInstallPrompt: (props) =>
    useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, props),
  closeInstallPrompt: () =>
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID),
};

/**
 * Notification toasts (realtime) and the push subscription talk to the
 * backend as the signed-in user: they mount only once a session is restored,
 * never on the sign-in page or while the session check waits for an outage
 * to end.
 */
function SignedInMounts(): React.JSX.Element | null {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  if (!isAuthenticated) return null;
  return (
    <>
      <NotificationRealtimeMount />
      <PushMount />
    </>
  );
}

export function RootRoute(): React.JSX.Element {
  return (
    <RealtimeProvider registry={socketRegistry}>
      <SurfaceProvider>
        <PwaProvider surfaceOpeners={pwaSurfaceOpeners}>
          <AuthProvider appScope="manager" signInRoute={ROUTES.signIn}>
            <SignedInMounts />
            <NotificationDeepLinkMount />
            <Outlet />
          </AuthProvider>
        </PwaProvider>
      </SurfaceProvider>
    </RealtimeProvider>
  );
}
