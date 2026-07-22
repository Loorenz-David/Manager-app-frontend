import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import { PauseReasonSchema } from "../types";
import type {
  PauseReason,
  UpdatePauseReasonInput,
} from "../types";
import type { PauseReasonId } from "@beyo/lib";

const UpdatePauseReasonResponseSchema = ApiEnvelopeSchema(
  z.object({ pause_reason: PauseReasonSchema }),
);

export async function updatePauseReason(
  id: PauseReasonId,
  changes: UpdatePauseReasonInput,
): Promise<PauseReason> {
  const response = await apiClient.patch(
    `/api/v1/pause-reasons/${id}`,
    UpdatePauseReasonResponseSchema,
    changes,
  );
  return response.data.pause_reason;
}
