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

// ── Inaccurate-time estimation ──────────────────────────────────────────────
// See docs/handoff/from_backend/HANDOFF_TO_FRONTEND_worker_stats_inaccurate_time_estimation_20260718.md
// Three alternatives for the same time: `trusted` (persisted, step not flagged),
// `wasted` (persisted time from flagged steps — diagnostic only, NEVER added to
// trusted), and `estimated_fill` (a modelled replacement for the flagged steps).
// The manager-facing usable number is `trusted + estimated_fill`; `wasted` and
// `estimated_fill` are never summed together.

export const TIME_STRATEGIES = ["mean", "median", "iqr"] as const;
export type TimeStrategy = (typeof TIME_STRATEGIES)[number];
export const TimeStrategySchema = z.enum(TIME_STRATEGIES);

// Per-state alternatives. `estimated_fill` is a float (seconds), not an int.
export const TimeQualityStateSchema = z.object({
  trusted: z.number().int(),
  wasted: z.number().int(),
  inaccurate_step_count: z.number().int(),
  estimated_fill: z.number(),
});
export type TimeQualityState = z.infer<typeof TimeQualityStateSchema>;

export const TimeQualitySchema = z.object({
  strategy: TimeStrategySchema,
  working: TimeQualityStateSchema,
  paused: TimeQualityStateSchema,
});
export type TimeQuality = z.infer<typeof TimeQualitySchema>;

// The roster/breakdown daily stats are summed over an inclusive [date_from,
// date_to] range. `work_date` is the legacy single-day key, kept optional so an
// older payload still parses. `time_quality` is additive.
export const DailyStatsSchema = z.object({
  work_date: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  total_working_seconds: z.number().int(),
  total_pause_seconds: z.number().int(),
  total_ended_shift_seconds: z.number().int().optional(),
  total_completed_count: z.number().int(),
  time_quality: TimeQualitySchema.optional(),
});
export type DailyStats = z.infer<typeof DailyStatsSchema>;

// Summed running time of the worker's currently-open intervals, on top of the
// settled `daily_stats`/`totals` (which exclude in-progress time). Live total =
// settled + running; tick locally by advancing each metric at real time while
// any interval for that state is open. All-zero for past days / nothing open.
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

export const WorkerLastStepRowSchema = z.object({
  user: WorkerStatsUserSchema,
  last_interacted_step: WorkerLastStepSchema.nullable(),
  batch: z.unknown().nullable(),
});
export type WorkerLastStepRow = z.infer<typeof WorkerLastStepRowSchema>;

export const WorkerTotalsRowSchema = z.object({
  user: WorkerStatsUserSchema,
  daily_stats: DailyStatsSchema,
  // Always present per the running-live-totals contract; defaulted for resilience.
  running: RunningTotalsSchema.optional().default(ZERO_RUNNING_TOTALS),
});
export type WorkerTotalsRow = z.infer<typeof WorkerTotalsRowSchema>;

export const WorkerInsightsRowSchema = z.object({
  user: WorkerStatsUserSchema,
  insights: z.array(WorkerInsightSchema).default([]),
});
export type WorkerInsightsRow = z.infer<typeof WorkerInsightsRowSchema>;

export const WorkerStatsPaginationSchema = z.object({
  has_more: z.boolean(),
  limit: z.number().int(),
  offset: z.number().int(),
  total: z.number().int(),
});

export const WorkerLastStepsResponseSchema = ApiEnvelopeSchema(
  z.object({
    workers: z.array(WorkerLastStepRowSchema),
    workers_pagination: WorkerStatsPaginationSchema,
  }),
);
export type WorkerLastStepsResponse = z.infer<
  typeof WorkerLastStepsResponseSchema
>;

export const WorkerTotalsResponseSchema = ApiEnvelopeSchema(
  z.object({
    workers: z.array(WorkerTotalsRowSchema),
    workers_pagination: WorkerStatsPaginationSchema,
  }),
);
export type WorkerTotalsResponse = z.infer<typeof WorkerTotalsResponseSchema>;

export const WorkerInsightsResponseSchema = ApiEnvelopeSchema(
  z.object({
    workers: z.array(WorkerInsightsRowSchema),
    workers_pagination: WorkerStatsPaginationSchema,
  }),
);
export type WorkerInsightsResponse = z.infer<
  typeof WorkerInsightsResponseSchema
>;

export type WorkerStatsDateRange = {
  from: string;
  to: string;
};

// Keep the backend's range parameter names in one place.
export const WORK_DATE_RANGE_PARAMS = {
  from: "date_from",
  to: "date_to",
} as const;

