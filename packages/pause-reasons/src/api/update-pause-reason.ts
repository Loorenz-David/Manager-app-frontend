import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import { ConfiguredPauseReasonSchema } from "../types";
import type {
  ConfiguredPauseReason,
  UpdatePauseReasonInput,
} from "../types";
import type { PauseReasonId } from "@beyo/lib";

const UpdatePauseReasonResponseSchema = ApiEnvelopeSchema(
  z.object({ pause_reason: ConfiguredPauseReasonSchema }),
);

export async function updatePauseReason(
  id: PauseReasonId,
  changes: UpdatePauseReasonInput,
): Promise<ConfiguredPauseReason> {
  const response = await apiClient.patch(
    `/api/v1/pause-reasons/${id}`,
    UpdatePauseReasonResponseSchema,
    changes,
  );
  return response.data.pause_reason;
}
