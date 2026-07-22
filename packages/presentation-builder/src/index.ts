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
  createEditorDraftStore,
  mediaElementForAsset,
  replaceBackgroundMediaElement,
  selectedSlideFromState,
  slideHasBackground,
  useEditorDraftStore,
  type EditorDraftState,
  type EditorDraftStore,
} from "./editor/draft-store";
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

// Dev-only kit showcases (mounted by the studio behind import.meta.env.DEV routes)
export { DashboardKitPreview } from "./dev/DashboardKitPreview";
export { EditorKitPreview } from "./dev/EditorKitPreview";
