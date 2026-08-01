import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { CurrentShiftSchema, type CurrentShift } from "../types";

const CurrentShiftResponseSchema = ApiEnvelopeSchema(CurrentShiftSchema);

/**
 * Handoff §12.1: `user_id` is mutually exclusive with the caller's role.
 * Manager/admin tokens **must** pass it; worker tokens **must** omit it (passing
 * someone else's id is a 403, and so is a manager omitting it).
 */
export async function fetchCurrentShift(
  user_id?: string,
): Promise<CurrentShift> {
  const response = await apiClient.get(
    "/api/v1/worker-shifts/current",
    CurrentShiftResponseSchema,
    user_id === undefined ? undefined : { user_id },
  );

  return response.data;
}
