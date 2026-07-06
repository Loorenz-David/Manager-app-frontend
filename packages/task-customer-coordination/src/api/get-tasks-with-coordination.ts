import { z } from "zod";

import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema } from "@beyo/lib";

import { TaskListItemWithCoordinationRawSchema } from "../types";
import type {
  ListTasksWithCoordinationParams,
  ListTasksWithCoordinationResult,
} from "../types";

const GetTasksWithCoordinationResponseSchema = ApiEnvelopeSchema(
  z.object({
    tasks_pagination: z.object({
      items: z.array(TaskListItemWithCoordinationRawSchema),
      limit: z.number().int(),
      offset: z.number().int(),
      has_more: z.boolean(),
    }),
  }),
).extend({ ok: z.literal(true) });

export async function getTasksWithCoordination(
  params: ListTasksWithCoordinationParams,
): Promise<ListTasksWithCoordinationResult> {
  const queryParams: Record<string, string | number | boolean> = {};

  if (params.limit != null) queryParams.limit = params.limit;
  if (params.offset != null) queryParams.offset = params.offset;
  if (params.q) queryParams.q = params.q;
  if (params.task_types) queryParams.task_types = params.task_types;
  if (params.task_states) queryParams.task_states = params.task_states;
  if (params.task_step_states) queryParams.task_step_states = params.task_step_states;
  if (params.step_readiness_statuses) {
    queryParams.step_readiness_statuses = params.step_readiness_statuses;
  }
  if (params.priorities) queryParams.priorities = params.priorities;
  if (params.return_sources) queryParams.return_sources = params.return_sources;
  if (params.working_section_ids) {
    queryParams.working_section_ids = params.working_section_ids;
  }
  if (params.ready_from_date) queryParams.ready_from_date = params.ready_from_date;
  if (params.ready_to_date) queryParams.ready_to_date = params.ready_to_date;
  if (params.scheduled_from_date) {
    queryParams.scheduled_from_date = params.scheduled_from_date;
  }
  if (params.scheduled_to_date) {
    queryParams.scheduled_to_date = params.scheduled_to_date;
  }
  if (params.upholstery_requirement_states) {
    queryParams.upholstery_requirement_states =
      params.upholstery_requirement_states;
  }
  if (params.post_handling_states) {
    queryParams.post_handling_states = params.post_handling_states;
  }
  if (params.customer_coordination_states) {
    queryParams.customer_coordination_states =
      params.customer_coordination_states;
  }
  if (params.deleted != null) queryParams.deleted = params.deleted;
  if (params.order_by) queryParams.order_by = params.order_by;

  const parsed = await apiClient.get(
    "/api/v1/tasks",
    GetTasksWithCoordinationResponseSchema,
    queryParams,
  );

  return parsed.data.tasks_pagination;
}
