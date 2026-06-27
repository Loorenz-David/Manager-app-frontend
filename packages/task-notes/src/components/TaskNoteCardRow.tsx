import { Trash2 } from "lucide-react";
import { ConfirmActionButton } from "@beyo/ui";
import { cn } from "@beyo/lib";

import type { TaskNoteApiEntry } from "../types";

type TaskNoteCardRowProps = {
  entry: TaskNoteApiEntry;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: () => void;
  onPress: () => void;
  testId?: string;
};

export function TaskNoteCardRow({
  entry,
  canDelete = false,
  isDeleting = false,
  onDelete,
  onPress,
  testId = "task-note-card-row",
}: TaskNoteCardRowProps): React.JSX.Element {
  const preview = entry.note.plain_text.trim() || "Empty note";
  const author = entry.note.created_by?.username ?? null;

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
      data-testid={`${testId}-${entry.note.client_id}`}
    >
      <button
        className={cn(
          "min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        type="button"
        onClick={onPress}
      >
        <p
          className="text-sm text-foreground"
          style={{
            display: "-webkit-box",
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
          }}
        >
          {preview}
        </p>
        {author ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{author}</p>
        ) : null}
      </button>

      {canDelete && onDelete ? (
        <ConfirmActionButton
          className="px-3 py-2 shadow-sm"
          confirmLabel=""
          borderColor="var(--color-between-border)"
          disabled={isDeleting}
          icon={<Trash2 aria-hidden="true" className="size-4" />}
          label=""
          textColor="var(--color-primary)"
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
