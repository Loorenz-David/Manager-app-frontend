import { useEffect, useMemo, useState } from "react";
import { AuthRole, useAuth, useRole } from "@beyo/auth";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { IMAGE_VIEWER_SURFACE_ID } from "@beyo/images";
import { cn } from "@beyo/lib";

import { useDeleteTaskNote } from "../api/use-delete-task-note";
import { useTaskNotesQuery } from "../api/use-task-notes-query";
import { TaskNoteCreatePanel } from "../components/TaskNoteCreatePanel";
import { TaskNoteDetailPanel } from "../components/TaskNoteDetailPanel";
import { TaskNoteListPanel } from "../components/TaskNoteListPanel";
import { toTaskNoteViewerImages } from "../components/TaskNoteReadonlyImages";
import type { TaskNotesSheetSurfaceProps } from "../surface-ids";

type NotesPanel = "list" | "detail" | "create";
const NOTES_PANEL_HEIGHT = 400;

export function TaskNotesSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const surface = useSurface();
  const { user } = useAuth();
  const { hasRole, workspaceRoleName } = useRole();
  const { taskId, hideEditCapability = false } =
    useSurfaceProps<TaskNotesSheetSurfaceProps>();
  const notesQuery = useTaskNotesQuery(taskId);
  const deleteNote = useDeleteTaskNote();

  useEffect(() => {
    console.log("[TaskNotesSheetPage] notesQuery.data changed", {
      taskId,
      count: notesQuery.data?.length ?? null,
      isPending: notesQuery.isPending,
      isFetching: notesQuery.isFetching,
    });
  }, [notesQuery.data, notesQuery.isPending, notesQuery.isFetching, taskId]);
  const canManageNotes =
    !hideEditCapability &&
    (hasRole(AuthRole.Admin) ||
      hasRole(AuthRole.Manager) ||
      workspaceRoleName !== null);

  const entries = notesQuery.data ?? [];
  const [activePanel, setActivePanel] = useState<NotesPanel>("list");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [hasInitializedPanel, setHasInitializedPanel] = useState(false);
  const selectedEntry = useMemo(
    () =>
      entries.find((entry) => entry.note.client_id === selectedNoteId) ?? null,
    [entries, selectedNoteId],
  );

  useEffect(() => {
    header?.setHeaderHidden(true);
  }, [header]);

  useEffect(() => {
    if (hasInitializedPanel || notesQuery.isPending) {
      return;
    }

    if (entries.length === 1) {
      setSelectedNoteId(entries[0]?.note.client_id ?? null);
      setActivePanel("detail");
    } else {
      setActivePanel("list");
    }

    setHasInitializedPanel(true);
  }, [entries, hasInitializedPanel, notesQuery.isPending]);

  useEffect(() => {
    if (selectedNoteId && selectedEntry === null && !notesQuery.isPending) {
      if (entries.length === 1) {
        setSelectedNoteId(entries[0]?.note.client_id ?? null);
        setActivePanel("detail");
      } else {
        setSelectedNoteId(null);
        setActivePanel("list");
      }
    }
  }, [entries, notesQuery.isPending, selectedEntry, selectedNoteId]);

  function handleOpenDetail(noteId: string): void {
    setSelectedNoteId(noteId);
    setActivePanel("detail");
  }

  function handleDelete(noteId: string): void {
    if (!taskId) {
      return;
    }

    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setActivePanel("list");
    }

    setDeletingNoteId(noteId);
    deleteNote.mutate(
      { taskId, noteId },
      {
        onSettled: () => {
          setDeletingNoteId((currentValue) =>
            currentValue === noteId ? null : currentValue,
          );
        },
      },
    );
  }

  function handleOpenCreate(): void {
    setActivePanel("create");
  }

  function handleBackFromDetail(): void {
    setActivePanel("list");
  }

  function handleBackFromCreate(): void {
    setActivePanel("list");
  }

  if (!taskId) {
    return (
      <div
        className="p-4 text-sm text-muted-foreground"
        data-testid="task-notes-sheet-page"
      >
        Task id is missing.
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden bg-background"
      data-testid="task-notes-sheet-page"
      style={{ height: NOTES_PANEL_HEIGHT }}
    >
      <div
        className={cn(
          "absolute inset-0 px-4 pb-2  transition-transform duration-300",
          activePanel === "list" ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <TaskNoteListPanel
          canCreate={canManageNotes}
          entries={entries}
          deletingNoteId={deletingNoteId}
          isError={notesQuery.isError}
          isLoading={notesQuery.isPending}
          onCreate={handleOpenCreate}
          onDelete={handleDelete}
          onOpenDetail={handleOpenDetail}
          onRetry={() => {
            void notesQuery.refetch();
          }}
        />
      </div>

      <div
        className={cn(
          "absolute inset-0 px-4 pb-2  transition-transform duration-300",
          activePanel === "detail" ? "translate-x-0" : "translate-x-full",
        )}
      >
        {selectedEntry ? (
          <TaskNoteDetailPanel
            canEdit={canManageNotes}
            entry={selectedEntry}
            taskId={taskId}
            onBack={handleBackFromDetail}
            onRequestClose={() => header?.requestClose()}
            onOpenViewer={(imageClientId) => {
              const images = toTaskNoteViewerImages(selectedEntry);

              surface.open(IMAGE_VIEWER_SURFACE_ID, {
                images,
                initialImageClientId: imageClientId,
                entityType: "note",
                entityClientId: selectedEntry.note.client_id,
                mode: "preview-only",
                enableOnDemandImageLoad: false,
              });
            }}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "absolute inset-0 px-4 pb-2 transition-transform duration-300",
          activePanel === "create" ? "translate-x-0" : "translate-x-full",
        )}
      >
        <TaskNoteCreatePanel
          currentUserId={user?.id ?? null}
          taskId={taskId}
          onBack={handleBackFromCreate}
          onRequestClose={() => header?.requestClose()}
        />
      </div>
    </div>
  );
}
