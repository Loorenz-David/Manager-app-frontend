import { SurfacePropsContext } from "@beyo/ui";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { PresentationPlayer } from "../PresentationPlayer";
import type { PresentationSurfaceProps } from "./presentation-surface-props";
import { usePresentationSurface } from "./usePresentationSurface";

export function PresentationSlidePageSurface(props: PresentationSurfaceProps): React.JSX.Element {
  const { surface, closeAfter } = usePresentationSurface(props);
  const furthestSlideRef = useRef(0);
  const [seenFullDeck, setSeenFullDeck] = useState(false);

  const dismissFromGesture = useCallback(() => {
    void closeAfter(() => props.onDismiss(furthestSlideRef.current));
  }, [closeAfter, props.onDismiss]);

  const closeFromGesture = useCallback(() => {
    void closeAfter(() => undefined);
  }, [closeAfter]);

  // Slide-to-close is the slide page's dismiss affordance. A non-dismissible deck keeps it
  // locked until the deck has played through once; after that every close is a plain close,
  // because the first loop already recorded `completed` (a later `dismissed` would 409).
  useEffect(() => {
    const lockedUntilSeen = !props.presentation.is_dismissible && !seenFullDeck;
    surface?.setSwipeDismissDisabled(lockedUntilSeen);
    surface?.setCloseInterceptor(
      lockedUntilSeen ? null : seenFullDeck ? closeFromGesture : dismissFromGesture,
    );
    return () => {
      surface?.setCloseInterceptor(null);
      surface?.setSwipeDismissDisabled(false);
    };
  }, [
    closeFromGesture,
    dismissFromGesture,
    props.presentation.is_dismissible,
    seenFullDeck,
    surface,
  ]);

  return (
    <PresentationPlayer
      {...props}
      surfaceType="slide_page"
      onProgress={(index) => {
        furthestSlideRef.current = Math.max(furthestSlideRef.current, index);
        return props.onProgress(index);
      }}
      onDismiss={(index) => closeAfter(() => props.onDismiss(index))}
      onComplete={(index) => {
        setSeenFullDeck(true);
        return props.onComplete(index);
      }}
      onClose={() => closeAfter(() => undefined)}
    />
  );
}

export function PresentationSlidePageSurfaceEntry(): React.JSX.Element {
  const props = useContext(SurfacePropsContext) as PresentationSurfaceProps;
  return <PresentationSlidePageSurface {...props} />;
}
