import { SurfacePropsContext } from "@beyo/ui";
import { useCallback, useContext, useEffect, useRef } from "react";

import { PresentationPlayer } from "../PresentationPlayer";
import type { PresentationSurfaceProps } from "./presentation-surface-props";
import { usePresentationSurface } from "./usePresentationSurface";

export function PresentationSlidePageSurface(props: PresentationSurfaceProps): React.JSX.Element {
  const { surface, closeAfter } = usePresentationSurface(props);
  const furthestSlideRef = useRef(0);

  const dismissFromGesture = useCallback(() => {
    void closeAfter(() => props.onDismiss(furthestSlideRef.current));
  }, [closeAfter, props.onDismiss]);

  useEffect(() => {
    const nonDismissible = !props.presentation.is_dismissible;
    surface?.setSwipeDismissDisabled(nonDismissible);
    surface?.setCloseInterceptor(nonDismissible ? null : dismissFromGesture);
    return () => {
      surface?.setCloseInterceptor(null);
      surface?.setSwipeDismissDisabled(false);
    };
  }, [dismissFromGesture, props.presentation.is_dismissible, surface]);

  return (
    <PresentationPlayer
      {...props}
      surfaceType="slide_page"
      onProgress={(index) => {
        furthestSlideRef.current = Math.max(furthestSlideRef.current, index);
        return props.onProgress(index);
      }}
      onDismiss={(index) => closeAfter(() => props.onDismiss(index))}
      onComplete={(index) => closeAfter(() => props.onComplete(index))}
    />
  );
}

export function PresentationSlidePageSurfaceEntry(): React.JSX.Element {
  const props = useContext(SurfacePropsContext) as PresentationSurfaceProps;
  return <PresentationSlidePageSurface {...props} />;
}
