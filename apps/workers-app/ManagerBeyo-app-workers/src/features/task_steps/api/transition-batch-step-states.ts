import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { LastStateRecordSchema, StepStateSchema } from "../types";
import type {
  BatchStepTransitionRequest,
  BatchStepTransitionResponse,
} from "../types";

const ResponseDataSchema = z.object({
  items: z.array(
    z.object({
      step_id: z.string(),
      new_state: StepStateSchema,
      last_state_record: LastStateRecordSchema,
    }),
  ),
});

export async function transitionBatchStepStates(
  input: BatchStepTransitionRequest,
): Promise<BatchStepTransitionResponse> {
  const envelope = await apiClient.post(
    "/api/v1/tasks/steps/transition-batch",
    ApiEnvelopeSchema(ResponseDataSchema),
    input,
  );
  return envelope.data as BatchStepTransitionResponse;
}
