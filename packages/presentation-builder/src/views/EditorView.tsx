import { memo, useCallback, useMemo, useRef, useState } from "react";

import {
  compositionTextStyle,
  SlideCompositionRenderer,
  usePlaybackClock,
  type CompositionElement,
  type ElementAnimation,
} from "@beyo/presentation-runtime";

import { CanvasDraggableBox } from "../components/editor/CanvasDraggableBox";
import { CanvasTextEditOverlay } from "../components/editor/CanvasTextEditOverlay";
import { EditorCanvas } from "../components/editor/EditorCanvas";
import { EditorReadOnlyBanner } from "../components/editor/EditorReadOnlyBanner";
import { EditorShell } from "../components/editor/EditorShell";
import { EditorTopBar } from "../components/editor/EditorTopBar";
import { MediaUploadOverlay } from "../components/editor/MediaUploadOverlay";
import { SlideRail } from "../components/editor/SlideRail";
import type { CanvasResizeGesture, SlideRailItemData } from "../components/editor/types";
import { MediaElementPanel, type MediaFitChoice } from "../components/panels/MediaElementPanel";
import { SlidePropertiesPanel } from "../components/panels/SlidePropertiesPanel";
import { TextBlockPanel } from "../components/panels/TextBlockPanel";
import { PreviewOverlay } from "../components/preview/PreviewOverlay";
import { TimelineBar } from "../components/timeline/TimelineBar";
import { TimelineControls } from "../components/timeline/TimelineControls";
import { TimelineDock } from "../components/timeline/TimelineDock";
import { TimelineRuler } from "../components/timeline/TimelineRuler";
import { TimelineTrack } from "../components/timeline/TimelineTrack";
import type { TimelineBarGesture } from "../components/timeline/types";
import { usePresentationEditorController } from "../controllers/use-presentation-editor.controller";
import { compositionElementId } from "../editor/draft-store";
import {
  EDITOR_CANVAS_HEIGHT,
  EDITOR_CANVAS_WIDTH,
  editorAnimationToWire,
  editorFontSizeToWire,
  wireAnimationToEditor,
  wireFontSizeToEditor,
} from "../lib/composition-mapping";
import { derivePresentationDisplayStatus } from "../lib/presentation-dashboard";
import { formatSlideDuration, parseSlideDuration } from "../lib/slide-duration";
import { textBoxHeightFraction } from "../lib/text-box-layout";
import {
  applyTimelineGesture,
  clampCanvasPosition,
  generateTimelineTicks,
  resizeElementLayout,
  resizeTextBox,
  scrubFractionToTime,
  timelineWindowFractions,
  type CanvasElementLayout,
} from "../lib/timeline-geometry";
import { useEditorTransportHotkey } from "../lib/use-editor-transport-hotkey";
import { PublishDialog } from "../publish/PublishDialog";
import { usePresentationPreviewPlayback } from "../preview/use-presentation-preview-playback";
import type { Slide } from "../types";

export type EditorViewProps = {
  presentationId: string;
  onBack: () => void;
  onPresentationIdChange?: (presentationId: string) => void;
};

type EditorController = ReturnType<typeof usePresentationEditorController>;

function EditorPreview({
  slides,
  onExit,
  onMediaError,
}: {
  slides: Slide[];
  onExit: () => void;
  onMediaError: () => void;
}) {
  const durations = useMemo(() => slides.map((slide) => slide.duration_ms ?? 4_000), [slides]);
  const playback = usePresentationPreviewPlayback(durations);
  const slide = slides[playback.activeSlideIndex];
  return (
    <PreviewOverlay
      onExit={onExit}
      isPlaying={playback.isPlaying}
      onTogglePlay={playback.toggle}
      progressFraction={playback.progressFraction}
      slideCount={slides.length}
      activeSlideIndex={playback.activeSlideIndex}
      onSelectSlide={playback.selectSlide}
    >
      {slide ? (
        <SlideCompositionRenderer
          elements={slide.elements}
          timeMs={playback.slideTimeMs}
          containerWidth={300}
          containerHeight={533}
          backgroundColor={slide.background_color}
          className="h-full w-full"
          onMediaError={onMediaError}
          videoPlayback={{ isPlaying: playback.isPlaying }}
        />
      ) : null}
    </PreviewOverlay>
  );
}

