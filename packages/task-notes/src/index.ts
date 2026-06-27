export type {
  TaskNoteApiEntry,
  TaskNoteApiImage,
  TaskNoteApiNote,
  TaskNoteApiUser,
  TaskNoteComposerValue,
  TaskNoteContentBlock,
  TaskNoteInlinePayload,
} from "./types";
export {
  hasMeaningfulNoteContent,
  plainTextToComposerContent,
  toTaskNoteContentBlocks,
} from "./lib/task-note-serialization";
export { taskNoteKeys } from "./api/task-note-keys";
export { fetchTaskNotes } from "./api/fetch-task-notes";
export { useTaskNotesQuery } from "./api/use-task-notes-query";
export { markTaskNoteReadBy } from "./api/mark-task-note-read-by";
export type {
  MarkTaskNoteReadByInput,
  MarkTaskNoteReadByResult,
} from "./api/mark-task-note-read-by";
export { useMarkTaskNoteReadBy } from "./api/use-mark-task-note-read-by";
export { createTaskNote } from "./api/create-task-note";
export type { CreateTaskNoteInput } from "./api/create-task-note";
export { useCreateTaskNote } from "./api/use-create-task-note";
export { updateTaskNote } from "./api/update-task-note";
export type { UpdateTaskNoteInput } from "./api/update-task-note";
export { useUpdateTaskNote } from "./api/use-update-task-note";
export { deleteTaskNote } from "./api/delete-task-note";
export type { DeleteTaskNoteInput } from "./api/delete-task-note";
export { useDeleteTaskNote } from "./api/use-delete-task-note";
export { TaskNoteComposer } from "./components/TaskNoteComposer";
export { TaskNoteContentView } from "./components/TaskNoteContentView";
export { TaskNoteCardRow } from "./components/TaskNoteCardRow";
export { TaskNoteImagesSection } from "./components/TaskNoteImagesSection";
export { TaskNoteReadonlyImages, toTaskNoteViewerImages } from "./components/TaskNoteReadonlyImages";
export { TaskNoteListPanel } from "./components/TaskNoteListPanel";
export { TaskNoteDetailPanel } from "./components/TaskNoteDetailPanel";
export { TaskNoteCreatePanel } from "./components/TaskNoteCreatePanel";
export { TaskNotePill } from "./components/TaskNotePill";
export { useTaskNotesUnreadController } from "./controllers/use-task-notes-unread.controller";
export type { UseTaskNotesUnreadControllerOptions } from "./controllers/use-task-notes-unread.controller";
export {
  TASK_NOTES_SHEET_SURFACE_ID,
  TASK_NOTE_UNREAD_VIEWER_SURFACE_ID,
  preloadTaskNotesSheetSurface,
  preloadTaskNoteUnreadViewerSurface,
} from "./surface-ids";
export type {
  TaskNotesSheetSurfaceProps,
  TaskNoteUnreadViewerSurfaceProps,
} from "./surface-ids";
export function loadTaskNotesSheetPage() {
  return import("./pages/TaskNotesSheetPage").then((m) => ({
    default: m.TaskNotesSheetPage,
  }));
}
export function loadTaskNoteUnreadViewerPage() {
  return import("./pages/TaskNoteUnreadViewerPage").then((m) => ({
    default: m.TaskNoteUnreadViewerPage,
  }));
}
export { taskNoteSocketEvents } from "./socket-events";
