import { PostHandlingIcon } from "@beyo/assets";

import type { TaskPostHandling } from "../types";

type PostHandlingBottomActionProps = {
  taskId: string;
  instance: TaskPostHandling | null;
  isCompleting: boolean;
  onComplete: () => void;
  onRequestPendingWarning: () => void;
};

export function PostHandlingBottomAction({
  taskId,
  instance,
  isCompleting,
  onComplete,
  onRequestPendingWarning,
}: PostHandlingBottomActionProps): React.JSX.Element {
  const isCompleted = instance == null || instance.state === "completed";
  const isPendingReview = instance?.state === "pending";
  const label = isCompleted
    ? "Completed"
    : isPendingReview
      ? "Pending - revision"
      : "Complete";

  return (
    <button
      aria-label={label}
      className="flex w-full items-center gap-2 bg-primary px-4 py-4 text-left text-md font-medium text-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      data-testid={`post-handling-action-${taskId}`}
      disabled={isCompleted || isCompleting}
      type="button"
      onClick={(event) => {
        event.stopPropagation();

        if (isCompleted) {
          return;
        }

        if (isPendingReview) {
          onRequestPendingWarning();
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
      <PostHandlingIcon aria-hidden="true" className="size-6 shrink-0" />
      <span>{isCompleting ? "Saving..." : label}</span>
    </button>
  );
}
