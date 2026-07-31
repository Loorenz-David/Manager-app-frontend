import { describe, expect, it } from "vitest";
import {
  ClockInResultSchema,
  ClockOutAnalyticsSchema,
  ClockOutResultSchema,
  CloseDeclaredStateResultSchema,
  CurrentShiftSchema,
  DeclareStateResultSchema,
  FloorRosterUserSchema,
} from "./types";

describe("worker-shift handoff schemas", () => {
  it("round-trips the floor roster user example", () => {
    const example = {
      client_id: "usr_…",
      username: "Mykola",
      profile_picture: "https://…",
      role: { "…": "…" },
      clock_in_code: "4821",
      email: "mykola@shop.com",
    };

    expect(FloorRosterUserSchema.parse(example)).toEqual(example);
    expect(
      FloorRosterUserSchema.parse({ ...example, clock_in_code: null }),
    ).toEqual({ ...example, clock_in_code: null });
  });

  it("accepts a floor roster user without a profile picture", () => {
    const user = {
      client_id: "usr_no_photo",
      username: "Sara Lind",
      profile_picture: null,
      role: { name: "Worker" },
      clock_in_code: null,
      email: "sara@shop.com",
    };

    expect(FloorRosterUserSchema.parse(user)).toEqual(user);
  });

  it("round-trips clocked-in, clocked-out, and legacy current states", () => {
    const clockedIn = {
      user_id: "usr_…",
      clocked_in: true,
      shift_started_at: "2026-07-29T06:58:00Z",
      state: "in_pause",
      state_entered_at: "2026-07-29T09:12:00Z",
      pause_reason: {
        id: "par_…",
        name: "Lunch break",
        image_url: "https://…",
      },
      declared_state: {
        id: "uds_…",
        pause_reason: {
          id: "par_…",
          name: "Lunch break",
          image_url: "https://…",
        },
        description: null,
        entered_at: "2026-07-29T09:12:00Z",
      },
    };
    const clockedOut = {
      user_id: "usr_…",
      clocked_in: false,
      shift_started_at: null,
      state: null,
      state_entered_at: null,
      pause_reason: null,
      declared_state: null,
    };
    const legacy = {
      ...clockedIn,
      pause_reason: null,
      declared_state: null,
      reason_text: "Old free-text pause",
    };

    expect(CurrentShiftSchema.parse(clockedIn)).toEqual(clockedIn);
    expect(CurrentShiftSchema.parse(clockedOut)).toEqual(clockedOut);
    expect(CurrentShiftSchema.parse(legacy)).toEqual(legacy);
  });

  it("retains the additive scheduled shift on fresh current state", () => {
    const current = {
      user_id: "usr_scheduled",
      clocked_in: false,
      shift_started_at: null,
      state: null,
      state_entered_at: null,
      pause_reason: null,
      declared_state: null,
      scheduled_shift: {
        start: "2026-07-30T05:00:00Z",
        end: "2026-07-30T13:30:00Z",
      },
    };

    expect(CurrentShiftSchema.parse(current)).toEqual(current);
  });

  it("accepts null pause-reason images and a null legacy reason", () => {
    const current = {
      user_id: "usr_…",
      clocked_in: true,
      shift_started_at: "2026-07-29T06:58:00Z",
      state: "in_pause",
      state_entered_at: "2026-07-29T09:12:00Z",
      pause_reason: {
        id: "par_…",
        name: "Lunch break",
        image_url: null,
      },
      declared_state: null,
      reason_text: null,
    };
    const analytics = {
      date: "2026-07-29",
      timeline: { working_seconds: 0, pause_seconds: 0, idle_seconds: 0 },
      pause_reasons: {
        "par_…": {
          name: "Lunch break",
          image_url: null,
          pause_type: "personal",
        },
      },
      rate: { units_per_hour: 0, baseline_units_per_hour: null, baseline_days: 0 },
    };

    expect(CurrentShiftSchema.parse(current)).toEqual(current);
    expect(
      ClockOutAnalyticsSchema.parse(analytics).pause_reasons["par_…"]
        ?.image_url,
    ).toBeNull();
  });

  it("accepts the 'unspecified' pause bucket with a null pause_type", () => {
    const analytics = {
      date: "2026-07-29",
      timeline: {
        working_seconds: 0,
        pause_seconds: 300,
        idle_seconds: 0,
        pause_by_reason: { unspecified: 300 },
      },
      pause_reasons: {
        unspecified: {
          name: "Reason unavailable",
          image_url: null,
          pause_type: null,
        },
      },
      rate: { units_per_hour: 0, baseline_units_per_hour: null, baseline_days: 0 },
    };

    expect(
      ClockOutAnalyticsSchema.parse(analytics).pause_reasons.unspecified,
    ).toEqual({
      name: "Reason unavailable",
      image_url: null,
      pause_type: null,
    });
  });

  it("round-trips the explicit clock action examples", () => {
    const clockIn = { action: "clock_in", user_id: "usr_…" };
    const clockOut = {
      action: "clock_out",
      user_id: "usr_…",
      transitioned_steps: 2,
      analytics: null,
    };

    expect(ClockInResultSchema.parse(clockIn)).toEqual(clockIn);
    expect(ClockOutResultSchema.parse(clockOut)).toEqual(clockOut);
  });

  it("round-trips the populated analytics example and accepts additive keys", () => {
    const analytics = {
      date: "2026-07-29",
      timeline: {
        working_seconds: 21600,
        pause_seconds: 3600,
        idle_seconds: 1800,
        pause_by_reason: { "par_…": 2700, "par_…2": 600, unspecified: 300 },
      },
      pause_reasons: {
        "par_…": {
          name: "Lunch break",
          image_url: "https://…",
          pause_type: "personal",
        },
        unspecified: {
          name: "Reason unavailable",
          image_url: null,
          pause_type: null,
        },
      },
      completed_items: [
        {
          item_id: "itm_…",
          reference: "ART-10482",
          image_url: "https://…",
          working_section: { client_id: "wsc_…", name: "Assembly" },
          units: 4,
          total_seconds: 4260,
          issues_count: 1,
        },
      ],
      completed_items_truncated: false,
      week: {
        days: [
          {
            date: "2026-07-27",
            working_seconds: 21600,
            pause_seconds: 3600,
            idle_seconds: 1800,
          },
        ],
        totals: {
          working_seconds: 108000,
          pause_seconds: 18000,
          idle_seconds: 9000,
        },
      },
      rate: {
        units_per_hour: 17.3,
        baseline_units_per_hour: 15.9,
        baseline_days: 5,
      },
    };

    expect(ClockOutAnalyticsSchema.parse(analytics)).toEqual(analytics);
    expect(
      ClockOutAnalyticsSchema.parse({
        ...analytics,
        additive_backend_field: { future: true },
      }).additive_backend_field,
    ).toEqual({ future: true });
    expect(
      ClockOutResultSchema.parse({
        action: "clock_out",
        user_id: "usr_…",
        transitioned_steps: 2,
        analytics,
      }).analytics,
    ).toEqual(analytics);
  });

  it("parses minimal analytics and defaults omitted maps/arrays", () => {
    const minimal = {
      date: "2026-07-29",
      timeline: { working_seconds: 21600, pause_seconds: 0, idle_seconds: 1800 },
      rate: { units_per_hour: 0, baseline_units_per_hour: null, baseline_days: 0 },
    };

    expect(ClockOutAnalyticsSchema.parse(minimal)).toEqual({
      ...minimal,
      timeline: { ...minimal.timeline, pause_by_reason: {} },
      pause_reasons: {},
      completed_items: [],
      completed_items_truncated: false,
      week: { days: [], totals: { working_seconds: 0, pause_seconds: 0, idle_seconds: 0 } },
    });
  });

  it("defaults an omitted timeline without failing clock-out success", () => {
    const result = ClockOutResultSchema.parse({
      action: "clock_out",
      user_id: "usr_partial",
      transitioned_steps: 0,
      analytics: {
        date: "2026-07-29",
        rate: { units_per_hour: 0, baseline_units_per_hour: null, baseline_days: 0 },
      },
    });

    expect(result.analytics?.timeline).toEqual({
      working_seconds: 0,
      pause_seconds: 0,
      idle_seconds: 0,
      pause_by_reason: {},
    });
    expect(result.analytics?.completed_items).toEqual([]);
    expect(result.analytics?.week).toEqual({
      days: [],
      totals: { working_seconds: 0, pause_seconds: 0, idle_seconds: 0 },
    });
  });

  it("rejects analytics missing the required rate object", () => {
    expect(() =>
      ClockOutAnalyticsSchema.parse({
        date: "2026-07-29",
        timeline: { working_seconds: 0, pause_seconds: 0, idle_seconds: 0 },
      }),
    ).toThrow();
  });

  it("round-trips declared-state action examples", () => {
    const declared = {
      declared_state: {
        id: "uds_…",
        pause_reason: {
          id: "par_…",
          name: "Cleaning",
          image_url: "https://…",
        },
        description: "Cleaning section B",
        entered_at: "2026-07-29T10:00:00Z",
      },
      shift_state: "in_pause",
      paused_steps: 1,
    };
    const closed = {
      shift_state: "idle",
      closed_declared_state_id: "uds_…",
    };

    expect(DeclareStateResultSchema.parse(declared)).toEqual(declared);
    expect(CloseDeclaredStateResultSchema.parse(closed)).toEqual(closed);
  });
});