type WorkerStatsPaginationParams = {
  limit?: number;
  offset?: number;
};

export type ListWorkerLastStepsParams = WorkerStatsPaginationParams & {
  workDate?: string;
};

export type ListWorkerTotalsParams = WorkerStatsPaginationParams & {
  dateFrom?: string;
  dateTo?: string;
  // Selects which statistic backs `daily_stats.time_quality.*.estimated_fill`.
  // Omitted → backend defaults to `mean`.
  timeStrategy?: TimeStrategy;
};

export type ListWorkerInsightsParams = WorkerStatsPaginationParams & {
  workDate?: string;
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

// The intention is sent to the backend as `sort_by`. All three both FILTER and
// order: each lists only steps contributing to that metric (a zero-contribution
// step would render as a 0h 0m card), ordered by it. `working`/`paused` sort by
// that metric's contribution (biggest first); `completed` by completion time
// (newest first). Two deliberate inclusions the backend keeps: a step live in
// that state with zero settled time, and — under `working` only — steps flagged
// inaccurate, whose trusted contribution is 0 but whose time lives in
// `wasted`/`estimated_fill_by_strategy`.
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

// Per-state estimated fill for a single flagged step, one value per strategy.
export const EstimatedFillByStrategySchema = z.object({
  mean: z.number(),
  median: z.number(),
  iqr: z.number(),
});
export type EstimatedFillByStrategy = z.infer<
  typeof EstimatedFillByStrategySchema
>;

export const StepEstimatedFillSchema = z.object({
  working: EstimatedFillByStrategySchema,
  paused: EstimatedFillByStrategySchema,
  ended_shift: EstimatedFillByStrategySchema,
});
export type StepEstimatedFill = z.infer<typeof StepEstimatedFillSchema>;

// One flagged state interval behind a step's `wasted` time — the diagnostic
// detail a manager can open to see *which* records were marked wrong.
export const InaccurateRecordSchema = z.object({
  record_id: z.string(),
  state: z.enum(["working", "paused", "ended_shift"]),
  entered_at: z.string(),
  exited_at: z.string().nullable(),
  wasted_seconds: z.number(),
});
export type InaccurateRecord = z.infer<typeof InaccurateRecordSchema>;

const ZERO_FILL_BY_STRATEGY: EstimatedFillByStrategy = {
  mean: 0,
  median: 0,
  iqr: 0,
};

export const WorkerDailyStepSchema = z.object({
  client_id: z.string(),
  task_id: z.string(),
  state: StepStateSchema,
  working_section_name_snapshot: z.string().optional(),
  task: DailyStepTaskLightSchema.optional().default(null),
  item: DailyStepItemLightSchema.optional().default(null),
  item_images: z.array(DailyStepImageSchema).default([]),
  // Trusted-only: a flagged step contributes 0 seconds here (but still its
  // completed_count). Its replacement lives in estimated_fill_by_strategy.
  contribution: StepContributionSchema,
  is_time_inaccurate: z.boolean().default(false),
  wasted: StepContributionSchema.optional().default({
    working_seconds: 0,
    pause_seconds: 0,
    ended_shift_seconds: 0,
    completed_count: 0,
  }),
  estimated_fill_by_strategy: StepEstimatedFillSchema.optional().default({
    working: ZERO_FILL_BY_STRATEGY,
    paused: ZERO_FILL_BY_STRATEGY,
    ended_shift: ZERO_FILL_BY_STRATEGY,
  }),
  inaccurate_records: z.array(InaccurateRecordSchema).default([]),
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
    work_date: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    // Trusted-only, i.e. excludes every flagged step's time.
    totals: StepContributionSchema,
    // trusted + estimated[time_strategy] — the number to show a manager.
    usable: StepContributionSchema.optional(),
    // Diagnostic only. Never add to `totals`/`usable`.
    wasted: StepContributionSchema.optional(),
    // Always all three strategies, regardless of the selected `time_strategy`,
    // so the strategies can be compared side by side.
    estimated: z
      .object({
        mean: StepContributionSchema,
        median: StepContributionSchema,
        iqr: StepContributionSchema,
      })
      .optional(),
    inaccurate_step_count: z.number().int().default(0),
    time_strategy: TimeStrategySchema.default("mean"),
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
  dateFrom?: string;
  dateTo?: string;
  // Selects only the top-level `usable` total; `estimated` and each step's
  // `estimated_fill_by_strategy` always carry all three strategies.
  timeStrategy?: TimeStrategy;
  // Narrows `steps.items` to flagged steps only. Totals stay range-wide.
  onlyInaccurate?: boolean;
};
