import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import { PauseReasonSchema, type PauseReason } from "../types";
import type { PauseReasonId } from "@beyo/lib";

const GetPauseReasonResponseSchema = ApiEnvelopeSchema(
  z.object({ pause_reason: PauseReasonSchema }),
);

export async function getPauseReason(
  id: PauseReasonId,
): Promise<PauseReason> {
  const response = await apiClient.get(
    `/api/v1/pause-reasons/${id}`,
    GetPauseReasonResponseSchema,
  );
  return response.data.pause_reason;
}
