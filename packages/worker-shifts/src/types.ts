import { z } from "zod";

const EmbeddedPauseReasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
});

const AnalyticsPauseReasonSchema = z.object({
  name: z.string(),
  image_url: z.string().nullable(),
  pause_type: z.string(),
});

export const ShiftStateSchema = z.enum(["idle", "working", "in_pause"]);
export type ShiftState = z.infer<typeof ShiftStateSchema>;

export const SegmentStateSchema = z.enum([
  "started_shift",
  "working",
  "paused",
  "idle",
  "ended_shift",
]);
export type SegmentState = z.infer<typeof SegmentStateSchema>;

export const FloorRosterUserSchema = z.object({
  client_id: z.string(),
  username: z.string(),
  profile_picture: z.string().nullable(),
  role: z.record(z.string(), z.unknown()),
  clock_in_code: z.string().nullable(),
  email: z.string(),
});
export type FloorRosterUser = z.infer<typeof FloorRosterUserSchema>;

export const FloorRosterSchema = z.array(FloorRosterUserSchema);
export type FloorRoster = z.infer<typeof FloorRosterSchema>;

export const DeclaredStateSchema = z.object({
  id: z.string(),
  pause_reason: EmbeddedPauseReasonSchema,
  description: z.string().nullable(),
  entered_at: z.string(),
});
export type DeclaredState = z.infer<typeof DeclaredStateSchema>;

export const CurrentShiftSchema = z.object({
  user_id: z.string(),
  clocked_in: z.boolean(),
  shift_started_at: z.string().nullable(),
  state: ShiftStateSchema.nullable(),
  state_entered_at: z.string().nullable(),
  pause_reason: EmbeddedPauseReasonSchema.nullable(),
  declared_state: DeclaredStateSchema.nullable(),
  reason_text: z.string().nullable().optional(),
});
export type CurrentShift = z.infer<typeof CurrentShiftSchema>;

export const ClockInResultSchema = z.object({
  action: z.literal("clock_in"),
  user_id: z.string(),
});
export type ClockInResult = z.infer<typeof ClockInResultSchema>;

export const AnalyticsTimelineSchema = z
  .object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    working_seconds: z.number(),
    pause_seconds: z.number(),
    ended_shift_seconds: z.number(),
    idle_seconds: z.number(),
    completed_count: z.number(),
    pause_by_reason: z.record(z.string(), z.number()).default({}),
  })
  .passthrough();
export type AnalyticsTimeline = z.infer<typeof AnalyticsTimelineSchema>;

export const AnalyticsSegmentSchema = z
  .object({
    start: z.string(),
    end: z.string(),
    state: SegmentStateSchema,
    reason: z.string().nullable(),
    is_open: z.boolean(),
    manually_recorded: z.boolean().default(false),
    seconds: z.number(),
    steps: z.array(z.unknown()).default([]),
  })
  .passthrough();
export type AnalyticsSegment = z.infer<typeof AnalyticsSegmentSchema>;

export const AnalyticsInsightSchema = z
  .object({
    code: z.string(),
    polarity: z.string(),
    metric: z.string(),
    target_value: z.number(),
    baseline_value: z.number(),
    delta: z.number(),
    delta_pct: z.number(),
    sample_size: z.number(),
    severity: z.string(),
  })
  .passthrough();
export type AnalyticsInsight = z.infer<typeof AnalyticsInsightSchema>;

export const ClockOutAnalyticsSchema = z
  .object({
    date: z.string(),
    timeline: AnalyticsTimelineSchema,
    segments: z.array(AnalyticsSegmentSchema).default([]),
    segments_truncated: z.boolean().default(false),
    pause_reasons: z
      .record(z.string(), AnalyticsPauseReasonSchema)
      .default({}),
    insights: z.array(AnalyticsInsightSchema).default([]),
  })
  .passthrough();
export type ClockOutAnalytics = z.infer<typeof ClockOutAnalyticsSchema>;

export const ClockOutResultSchema = z.object({
  action: z.literal("clock_out"),
  user_id: z.string(),
  transitioned_steps: z.number(),
  analytics: ClockOutAnalyticsSchema.nullable(),
});
export type ClockOutResult = z.infer<typeof ClockOutResultSchema>;

export const DeclareStateResultSchema = z.object({
  declared_state: DeclaredStateSchema,
  shift_state: z.literal("in_pause"),
  paused_steps: z.number(),
});
export type DeclareStateResult = z.infer<typeof DeclareStateResultSchema>;

export const CloseDeclaredStateResultSchema = z.object({
  shift_state: z.enum(["idle", "in_pause"]),
  closed_declared_state_id: z.string(),
});
export type CloseDeclaredStateResult = z.infer<
  typeof CloseDeclaredStateResultSchema
>;

export const ClockInInputSchema = z.object({
  user_id: z.string(),
});
export type ClockInInput = z.infer<typeof ClockInInputSchema>;

export const ClockOutInputSchema = z.object({
  user_id: z.string(),
});
export type ClockOutInput = z.infer<typeof ClockOutInputSchema>;

export const DeclareStateInputSchema = z.object({
  user_id: z.string(),
  pause_reason_id: z.string(),
  description: z.string().optional(),
});
export type DeclareStateInput = z.infer<typeof DeclareStateInputSchema>;

export const CloseDeclaredStateInputSchema = z.object({
  user_id: z.string(),
});
export type CloseDeclaredStateInput = z.infer<
  typeof CloseDeclaredStateInputSchema
>;
