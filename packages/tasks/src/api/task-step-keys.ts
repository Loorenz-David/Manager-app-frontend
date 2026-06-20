export const taskStepKeys = {
  all: ["task-steps"] as const,
  byTask: (taskId: string) => [...taskStepKeys.all, "by-task", taskId] as const,
  missingTask: () => [...taskStepKeys.all, "missing-task"] as const,
};
