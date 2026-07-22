import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ActivePresentationProvider,
  activePresentationKeys,
} from "@beyo/presentations";
import { useQueryClient } from "@tanstack/react-query";

import {
  createManagerPresentationSurfaceOpeners,
  isManagerPresentationHome,
  MANAGER_PRESENTATION_APP_KEY,
} from "@/app/presentation-glue";
import { useSurfaceStore } from "@/providers/SurfaceProvider";

const presentationSurfaceOpeners = createManagerPresentationSurfaceOpeners(
  (id, props) => useSurfaceStore.getState().open(id, props),
  (id) => useSurfaceStore.getState().close(id),
);

type PresentationMountProps = {
  children: ReactNode;
};

export function PresentationMount({
  children,
}: PresentationMountProps): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: activePresentationKeys.active(MANAGER_PRESENTATION_APP_KEY),
      });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [queryClient]);

  return (
    <ActivePresentationProvider
      appKey={MANAGER_PRESENTATION_APP_KEY}
      canAutoShow={isManagerPresentationHome(location.pathname)}
      surfaceOpeners={presentationSurfaceOpeners}
      navigate={(route) => navigate(route)}
    >
      {children}
    </ActivePresentationProvider>
  );
}
