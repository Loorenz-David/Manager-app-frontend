import { SlideCompositionRenderer } from "@beyo/presentation-runtime";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  PlayerAcknowledgeFooter,
  PlayerCtaButton,
  PlayerDismissButton,
  PlayerPausedIndicator,
  PlayerTapZones,
} from "./components/player/PlayerAffordances";
import { PlayerSegmentedProgress } from "./components/player/PlayerSegmentedProgress";
import { PlayerViewport } from "./components/player/PlayerViewport";
import { usePresentationPlayback } from "./playback/usePresentationPlayback";
import { usePlayerTextSelection } from "./playback/usePlayerTextSelection";
import { LONG_PRESS_MOVE_TOLERANCE_PX, LONG_PRESS_MS } from "./playback/text-selection";
import type { ConsumerPresentation, PresentationType } from "./types";

export type PresentationPlayerProps = {
  presentation: ConsumerPresentation;
  surfaceType?: PresentationType;
  navigate: (route: string) => void;
  onProgress: (lastSlideIndex: number) => void | Promise<void>;
  /** Early exit, before the deck has played through once — records `dismissed` and closes. */
  onDismiss: (lastSlideIndex: number) => void | Promise<void>;
  /**
   * Fires once, the moment the first loop wraps — records `completed`.
   * It must NOT close the surface: the deck keeps looping until the user quits.
   */
  onComplete: (lastSlideIndex: number) => void | Promise<void>;
  /** Closes the surface without recording anything (the deck is already `completed`). */
  onClose: () => void | Promise<void>;
  onMediaExpired: () => Promise<ConsumerPresentation | null>;
};

export function PresentationPlayer({
  presentation,
  surfaceType = presentation.presentation_type,
  navigate,
  onProgress,
  onDismiss,
  onComplete,
  onClose,
  onMediaExpired,
}: PresentationPlayerProps): React.JSX.Element {
  const [currentPresentation, setCurrentPresentation] = useState(presentation);
  const [exitPending, setExitPending] = useState(false);
  const refreshingMediaRef = useRef(false);
  const furthestReportedRef = useRef(0);
  const completeStartedRef = useRef(false);

  useEffect(() => {
    if (
      presentation.client_id !== currentPresentation.client_id
      || presentation.version !== currentPresentation.version
    ) {
      setCurrentPresentation(presentation);
      furthestReportedRef.current = 0;
      completeStartedRef.current = false;
    }
  }, [currentPresentation.client_id, currentPresentation.version, presentation]);

  /** Recorded in the background — completing must never block the still-running deck. */
  const handleFirstLoopComplete = useCallback(() => {
    if (completeStartedRef.current) return;
    completeStartedRef.current = true;
    void onComplete(furthestReportedRef.current);
  }, [onComplete]);

  const playback = usePresentationPlayback(
    currentPresentation.slides,
    handleFirstLoopComplete,
  );
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const slide = currentPresentation.slides[playback.activeSlideIndex];
  const hasSeenFullDeck = playback.loopCount > 0;
  const selection = usePlayerTextSelection();

  /** Holding to read means holding the deck: pause first, then hand the text over. */
  const handleLongPress = useCallback((clientX: number, clientY: number) => {
    if (!selection.selectAt(clientX, clientY)) return;
    if (!playbackRef.current.isPaused) playbackRef.current.togglePause();
  }, [selection]);

  useEffect(() => {
    if (playback.activeSlideIndex <= furthestReportedRef.current) return;
    furthestReportedRef.current = playback.activeSlideIndex;
    void onProgress(playback.activeSlideIndex);
  }, [onProgress, playback.activeSlideIndex]);

  // A selection belongs to the slide it was made on.
  useEffect(() => selection.clear, [playback.activeSlideIndex, selection.clear]);

  const handleDismiss = useCallback(async () => {
    if (!currentPresentation.is_dismissible || exitPending) return;
    setExitPending(true);
    try {
      await onDismiss(furthestReportedRef.current);
    } finally {
      setExitPending(false);
    }
  }, [currentPresentation.is_dismissible, exitPending, onDismiss]);

  const handleClose = useCallback(async () => {
    if (exitPending) return;
    setExitPending(true);
    try {
      await onClose();
    } finally {
      setExitPending(false);
    }
  }, [exitPending, onClose]);

  const handleMediaError = useCallback(() => {
    if (refreshingMediaRef.current) return;
    refreshingMediaRef.current = true;
    void onMediaExpired()
      .then((refreshed) => {
        if (refreshed?.client_id === currentPresentation.client_id) {
          setCurrentPresentation(refreshed);
        }
      })
      .finally(() => {
        refreshingMediaRef.current = false;
      });
  }, [currentPresentation.client_id, onMediaExpired]);

  if (!slide) return <div data-testid="presentation-player-empty" />;

  // Before the first loop wraps, only a dismissible deck may be left early (records `dismissed`);
  // after it, every affordance is a plain close because `completed` is already recorded.
  const showDismissButton = currentPresentation.is_dismissible && surfaceType !== "slide_page";
  const cta = slide.action
    ? (
      <PlayerCtaButton
        label={slide.action.label}
        onClick={() => navigate(slide.action!.route)}
      />
    )
    : null;

  return (
    <PlayerViewport>
      {({ width, height }) => (
        <>
          {/*
            `isolate` is load-bearing: composition elements carry authored `layer_index`
            as their z-index (text starts at 10 and climbs), which without a stacking
            context here competes directly with the chrome — text ended up above the tap
            zones and swallowed every tap into a text selection.
          */}
          <div
            ref={selection.attachContainer}
            className="isolate relative z-0 h-full w-full"
          >
            <SlideCompositionRenderer
              elements={slide.elements}
              timeMs={playback.slideTimeMs}
              containerWidth={width}
              containerHeight={height}
              backgroundColor={slide.background_color}
              className="h-full w-full"
              onMediaError={handleMediaError}
              // A media-driven slide's video IS the clock, so the playback hook owns it;
              // every other slide has its video driven by the renderer from the clock.
              videoPlayback={slide.playback_mode === "media_driven"
                ? undefined
                : { isPlaying: playback.isPlaying }}
            />
          </div>
          <PlayerSegmentedProgress
            slideCount={currentPresentation.slides.length}
            activeIndex={playback.activeSlideIndex}
            activeFraction={playback.activeFraction}
          />
          <PlayerTapZones
            onPrev={playback.previous}
            onNext={playback.next}
            onTogglePause={playback.togglePause}
            isPaused={playback.isPaused}
            disabled={exitPending}
            onLongPress={handleLongPress}
            longPressMs={LONG_PRESS_MS}
            longPressMoveTolerancePx={LONG_PRESS_MOVE_TOLERANCE_PX}
            interactive={!selection.isSelecting}
          />
          {playback.isPaused && <PlayerPausedIndicator />}
          {showDismissButton && (
            <PlayerDismissButton
              variant={surfaceType === "full_screen" ? "skip" : "x"}
              onDismiss={() => void (hasSeenFullDeck ? handleClose() : handleDismiss())}
            />
          )}
          {hasSeenFullDeck
            ? (
              <PlayerAcknowledgeFooter
                label="Close"
                disabled={exitPending}
                onAcknowledge={() => void handleClose()}
                above={cta}
              />
            )
            : cta && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {cta}
              </div>
            )}
        </>
      )}
    </PlayerViewport>
  );
}
