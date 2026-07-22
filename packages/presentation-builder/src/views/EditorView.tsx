import { useRef } from "react";

import {
  SlideCompositionRenderer,
  type CompositionElement,
} from "@beyo/presentation-runtime";

import { EditorCanvas } from "../components/editor/EditorCanvas";
import { EditorReadOnlyBanner } from "../components/editor/EditorReadOnlyBanner";
import { EditorShell } from "../components/editor/EditorShell";
import { EditorTopBar } from "../components/editor/EditorTopBar";
import { MediaUploadOverlay } from "../components/editor/MediaUploadOverlay";
import { SlideRail } from "../components/editor/SlideRail";
import type { SlideRailItemData } from "../components/editor/types";
import { usePresentationEditorController } from "../controllers/use-presentation-editor.controller";
import { slideHasBackground } from "../editor/draft-store";

export type EditorViewProps = {
  presentationId: string;
  onBack: () => void;
};

function renderSlide(elements: readonly CompositionElement[], width: number, height: number) {
  return (
    <SlideCompositionRenderer
      elements={elements}
      timeMs={0}
      containerWidth={width}
      containerHeight={height}
      className="h-full w-full"
    />
  );
}

export function EditorView({ presentationId, onBack }: EditorViewProps): React.JSX.Element {
  const controller = usePresentationEditorController(presentationId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRoleRef = useRef<"background" | "overlay">("background");

  if (controller.isLoading && !controller.presentation) {
    return <div data-testid="presentation-editor-loading" className="p-8 text-sm text-[#767676]">Loading editor…</div>;
  }

  if (controller.error && !controller.presentation) {
    return (
      <div data-testid="presentation-editor-error" className="p-8 text-sm text-[#c05a5a]">
        {controller.error.message}
      </div>
    );
  }

  const presentation = controller.presentation;
  if (!presentation) return <div data-testid="presentation-editor-empty" />;

  const railSlides: SlideRailItemData[] = presentation.slides.map((slide) => {
    const elements = controller.localCompositions[slide.client_id] ?? slide.elements;
    const mediaKind = slide.media[0]?.media_type;
    const textCount = elements.filter((element) => element.element_type === "text").length;
    return {
      id: slide.client_id,
      mediaLabel: mediaKind === "image" ? "IMAGE" : mediaKind === "video" ? "VIDEO" : null,
      textCountLabel: `${textCount} ${textCount === 1 ? "text" : "texts"}`,
      thumbnail: renderSlide(elements, 58, 104),
    };
  });
  const selectedElements = controller.selectedSlide
    ? controller.localCompositions[controller.selectedSlide.client_id] ?? controller.selectedSlide.elements
    : [];
  const placeholderKind = controller.selectedSlide?.media[0]?.media_type === "video" ? "VIDEO" : "IMAGE";
  const canUpload = !controller.readOnly && !controller.isMutating;

  const openFilePicker = (role: "background" | "overlay") => {
    uploadRoleRef.current = role;
    fileInputRef.current?.click();
  };

  return (
    <EditorShell
      topBar={
        <EditorTopBar
          title={controller.title}
          onTitleChange={controller.onTitleChange}
          onTitleCommit={controller.onTitleCommit}
          titleReadOnly={controller.readOnly}
          status={presentation.status}
          onBack={onBack}
          onPreview={() => undefined}
          previewDisabled
          onSaveDraft={() => undefined}
          saveDraftDisabled
          saveDraftLabel={controller.dirty ? "Composition local" : "Saved"}
          onPublish={() => undefined}
          publishDisabled
        />
      }
      banner={
        controller.readOnly ? (
          <EditorReadOnlyBanner
            label={`${presentation.status === "published" ? "Published" : "Archived"} — read-only · v${presentation.version}`}
          />
        ) : undefined
      }
      rail={
        <SlideRail
          slides={railSlides}
          selectedSlideId={controller.selectedSlideId}
          onSelectSlide={controller.onSelectSlide}
          onAddSlide={controller.onAddSlide}
          addDisabled={!canUpload}
          onDeleteSlide={controller.onDeleteSlide}
          deleteDisabled={presentation.slides.length <= 1 || !canUpload}
          onReorder={controller.onReorder}
          readOnly={controller.readOnly}
        />
      }
    >
      <div className="relative flex min-h-0 flex-1">
        <EditorCanvas
          onUploadClick={() => openFilePicker(slideHasBackground(selectedElements) ? "overlay" : "background")}
          onFilesDropped={controller.onFilesDropped}
          uploadDisabled={!canUpload}
          placeholderKind={placeholderKind}
        >
          {selectedElements.length > 0 ? renderSlide(selectedElements, 264, 470) : undefined}
        </EditorCanvas>
        {controller.uploadState && (
          <MediaUploadOverlay
            progress={controller.uploadProgress}
            fileName={controller.uploadState.fileName}
            onCancel={controller.cancelUpload}
            errorMessage={controller.uploadState.errorMessage}
            onRetry={controller.retryUpload}
            onDismissError={controller.dismissUploadError}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="hidden"
          data-testid="presentation-editor-media-file-input"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void controller.onUploadFile(file, uploadRoleRef.current);
          }}
        />
      </div>
    </EditorShell>
  );
}
