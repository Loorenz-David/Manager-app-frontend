import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import { ConfiguredPauseReasonSchema } from "../types";
import type { ConfiguredPauseReason, CreatePauseReasonInput } from "../types";

const CreatePauseReasonResponseSchema = ApiEnvelopeSchema(
  z.object({ pause_reason: ConfiguredPauseReasonSchema }),
);

export async function createPauseReason(
  input: CreatePauseReasonInput,
): Promise<ConfiguredPauseReason> {
  const response = await apiClient.put(
    "/api/v1/pause-reasons",
    CreatePauseReasonResponseSchema,
    input,
  );
  return response.data.pause_reason;
}
