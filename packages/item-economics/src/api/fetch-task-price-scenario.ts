import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema, type TaskId } from "@beyo/lib";

import {
  ITEM_ECONOMICS_BASE_PATH,
  PriceScenarioSchema,
  type PriceScenario,
} from "../types";

/**
 * The one read of the expected sold price screen (price-scenario handoff §1).
 *
 * Task-scoped, not item-scoped: the typical time and the participating section
 * set only exist relative to a task's steps, and the commit this screen pairs
 * with is task-scoped too.
 */
const TaskPriceScenarioEnvelopeSchema = ApiEnvelopeSchema(PriceScenarioSchema);

export async function fetchTaskPriceScenario(
  taskId: TaskId,
): Promise<PriceScenario> {
  const response = await apiClient.get(
    `${ITEM_ECONOMICS_BASE_PATH}/tasks/${taskId}/price-scenario`,
    TaskPriceScenarioEnvelopeSchema,
  );

  return response.data;
}
