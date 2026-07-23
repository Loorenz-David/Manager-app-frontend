import { useState } from "react";

import { CanvasDraggableBox } from "../components/editor/CanvasDraggableBox";
import { EditorCanvas } from "../components/editor/EditorCanvas";
import { MediaElementPanel } from "../components/panels/MediaElementPanel";
import { SlidePropertiesPanel } from "../components/panels/SlidePropertiesPanel";
import { TextBlockPanel, type TextAnimationChoice } from "../components/panels/TextBlockPanel";
import { TimelineBar } from "../components/timeline/TimelineBar";
import { TimelineControls } from "../components/timeline/TimelineControls";
import { TimelineDock } from "../components/timeline/TimelineDock";
import { TimelineRuler } from "../components/timeline/TimelineRuler";
import { TimelineTrack } from "../components/timeline/TimelineTrack";
import type { CanvasResizeGesture } from "../components/editor/types";
import type { TimelineBarGesture } from "../components/timeline/types";

const DURATION_MS = 4000;
const MIN_WINDOW_MS = 400;

type MockElement = {
  id: string;
  kind: "text" | "media";
  label: string;
  content: string;
  startMs: number;
  endMs: number;
  appears: TextAnimationChoice;
  disappears: TextAnimationChoice;
  sizePx: number;
  x: number;
  y: number;
  /** Media only: box size as canvas fractions (resize handle demo). */
  w?: number;
  h?: number;
};

const INITIAL_ELEMENTS: MockElement[] = [
  {
    id: "el_text_1", kind: "text", label: "See what's new", content: "See what's new",
    startMs: 400, endMs: 3400, appears: "slide", disappears: "fade", sizePx: 30, x: 0.5, y: 0.32,
  },
  {
    id: "el_text_2", kind: "text", label: "Open the app →", content: "Open the app →",
    startMs: 1200, endMs: 3800, appears: "fade", disappears: "fade", sizePx: 16, x: 0.5, y: 0.78,
  },
  {
    id: "el_media_1", kind: "media", label: "sticker.png", content: "sticker.png",
    startMs: 0, endMs: 2000, appears: "none", disappears: "none", sizePx: 0,
    x: 0.72, y: 0.14, w: 0.34, h: 0.16,
  },
];

// Reference resize math for the kit's gesture contract (the production version
// lives in the logic layer's geometry module): aspect-locked corners, free edges,
// center-anchored — each moved edge shifts the center by half its travel.
const applyResize = (
  base: { x: number; y: number; w: number; h: number },
  gesture: CanvasResizeGesture,
) => {
  const sx = gesture.handle.includes("e") ? 1 : gesture.handle.includes("w") ? -1 : 0;
  const sy = gesture.handle.includes("s") ? 1 : gesture.handle.includes("n") ? -1 : 0;
  let w = sx === 0 ? base.w : base.w + sx * gesture.deltaXFraction;
  let h = sy === 0 ? base.h : base.h + sy * gesture.deltaYFraction;
  if (sx !== 0 && sy !== 0) h = w * (base.h / base.w);
  w = Math.min(1, Math.max(0.08, w));
  h = Math.min(1, Math.max(0.08, h));
  return {
    w,
    h,
    x: base.x + sx * ((w - base.w) / 2),
    y: base.y + sy * ((h - base.h) / 2),
  };
};

const animLabel = (v: TextAnimationChoice) => v.charAt(0).toUpperCase() + v.slice(1);

/** DEV-ONLY showcase of the Phase 5 timeline + panels kit. Also the reference
 * consumer for the gesture contract: this file's px→ms conversion mirrors what the
 * logic layer's geometry module will do. */
