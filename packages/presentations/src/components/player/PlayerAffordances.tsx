import { cn } from "@beyo/lib";
import { Pause, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

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
  /** Press-and-hold anywhere on the deck. Injected; the overlay only measures the gesture. */
  onLongPress?: (clientX: number, clientY: number) => void;
  longPressMs?: number;
  longPressMoveTolerancePx?: number;
  /**
   * False lifts the overlay out of the way (`pointer-events: none`) so the content beneath
   * is reachable — used while the user is working with a text selection.
   */
  interactive?: boolean;
};

/**
 * Invisible story-style tap navigation: left = previous, centre = pause/resume, right = next.
 * The centre is the widest zone — it is the one users aim for deliberately, while the side
 * zones are swipe-adjacent and easy to hit by accident.
 */
export function PlayerTapZones({
  onPrev,
  onNext,
  onTogglePause,
  isPaused,
  disabled,
  onLongPress,
  longPressMs = 450,
  longPressMoveTolerancePx = 10,
  interactive = true,
}: PlayerTapZonesProps): React.JSX.Element {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    originRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!onLongPress || disabled) return;
    const { clientX, clientY } = event;
    firedRef.current = false;
    originRef.current = { x: clientX, y: clientY };
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress(clientX, clientY);
    }, longPressMs);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const origin = originRef.current;
    if (!origin) return;
    const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (moved > longPressMoveTolerancePx) cancel();
  };

  /** A press that became a long press must not also fire the zone's tap action. */
  const guardTap = (action: () => void) => () => {
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    action();
  };

  const zone = (
    testId: string,
    label: string,
    width: string,
    action: () => void,
  ) => (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      disabled={disabled}
      onClick={guardTap(action)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      data-testid={testId}
      className={cn("h-full cursor-default focus:outline-none", width)}
    />
  );

  return (
    <div
      className={cn("absolute inset-0 z-10 flex", !interactive && "pointer-events-none")}
      aria-hidden={disabled}
    >
      {zone("presentation-player-tap-prev", "Previous slide", "w-[25%]", onPrev)}
      {zone("presentation-player-tap-pause", isPaused ? "Resume" : "Pause", "w-[50%]", onTogglePause)}
      {zone("presentation-player-tap-next", "Next slide", "w-[25%]", onNext)}
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
