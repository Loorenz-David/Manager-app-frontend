import { Outlet } from "react-router-dom";
import { PwaProvider, type PwaSurfaceOpeners } from "@beyo/pwa";
import { AuthProvider } from "@/features/auth";
import {
  PWA_INSTALL_SURFACE_ID,
  PWA_UPDATE_SURFACE_ID,
} from "@/features/pwa/surfaces";
import { SurfaceProvider, useSurfaceStore } from "@/providers/SurfaceProvider";

const pwaSurfaceOpeners: PwaSurfaceOpeners = {
  openUpdatePrompt: (props) =>
    useSurfaceStore.getState().open(PWA_UPDATE_SURFACE_ID, props),
  openInstallPrompt: (props) =>
    useSurfaceStore.getState().open(PWA_INSTALL_SURFACE_ID, props),
  closeInstallPrompt: () =>
    useSurfaceStore.getState().close(PWA_INSTALL_SURFACE_ID),
};

export function RootRoute(): React.JSX.Element {
  return (
    <SurfaceProvider>
      <PwaProvider surfaceOpeners={pwaSurfaceOpeners}>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </PwaProvider>
    </SurfaceProvider>
  );
}
