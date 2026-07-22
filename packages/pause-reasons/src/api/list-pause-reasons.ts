import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  PauseReasonsListSchema,
  type ListPauseReasonsParams,
  type PauseReasonsList,
} from "../types";

const ListPauseReasonsResponseSchema = ApiEnvelopeSchema(
  PauseReasonsListSchema,
);

export async function listPauseReasons(
  params: ListPauseReasonsParams = {},
): Promise<PauseReasonsList> {
  const queryParams: Record<string, string | number | undefined> = {
    limit: params.limit,
    offset: params.offset,
    pause_type: params.pause_type,
  };

  const response = await apiClient.get(
    "/api/v1/pause-reasons",
    ListPauseReasonsResponseSchema,
    queryParams,
  );

  return response.data;
}
