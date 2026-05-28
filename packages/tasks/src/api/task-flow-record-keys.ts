export const taskFlowRecordKeys = {
  all: ["task-flow-records"] as const,
  byTask: (taskId: string) => [...taskFlowRecordKeys.all, taskId] as const,
  missing: () => [...taskFlowRecordKeys.all, "missing"] as const,
};
