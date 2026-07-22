import { SurfacePropsContext } from "@beyo/ui";
import { useContext } from "react";

import { PresentationPlayer } from "../PresentationPlayer";
import { PlayerFullScreenFrame } from "../components/player/PlayerFrames";
import type { PresentationSurfaceProps } from "./presentation-surface-props";
import { usePresentationSurface } from "./usePresentationSurface";

export function PresentationFullScreenSurface(props: PresentationSurfaceProps): React.JSX.Element {
  const { closeAfter } = usePresentationSurface(props);
  return (
    <PlayerFullScreenFrame>
      <PresentationPlayer
        {...props}
        surfaceType="full_screen"
        onDismiss={(index) => closeAfter(() => props.onDismiss(index))}
        onComplete={(index) => closeAfter(() => props.onComplete(index))}
      />
    </PlayerFullScreenFrame>
  );
}

export default function PresentationFullScreenSurfaceEntry(): React.JSX.Element {
  const props = useContext(SurfacePropsContext) as PresentationSurfaceProps;
  return <PresentationFullScreenSurface {...props} />;
}
