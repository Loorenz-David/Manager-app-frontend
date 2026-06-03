import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  ListTaskFlowRecordsResponseSchema,
  type ListTaskFlowRecordsResponse,
} from "../types";

export async function listTaskFlowRecords(
  taskId: string,
  params: { limit: number; offset: number } = { limit: 10, offset: 0 },
): Promise<ListTaskFlowRecordsResponse> {
  const { limit, offset } = params;
  const envelope = await apiClient.get(
    `/api/v1/tasks/${taskId}/flow-records?limit=${limit}&offset=${offset}`,
    ApiEnvelopeSchema(ListTaskFlowRecordsResponseSchema),
  );

  return envelope.data;
}
