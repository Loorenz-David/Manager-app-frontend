import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema, type TaskId } from "@beyo/lib";

import {
  TaskBudgetAllocationSchema,
  type TaskBudgetAllocation,
} from "../types";

/**
 * The batch is opened row by row on purpose.
 *
 * One task whose shape the frontend does not expect must cost that task its
 * figures and nothing more. Validating the array as a whole meant a single
 * unexpected null blanked the budget line on every card in the feed — which is
 * exactly what a null `actual_worker_seconds` did, the handoff having promised
 * that field was never null.
 */
const TaskBudgetAllocationsEnvelopeSchema = ApiEnvelopeSchema(
  z.object({ budget_allocations: z.array(z.unknown()) }),
);

/**
 * Backend hard cap per call; exceeding it returns
 * `BUDGET_ALLOCATIONS_TOO_MANY_TASK_IDS` (handoff §1).
 */
export const BUDGET_ALLOCATIONS_MAX_TASK_IDS = 50;

/**
 * Keeps every row the frontend understands and drops the rest with a warning,
 * so a contract drift degrades one task instead of the whole screen.
 */
export function parseBudgetAllocations(
  rows: readonly unknown[],
): TaskBudgetAllocation[] {
  const parsed: TaskBudgetAllocation[] = [];
  const rejections: unknown[] = [];

  for (const row of rows) {
    const result = TaskBudgetAllocationSchema.safeParse(row);

    if (result.success) {
      parsed.push(result.data);
    } else {
      rejections.push({
        taskId: (row as { task_id?: unknown })?.task_id ?? null,
        issues: result.error.issues,
      });
    }
  }

  if (rejections.length > 0) {
    console.warn(
      `[budget-allocations] dropped ${rejections.length} of ${rows.length} task rows that did not match the expected shape`,
      rejections,
    );
  }

  return parsed;
}

/**
 * Unknown, deleted, or other-workspace task ids are silently omitted from the
 * response — a missing task entry is not a failure (handoff §1).
 *
 * `task_ids` is a repeatable query param; the shared apiClient params object
 * can only set each key once, so the query string is built here.
 */
export async function fetchTaskBudgetAllocations(
  taskIds: TaskId[],
): Promise<TaskBudgetAllocation[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const chunks: TaskId[][] = [];
  for (let i = 0; i < taskIds.length; i += BUDGET_ALLOCATIONS_MAX_TASK_IDS) {
    chunks.push(taskIds.slice(i, i + BUDGET_ALLOCATIONS_MAX_TASK_IDS));
  }

  const pages = await Promise.all(
    chunks.map(async (chunk) => {
      const query = new URLSearchParams();
      for (const taskId of chunk) {
        query.append("task_ids", taskId);
      }

      const envelope = await apiClient.get(
        `/api/v1/item-economics/tasks/budget-allocations?${query.toString()}`,
        TaskBudgetAllocationsEnvelopeSchema,
      );

      return parseBudgetAllocations(envelope.data.budget_allocations);
    }),
  );

  return pages.flat();
}
