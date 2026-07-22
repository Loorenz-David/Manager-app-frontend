// Player chrome UI kit (presentational, props-only — see master plan "Division of labor")
export { PlayerViewport } from "./components/player/PlayerViewport";
export { PlayerSegmentedProgress } from "./components/player/PlayerSegmentedProgress";
export {
  PlayerAcknowledgeFooter,
  PlayerCtaButton,
  PlayerDismissButton,
  PlayerTapZones,
} from "./components/player/PlayerAffordances";
export { PlayerFullScreenFrame, PlayerModalFrame } from "./components/player/PlayerFrames";

// Dev-only kit showcase (mounted by the studio behind an import.meta.env.DEV route)
export { PlayerKitPreview } from "./dev/PlayerKitPreview";
