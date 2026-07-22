import { SurfacePropsContext } from "@beyo/ui";
import { useContext } from "react";

import { PresentationPlayer } from "../PresentationPlayer";
import { PlayerModalFrame } from "../components/player/PlayerFrames";
import type { PresentationSurfaceProps } from "./presentation-surface-props";
import { usePresentationSurface } from "./usePresentationSurface";

export function PresentationModalSurface(props: PresentationSurfaceProps): React.JSX.Element {
  const { closeAfter } = usePresentationSurface(props);
  return (
    <PlayerModalFrame>
      <PresentationPlayer
        {...props}
        surfaceType="modal"
        onDismiss={(index) => closeAfter(() => props.onDismiss(index))}
        onComplete={(index) => closeAfter(() => props.onComplete(index))}
      />
    </PlayerModalFrame>
  );
}

export default function PresentationModalSurfaceEntry(): React.JSX.Element {
  const props = useContext(SurfacePropsContext) as PresentationSurfaceProps;
  return <PresentationModalSurface {...props} />;
}
