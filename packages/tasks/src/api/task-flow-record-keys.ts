export const taskFlowRecordKeys = {
  all: ["task-flow-records"] as const,
  byTask: (taskId: string) => [...taskFlowRecordKeys.all, taskId] as const,
  byTaskInfinite: (taskId: string) =>
    [...taskFlowRecordKeys.all, taskId, "infinite"] as const,
  missing: () => [...taskFlowRecordKeys.all, "missing"] as const,
};
