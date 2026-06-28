export const taskStepKeys = {
  all: ["task-steps"] as const,
  byTaskAll: () => [...taskStepKeys.all, "by-task"] as const,
  byTask: (taskId: string) => [...taskStepKeys.all, "by-task", taskId] as const,
  counts: (taskId: string) => [...taskStepKeys.all, "counts", taskId] as const,
  missingTask: () => [...taskStepKeys.all, "missing-task"] as const,
};
