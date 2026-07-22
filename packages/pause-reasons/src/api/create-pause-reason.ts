import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import { PauseReasonSchema } from "../types";
import type { CreatePauseReasonInput, PauseReason } from "../types";

const CreatePauseReasonResponseSchema = ApiEnvelopeSchema(
  z.object({ pause_reason: PauseReasonSchema }),
);

export async function createPauseReason(
  input: CreatePauseReasonInput,
): Promise<PauseReason> {
  const response = await apiClient.put(
    "/api/v1/pause-reasons",
    CreatePauseReasonResponseSchema,
    input,
  );
  return response.data.pause_reason;
}
