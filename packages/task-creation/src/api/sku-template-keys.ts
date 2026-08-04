import type { TaskCreationFormType } from "../types";

export const skuTemplateKeys = {
  all: ["sku-templates"] as const,
  byTaskType: (taskType: TaskCreationFormType) =>
    [...skuTemplateKeys.all, "by-task-type", taskType] as const,
};
