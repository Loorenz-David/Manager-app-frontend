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

export {
  ActivePresentationEnvelopeSchema,
  ConsumerPresentationSchema,
  ConsumerPresentationSlideSchema,
  ConsumerPresentationViewStateSchema,
  PresentationTypeSchema,
  PresentationViewActionSchema,
  PresentationViewStatusSchema,
  RecordedPresentationViewStateSchema,
  ViewStateEnvelopeSchema,
} from "./types";
export type {
  ConsumerPresentation,
  ConsumerPresentationSlide,
  PresentationType,
  PresentationViewAction,
  RecordedPresentationViewState,
  RecordViewStateInput,
} from "./types";
export { activePresentationKeys, getActivePresentation, useActivePresentation } from "./api/active-presentation";
export { recordPresentationViewState, useRecordViewState } from "./actions/useRecordViewState";
export { usePresentationPlayback, type PresentationPlayback } from "./playback/usePresentationPlayback";
export { PresentationPlayer, type PresentationPlayerProps } from "./PresentationPlayer";
export {
  PRESENTATION_FULL_SCREEN_SURFACE_ID,
  PRESENTATION_MODAL_SURFACE_ID,
  PRESENTATION_SLIDE_PAGE_SURFACE_ID,
  preloadPresentationFullScreenSurface,
  preloadPresentationModalSurface,
  preloadPresentationSlidePageSurface,
} from "./surface-ids";
export type { PresentationsSurfaceOpeners } from "./surface-ids";
export { PresentationModalSurface } from "./surfaces/PresentationModalSurface";
export { PresentationFullScreenSurface } from "./surfaces/PresentationFullScreenSurface";
export { PresentationSlidePageSurface } from "./surfaces/PresentationSlidePageSurface";
export type { PresentationSurfaceProps } from "./surfaces/presentation-surface-props";
export { ActivePresentationProvider, type ActivePresentationProviderProps } from "./ActivePresentationProvider";

// Dev-only kit showcase (mounted by the studio behind an import.meta.env.DEV route)
export { PlayerKitPreview } from "./dev/PlayerKitPreview";
