export const TASK_NOTES_SHEET_SURFACE_ID = "task-notes-sheet";
export const TASK_NOTE_UNREAD_VIEWER_SURFACE_ID = "task-note-unread-viewer";

export type TaskNotesSheetSurfaceProps = {
  taskId: string;
  hideEditCapability?: boolean;
};

export type TaskNoteUnreadViewerSurfaceProps = {
  taskId: string;
};

export function preloadTaskNotesSheetSurface(): Promise<unknown> {
  return import("./pages/TaskNotesSheetPage");
}

export function preloadTaskNoteUnreadViewerSurface(): Promise<unknown> {
  return import("./pages/TaskNoteUnreadViewerPage");
}
