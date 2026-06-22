import type { CelebrationVariant } from "../types";
import { ConfettiRenderer } from "./renderers/ConfettiRenderer";

type AnimationRendererProps = {
  variant: CelebrationVariant;
};

export function AnimationRenderer({
  variant,
}: AnimationRendererProps): React.JSX.Element | null {
  switch (variant.type) {
    case "confetti":
      return <ConfettiRenderer intensity={variant.intensity} />;
    case "none":
      return null;
    default:
      return null;
  }
}
