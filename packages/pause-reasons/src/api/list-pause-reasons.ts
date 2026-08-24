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
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.pause_type !== undefined) query.set("pause_type", params.pause_type);
  for (const userId of [...new Set(params.user_ids ?? [])].sort()) {
    query.append("user_ids", userId);
  }
  for (const workingSectionId of [
    ...new Set(params.working_section_ids ?? []),
  ].sort()) {
    query.append("working_section_ids", workingSectionId);
  }
  const queryString = query.toString();

  const response = await apiClient.get(
    `/api/v1/pause-reasons${queryString ? `?${queryString}` : ""}`,
    ListPauseReasonsResponseSchema,
  );

  return response.data;
}
