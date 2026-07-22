import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { z } from "zod";
import type { PauseReasonId } from "@beyo/lib";

export async function deletePauseReason(id: PauseReasonId): Promise<void> {
  await apiClient.delete(
    `/api/v1/pause-reasons/${id}`,
    ApiEnvelopeSchema(z.object({})),
  );
}
