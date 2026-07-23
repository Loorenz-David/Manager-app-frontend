import { SlideCompositionRenderer } from "@beyo/presentation-runtime";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  PlayerAcknowledgeFooter,
  PlayerCtaButton,
  PlayerDismissButton,
  PlayerTapZones,
} from "./components/player/PlayerAffordances";
import { PlayerSegmentedProgress } from "./components/player/PlayerSegmentedProgress";
import { PlayerViewport } from "./components/player/PlayerViewport";
import { usePresentationPlayback } from "./playback/usePresentationPlayback";
import type { ConsumerPresentation, PresentationType } from "./types";

export type PresentationPlayerProps = {
  presentation: ConsumerPresentation;
  surfaceType?: PresentationType;
  navigate: (route: string) => void;
  onProgress: (lastSlideIndex: number) => void | Promise<void>;
  onDismiss: (lastSlideIndex: number) => void | Promise<void>;
  onComplete: (lastSlideIndex: number) => void | Promise<void>;
  onMediaExpired: () => Promise<ConsumerPresentation | null>;
};

export function PresentationPlayer({
  presentation,
  surfaceType = presentation.presentation_type,
  navigate,
  onProgress,
  onDismiss,
  onComplete,
  onMediaExpired,
}: PresentationPlayerProps): React.JSX.Element {
  const [currentPresentation, setCurrentPresentation] = useState(presentation);
  const [terminalPending, setTerminalPending] = useState(false);
  const refreshingMediaRef = useRef(false);
  const furthestReportedRef = useRef(0);

  useEffect(() => {
    if (
      presentation.client_id !== currentPresentation.client_id
      || presentation.version !== currentPresentation.version
    ) {
      setCurrentPresentation(presentation);
      furthestReportedRef.current = 0;
    }
  }, [currentPresentation.client_id, currentPresentation.version, presentation]);

  const handleComplete = useCallback(async () => {
    if (terminalPending) return;
    setTerminalPending(true);
    try {
      await onComplete(furthestReportedRef.current);
    } finally {
      setTerminalPending(false);
    }
  }, [onComplete, terminalPending]);

  const playback = usePresentationPlayback(currentPresentation.slides, () => {
    void handleComplete();
  });
  const slide = currentPresentation.slides[playback.activeSlideIndex];
  const isLast = playback.activeSlideIndex === currentPresentation.slides.length - 1;

  useEffect(() => {
    if (playback.activeSlideIndex <= furthestReportedRef.current) return;
    furthestReportedRef.current = playback.activeSlideIndex;
    void onProgress(playback.activeSlideIndex);
  }, [onProgress, playback.activeSlideIndex]);

  const handleDismiss = useCallback(async () => {
    if (!currentPresentation.is_dismissible || terminalPending) return;
    setTerminalPending(true);
    try {
      await onDismiss(furthestReportedRef.current);
    } finally {
      setTerminalPending(false);
    }
  }, [currentPresentation.is_dismissible, onDismiss, terminalPending]);

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

  const showAcknowledge = !currentPresentation.is_dismissible
    && (surfaceType === "slide_page" || isLast);

  return (
    <PlayerViewport>
      {({ width, height }) => (
        <>
          <div ref={playback.attachMediaContainer} className="h-full w-full">
            <SlideCompositionRenderer
              elements={slide.elements}
              timeMs={playback.slideTimeMs}
              containerWidth={width}
              containerHeight={height}
              backgroundColor={slide.background_color}
              className="h-full w-full"
              onMediaError={handleMediaError}
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
            disabled={terminalPending}
          />
          {currentPresentation.is_dismissible && surfaceType !== "slide_page" && (
            <PlayerDismissButton
              variant={surfaceType === "full_screen" ? "skip" : "x"}
              onDismiss={() => void handleDismiss()}
            />
          )}
          {slide.action && !(!currentPresentation.is_dismissible && isLast) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <PlayerCtaButton
                label={slide.action.label}
                onClick={() => navigate(slide.action!.route)}
              />
            </div>
          )}
          {showAcknowledge && (
            <PlayerAcknowledgeFooter
              label="Got it"
              disabled={terminalPending}
              onAcknowledge={() => void handleComplete()}
            />
          )}
        </>
      )}
    </PlayerViewport>
  );
}
