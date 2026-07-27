import { Check } from "lucide-react";

import type { TaskPostHandling } from "../types";

type PostHandlingBottomActionProps = {
  taskId: string;
  instance: TaskPostHandling | null;
  isCompleting: boolean;
  onComplete: () => void;
};

/**
 * Completion action for a post-handling instance that already has every value
 * filled. While values are still missing the card's missing-values band is the
 * trigger instead, so this button is not rendered.
 */
export function PostHandlingBottomAction({
  taskId,
  instance,
  isCompleting,
  onComplete,
}: PostHandlingBottomActionProps): React.JSX.Element {
  const isCompleted = instance == null || instance.state === "completed";
  const label = isCompleted ? "Completed" : "Complete task";

  return (
    <button
      aria-label={label}
      className={`flex w-full items-center justify-center gap-3 rounded-full px-6 py-2.5 text-base font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        isCompleted ? "bg-muted" : "bg-[#b7ddb2]"
      }`}
      data-testid={`post-handling-action-${taskId}`}
      disabled={isCompleted || isCompleting}
      type="button"
      onClick={(event) => {
        event.stopPropagation();

        if (isCompleted) {
          return;
        }

        onComplete();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.stopPropagation();
        }
      }}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#123a22] text-card">
        <Check aria-hidden="true" className="size-4.5" />
      </span>
      <span>{isCompleting ? "Saving..." : label}</span>
    </button>
  );
}
