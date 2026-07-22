import { X } from "lucide-react";

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
  /** e.g. "Got it". The only exit for non-dismissible presentations. */
  label: string;
  onAcknowledge: () => void;
  disabled?: boolean;
};

/** Fixed footer acknowledge button (records `completed`, then closes). */
export function PlayerAcknowledgeFooter({
  label,
  onAcknowledge,
  disabled,
}: PlayerAcknowledgeFooterProps): React.JSX.Element {
  return (
    <div
      data-testid="presentation-player-acknowledge-footer"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/60 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10"
    >
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
  disabled?: boolean;
};

/** Invisible story-style tap navigation: left third = previous, rest = next. */
export function PlayerTapZones({
  onPrev,
  onNext,
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
        className="h-full w-1/3 cursor-default focus:outline-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Next slide"
        disabled={disabled}
        onClick={onNext}
        data-testid="presentation-player-tap-next"
        className="h-full w-2/3 cursor-default focus:outline-none"
      />
    </div>
  );
}
