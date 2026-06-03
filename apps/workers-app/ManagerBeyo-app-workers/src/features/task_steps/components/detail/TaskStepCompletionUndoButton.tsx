import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";

type TaskStepCompletionUndoButtonProps = {
  expiresAt: string;
  isCancelling: boolean;
  onUndo: () => void;
  onExpired: () => void;
};

function secondsUntilExpiry(expiresAt: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
}

export function TaskStepCompletionUndoButton({
  expiresAt,
  isCancelling,
  onUndo,
  onExpired,
}: TaskStepCompletionUndoButtonProps): React.JSX.Element {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntilExpiry(expiresAt),
  );
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    hasExpiredRef.current = false;
    setSecondsLeft(secondsUntilExpiry(expiresAt));

    const interval = window.setInterval(() => {
      const remaining = secondsUntilExpiry(expiresAt);
      setSecondsLeft(remaining);

      if (remaining <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpired();
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [expiresAt, onExpired]);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-card disabled:opacity-50"
      data-testid="task-step-complete-undo-button"
      disabled={isCancelling || secondsLeft <= 0}
      onClick={onUndo}
    >
      <Undo2 aria-hidden="true" className="size-4 shrink-0" />
      <span>Undo</span>
      <span className="font-mono">{secondsLeft}s</span>
    </button>
  );
}
