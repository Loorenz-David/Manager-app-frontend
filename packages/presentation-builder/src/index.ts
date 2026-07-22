export * from "./types";

export { presentationKeys } from "./api/presentation-keys";
export { usePresentationsList } from "./api/use-presentations-list";
export { usePresentationDetail } from "./api/use-presentation-detail";
export {
  usePresentationPreview,
  type PresentationPreviewOptions,
} from "./api/use-presentation-preview";

export { useCreatePresentation } from "./actions/use-create-presentation";
export { useUpdatePresentationMetadata } from "./actions/use-update-presentation-metadata";
export { usePublishPresentation } from "./actions/use-publish-presentation";
export { useArchivePresentation } from "./actions/use-archive-presentation";
export { useCreateNewVersion } from "./actions/use-create-new-version";
export { useAddSlide } from "./actions/use-add-slide";
export { useUpdateSlide } from "./actions/use-update-slide";
export { useDeleteSlide } from "./actions/use-delete-slide";
export { useReorderSlides } from "./actions/use-reorder-slides";
export { useUploadSlideMedia } from "./actions/use-upload-slide-media";
export { useUpdateSlideMedia } from "./actions/use-update-slide-media";
export { useDeleteSlideMedia } from "./actions/use-delete-slide-media";
export { useReorderSlideMedia } from "./actions/use-reorder-slide-media";
export { useReplaceComposition } from "./actions/use-replace-composition";
export { useReplaceAudience } from "./actions/use-replace-audience";

export { usePresentationBuilderPermissions } from "./lib/use-presentation-builder-permissions";

export { DashboardView, type DashboardViewProps } from "./views/DashboardView";
export { EditorView, type EditorViewProps } from "./views/EditorView";
export {
  appendOverlayMediaElement,
  compositionElementId,
  createEditorDraftStore,
  mediaElementForAsset,
  replaceBackgroundMediaElement,
  selectedSlideFromState,
  slideHasBackground,
  useEditorDraftStore,
  type EditorDraftState,
  type EditorDraftStore,
} from "./editor/draft-store";
export {
  editorAnimationToWire,
  editorCompositionToPutBody,
  putElementToServerElement,
  serverElementsToEditorComposition,
  wireAnimationToEditor,
  type CompositionPutBody,
  type EditorAnimationChoice,
  type EditorComposition,
  type EditorCompositionElement,
  type EditorMediaElement,
  type EditorTextElement,
  type TextMeasurementAdapter,
} from "./lib/composition-mapping";
export {
  applyTimelineGesture,
  clampCanvasPosition,
  clampWindowToDuration,
  generateTimelineTicks,
  MIN_TIMELINE_WINDOW_MS,
  scrubFractionToTime,
  timelineWindowFractions,
  timeToX,
  xToTime,
  type CanvasPosition,
  type TimelineWindow,
} from "./lib/timeline-geometry";
export { usePresentationEditorController } from "./controllers/use-presentation-editor.controller";

// Dashboard UI kit (presentational, props-only — see master plan "Division of labor")
export { DashboardTopBar } from "./components/dashboard/DashboardTopBar";
export { DashboardFilterRow } from "./components/dashboard/DashboardFilterRow";
export { AnnouncementCardGrid } from "./components/dashboard/AnnouncementCardGrid";
export { AnnouncementCard } from "./components/dashboard/AnnouncementCard";
export { NewAnnouncementCard } from "./components/dashboard/NewAnnouncementCard";
export { AnnouncementStatusPill } from "./components/dashboard/AnnouncementStatusPill";
export { MiniPhoneCover } from "./components/dashboard/MiniPhoneCover";
export { DashboardSkeletonGrid } from "./components/dashboard/DashboardSkeletonGrid";
export { DashboardEmptyState } from "./components/dashboard/DashboardEmptyState";
export { DashboardErrorState } from "./components/dashboard/DashboardErrorState";
export {
  DASHBOARD_FILTERS,
  type AnnouncementCardData,
  type AnnouncementDisplayStatus,
  type AnnouncementMediaKind,
  type DashboardFilterKey,
} from "./components/dashboard/types";

// Editor UI kit (presentational, props-only — see master plan "Division of labor")
export { EditorShell } from "./components/editor/EditorShell";
export { EditorTopBar } from "./components/editor/EditorTopBar";
export { EditorReadOnlyBanner } from "./components/editor/EditorReadOnlyBanner";
export { SlideRail } from "./components/editor/SlideRail";
export { SlideRailCard } from "./components/editor/SlideRailCard";
export { EditorCanvas } from "./components/editor/EditorCanvas";
export { MediaUploadOverlay } from "./components/editor/MediaUploadOverlay";
export { type SlideRailItemData } from "./components/editor/types";

// Timeline & panels UI kit (presentational, props-only — see master plan "Division of labor")
export { TimelineDock } from "./components/timeline/TimelineDock";
export { TimelineControls } from "./components/timeline/TimelineControls";
export { TimelineRuler } from "./components/timeline/TimelineRuler";
export { TimelineTrack } from "./components/timeline/TimelineTrack";
export { TimelineBar } from "./components/timeline/TimelineBar";
export {
  TIMELINE_LABEL_GUTTER_PX,
  type TimelineBarGesture,
  type TimelineBarGestureKind,
} from "./components/timeline/types";
export { CanvasDraggableBox } from "./components/editor/CanvasDraggableBox";
export { TextBlockPanel, type TextAnimationChoice } from "./components/panels/TextBlockPanel";
export { MediaElementPanel, type MediaFitChoice } from "./components/panels/MediaElementPanel";
export { SlidePropertiesPanel } from "./components/panels/SlidePropertiesPanel";
export {
  PanelDeleteButton,
  PanelFieldLabel,
  PanelHeading,
  PanelHint,
  PanelSection,
  PanelSlider,
  SegmentedControl,
} from "./components/panels/PanelPrimitives";

// Preview & publish UI kit (presentational, props-only — see master plan "Division of labor")
export { PreviewOverlay } from "./components/preview/PreviewOverlay";
export {
  PublishDialogShell,
  PublishDialogSection,
} from "./components/publish/PublishDialogShell";
export { ChipCheckboxGroup } from "./components/publish/ChipCheckboxGroup";
export { UserPickerList, type UserPickerOption } from "./components/publish/UserPickerList";
export {
  PublishSettingsFields,
  type PublishCategoryChoice,
  type PublishTypeChoice,
} from "./components/publish/PublishSettingsFields";
export { SchedulePickers } from "./components/publish/SchedulePickers";
export { PublishErrorSummary } from "./components/publish/PublishErrorSummary";

// Dev-only kit showcases (mounted by the studio behind import.meta.env.DEV routes)
export { DashboardKitPreview } from "./dev/DashboardKitPreview";
export { EditorKitPreview } from "./dev/EditorKitPreview";
export { TimelineKitPreview } from "./dev/TimelineKitPreview";
export { PublishKitPreview } from "./dev/PublishKitPreview";
