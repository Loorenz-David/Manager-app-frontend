import { cn } from "@beyo/lib";
import { VerticalScrollArea, useScrollVisibility } from "@beyo/ui";

import type { TaskNoteApiEntry } from "../types";
import { TaskNoteCardRow } from "./TaskNoteCardRow";
import { Plus } from "lucide-react";

type TaskNoteListPanelProps = {
  canCreate: boolean;
  deletingNoteId: string | null;
  entries: TaskNoteApiEntry[];
  isError: boolean;
  isLoading: boolean;
  onCreate: () => void;
  onDelete: (noteId: string) => void;
  onOpenDetail: (noteId: string) => void;
  onRetry: () => void;
};

export function TaskNoteListPanel({
  canCreate,
  deletingNoteId,
  entries,
  isError,
  isLoading,
  onCreate,
  onDelete,
  onOpenDetail,
  onRetry,
}: TaskNoteListPanelProps): React.JSX.Element {
  const { isHidden, scrollRef } = useScrollVisibility({
    mode: "relative",
    hideThreshold: 16,
    showThreshold: 8,
  });

  return (
    <div
      className="relative flex h-full flex-col"
      data-testid="task-note-list-panel"
    >
      <div className="pb-4">
        <p className="text-base font-semibold text-foreground">Notes</p>
        {/* <p className="text-sm text-muted-foreground">
          {entries.length === 0
            ? "No notes yet"
            : `${entries.length} note${entries.length === 1 ? "" : "s"}`}
        </p> */}
      </div>

      <div className="min-h-0 flex-1">
        <VerticalScrollArea
          className={cn("h-full pr-3", canCreate ? "pb-[72px]" : null)}
          data-testid="task-note-list-scroll-area"
          scrollRef={scrollRef}
          style={{ height: "100%" }}
        >
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                Loading notes...
              </div>
            ) : null}

            {isError ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                <p>Notes could not be loaded.</p>
                <button
                  className="mt-3 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground"
                  type="button"
                  onClick={onRetry}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {!isLoading && !isError && entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                No notes yet
              </div>
            ) : null}

            {!isLoading && !isError && entries.length > 0 ? (
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <TaskNoteCardRow
                    key={entry.note.client_id}
                    canDelete={canCreate}
                    entry={entry}
                    isDeleting={deletingNoteId === entry.note.client_id}
                    onDelete={() => onDelete(entry.note.client_id)}
                    onPress={() => onOpenDetail(entry.note.client_id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </VerticalScrollArea>
      </div>

      {canCreate ? (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 px-1 pb-1 transition-transform duration-300",
            isHidden ? "translate-y-full" : "translate-y-0",
          )}
        >
          <button
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            data-testid="task-notes-create-button"
            type="button"
            onClick={onCreate}
          >
            <Plus aria-hidden="true" className="size-5" />
            Add note
          </button>
        </div>
      ) : null}
    </div>
  );
}
