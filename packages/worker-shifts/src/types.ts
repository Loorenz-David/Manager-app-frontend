import { z } from "zod";

const EmbeddedPauseReasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_url: z.string().nullable(),
});

const AnalyticsPauseReasonSchema = z.object({
  name: z.string(),
  image_url: z.string().nullable(),
  // Handoff §5.1: the literal "unspecified" bucket ships `pause_type: null`
  // (paused time that couldn't be attributed to a catalog reason) — not a
  // valid enum member, so this must stay nullable or that bucket fails to parse.
  pause_type: z.string().nullable(),
});

export const ShiftStateSchema = z.enum(["idle", "working", "in_pause"]);
export type ShiftState = z.infer<typeof ShiftStateSchema>;

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

export const ScheduledShiftSchema = z.object({
  start: z.string(),
  end: z.string(),
});
export type ScheduledShift = z.infer<typeof ScheduledShiftSchema>;

export const CurrentShiftSchema = z.object({
  user_id: z.string(),
  clocked_in: z.boolean(),
  shift_started_at: z.string().nullable(),
  state: ShiftStateSchema.nullable(),
  state_entered_at: z.string().nullable(),
  pause_reason: EmbeddedPauseReasonSchema.nullable(),
  declared_state: DeclaredStateSchema.nullable(),
  reason_text: z.string().nullable().optional(),
  scheduled_shift: ScheduledShiftSchema.nullable().optional(),
});
export type CurrentShift = z.infer<typeof CurrentShiftSchema>;

export const ClockInResultSchema = z.object({
  action: z.literal("clock_in"),
  user_id: z.string(),
});
export type ClockInResult = z.infer<typeof ClockInResultSchema>;

export const AnalyticsTimelineSchema = z
  .object({
    working_seconds: z.number().default(0),
    pause_seconds: z.number().default(0),
    idle_seconds: z.number().default(0),
    // Keyed by pause-reason id, plus the literal key "unspecified" — see
    // AnalyticsPauseReasonSchema. Sums exactly to pause_seconds (handoff §5.1).
    pause_by_reason: z.record(z.string(), z.number()).default({}),
  })
  .passthrough();
export type AnalyticsTimeline = z.infer<typeof AnalyticsTimelineSchema>;

const AnalyticsWorkingSectionSchema = z.object({
  client_id: z.string(),
  name: z.string(),
});

export const AnalyticsCompletedItemSchema = z
  .object({
    item_id: z.string(),
    // No product-name entity in this system — reference (article_number,
    // falling back to sku) IS the label. Null when neither is set.
    reference: z.string().nullable(),
    image_url: z.string().nullable(),
    working_section: AnalyticsWorkingSectionSchema.nullable(),
    units: z.number(),
    // Working time only (excludes pause/idle) — see handoff §5.1.
    total_seconds: z.number(),
    issues_count: z.number(),
  })
  .passthrough();
export type AnalyticsCompletedItem = z.infer<
  typeof AnalyticsCompletedItemSchema
>;

const AnalyticsWeekDaySchema = z
  .object({
    date: z.string(),
    working_seconds: z.number().default(0),
    pause_seconds: z.number().default(0),
    idle_seconds: z.number().default(0),
  })
  .passthrough();
export type AnalyticsWeekDay = z.infer<typeof AnalyticsWeekDaySchema>;

const AnalyticsWeekTotalsSchema = z
  .object({
    working_seconds: z.number().default(0),
    pause_seconds: z.number().default(0),
    idle_seconds: z.number().default(0),
  })
  .passthrough();

export const AnalyticsWeekSchema = z.object({
  days: z.array(AnalyticsWeekDaySchema).default([]),
  totals: AnalyticsWeekTotalsSchema.default({
    working_seconds: 0,
    pause_seconds: 0,
    idle_seconds: 0,
  }),
});
export type AnalyticsWeek = z.infer<typeof AnalyticsWeekSchema>;

export const AnalyticsRateSchema = z.object({
  units_per_hour: z.number(),
  // Null when baseline_days is 0 (not enough recent history) — handoff §5.1.
  baseline_units_per_hour: z.number().nullable(),
  baseline_days: z.number(),
});
export type AnalyticsRate = z.infer<typeof AnalyticsRateSchema>;

export const ClockOutAnalyticsSchema = z
  .object({
    date: z.string(),
    timeline: AnalyticsTimelineSchema.default({
      working_seconds: 0,
      pause_seconds: 0,
      idle_seconds: 0,
      pause_by_reason: {},
    }),
    pause_reasons: z
      .record(z.string(), AnalyticsPauseReasonSchema)
      .default({}),
    completed_items: z.array(AnalyticsCompletedItemSchema).default([]),
    completed_items_truncated: z.boolean().default(false),
    week: AnalyticsWeekSchema.default({ days: [], totals: {
      working_seconds: 0,
      pause_seconds: 0,
      idle_seconds: 0,
    } }),
    rate: AnalyticsRateSchema,
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
