import { SurfaceHeaderContext } from "@beyo/ui";
import { useCallback, useContext, useEffect } from "react";

import type { PresentationSurfaceProps } from "./presentation-surface-props";

export function usePresentationSurface(props: PresentationSurfaceProps) {
  const surface = useContext(SurfaceHeaderContext);

  useEffect(() => {
    surface?.setHeaderHidden(true);
    return () => surface?.setHeaderHidden(false);
  }, [surface]);

  const closeAfter = useCallback(
    async (action: () => void | Promise<void>) => {
      let actionPromise: Promise<void>;
      try {
        actionPromise = Promise.resolve(action());
      } catch (error) {
        actionPromise = Promise.reject(error);
      }
      // Start the state write first, then close immediately; network failure/retry never traps the user.
      (surface?.requestClose ?? props.onRequestClose)?.();
      try {
        await actionPromise;
      } finally {
        await props.onClosed();
      }
    },
    [props.onClosed, props.onRequestClose, surface],
  );

  return { surface, closeAfter };
}
