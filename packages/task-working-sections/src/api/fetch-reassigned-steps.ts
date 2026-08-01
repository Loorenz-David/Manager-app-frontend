import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  ReassignedStepsResponseSchema,
  type ListReassignedStepsParams,
  type ReassignedStepsResponse,
} from "../types";

export const REASSIGNED_STEPS_PAGE_SIZE = 20;
/** Handoff §3.1: a longer `q` is a 422 — clamp rather than let the request fail. */
export const REASSIGNED_STEPS_MAX_QUERY_LENGTH = 200;

const ResponseSchema = ApiEnvelopeSchema(ReassignedStepsResponseSchema);

export function normalizeReassignedStepsQuery(
  q: string | undefined,
): string | undefined {
  const trimmed = q?.trim() ?? "";
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.slice(0, REASSIGNED_STEPS_MAX_QUERY_LENGTH);
}

export async function fetchReassignedSteps(
  params: ListReassignedStepsParams = {},
): Promise<ReassignedStepsResponse> {
  const q = normalizeReassignedStepsQuery(params.q);

  const envelope = await apiClient.get(
    "/api/v1/task-step-acknowledgments/reassigned-steps",
    ResponseSchema,
    {
      limit: params.limit ?? REASSIGNED_STEPS_PAGE_SIZE,
      offset: params.offset ?? 0,
      ...(q === undefined ? {} : { q }),
      ...(params.unacknowledged_only === undefined
        ? {}
        : { unacknowledged_only: params.unacknowledged_only }),
    },
  );

  return envelope.data;
}