const RailThumbnail = memo(function RailThumbnail({
  elements,
  backgroundColor,
  onMediaError,
}: {
  elements: readonly CompositionElement[];
  backgroundColor: string | null;
  revision: number;
  onMediaError: () => void;
}) {
  return (
    <SlideCompositionRenderer
      elements={elements}
      timeMs={0}
      containerWidth={58}
      containerHeight={104}
      backgroundColor={backgroundColor}
      className="h-full w-full"
      onMediaError={onMediaError}
    />
  );
});

const animationLabel = (animation: ElementAnimation | null): string => {
  const value = wireAnimationToEditor(animation);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

function canvasHitAreaHeightFraction(element: CompositionElement): number {
  // The stored height IS the box: auto while hugging (kept in sync by the controller),
  // the author's once they drag a vertical handle. Text may then overflow it, as in any
  // fixed-size text frame — the renderer does not clip unless `overflow` says so.
  if (element.layout?.height !== undefined) return element.layout.height;
  return element.element_type === "text" ? textBoxHeightFraction(element) : 0.1;
}

function TimelineCanvasWorkspace({
  controller,
  elements,
  backgroundColor,
  onUploadClick,
  transportHotkeyEnabled,
  publishDialogOpen,
}: {
  controller: EditorController;
  elements: readonly CompositionElement[];
  backgroundColor: string | null;
  onUploadClick: () => void;
  transportHotkeyEnabled: boolean;
  publishDialogOpen: boolean;
}) {
  const durationMs = controller.selectedSlide?.duration_ms ?? 4_000;
  const clock = usePlaybackClock({
    durationMs,
    initialTimeMs: controller.playback.playheadMs,
    loop: true,
  });
  const gestureBases = useRef(new Map<string, { startMs: number; endMs: number }>());
  const resizeBases = useRef(new Map<string, CanvasElementLayout>());
  const timedElements = elements.filter(
    (element) => element.element_type === "text" || element.element_type === "media",
  );
  const inlineEditingElement = timedElements.find(
    (element) =>
      element.element_type === "text" &&
      compositionElementId(element) === controller.inlineEditingElementId,
  ) ?? null;
  const renderedElements = inlineEditingElement
    ? elements.filter(
        (element) => compositionElementId(element) !== controller.inlineEditingElementId,
      )
    : elements;

  const scrub = (fraction: number) => {
    clock.pause();
    const playheadMs = scrubFractionToTime(fraction, durationMs);
    clock.seek(playheadMs);
    controller.onPlaybackCheckpoint({ playheadMs, playing: false });
  };

  const togglePlayback = useCallback(() => {
    clock.toggle();
    controller.onPlaybackCheckpoint({ playing: !clock.isPlaying, playheadMs: clock.timeMs });
  }, [clock, controller]);

  useEditorTransportHotkey(togglePlayback, {
    enabled: transportHotkeyEnabled && controller.selectedSlide !== null,
    publishDialogOpen,
  });

  const handleGesture = (element: CompositionElement, gesture: TimelineBarGesture) => {
    const id = compositionElementId(element);
    const effectiveEndMs = element.end_ms ?? durationMs;
    const base = gestureBases.current.get(id) ?? { startMs: element.start_ms, endMs: effectiveEndMs };
    if (!gestureBases.current.has(id)) gestureBases.current.set(id, base);
    const next = applyTimelineGesture(base, gesture, durationMs);
    controller.onUpdateElement(id, (current) => ({
      ...current,
      start_ms: next.startMs,
      end_ms: gesture.kind === "move" && current.end_ms === null ? null : next.endMs,
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
          {elements.length > 0 || backgroundColor !== null ? (
            <>
              <div
                data-testid="presentation-editor-renderer-layer"
                className="pointer-events-none select-none"
              >
                <SlideCompositionRenderer
                  elements={renderedElements}
                  timeMs={clock.timeMs}
                  containerWidth={264}
                  containerHeight={470}
                  backgroundColor={backgroundColor}
                  className="h-full w-full"
                  forceVisibleElementId={controller.selectedElementId}
                  forceVisibleOpacity={0.25}
                  onMediaError={() => void controller.onMediaError()}
                  videoPlayback={{ isPlaying: clock.isPlaying }}
                />
              </div>
              {timedElements.map((element) => {
                const id = compositionElementId(element);
                if (id === controller.inlineEditingElementId) return null;
                const isSelected = controller.selectedElementId === id;
                const endMs = element.end_ms ?? durationMs;
                const visible = clock.timeMs >= element.start_ms && clock.timeMs < endMs;
                const hitAreaHeight = canvasHitAreaHeightFraction(element);
                return (
                  <CanvasDraggableBox
                    key={id}
                    centerXFraction={element.layout?.x ?? 0.5}
                    centerYFraction={element.layout?.y ?? 0.5}
                    widthFraction={element.layout?.width ?? 0.5}
                    heightFraction={hitAreaHeight}
                    isSelected={isSelected}
                    isOutsideWindow={isSelected && !visible}
                    onSelect={() => controller.onSelectElement(id, "canvas")}
                    onDoubleClick={element.element_type === "text" ? () => {
                      clock.pause();
                      controller.onPlaybackCheckpoint({ playheadMs: clock.timeMs, playing: false });
                      controller.onBeginInlineEdit(id);
                    } : undefined}
                    onDrag={(x, y) => {
                      const position = clampCanvasPosition(x, y);
                      controller.onUpdateElement(id, (current) => ({
                        ...current,
                        layout: { ...(current.layout ?? {}), ...position, anchor: "center" },
                      }));
                    }}
                    onDragEnd={() => undefined}
                    {...{
                      onResize: (gesture: CanvasResizeGesture) => {
                        const base = resizeBases.current.get(id) ?? {
                          x: element.layout?.x ?? 0.5,
                          y: element.layout?.y ?? 0.5,
                          width: element.layout?.width ?? 0.5,
                          height: element.layout?.height ?? 0.1,
                        };
                        if (!resizeBases.current.has(id)) resizeBases.current.set(id, base);
                        // Text rewraps to the new width; the controller re-measures its height.
                        const next = element.element_type === "text"
                          ? resizeTextBox(base, gesture)
                          : resizeElementLayout(base, gesture);
                        controller.onUpdateElement(id, (current) => ({
                          ...current,
                          layout: {
                            ...(current.layout ?? {}),
                            ...next,
                            anchor: "center",
                          },
                        }));
                      },
                      onResizeEnd: () => resizeBases.current.delete(id),
                    }}
                    disabled={controller.readOnly}
                    testId={`presentation-canvas-element-${id}`}
                  >
                    <div className="h-full w-full" />
                  </CanvasDraggableBox>
                );
              })}
              {inlineEditingElement?.element_type === "text" && (
                <CanvasTextEditOverlay
                  centerXFraction={inlineEditingElement.layout?.x ?? 0.5}
                  centerYFraction={inlineEditingElement.layout?.y ?? 0.5}
                  widthFraction={inlineEditingElement.layout?.width ?? 0.5}
                  heightFraction={canvasHitAreaHeightFraction(inlineEditingElement)}
                  canvasHeightPx={EDITOR_CANVAS_HEIGHT}
                  value={inlineEditingElement.text_content ?? ""}
                  textStyle={compositionTextStyle(inlineEditingElement, EDITOR_CANVAS_WIDTH)}
                  onChange={(content) => controller.onUpdateElement(
                    compositionElementId(inlineEditingElement),
                    (element) => ({ ...element, text_content: content }),
                  )}
                  onCommit={controller.onFinishInlineEdit}
                  testId={`presentation-canvas-text-editor-${compositionElementId(inlineEditingElement)}`}
                />
              )}
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
            onTogglePlay={togglePlayback}
            timecodeLabel={`${(clock.timeMs / 1_000).toFixed(1)}s / ${(durationMs / 1_000).toFixed(1)}s`}
            onAddText={() => {
              clock.pause();
              controller.onPlaybackCheckpoint({ playheadMs: clock.timeMs, playing: false });
              controller.onAddText();
            }}
            addTextDisabled={controller.readOnly || controller.selectedSlide === null}
            onAddMedia={onUploadClick}
            addMediaDisabled={
              controller.readOnly ||
              controller.isMutating ||
              controller.selectedSlide === null
            }
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
              onSelectLabel={() => controller.onSelectElement(id, "timeline")}
              testId={`presentation-timeline-track-${id}`}
            >
              <TimelineBar
                {...fractions}
                isSelected={controller.selectedElementId === id}
                label={element.element_type === "text"
                  ? `${animationLabel(element.enter_animation)} · ${animationLabel(element.exit_animation)}`
                  : mediaName}
                onSelect={() => controller.onSelectElement(id, "timeline")}
                onGesture={(gesture) => handleGesture(element, gesture)}
                onGestureEnd={() => gestureBases.current.delete(id)}
                variant={element.element_type === "media" ? "media" : "text"}
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
  openFilePicker: (replaceElementId?: string) => void,
): React.JSX.Element {
  const durationMs = controller.selectedSlide?.duration_ms ?? 4_000;
  if (selected?.element_type === "text") {
    const id = compositionElementId(selected);
    const sizePx = wireFontSizeToEditor(selected.style?.font_size ?? 44);
    return (
      <TextBlockPanel
        content={selected.text_content ?? ""}
        onContentChange={(content) => controller.onUpdateElement(id, (element) => ({ ...element, text_content: content }))}
        onContentCommit={(content) => controller.onUpdateElement(id, (element) => ({ ...element, text_content: content }))}
        appears={wireAnimationToEditor(selected.enter_animation)}
        onAppearsChange={(choice) => controller.onUpdateElement(id, (element) => ({ ...element, enter_animation: editorAnimationToWire(choice) }))}
        disappears={wireAnimationToEditor(selected.exit_animation)}
        onDisappearsChange={(choice) => controller.onUpdateElement(id, (element) => ({ ...element, exit_animation: editorAnimationToWire(choice) }))}
        sizePx={sizePx}
        onSizeChange={(value) => controller.onUpdateElement(id, (element) => ({
          ...element,
          style: { ...(element.style ?? {}), font_size: editorFontSizeToWire(value) },
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
        styling={{
          align: selected.style?.text_align === "center" || selected.style?.text_align === "right"
            ? selected.style.text_align
            : "left",
          textColor: selected.style?.text_color,
          backgroundColor: selected.style?.background_color,
          borderRadius: selected.style?.border_radius ?? 0,
          padding: selected.style?.padding ?? 0,
          onAlignChange: (textAlign) => controller.onUpdateElement(id, (element) => ({
            ...element,
            style: { ...(element.style ?? {}), text_align: textAlign },
          })),
          onTextColorChange: (textColor) => controller.onUpdateElement(id, (element) => ({
            ...element,
            style: { ...(element.style ?? {}), text_color: textColor },
          })),
          onBackgroundColorChange: (backgroundColor) => controller.onUpdateElement(id, (element) => ({
            ...element,
            style: { ...(element.style ?? {}), background_color: backgroundColor },
          })),
          onBorderRadiusChange: (borderRadius) => controller.onUpdateElement(id, (element) => ({
            ...element,
            style: { ...(element.style ?? {}), border_radius: borderRadius },
          })),
          onPaddingChange: (padding) => controller.onUpdateElement(id, (element) => ({
            ...element,
            style: { ...(element.style ?? {}), padding },
          })),
        }}
        drawers={{
          open: [...controller.openDrawersByPanel.text],
          onToggle: (drawerId) => controller.toggleDrawer("text", drawerId),
        }}
        windowLabel={`On screen ${(selected.start_ms / 1_000).toFixed(1)}s → ${((selected.end_ms ?? durationMs) / 1_000).toFixed(1)}s`}
        onDelete={() => controller.onDeleteElement(id)}
        onClose={controller.onDeselectElement}
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
        appears={wireAnimationToEditor(selected.enter_animation)}
        onAppearsChange={(choice) => controller.onUpdateElement(id, (element) => ({
          ...element,
          enter_animation: editorAnimationToWire(choice),
        }))}
        disappears={wireAnimationToEditor(selected.exit_animation)}
        onDisappearsChange={(choice) => controller.onUpdateElement(id, (element) => ({
          ...element,
          exit_animation: editorAnimationToWire(choice),
        }))}
        drawers={{
          open: [...controller.openDrawersByPanel.media],
          onToggle: (drawerId) => controller.toggleDrawer("media", drawerId),
        }}
        geometryLabel={`${Math.round((selected.layout?.width ?? 1) * 100)}% × ${Math.round((selected.layout?.height ?? 1) * 100)}% at ${Math.round((selected.layout?.x ?? 0.5) * 100)}%, ${Math.round((selected.layout?.y ?? 0.5) * 100)}%`}
        windowLabel={`On screen ${(selected.start_ms / 1_000).toFixed(1)}s → ${((selected.end_ms ?? durationMs) / 1_000).toFixed(1)}s`}
        onReplace={() => openFilePicker(id)}
        onDelete={() => {
          if (selected.media && window.confirm("Delete this media element?")) {
            void controller.onDeleteMedia(selected.media.client_id);
          }
        }}
        onClose={controller.onDeselectElement}
        readOnly={controller.readOnly}
      />
    );
  }
  return (
    <SlidePropertiesPanel
      onReplaceMedia={() => {
        const slide = controller.selectedSlide;
        const elements = slide
          ? controller.localCompositions[slide.client_id] ?? slide.elements
          : [];
        const media = elements.find((element) => element.element_type === "media");
        openFilePicker(media ? compositionElementId(media) : undefined);
      }}
      durationSeconds={durationMs / 1_000}
      onDurationChange={(seconds) => controller.onDurationChange(seconds * 1_000)}
      durationLabel={formatSlideDuration(durationMs / 1_000)}
      onDurationLabelCommit={(raw) => {
        const seconds = parseSlideDuration(raw);
        if (seconds !== null) controller.onDurationChange(seconds * 1_000);
      }}
      backgroundColor={controller.selectedSlide?.background_color ?? null}
      onBackgroundColorChange={controller.onBackgroundColorChange}
      ctaLabel={controller.ctaLabel}
      onCtaLabelChange={controller.onCtaLabelChange}
      ctaRoute={controller.ctaRoute}
      onCtaRouteChange={controller.onCtaRouteChange}
      onCtaCommit={controller.onCtaCommit}
      ctaRouteError={controller.ctaRouteError}
      drawers={{
        open: [...controller.openDrawersByPanel.slide],
        onToggle: (drawerId) => controller.toggleDrawer("slide", drawerId),
      }}
      readOnly={controller.readOnly}
    />
  );
}

export function EditorView({ presentationId, onBack, onPresentationIdChange }: EditorViewProps): React.JSX.Element {
  const controller = usePresentationEditorController(presentationId);
  const [surface, setSurface] = useState<"none" | "publish">("none");
  const [previewSlides, setPreviewSlides] = useState<Slide[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceElementIdRef = useRef<string | null>(null);
  const railSlides: SlideRailItemData[] = useMemo(() =>
    controller.presentation?.slides.map((slide) => {
      const elements = controller.localCompositions[slide.client_id] ?? slide.elements;
      const mediaKind = slide.media[0]?.media_type;
      const textCount = elements.filter((element) => element.element_type === "text").length;
      return {
        id: slide.client_id,
        mediaLabel: mediaKind === "image" ? "IMAGE" : mediaKind === "video" ? "VIDEO" : null,
        textCountLabel: `${textCount} ${textCount === 1 ? "text" : "texts"}`,
        thumbnail: (
          <RailThumbnail
            elements={elements}
            backgroundColor={slide.background_color}
            revision={controller.slideRevisions[slide.client_id] ?? 0}
            onMediaError={() => void controller.onMediaError()}
          />
        ),
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
  const displayStatus = derivePresentationDisplayStatus(presentation, new Date());
  const openFilePicker = (replaceElementId?: string) => {
    replaceElementIdRef.current = replaceElementId ?? null;
    fileInputRef.current?.click();
  };

  return (
    <>
      <EditorShell
      topBar={<EditorTopBar
        title={controller.title}
        onTitleChange={controller.onTitleChange}
        onTitleCommit={controller.onTitleCommit}
        titleReadOnly={controller.readOnly}
        status={displayStatus}
        onBack={onBack}
        onPreview={() => void controller.onOpenPreview().then((slides) => {
          if (slides) setPreviewSlides(slides);
        })}
        previewDisabled={controller.isMutating || presentation.slides.length === 0}
        onSaveDraft={() => void controller.onSaveDraft()}
        saveDraftDisabled={controller.readOnly || controller.isSavingComposition || !controller.dirty}
        saveDraftLabel={controller.isSavingComposition ? "Saving…" : controller.dirty ? "Save draft •" : "Saved"}
        onPublish={() => setSurface("publish")}
        publishDisabled={controller.readOnly || controller.isMutating}
        onArchive={presentation.status === "archived" ? undefined : () => {
          if (window.confirm("Archive this announcement?")) void controller.onArchive();
        }}
        archiveDisabled={controller.isMutating}
      />}
      banner={controller.notice || controller.readOnly ? (
        <>
          {controller.notice && (
            <div
              data-testid="presentation-editor-notice"
              className="shrink-0 border-b border-[#f0e2c0] bg-[#fdf6e7] px-4 py-2 text-xs font-semibold text-[#8a5a00]"
            >
              {controller.notice}
            </div>
          )}
          {controller.readOnly && (
            <EditorReadOnlyBanner
              label={`${presentation.status === "published" ? "Published" : "Archived"} — read-only · v${presentation.version}`}
              onEditAsNewVersion={() => void controller.onEditAsNewVersion().then((id) => {
                if (id) onPresentationIdChange?.(id);
              })}
              editAsNewVersionDisabled={controller.isCreatingNewVersion}
            />
          )}
        </>
      ) : undefined}
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
        backgroundColor={controller.selectedSlide?.background_color ?? null}
        onUploadClick={() => openFilePicker()}
        transportHotkeyEnabled={previewSlides === null}
        publishDialogOpen={surface === "publish"}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        data-testid="presentation-editor-media-file-input"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          const replaceElementId = replaceElementIdRef.current;
          replaceElementIdRef.current = null;
          event.currentTarget.value = "";
          if (replaceElementId && files[0]) {
            void controller.onUploadFile(files[0], replaceElementId);
          } else {
            controller.onFilesDropped(files);
          }
        }}
      />
      </EditorShell>
      {previewSlides && (
        <EditorPreview
          slides={previewSlides}
          onExit={() => setPreviewSlides(null)}
          onMediaError={() => {
            void controller.onMediaError().then((slides) => {
              if (slides) setPreviewSlides(slides);
            });
          }}
        />
      )}
      {surface === "publish" && !controller.readOnly && (
        <PublishDialog
          presentation={presentation}
          isPublishing={controller.isPublishing}
          onClose={() => setSurface("none")}
          onPublish={controller.onPublish}
        />
      )}
    </>
  );
}
