import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema, type TaskId } from "@beyo/lib";

import {
  TaskProductionTimeSchema,
  type TaskProductionTime,
} from "../types";

const TaskProductionTimeEnvelopeSchema = ApiEnvelopeSchema(
  TaskProductionTimeSchema,
);

export async function fetchTaskProductionTime(
  taskId: TaskId,
): Promise<TaskProductionTime> {
  const response = await apiClient.get(
    `/api/v1/item-economics/tasks/${taskId}/production-time`,
    TaskProductionTimeEnvelopeSchema,
  );

  return response.data;
}
