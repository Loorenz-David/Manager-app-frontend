import { useState } from "react";

import {
  AlignmentPicker,
  ColorSwatchPicker,
  SliderFieldRow,
  type TextAlignmentChoice,
} from "@beyo/ui";

import { EditorCanvas } from "../components/editor/EditorCanvas";
import { EditorReadOnlyBanner } from "../components/editor/EditorReadOnlyBanner";
import { EditorShell } from "../components/editor/EditorShell";
import { EditorTopBar } from "../components/editor/EditorTopBar";
import { MediaUploadOverlay } from "../components/editor/MediaUploadOverlay";
import { SlideRail } from "../components/editor/SlideRail";
import type { SlideRailItemData } from "../components/editor/types";
import { TextStylingSection } from "../components/panels/TextStylingSection";

const INITIAL_SLIDES: SlideRailItemData[] = [
  { id: "aups_mock_1", mediaLabel: "IMAGE", textCountLabel: "2 texts" },
  { id: "aups_mock_2", mediaLabel: "VIDEO", textCountLabel: "1 text" },
  { id: "aups_mock_3", mediaLabel: "IMAGE", textCountLabel: "2 texts" },
];

type OverlayMode = "none" | "uploading" | "error";

/**
 * DEV-ONLY showcase of the Phase 4 editor chrome kit with mock data.
 * Interactive: title editing, slide select/add/delete/drag-reorder, read-only toggle,
 * upload-overlay states. Mounted behind an import.meta.env.DEV route.
 */
export function EditorKitPreview(): React.JSX.Element {
  const [title, setTitle] = useState("Q3 Product Update");
  const [slides, setSlides] = useState(INITIAL_SLIDES);
  const [selectedId, setSelectedId] = useState<string | null>("aups_mock_3");
  const [readOnly, setReadOnly] = useState(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("none");
  const [align, setAlign] = useState<TextAlignmentChoice>("center");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>("#3F78A8");
  const [borderRadius, setBorderRadius] = useState(12);
  const [padding, setPadding] = useState(8);
  const noop = () => undefined;

  const addSlide = () => {
    const id = `aups_mock_${slides.length + 1}_${Math.random().toString(36).slice(2, 6)}`;
    setSlides((current) => [...current, { id, mediaLabel: "IMAGE", textCountLabel: "0 texts" }]);
    setSelectedId(id);
  };
  const deleteSlide = (id: string) => {
    setSlides((current) => current.filter((slide) => slide.id !== id));
    setSelectedId((current) => (current === id ? (slides[0]?.id ?? null) : current));
  };
  const reorder = (id: string, targetIndex: number) => {
    setSlides((current) => {
      const next = current.filter((slide) => slide.id !== id);
      const moved = current.find((slide) => slide.id === id);
      if (!moved) return current;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  return (
    <div className="relative h-screen">
      <EditorShell
        topBar={
          <EditorTopBar
            title={title}
            onTitleChange={setTitle}
            onTitleCommit={noop}
            titleReadOnly={readOnly}
            status={readOnly ? "published" : "draft"}
            onBack={noop}
            onPreview={noop}
            previewDisabled
            onSaveDraft={noop}
            saveDraftDisabled={readOnly}
            onPublish={noop}
            publishDisabled
          />
        }
        banner={
          readOnly ? (
            <EditorReadOnlyBanner label="Published — read-only · v2" onEditAsNewVersion={noop} />
          ) : undefined
        }
        rail={
          <SlideRail
            slides={slides}
            selectedSlideId={selectedId}
            onSelectSlide={setSelectedId}
            onAddSlide={addSlide}
            onDeleteSlide={deleteSlide}
            deleteDisabled={slides.length <= 1}
            onReorder={reorder}
            readOnly={readOnly}
          />
        }
        panel={
          <div className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
              Text styling kit
            </p>
            <TextStylingSection
              align={align}
              textColor={textColor}
              backgroundColor={backgroundColor}
              borderRadius={borderRadius}
              padding={padding}
              onAlignChange={setAlign}
              onTextColorChange={setTextColor}
              onBackgroundColorChange={setBackgroundColor}
              onBorderRadiusChange={setBorderRadius}
              onPaddingChange={setPadding}
              readOnly={readOnly}
            />
            <div className="mt-6 border-t border-[#e7e7e7] pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
                Standalone @beyo/ui primitives
              </p>
              <div className="space-y-3">
                <AlignmentPicker value={align} onChange={setAlign} disabled={readOnly} />
                <ColorSwatchPicker
                  value={backgroundColor}
                  onChange={setBackgroundColor}
                  allowNone
                  disabled={readOnly}
                />
                <SliderFieldRow
                  label="Padding"
                  value={padding}
                  min={0}
                  max={48}
                  valueLabel={`${padding}px`}
                  onChange={setPadding}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        }
      >
        <EditorCanvas
          placeholderKind="IMAGE"
          onUploadClick={() => setOverlayMode("uploading")}
          onFilesDropped={() => setOverlayMode("uploading")}
          uploadDisabled={readOnly}
        />
        {/* Dev controls for preview states */}
        <div className="flex shrink-0 items-center gap-3 border-t border-[#e7e7e7] bg-white px-4 py-2 text-xs text-[#767676]">
          <span className="font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
            Preview controls
          </span>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(event) => setReadOnly(event.target.checked)}
            />
            Read-only mode
          </label>
          <button
            type="button"
            className="rounded border border-[#dcdcdc] px-2 py-1 hover:bg-[#f4f4f4]"
            onClick={() => setOverlayMode("uploading")}
          >
            Show upload progress
          </button>
          <button
            type="button"
            className="rounded border border-[#dcdcdc] px-2 py-1 hover:bg-[#f4f4f4]"
            onClick={() => setOverlayMode("error")}
          >
            Show upload error
          </button>
        </div>
      </EditorShell>
      {overlayMode !== "none" && (
        <MediaUploadOverlay
          progress={overlayMode === "uploading" ? 62 : 100}
          fileName="team-update.mp4"
          onCancel={() => setOverlayMode("none")}
          errorMessage={
            overlayMode === "error"
              ? "The file exceeds the 200 MB limit for videos."
              : null
          }
          onRetry={() => setOverlayMode("uploading")}
          onDismissError={() => setOverlayMode("none")}
        />
      )}
    </div>
  );
}
