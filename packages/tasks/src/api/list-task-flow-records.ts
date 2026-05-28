import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ListTaskFlowRecordsResponseSchema,
  type ListTaskFlowRecordsResponse,
} from "../types";

export async function listTaskFlowRecords(
  taskId: string,
): Promise<ListTaskFlowRecordsResponse> {
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/flow-records`,
    ApiEnvelopeSchema(ListTaskFlowRecordsResponseSchema),
  );

  return envelope.data;
}
