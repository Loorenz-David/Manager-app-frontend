export const taskNoteKeys = {
  all: ["task-notes"] as const,
  lists: () => [...taskNoteKeys.all, "list"] as const,
  list: (taskId: string) => [...taskNoteKeys.lists(), taskId] as const,
};
