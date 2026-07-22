import { memo, useMemo, useRef } from "react";

import {
  REFERENCE_CANVAS_WIDTH,
  SlideCompositionRenderer,
  usePlaybackClock,
  type CompositionElement,
  type ElementAnimation,
} from "@beyo/presentation-runtime";

import { CanvasDraggableBox } from "../components/editor/CanvasDraggableBox";
import { EditorCanvas } from "../components/editor/EditorCanvas";
import { EditorReadOnlyBanner } from "../components/editor/EditorReadOnlyBanner";
import { EditorShell } from "../components/editor/EditorShell";
import { EditorTopBar } from "../components/editor/EditorTopBar";
import { MediaUploadOverlay } from "../components/editor/MediaUploadOverlay";
import { SlideRail } from "../components/editor/SlideRail";
import type { SlideRailItemData } from "../components/editor/types";
import { MediaElementPanel, type MediaFitChoice } from "../components/panels/MediaElementPanel";
import { SlidePropertiesPanel } from "../components/panels/SlidePropertiesPanel";
import { TextBlockPanel, type TextAnimationChoice } from "../components/panels/TextBlockPanel";
import { TimelineBar } from "../components/timeline/TimelineBar";
import { TimelineControls } from "../components/timeline/TimelineControls";
import { TimelineDock } from "../components/timeline/TimelineDock";
import { TimelineRuler } from "../components/timeline/TimelineRuler";
import { TimelineTrack } from "../components/timeline/TimelineTrack";
import type { TimelineBarGesture } from "../components/timeline/types";
import { usePresentationEditorController } from "../controllers/use-presentation-editor.controller";
import { compositionElementId, slideHasBackground } from "../editor/draft-store";
import {
  applyTimelineGesture,
  clampCanvasPosition,
  generateTimelineTicks,
  scrubFractionToTime,
  timelineWindowFractions,
} from "../lib/timeline-geometry";

export type EditorViewProps = {
  presentationId: string;
  onBack: () => void;
};

type EditorController = ReturnType<typeof usePresentationEditorController>;

const RailThumbnail = memo(function RailThumbnail({
  elements,
}: {
  elements: readonly CompositionElement[];
  revision: number;
}) {
  return (
    <SlideCompositionRenderer
      elements={elements}
      timeMs={0}
      containerWidth={58}
      containerHeight={104}
      className="h-full w-full"
    />
  );
});

function editorAnimation(animation: ElementAnimation | null): TextAnimationChoice {
  if (animation === null || animation.type === "none") return "none";
  return animation.type === "fade" ? "fade" : "slide";
}

function wireAnimation(choice: TextAnimationChoice): ElementAnimation {
  if (choice === "none") return { type: "none" };
  return { type: choice === "slide" ? "fade_up" : "fade", duration_ms: 450 };
}

