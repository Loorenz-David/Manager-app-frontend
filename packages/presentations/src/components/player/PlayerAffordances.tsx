import { Pause, X } from "lucide-react";

type PlayerDismissButtonProps = {
  /** "x" for modal, "skip" for full_screen (per the master dismiss-chrome matrix). */
  variant: "x" | "skip";
  onDismiss: () => void;
};

/** Dismiss affordance — render ONLY when `is_dismissible` (records `dismissed`). */
export function PlayerDismissButton({
  variant,
  onDismiss,
}: PlayerDismissButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss announcement"
      data-testid="presentation-player-dismiss-button"
      className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-semibold text-white/90 backdrop-blur-sm transition-colors duration-150 hover:bg-black/55 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
    >
      {variant === "x" ? <X aria-hidden className="size-4" strokeWidth={2.5} /> : "Skip"}
    </button>
  );
}

type PlayerCtaButtonProps = {
  label: string;
  onClick: () => void;
};

/** The slide's call-to-action; navigation is injected by the host app. */
export function PlayerCtaButton({ label, onClick }: PlayerCtaButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="presentation-player-cta-button"
      className="pointer-events-auto rounded-xl bg-white px-5 py-3 text-[14.5px] font-bold text-[#1c1c1c] shadow-[0_12px_34px_-14px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {label}
    </button>
  );
}

type PlayerAcknowledgeFooterProps = {
  /** e.g. "Close". The deck's exit, revealed once it has played through once. */
  label: string;
  onAcknowledge: () => void;
  disabled?: boolean;
  /** Optional node stacked above the button (the slide CTA shares this footer). */
  above?: React.ReactNode;
};

/** Fixed footer exit button — closes the deck after the first loop. */
export function PlayerAcknowledgeFooter({
  label,
  onAcknowledge,
  disabled,
  above,
}: PlayerAcknowledgeFooterProps): React.JSX.Element {
  return (
    <div
      data-testid="presentation-player-acknowledge-footer"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/60 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10"
    >
      {above ? <div className="mb-2.5 flex justify-center">{above}</div> : null}
      <button
        type="button"
        onClick={onAcknowledge}
        disabled={disabled}
        data-testid="presentation-player-acknowledge-button"
        className="pointer-events-auto w-full rounded-xl bg-white py-3 text-[14.5px] font-bold text-[#1c1c1c] transition-colors duration-150 hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {label}
      </button>
    </div>
  );
}

type PlayerTapZonesProps = {
  onPrev: () => void;
  onNext: () => void;
  onTogglePause: () => void;
  isPaused?: boolean;
  disabled?: boolean;
};

/** Invisible story-style tap navigation: left = previous, centre = pause/resume, right = next. */
export function PlayerTapZones({
  onPrev,
  onNext,
  onTogglePause,
  isPaused,
  disabled,
}: PlayerTapZonesProps): React.JSX.Element {
  return (
    <div className="absolute inset-0 z-10 flex" aria-hidden={disabled}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Previous slide"
        disabled={disabled}
        onClick={onPrev}
        data-testid="presentation-player-tap-prev"
        className="h-full w-[30%] cursor-default focus:outline-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={isPaused ? "Resume" : "Pause"}
        disabled={disabled}
        onClick={onTogglePause}
        data-testid="presentation-player-tap-pause"
        className="h-full w-[40%] cursor-default focus:outline-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Next slide"
        disabled={disabled}
        onClick={onNext}
        data-testid="presentation-player-tap-next"
        className="h-full w-[30%] cursor-default focus:outline-none"
      />
    </div>
  );
}

/** Centre-screen feedback while the deck timer is held, so pause is discoverable. */
export function PlayerPausedIndicator(): React.JSX.Element {
  return (
    <div
      aria-hidden
      data-testid="presentation-player-paused-indicator"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm">
        <Pause className="size-6" fill="currentColor" strokeWidth={0} />
      </span>
    </div>
  );
}
