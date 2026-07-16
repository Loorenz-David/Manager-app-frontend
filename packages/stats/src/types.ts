import { z } from "zod";

import { ApiEnvelopeSchema } from "@beyo/lib";
import { TASK_RETURN_SOURCE, TASK_TYPE } from "@beyo/tasks";
import type { StepState } from "@beyo/tasks";

export const StepStateSchema = z.enum([
  "pending",
  "working",
  "paused",
  "ended_shift",
  "blocked",
  "completed",
  "skipped",
  "failed",
  "cancelled",
]) satisfies z.ZodType<StepState>;

export const WorkerStatsUserSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
  last_online: z.string().nullable(),
});
export type WorkerStatsUser = z.infer<typeof WorkerStatsUserSchema>;

export const WorkerLastStepSchema = z.object({
  client_id: z.string(),
  task_id: z.string().optional(),
  state: StepStateSchema,
  working_section_id: z.string(),
  working_section_name_snapshot: z.string(),
  item: z
    .object({
      article_number: z.string().nullable(),
      sku: z.string().nullable(),
    })
    .nullable(),
  last_state_record: z
    .object({
      entered_at: z.string(),
      // Why the step entered this state (StepTransitionReason enum value);
      // populated for paused/ended-shift transitions. Kept as a tolerant string.
      reason: z.string().nullable().optional(),
    })
    .nullable(),
  total_working_seconds: z.number().int(),
  total_pause_seconds: z.number().int(),
  total_ended_shift_seconds: z.number().int(),
});
export type WorkerLastStep = z.infer<typeof WorkerLastStepSchema>;

export const DailyStatsSchema = z.object({
  work_date: z.string(),
  total_working_seconds: z.number().int(),
  total_pause_seconds: z.number().int(),
  total_completed_count: z.number().int(),
});
export type DailyStats = z.infer<typeof DailyStatsSchema>;

// Summed running time of the worker's currently-open intervals, on top of the
// settled `daily_stats`/`totals` (which exclude in-progress time). Live total =
// settled + running; tick locally by advancing each metric by
// `open_count × (now − as_of)`. All-zero for past days / nothing open.
// See docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_running_live_totals_20260716.md
export const RunningTotalsSchema = z.object({
  working_seconds: z.number().int(),
  pause_seconds: z.number().int(),
  ended_shift_seconds: z.number().int(),
  working_open_count: z.number().int(),
  pause_open_count: z.number().int(),
  ended_shift_open_count: z.number().int(),
  as_of: z.string(),
});
export type RunningTotals = z.infer<typeof RunningTotalsSchema>;

export const ZERO_RUNNING_TOTALS: RunningTotals = {
  working_seconds: 0,
  pause_seconds: 0,
  ended_shift_seconds: 0,
  working_open_count: 0,
  pause_open_count: 0,
  ended_shift_open_count: 0,
  as_of: new Date(0).toISOString(),
};

export const InsightPolaritySchema = z.enum(["positive", "negative"]);
export type InsightPolarity = z.infer<typeof InsightPolaritySchema>;

export const InsightSeveritySchema = z.enum(["low", "medium", "high"]);
export type InsightSeverity = z.infer<typeof InsightSeveritySchema>;

// A ranked (strongest-first), capped 0–3 list of observations about the worker's
// day vs their own baseline. `code` is an open set — unknown codes are ignorable.
// Copy is rendered client-side (see lib/insight-copy.ts); trust `polarity` for
// valence, never infer it from the sign of `delta`.
export const WorkerInsightSchema = z.object({
  code: z.string(),
  polarity: InsightPolaritySchema,
  metric: z.string(),
  target_value: z.number(),
  baseline_value: z.number(),
  delta: z.number(),
  delta_pct: z.number().nullable(),
  sample_size: z.number().int(),
  severity: InsightSeveritySchema,
});
export type WorkerInsight = z.infer<typeof WorkerInsightSchema>;

export const WorkerStatsRowSchema = z.object({
  user: WorkerStatsUserSchema,
  last_interacted_step: WorkerLastStepSchema.nullable(),
  batch: z.unknown().nullable(),
  daily_stats: DailyStatsSchema,
  // Always present per the running-live-totals contract; defaulted for resilience.
  running: RunningTotalsSchema.optional().default(ZERO_RUNNING_TOTALS),
  insights: z.array(WorkerInsightSchema).default([]),
});
export type WorkerStatsRow = z.infer<typeof WorkerStatsRowSchema>;

export const WorkerStatsPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number().int(),
  offset: z.number().int(),
  total: z.number().int(),
});

