import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  SkuReservationSchema,
  type SkuReservation,
  type TaskCreationFormType,
} from "../types";

const ReserveSkuTemplateResponseSchema = ApiEnvelopeSchema(
  SkuReservationSchema,
);

export async function reserveSkuTemplate(
  taskType: TaskCreationFormType,
): Promise<SkuReservation> {
  const envelope = await apiClient.post(
    `/api/v1/sku-templates/by-task-type/${taskType}/reserve`,
    ReserveSkuTemplateResponseSchema,
    undefined,
  );

  return envelope.data;
}
