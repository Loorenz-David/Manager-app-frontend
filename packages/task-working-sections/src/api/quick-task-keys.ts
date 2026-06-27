export const quickTaskKeys = {
  all: ["quick-tasks"] as const,
  counts: (taskType: string, taskStates: string) =>
    [...quickTaskKeys.all, "counts", taskType, taskStates] as const,
  list: (taskType: string, taskStates: string, limit: number) =>
    [...quickTaskKeys.all, "list", taskType, taskStates, limit] as const,
};