export function TimelineKitPreview(): React.JSX.Element {
  const [elements, setElements] = useState(INITIAL_ELEMENTS);
  const [selectedId, setSelectedId] = useState<string | null>("el_text_1");
  const [playheadMs, setPlayheadMs] = useState(800);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationS, setDurationS] = useState(DURATION_MS / 1000);
  const [gestureBase, setGestureBase] = useState<{ startMs: number; endMs: number } | null>(null);
  const [resizeBase, setResizeBase] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [mediaCount, setMediaCount] = useState(1);
  const [slideBackground, setSlideBackground] = useState<string | null>(null);
  const noop = () => undefined;

  const durationMs = durationS * 1000;
  const selected = elements.find((element) => element.id === selectedId) ?? null;

  // Confirmed product rule: shrinking the slide duration clamps elements into the
  // new window (bars compress; the slider is never blocked).
  const changeDuration = (seconds: number) => {
    setDurationS(seconds);
    const newDurationMs = seconds * 1000;
    setElements((current) =>
      current.map((element) => {
        const endMs = Math.min(element.endMs, newDurationMs);
        const startMs = Math.min(element.startMs, Math.max(0, endMs - MIN_WINDOW_MS));
        return endMs === element.endMs && startMs === element.startMs
          ? element
          : { ...element, startMs, endMs };
      }),
    );
    setPlayheadMs((current) => Math.min(current, newDurationMs));
  };

  const update = (id: string, patch: Partial<MockElement>) =>
    setElements((current) =>
      current.map((element) => (element.id === id ? { ...element, ...patch } : element)),
    );

  // Reference px→ms conversion for the kit's gesture contract.
  const handleGesture = (element: MockElement, gesture: TimelineBarGesture) => {
    const base = gestureBase ?? { startMs: element.startMs, endMs: element.endMs };
    if (gestureBase === null) setGestureBase(base);
    const deltaMs = (gesture.deltaPx / gesture.laneWidthPx) * durationMs;
    if (gesture.kind === "move") {
      const length = base.endMs - base.startMs;
      const start = Math.min(Math.max(0, base.startMs + deltaMs), durationMs - length);
      update(element.id, { startMs: start, endMs: start + length });
    } else if (gesture.kind === "resize-start") {
      update(element.id, {
        startMs: Math.min(Math.max(0, base.startMs + deltaMs), base.endMs - MIN_WINDOW_MS),
      });
    } else {
      update(element.id, {
        endMs: Math.max(Math.min(durationMs, base.endMs + deltaMs), base.startMs + MIN_WINDOW_MS),
      });
    }
  };

  const ticks = Array.from({ length: Math.floor(durationS) + 1 }, (_, second) => ({
    label: `${second}s`,
    fraction: (second * 1000) / durationMs,
  }));

  const windowLabel = (element: MockElement) =>
    `On screen ${(element.startMs / 1000).toFixed(1)}s → ${(element.endMs / 1000).toFixed(1)}s`;

  const isVisibleNow = (element: MockElement) =>
    playheadMs >= element.startMs && playheadMs < element.endMs;

  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="flex min-h-0 flex-1">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f4f4f4]">
          <EditorCanvas onUploadClick={noop} onFilesDropped={noop} uploadDisabled>
            {elements.map((element) => (
              <CanvasDraggableBox
                key={element.id}
                centerXFraction={element.x}
                centerYFraction={element.y}
                widthFraction={element.w}
                heightFraction={element.h}
                isSelected={element.id === selectedId}
                isOutsideWindow={element.id === selectedId && !isVisibleNow(element)}
                onSelect={() => setSelectedId(element.id)}
                onDrag={(x, y) =>
                  update(element.id, {
                    x: Math.min(0.95, Math.max(0.05, x)),
                    y: Math.min(0.94, Math.max(0.06, y)),
                  })
                }
                onDragEnd={noop}
                onResize={
                  element.kind === "media"
                    ? (gesture) => {
                        const base = resizeBase ?? {
                          x: element.x, y: element.y, w: element.w ?? 0.3, h: element.h ?? 0.2,
                        };
                        if (resizeBase === null) setResizeBase(base);
                        update(element.id, applyResize(base, gesture));
                      }
                    : undefined
                }
                onResizeEnd={() => setResizeBase(null)}
                disabled={readOnly}
                testId={`presentation-canvas-element-${element.id}`}
              >
                {element.kind === "text" ? (
                  <span
                    className="whitespace-pre text-center font-bold text-white drop-shadow"
                    style={{ fontSize: element.sizePx * (264 / 390), opacity: isVisibleNow(element) ? 1 : 0.4 }}
                  >
                    {element.content}
                  </span>
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded bg-white/85 font-mono text-[9px] text-[#303030]">
                    {element.content}
                  </span>
                )}
              </CanvasDraggableBox>
            ))}
          </EditorCanvas>
          <TimelineDock
            controls={
              <TimelineControls
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying((current) => !current)}
                timecodeLabel={`${(playheadMs / 1000).toFixed(1)}s / ${durationS.toFixed(1)}s`}
                onAddText={noop}
                addTextDisabled={readOnly}
                onAddMedia={() => {
                  const next = mediaCount + 1;
                  setMediaCount(next);
                  const id = `el_media_${next}`;
                  setElements((current) => [...current, {
                    id, kind: "media", label: `photo-${next}.jpg`, content: `photo-${next}.jpg`,
                    startMs: playheadMs, endMs: Math.min(durationMs, playheadMs + 2000),
                    appears: "fade", disappears: "none", sizePx: 0,
                    x: 0.5, y: 0.5, w: 0.4, h: 0.24,
                  }]);
                  setSelectedId(id);
                }}
                addMediaDisabled={readOnly}
              />
            }
            ruler={
              <TimelineRuler
                ticks={ticks}
                onScrub={(fraction) => {
                  setIsPlaying(false);
                  setPlayheadMs(fraction * durationMs);
                }}
              />
            }
            playheadFraction={playheadMs / durationMs}
            onPlayheadScrub={(fraction) => {
              setIsPlaying(false);
              setPlayheadMs(fraction * durationMs);
            }}
          >
            {elements.map((element) => (
              <TimelineTrack
                key={element.id}
                label={element.label}
                isSelected={element.id === selectedId}
                onSelectLabel={() => setSelectedId(element.id)}
                testId={`presentation-timeline-track-${element.id}`}
              >
                <TimelineBar
                  leftFraction={element.startMs / durationMs}
                  widthFraction={(element.endMs - element.startMs) / durationMs}
                  isSelected={element.id === selectedId}
                  variant={element.kind}
                  label={
                    element.kind === "text"
                      ? `${animLabel(element.appears)} · ${animLabel(element.disappears)}`
                      : element.label
                  }
                  onSelect={() => setSelectedId(element.id)}
                  onGesture={(gesture) => handleGesture(element, gesture)}
                  onGestureEnd={() => setGestureBase(null)}
                  disabled={readOnly}
                  testId={`presentation-timeline-bar-${element.id}`}
                />
              </TimelineTrack>
            ))}
          </TimelineDock>
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
              onClick={() => setSelectedId(null)}
            >
              Deselect (slide panel)
            </button>
          </div>
        </main>
        <aside className="w-[250px] shrink-0 overflow-y-auto border-l border-[#e7e7e7] bg-[#fafafa]">
          {selected === null ? (
            <SlidePropertiesPanel
              onReplaceMedia={noop}
              durationSeconds={durationS}
              onDurationChange={changeDuration}
              backgroundColor={slideBackground}
              onBackgroundColorChange={setSlideBackground}
              ctaLabel=""
              onCtaLabelChange={noop}
              ctaRoute=""
              onCtaRouteChange={noop}
              onCtaCommit={noop}
              readOnly={readOnly}
            />
          ) : selected.kind === "media" ? (
            <MediaElementPanel
              mediaLabel={`IMAGE · ${selected.label}`}
              fit="cover"
              onFitChange={noop}
              appears={selected.appears}
              onAppearsChange={(value) => update(selected.id, { appears: value })}
              disappears={selected.disappears}
              onDisappearsChange={(value) => update(selected.id, { disappears: value })}
              geometryLabel={`${Math.round((selected.w ?? 0.3) * 100)}% × ${Math.round((selected.h ?? 0.2) * 100)}% at ${Math.round(selected.x * 100)}%, ${Math.round(selected.y * 100)}%`}
              windowLabel={windowLabel(selected)}
              onReplace={noop}
              onDelete={() => {
                setElements((current) => current.filter((e) => e.id !== selected.id));
                setSelectedId(null);
              }}
              onClose={() => setSelectedId(null)}
              readOnly={readOnly}
            />
          ) : (
            <TextBlockPanel
              content={selected.content}
              onContentChange={(value) =>
                update(selected.id, { content: value, label: value.split("\n")[0] ?? "" })
              }
              onContentCommit={noop}
              appears={selected.appears}
              onAppearsChange={(value) => update(selected.id, { appears: value })}
              disappears={selected.disappears}
              onDisappearsChange={(value) => update(selected.id, { disappears: value })}
              sizePx={selected.sizePx}
              onSizeChange={(value) => update(selected.id, { sizePx: value })}
              styleRole="heading"
              onStyleRoleChange={noop}
              styling={{
                align: "center",
                textColor: "#FFFFFF",
                backgroundColor: undefined,
                borderRadius: 0,
                padding: 0,
                onAlignChange: noop,
                onTextColorChange: noop,
                onBackgroundColorChange: noop,
                onBorderRadiusChange: noop,
                onPaddingChange: noop,
              }}
              windowLabel={windowLabel(selected)}
              onDelete={() => {
                setElements((current) => current.filter((e) => e.id !== selected.id));
                setSelectedId(null);
              }}
              onClose={() => setSelectedId(null)}
              readOnly={readOnly}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
