import { useState } from "react";

import {
  PlayerAcknowledgeFooter,
  PlayerCtaButton,
  PlayerDismissButton,
  PlayerPausedIndicator,
  PlayerTapZones,
} from "../components/player/PlayerAffordances";
import { PlayerFullScreenFrame, PlayerModalFrame } from "../components/player/PlayerFrames";
import { PlayerSegmentedProgress } from "../components/player/PlayerSegmentedProgress";
import { PlayerViewport } from "../components/player/PlayerViewport";

type FrameChoice = "modal" | "full_screen" | "slide_page";

const SLIDES = [
  { text: "See what’s new", cta: null },
  { text: "Fewer taps, more control", cta: null },
  { text: "Try it today", cta: "Open product search" },
];

/** Dev-only mock slide fill (the real player renders through the runtime). */
function MockSlide({ text, width }: { text: string; width: number }): React.JSX.Element {
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center"
      style={{
        background: "repeating-linear-gradient(135deg, #474d56 0 11px, #414751 11px 22px)",
      }}
    >
      <span
        className="max-w-[80%] text-center font-bold text-white drop-shadow"
        style={{ fontSize: 23 * (width / 390) }}
      >
        {text}
      </span>
    </div>
  );
}

/** DEV-ONLY showcase of the Phase 8 player chrome kit with mock slides. */
export function PlayerKitPreview(): React.JSX.Element {
  const [frame, setFrame] = useState<FrameChoice>("modal");
  const [isDismissible, setIsDismissible] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fraction, setFraction] = useState(0.4);
  const [isPaused, setIsPaused] = useState(false);
  const [seenFullDeck, setSeenFullDeck] = useState(false);
  const noop = () => undefined;

  const slide = SLIDES[activeIndex]!;
  const cta = slide.cta ? <PlayerCtaButton label={slide.cta} onClick={noop} /> : null;

  const playerBody = (
    <PlayerViewport>
      {({ width }) => (
        <>
          <MockSlide text={slide.text} width={width} />
          <PlayerSegmentedProgress
            slideCount={SLIDES.length}
            activeIndex={activeIndex}
            activeFraction={fraction}
          />
          <PlayerTapZones
            onPrev={() => setActiveIndex((current) => Math.max(0, current - 1))}
            onNext={() => setActiveIndex((current) => (current + 1) % SLIDES.length)}
            onTogglePause={() => setIsPaused((paused) => !paused)}
            isPaused={isPaused}
            onLongPress={() => setIsPaused(true)}
          />
          {isPaused && <PlayerPausedIndicator />}
          {isDismissible && frame !== "slide_page" && (
            <PlayerDismissButton
              variant={frame === "full_screen" ? "skip" : "x"}
              onDismiss={noop}
            />
          )}
          {seenFullDeck
            ? <PlayerAcknowledgeFooter label="Close" onAcknowledge={noop} above={cta} />
            : cta && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {cta}
              </div>
            )}
        </>
      )}
    </PlayerViewport>
  );

  return (
    <div className="flex h-screen flex-col bg-[#ededed]">
      <div className="z-[60] flex items-center gap-3 border-b border-[#e7e7e7] bg-white px-4 py-2 text-xs text-[#767676]">
        <span className="font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">
          Preview controls
        </span>
        {(["modal", "full_screen", "slide_page"] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => setFrame(choice)}
            className={`rounded border px-2 py-1 ${frame === choice ? "border-[#3f78a8] text-[#2c5372]" : "border-[#dcdcdc] hover:bg-[#f4f4f4]"}`}
          >
            {choice}
          </button>
        ))}
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isDismissible}
            onChange={(event) => setIsDismissible(event.target.checked)}
          />
          is_dismissible
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={seenFullDeck}
            onChange={(event) => setSeenFullDeck(event.target.checked)}
          />
          first loop done
        </label>
        <label className="flex items-center gap-1.5">
          progress
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={fraction}
            onChange={(event) => setFraction(Number(event.target.value))}
          />
        </label>
      </div>
      {frame === "modal" && <PlayerModalFrame>{playerBody}</PlayerModalFrame>}
      {frame === "full_screen" && <PlayerFullScreenFrame>{playerBody}</PlayerFullScreenFrame>}
      {frame === "slide_page" && (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          {/* slide_page renders inside the app's SlidePageSurface; this stands in for it */}
          <div className="relative h-full max-h-[720px] w-full max-w-[380px] overflow-hidden rounded-2xl border border-[#dcdcdc] bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.28)]">
            {playerBody}
          </div>
        </div>
      )}
    </div>
  );
}
