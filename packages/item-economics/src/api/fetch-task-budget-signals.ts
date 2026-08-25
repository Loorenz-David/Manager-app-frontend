import { z } from "zod";
import { apiClient } from "@beyo/api-client";
import { ApiEnvelopeSchema, type TaskId } from "@beyo/lib";

import { TaskBudgetSignalSchema, type TaskBudgetSignal } from "../types";

const TaskBudgetSignalsEnvelopeSchema = ApiEnvelopeSchema(
  z.object({ budget_signals: z.array(z.unknown()) }),
);

export const BUDGET_SIGNALS_MAX_TASK_IDS = 50;

/** Drops a malformed row without blanking signals on the rest of the feed. */
export function parseTaskBudgetSignals(
  rows: readonly unknown[],
): TaskBudgetSignal[] {
  const parsed: TaskBudgetSignal[] = [];
  const rejections: unknown[] = [];

  for (const row of rows) {
    const result = TaskBudgetSignalSchema.safeParse(row);
    if (result.success) parsed.push(result.data);
    else {
      rejections.push({
        taskId: (row as { task_id?: unknown })?.task_id ?? null,
        issues: result.error.issues,
      });
    }
  }

  if (rejections.length > 0) {
    console.warn(
      `[budget-signals] dropped ${rejections.length} of ${rows.length} task rows that did not match the expected shape`,
      rejections,
    );
  }
  return parsed;
}

export async function fetchTaskBudgetSignals(
  taskIds: TaskId[],
): Promise<TaskBudgetSignal[]> {
  if (taskIds.length === 0) return [];

  const chunks: TaskId[][] = [];
  for (let i = 0; i < taskIds.length; i += BUDGET_SIGNALS_MAX_TASK_IDS) {
    chunks.push(taskIds.slice(i, i + BUDGET_SIGNALS_MAX_TASK_IDS));
  }

  const pages = await Promise.all(
    chunks.map(async (chunk) => {
      const query = new URLSearchParams();
      for (const taskId of chunk) query.append("task_ids", taskId);
      const envelope = await apiClient.get(
        `/api/v1/item-economics/tasks/budget-signals?${query.toString()}`,
        TaskBudgetSignalsEnvelopeSchema,
      );
      return parseTaskBudgetSignals(envelope.data.budget_signals);
    }),
  );

  return pages.flat();
}
