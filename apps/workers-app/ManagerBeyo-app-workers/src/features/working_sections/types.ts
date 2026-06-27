import { z } from "zod";
import type { WorkingSectionId } from "@beyo/lib";

const WorkingSectionIdSchema = z
  .string()
  .transform((value) => value as WorkingSectionId);

export const TaskStepStateCountsSchema = z.object({
  pending: z.number(),
  working: z.number(),
  paused: z.number(),
  ended_shift: z.number(),
  blocked: z.number(),
  completed: z.number(),
  skipped: z.number(),
  failed: z.number(),
});
export type TaskStepStateCounts = z.infer<typeof TaskStepStateCountsSchema>;

export const WorkerWorkingSectionSchema = z.object({
  client_id: WorkingSectionIdSchema,
  name: z.string(),
  image: z.string().nullable(),
  allows_batch_working: z.boolean(),
  task_steps_counts: TaskStepStateCountsSchema,
  ready_and_pending_count: z.number(),
});
export type WorkerWorkingSection = z.infer<typeof WorkerWorkingSectionSchema>;

export const WorkerWorkingSectionsResponseSchema = z.object({
  working_sections: z.array(WorkerWorkingSectionSchema),
});

export type WorkingSectionViewModel = {
  sectionId: WorkingSectionId;
  name: string;
  imageUrl: string | null;
  allowsBatchWorking: boolean;
  counts: TaskStepStateCounts;
  activeCount: number;
  readyAndPendingCount: number;
  todayDoneCount: number;
};

export function toWorkingSectionViewModel(
  section: WorkerWorkingSection,
): WorkingSectionViewModel {
  const c = section.task_steps_counts;

  return {
    sectionId: section.client_id,
    name: section.name,
    imageUrl: section.image,
    allowsBatchWorking: section.allows_batch_working,
    counts: c,
    activeCount: section.ready_and_pending_count + c.working + c.paused + c.ended_shift,
    readyAndPendingCount: section.ready_and_pending_count,
    todayDoneCount: c.completed + c.skipped + c.failed,
  };
}
