import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import {
  SkuTemplatePreviewSchema,
  type SkuTemplatePreview,
  type TaskCreationFormType,
} from "../types";

const GetSkuTemplateResponseSchema = ApiEnvelopeSchema(SkuTemplatePreviewSchema);

/**
 * Reads a task type's SKU template so the form can show the number that would
 * be assigned next. Non-destructive — safe to call as often as the form needs.
 * A 404 means the workspace has no template for this task type; the caller
 * then shows no preview and keeps requiring a manual identity.
 */
export async function getSkuTemplateByTaskType(
  taskType: TaskCreationFormType,
): Promise<SkuTemplatePreview> {
  const envelope = await apiClient.get(
    `/api/v1/sku-templates/by-task-type/${taskType}`,
    GetSkuTemplateResponseSchema,
  );

  return envelope.data;
}
