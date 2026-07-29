import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import { CurrentShiftSchema, type CurrentShift } from "../types";

const CurrentShiftResponseSchema = ApiEnvelopeSchema(CurrentShiftSchema);

export async function fetchCurrentShift(user_id: string): Promise<CurrentShift> {
  const response = await apiClient.get(
    "/api/v1/worker-shifts/current",
    CurrentShiftResponseSchema,
    { user_id },
  );

  return response.data;
}
