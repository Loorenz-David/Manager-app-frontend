import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";
import {
  TaskStepsPaginationSchema,
  type ListWorkingSectionStepsParams,
  type TaskStepsPagination,
} from "../types";

const ResponseDataSchema = z.object({
  steps_pagination: TaskStepsPaginationSchema,
});

export async function fetchWorkingSectionSteps(
  params: ListWorkingSectionStepsParams,
): Promise<TaskStepsPagination> {
  const { working_section_id, ...queryParams } = params;
  const envelope = await apiClient.get(
    `/api/v1/working-sections/${working_section_id}/steps`,
    ApiEnvelopeSchema(ResponseDataSchema),
    queryParams,
  );
  return envelope.data.steps_pagination;
}
