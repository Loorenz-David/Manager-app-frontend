import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  ReassignedStepsCountResponseSchema,
  type ReassignedStepsCount,
} from "../types";

const ResponseSchema = ApiEnvelopeSchema(ReassignedStepsCountResponseSchema);

/**
 * The badge endpoint. Handoff §4: it takes **no query parameters at all** — in
 * particular never `q`, so the badge cannot shrink because of a search box.
 */
export async function fetchReassignedStepsCount(): Promise<ReassignedStepsCount> {
  const envelope = await apiClient.get(
    "/api/v1/task-step-acknowledgments/reassigned-steps/count",
    ResponseSchema,
  );

  return envelope.data.reassigned_steps_count;
}
