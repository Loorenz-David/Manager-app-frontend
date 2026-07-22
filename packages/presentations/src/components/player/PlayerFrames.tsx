import type { ReactNode } from "react";

/** Centered portrait card over a dimmed backdrop — `presentation_type: "modal"`. */
export function PlayerModalFrame({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div
      data-testid="presentation-player-modal-frame"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
    >
      <div className="relative aspect-[9/17] max-h-[86vh] w-full max-w-[340px] overflow-hidden rounded-[22px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
        {children}
      </div>
    </div>
  );
}

/** Full-viewport takeover — `presentation_type: "full_screen"`. */
export function PlayerFullScreenFrame({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div
      data-testid="presentation-player-full-screen-frame"
      className="fixed inset-0 z-50 bg-black"
    >
      {children}
    </div>
  );
}