export const WorkerStatsResponseSchema = ApiEnvelopeSchema(
  z.object({
    workers: z.array(WorkerStatsRowSchema),
    workers_pagination: WorkerStatsPaginationSchema,
  }),
);
export type WorkerStatsResponse = z.infer<typeof WorkerStatsResponseSchema>;

export type ListWorkerStatsParams = {
  limit?: number;
  offset?: number;
};

// ── Worker daily-step granularity drill-down ────────────────────────────────
// GET /api/v1/worker-stats/{user_id}/daily-steps
// See docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_daily_step_breakdown_20260716.md

export const WORKER_GRANULARITY_INTENTIONS = [
  "working",
  "paused",
  "completed",
] as const;
export type WorkerGranularityIntention =
  (typeof WORKER_GRANULARITY_INTENTIONS)[number];

// The intention is sent to the backend as `sort_by`. `working`/`paused` order
// by that metric's contribution (biggest first); `completed` filters to steps
// completed that day, ordered by completion time (newest first).
export const INTENTION_SORT_BY: Record<WorkerGranularityIntention, string> = {
  working: "working",
  paused: "paused",
  completed: "completed",
};

export const StepContributionSchema = z.object({
  working_seconds: z.number().int(),
  pause_seconds: z.number().int(),
  ended_shift_seconds: z.number().int(),
  completed_count: z.number().int(),
});
export type StepContribution = z.infer<typeof StepContributionSchema>;

// Only time-bearing states carry a running interval; completed is never here.
export const ActiveRecordSchema = z
  .object({
    state: z.enum(["working", "paused", "ended_shift"]),
    entered_at: z.string(),
  })
  .nullable();
export type ActiveRecord = z.infer<typeof ActiveRecordSchema>;

// serialize_task_light | null — only the fields the granularity card consumes;
// non-strict so the remaining light fields pass through harmlessly.
export const DailyStepTaskLightSchema = z
  .object({
    client_id: z.string(),
    task_type: z.enum(TASK_TYPE),
    return_source: z.enum(TASK_RETURN_SOURCE).nullable(),
    ready_by_at: z.string().nullable(),
  })
  .nullable();
export type DailyStepTaskLight = z.infer<typeof DailyStepTaskLightSchema>;

// serialize_item_worker_light | null — the light item has NO
// item_major_category_snapshot; the quantity pill renders as plain #{quantity}.
export const DailyStepItemLightSchema = z
  .object({
    client_id: z.string(),
    article_number: z.string().nullable(),
    sku: z.string().nullable(),
    quantity: z.number().int(),
  })
  .nullable();
export type DailyStepItemLight = z.infer<typeof DailyStepItemLightSchema>;

// item_images[]: first is rich (serialize_image), rest light. Only the fields
// needed to render the thumbnail and open the viewer are modeled.
export const DailyStepImageSchema = z.object({
  client_id: z.string(),
  image_url: z.string(),
  width_px: z.number().int().nullable().optional(),
  height_px: z.number().int().nullable().optional(),
  file_size_bytes: z.number().int().nullable().optional(),
  created_at: z.string().optional(),
});
export type DailyStepImage = z.infer<typeof DailyStepImageSchema>;

export const WorkerDailyStepSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  state: StepStateSchema,
  working_section_name_snapshot: z.string().optional(),
  task: DailyStepTaskLightSchema.optional().default(null),
  item: DailyStepItemLightSchema.optional().default(null),
  item_images: z.array(DailyStepImageSchema).default([]),
  contribution: StepContributionSchema,
  active_record: ActiveRecordSchema.default(null),
  last_activity_at: z.string().nullable().default(null),
  last_completed_at: z.string().nullable().default(null),
});
export type WorkerDailyStep = z.infer<typeof WorkerDailyStepSchema>;

export const WorkerDailyStepsPageSchema = z.object({
  items: z.array(WorkerDailyStepSchema),
  limit: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean(),
});

export const WorkerDailyStepsResponseSchema = ApiEnvelopeSchema(
  z.object({
    user: WorkerStatsUserSchema,
    work_date: z.string(),
    totals: StepContributionSchema,
    daily_stats: DailyStatsSchema,
    steps: WorkerDailyStepsPageSchema,
  }),
);
export type WorkerDailyStepsResponse = z.infer<
  typeof WorkerDailyStepsResponseSchema
>;

export type ListWorkerDailyStepsParams = {
  userId: string;
  intention: WorkerGranularityIntention;
  limit?: number;
  offset?: number;
  workDate?: string;
};
