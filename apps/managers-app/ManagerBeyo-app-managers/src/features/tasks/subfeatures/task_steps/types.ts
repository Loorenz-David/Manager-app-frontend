import { z } from 'zod';

import type { TaskId, TaskStepId, UserId, WorkingSectionId } from '@/types/common';

export const TASK_STEP_STATE = [
  'pending',
  'working',
  'paused',
  'ended_shift',
  'blocked',
  'completed',
  'skipped',
  'failed',
  'cancelled',
] as const;
export const TASK_STEP_READINESS_STATUS = ['blocked', 'partial', 'ready'] as const;

export const TaskStepSchema = z.object({
  id: z.string().transform((v) => v as TaskStepId),
  task_id: z.string().transform((v) => v as TaskId),
  state: z.enum(TASK_STEP_STATE),
  readiness_status: z.enum(TASK_STEP_READINESS_STATUS),
  sequence_order: z.number().int().nullable(),
  working_section_id: z.string().transform((v) => v as WorkingSectionId),
  assigned_worker_id: z.string().transform((v) => v as UserId).nullable(),
  total_dependencies: z.number().int(),
  completed_dependencies: z.number().int(),
  recorded_time_marked_wrong: z.boolean(),
  taken_from_average: z.boolean(),
  working_section_name_snapshot: z.string().nullable(),
  assigned_worker_display_name_snapshot: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  created_by_id: z.string().transform((v) => v as UserId).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  latest_state_record_id: z.string().nullable(),
});

export type TaskStep = z.infer<typeof TaskStepSchema>;

export const CreateTaskStepInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  working_section_id: z.string().min(1),
  sequence_order: z.number().int().nonnegative().optional(),
});
export type CreateTaskStepInput = z.infer<typeof CreateTaskStepInputSchema>;

export const AssignWorkerToStepInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  step_id: z.string().transform((v) => v as TaskStepId),
  worker_id: z.string().min(1),
});
export type AssignWorkerToStepInput = z.infer<typeof AssignWorkerToStepInputSchema>;

export const TransitionStepStateInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  step_id: z.string().transform((v) => v as TaskStepId),
});
export type TransitionStepStateInput = z.infer<typeof TransitionStepStateInputSchema>;

export const AddStepDependencyInputSchema = z.object({
  task_id: z.string().transform((v) => v as TaskId),
  step_id: z.string().transform((v) => v as TaskStepId),
  prerequisite_step_id: z.string().min(1),
});
export type AddStepDependencyInput = z.infer<typeof AddStepDependencyInputSchema>;

export type ListTaskStepsParams = {
  task_id: TaskId;
};

export type TaskStepViewModel = TaskStep & {
  state_label: string;
  readiness_label: string;
  is_blocked: boolean;
  is_complete: boolean;
  dependencies_progress: string;
  worker_display: string | null;
};

export function toTaskStepViewModel(step: TaskStep): TaskStepViewModel {
  return {
    ...step,
    state_label: step.state,
    readiness_label: step.readiness_status,
    is_blocked:
      step.total_dependencies > 0 && step.completed_dependencies < step.total_dependencies,
    is_complete: step.state === 'completed',
    dependencies_progress:
      step.total_dependencies > 0
        ? `${step.completed_dependencies}/${step.total_dependencies}`
        : '',
    worker_display: step.assigned_worker_display_name_snapshot,
  };
}