const animationLabel = (animation: ElementAnimation | null): string => {
  const value = editorAnimation(animation);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function TimelineCanvasWorkspace({
  controller,
  elements,
  onUploadClick,
}: {
  controller: EditorController;
  elements: readonly CompositionElement[];
  onUploadClick: () => void;
}) {
  const durationMs = controller.selectedSlide?.duration_ms ?? 4_000;
  const clock = usePlaybackClock({
    durationMs,
    initialTimeMs: controller.playback.playheadMs,
    loop: true,
  });
  const gestureBases = useRef(new Map<string, { startMs: number; endMs: number }>());
  const timedElements = elements.filter(
    (element) => element.element_type === "text" || element.layer_index > 0,
  );

  const scrub = (fraction: number) => {
    clock.pause();
    const playheadMs = scrubFractionToTime(fraction, durationMs);
    clock.seek(playheadMs);
    controller.onPlaybackCheckpoint({ playheadMs, playing: false });
  };

  const handleGesture = (element: CompositionElement, gesture: TimelineBarGesture) => {
    const id = compositionElementId(element);
    const effectiveEndMs = element.end_ms ?? durationMs;
    const base = gestureBases.current.get(id) ?? { startMs: element.start_ms, endMs: effectiveEndMs };
    if (!gestureBases.current.has(id)) gestureBases.current.set(id, base);
    const next = applyTimelineGesture(base, gesture, durationMs);
    controller.onUpdateElement(id, (current) => ({
      ...current,
      start_ms: next.startMs,
      end_ms: next.endMs,
    }));
  };

  return (
    <>
      <div className="relative flex min-h-0 flex-1">
        <EditorCanvas
          onUploadClick={onUploadClick}
          onFilesDropped={controller.onFilesDropped}
          uploadDisabled={controller.readOnly || controller.isMutating}
          placeholderKind={controller.selectedSlide?.media[0]?.media_type === "video" ? "VIDEO" : "IMAGE"}
        >
          {elements.length > 0 ? (
            <>
              <SlideCompositionRenderer
                elements={elements}
                timeMs={clock.timeMs}
                containerWidth={264}
                containerHeight={470}
                className="h-full w-full"
                forceVisibleElementId={controller.selectedElementId}
                forceVisibleOpacity={0.25}
              />
              {timedElements.map((element) => {
                const id = compositionElementId(element);
                const isSelected = controller.selectedElementId === id;
                const endMs = element.end_ms ?? durationMs;
                const visible = clock.timeMs >= element.start_ms && clock.timeMs < endMs;
                return (
                  <CanvasDraggableBox
                    key={id}
                    centerXFraction={element.layout?.x ?? 0.5}
                    centerYFraction={element.layout?.y ?? 0.5}
                    widthFraction={element.layout?.width ?? 0.5}
                    isSelected={isSelected}
                    isOutsideWindow={isSelected && !visible}
                    onSelect={() => controller.onSelectElement(id)}
                    onDrag={(x, y) => {
                      const position = clampCanvasPosition(x, y);
                      controller.onUpdateElement(id, (current) => ({
                        ...current,
                        layout: { ...(current.layout ?? {}), ...position, anchor: "center" },
                      }));
                    }}
                    onDragEnd={() => undefined}
                    disabled={controller.readOnly}
                    testId={`presentation-canvas-element-${id}`}
                  >
                    <div style={{ height: `${Math.max(18, (element.layout?.height ?? 0.1) * 470)}px` }} />
                  </CanvasDraggableBox>
                );
              })}
            </>
          ) : undefined}
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
      </div>
      <TimelineDock
        controls={
          <TimelineControls
            isPlaying={clock.isPlaying}
            onTogglePlay={() => {
              clock.toggle();
              controller.onPlaybackCheckpoint({ playing: !clock.isPlaying, playheadMs: clock.timeMs });
            }}
            timecodeLabel={`${(clock.timeMs / 1_000).toFixed(1)}s / ${(durationMs / 1_000).toFixed(1)}s`}
            onAddText={controller.onAddText}
            addTextDisabled={controller.readOnly}
          />
        }
        ruler={<TimelineRuler ticks={generateTimelineTicks(durationMs)} onScrub={scrub} />}
        playheadFraction={durationMs > 0 ? clock.timeMs / durationMs : 0}
        onPlayheadScrub={scrub}
        onPlayheadScrubStart={clock.pause}
        playheadDisabled={controller.readOnly}
      >
        {timedElements.map((element) => {
          const id = compositionElementId(element);
          const window = { startMs: element.start_ms, endMs: element.end_ms ?? durationMs };
          const fractions = timelineWindowFractions(window, durationMs);
          const mediaName = element.media?.alt_text || element.media?.media_url.split("/").at(-1) || "Media";
          return (
            <TimelineTrack
              key={id}
              label={element.element_type === "text" ? element.text_content ?? "Text" : mediaName}
              isSelected={controller.selectedElementId === id}
              onSelectLabel={() => controller.onSelectElement(id)}
              testId={`presentation-timeline-track-${id}`}
            >
              <TimelineBar
                {...fractions}
                isSelected={controller.selectedElementId === id}
                label={element.element_type === "text"
                  ? `${animationLabel(element.enter_animation)} · ${animationLabel(element.exit_animation)}`
                  : mediaName}
                onSelect={() => controller.onSelectElement(id)}
                onGesture={(gesture) => handleGesture(element, gesture)}
                onGestureEnd={() => gestureBases.current.delete(id)}
                disabled={controller.readOnly}
                testId={`presentation-timeline-bar-${id}`}
              />
            </TimelineTrack>
          );
        })}
      </TimelineDock>
    </>
  );
}

function propertiesPanel(
  controller: EditorController,
  selected: CompositionElement | null,
  openFilePicker: (role: "background" | "overlay") => void,
): React.JSX.Element {
  const durationMs = controller.selectedSlide?.duration_ms ?? 4_000;
  if (selected?.element_type === "text") {
    const id = compositionElementId(selected);
    const sizePx = Math.round((selected.style?.font_size ?? 44) * 264 / REFERENCE_CANVAS_WIDTH);
    return (
      <TextBlockPanel
        content={selected.text_content ?? ""}
        onContentChange={(content) => controller.onUpdateElement(id, (element) => ({ ...element, text_content: content }))}
        onContentCommit={(content) => controller.onUpdateElement(id, (element) => ({ ...element, text_content: content }))}
        appears={editorAnimation(selected.enter_animation)}
        onAppearsChange={(choice) => controller.onUpdateElement(id, (element) => ({ ...element, enter_animation: wireAnimation(choice) }))}
        disappears={editorAnimation(selected.exit_animation)}
        onDisappearsChange={(choice) => controller.onUpdateElement(id, (element) => ({ ...element, exit_animation: wireAnimation(choice) }))}
        sizePx={sizePx}
        onSizeChange={(value) => controller.onUpdateElement(id, (element) => ({
          ...element,
          style: { ...(element.style ?? {}), font_size: Math.round(value * REFERENCE_CANVAS_WIDTH / 264) },
        }))}
        styleRole={selected.style?.font_weight === 700 ? "heading" : "body"}
        onStyleRoleChange={(role) => controller.onUpdateElement(id, (element) => ({
          ...element,
          style: {
            ...(element.style ?? {}),
            font_weight: role === "heading" ? 700 : 400,
            text_role: role === "heading" ? "headline" : "body",
          },
        }))}
        windowLabel={`On screen ${(selected.start_ms / 1_000).toFixed(1)}s → ${((selected.end_ms ?? durationMs) / 1_000).toFixed(1)}s`}
        onDelete={() => controller.onDeleteElement(id)}
        onClose={() => controller.onSelectElement(null)}
        readOnly={controller.readOnly}
      />
    );
  }
  if (selected?.element_type === "media") {
    const id = compositionElementId(selected);
    const fit: MediaFitChoice = selected.layout?.fit === "contain" || selected.layout?.fit === "fill"
      ? selected.layout.fit
      : "cover";
    return (
      <MediaElementPanel
        mediaLabel={`${selected.media?.media_type.toUpperCase() ?? "MEDIA"} · ${selected.media?.alt_text ?? "file"}`}
        fit={fit}
        onFitChange={(value) => controller.onUpdateElement(id, (element) => ({
          ...element,
          layout: { ...(element.layout ?? {}), fit: value },
        }))}
        windowLabel={`On screen ${(selected.start_ms / 1_000).toFixed(1)}s → ${((selected.end_ms ?? durationMs) / 1_000).toFixed(1)}s`}
        onReplace={() => openFilePicker("overlay")}
        onDelete={() => {
          if (selected.media && window.confirm("Delete this media element?")) {
            void controller.onDeleteMedia(selected.media.client_id);
          }
        }}
        onClose={() => controller.onSelectElement(null)}
        readOnly={controller.readOnly}
      />
    );
  }
  return (
    <SlidePropertiesPanel
      onReplaceMedia={() => openFilePicker("background")}
      durationSeconds={durationMs / 1_000}
      onDurationChange={(seconds) => controller.onDurationChange(seconds * 1_000)}
      ctaLabel={controller.ctaLabel}
      onCtaLabelChange={controller.onCtaLabelChange}
      ctaRoute={controller.ctaRoute}
      onCtaRouteChange={controller.onCtaRouteChange}
      onCtaCommit={controller.onCtaCommit}
      ctaRouteError={controller.ctaRouteError}
      readOnly={controller.readOnly}
    />
  );
}

export function EditorView({ presentationId, onBack }: EditorViewProps): React.JSX.Element {
  const controller = usePresentationEditorController(presentationId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRoleRef = useRef<"background" | "overlay">("background");
  const railSlides: SlideRailItemData[] = useMemo(() =>
    controller.presentation?.slides.map((slide) => {
      const elements = controller.localCompositions[slide.client_id] ?? slide.elements;
      const mediaKind = slide.media[0]?.media_type;
      const textCount = elements.filter((element) => element.element_type === "text").length;
      return {
        id: slide.client_id,
        mediaLabel: mediaKind === "image" ? "IMAGE" : mediaKind === "video" ? "VIDEO" : null,
        textCountLabel: `${textCount} ${textCount === 1 ? "text" : "texts"}`,
        thumbnail: <RailThumbnail elements={elements} revision={controller.slideRevisions[slide.client_id] ?? 0} />,
      };
    }) ?? [],
  [controller.localCompositions, controller.slideRevisions, controller.presentation?.slides]);

  if (controller.isLoading && !controller.presentation) {
    return <div data-testid="presentation-editor-loading" className="p-8 text-sm text-[#767676]">Loading editor…</div>;
  }
  if (controller.error && !controller.presentation) {
    return <div data-testid="presentation-editor-error" className="p-8 text-sm text-[#c05a5a]">{controller.error.message}</div>;
  }
  const presentation = controller.presentation;
  if (!presentation) return <div data-testid="presentation-editor-empty" />;

  const selectedElements = controller.selectedSlide
    ? controller.localCompositions[controller.selectedSlide.client_id] ?? controller.selectedSlide.elements
    : [];
  const selectedElement = selectedElements.find(
    (element) => compositionElementId(element) === controller.selectedElementId,
  ) ?? null;
  const canMutate = !controller.readOnly && !controller.isMutating;
  const openFilePicker = (role: "background" | "overlay") => {
    uploadRoleRef.current = role;
    fileInputRef.current?.click();
  };

  return (
    <EditorShell
      topBar={<EditorTopBar
        title={controller.title}
        onTitleChange={controller.onTitleChange}
        onTitleCommit={controller.onTitleCommit}
        titleReadOnly={controller.readOnly}
        status={presentation.status}
        onBack={onBack}
        onPreview={() => undefined}
        previewDisabled
        onSaveDraft={() => void controller.onSaveDraft()}
        saveDraftDisabled={controller.readOnly || controller.isSavingComposition || !controller.dirty}
        saveDraftLabel={controller.isSavingComposition ? "Saving…" : controller.dirty ? "Save draft •" : "Saved"}
        onPublish={() => undefined}
        publishDisabled
      />}
      banner={controller.readOnly ? <EditorReadOnlyBanner label={`${presentation.status === "published" ? "Published" : "Archived"} — read-only · v${presentation.version}`} /> : undefined}
      rail={<SlideRail
        slides={railSlides}
        selectedSlideId={controller.selectedSlideId}
        onSelectSlide={controller.onSelectSlide}
        onAddSlide={controller.onAddSlide}
        addDisabled={!canMutate}
        onDeleteSlide={controller.onDeleteSlide}
        deleteDisabled={presentation.slides.length <= 1 || !canMutate}
        onReorder={controller.onReorder}
        readOnly={controller.readOnly}
      />}
      panel={propertiesPanel(controller, selectedElement, openFilePicker)}
    >
      <TimelineCanvasWorkspace
        key={controller.selectedSlideId}
        controller={controller}
        elements={selectedElements}
        onUploadClick={() => openFilePicker(slideHasBackground(selectedElements) ? "overlay" : "background")}
      />
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
    </EditorShell>
  );
}
