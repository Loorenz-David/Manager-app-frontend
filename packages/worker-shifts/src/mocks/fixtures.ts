import {
  ClockOutAnalyticsSchema,
  CurrentShiftSchema,
  FloorRosterSchema,
  type ClockOutAnalytics,
  type CurrentShift,
  type FloorRoster,
} from "../types";

export const MOCK_CLOCKED_IN_USER_ID = "usr_floor_001";
export const MOCK_CLOCKED_OUT_USER_ID = "usr_floor_002";
export const MOCK_DECLARED_USER_ID = "usr_floor_003";
export const MOCK_UNKNOWN_USER_ID = "usr_floor_unknown";

export const mockFloorRoster: FloorRoster = FloorRosterSchema.parse([
  {
    client_id: MOCK_CLOCKED_IN_USER_ID,
    username: "Mykola Petrenko",
    profile_picture: "https://example.com/mykola.jpg",
    role: { client_id: "rol_worker", name: "Worker" },
    clock_in_code: "4821",
    email: "mykola@shop.com",
  },
  {
    client_id: MOCK_CLOCKED_OUT_USER_ID,
    username: "Sara Lind",
    profile_picture: null,
    role: { client_id: "rol_worker", name: "Worker" },
    clock_in_code: null,
    email: "sara@shop.com",
  },
  {
    client_id: MOCK_DECLARED_USER_ID,
    username: "Noah Berg",
    profile_picture: "https://example.com/noah.jpg",
    role: { client_id: "rol_worker", name: "Worker" },
    clock_in_code: "7314",
    email: "noah@shop.com",
  },
]);

export const mockClockOutAnalytics: ClockOutAnalytics =
  ClockOutAnalyticsSchema.parse({
    date: "2026-07-29",
    timeline: {
      date_from: "2026-07-29",
      date_to: "2026-07-29",
      working_seconds: 21600,
      pause_seconds: 3600,
      ended_shift_seconds: 0,
      idle_seconds: 1800,
      completed_count: 7,
      pause_by_reason: { par_lunch: 2700, par_cleaning: 900 },
    },
    segments: [
      {
        start: "2026-07-29T06:58:00Z",
        end: "2026-07-29T06:58:00Z",
        state: "started_shift",
        reason: null,
        is_open: false,
        manually_recorded: false,
        seconds: 0,
        steps: [],
      },
      {
        start: "2026-07-29T06:58:00Z",
        end: "2026-07-29T09:12:00Z",
        state: "working",
        reason: null,
        is_open: false,
        manually_recorded: false,
        seconds: 8040,
        steps: [],
      },
      {
        start: "2026-07-29T09:12:00Z",
        end: "2026-07-29T09:42:00Z",
        state: "paused",
        reason: "par_lunch",
        is_open: false,
        manually_recorded: true,
        seconds: 1800,
        steps: [],
      },
      {
        start: "2026-07-29T09:42:00Z",
        end: "2026-07-29T10:12:00Z",
        state: "idle",
        reason: null,
        is_open: false,
        manually_recorded: false,
        seconds: 1800,
        steps: [],
      },
      {
        start: "2026-07-29T15:10:00Z",
        end: "2026-07-29T15:10:00Z",
        state: "ended_shift",
        reason: null,
        is_open: false,
        manually_recorded: false,
        seconds: 0,
        steps: [],
      },
    ],
    segments_truncated: false,
    pause_reasons: {
      par_lunch: {
        name: "Lunch break",
        image_url: "https://example.com/lunch.png",
        pause_type: "personal",
      },
      par_cleaning: {
        name: "Cleaning",
        image_url: "https://example.com/cleaning.png",
        pause_type: "personal",
      },
    },
    insights: [
      {
        code: "working_time_vs_baseline",
        polarity: "positive",
        metric: "working_seconds",
        target_value: 21600,
        baseline_value: 19800,
        delta: 1800,
        delta_pct: 9.1,
        sample_size: 12,
        severity: "info",
      },
    ],
  });

export const mockClockedInCurrentShift: CurrentShift =
  CurrentShiftSchema.parse({
    user_id: MOCK_CLOCKED_IN_USER_ID,
    clocked_in: true,
    shift_started_at: "2026-07-29T06:58:00Z",
    state: "working",
    state_entered_at: "2026-07-29T06:58:00Z",
    pause_reason: null,
    declared_state: null,
  });

export const mockClockedOutCurrentShift: CurrentShift =
  CurrentShiftSchema.parse({
    user_id: MOCK_CLOCKED_OUT_USER_ID,
    clocked_in: false,
    shift_started_at: null,
    state: null,
    state_entered_at: null,
    pause_reason: null,
    declared_state: null,
  });

export const mockDeclaredCurrentShift: CurrentShift =
  CurrentShiftSchema.parse({
    user_id: MOCK_DECLARED_USER_ID,
    clocked_in: true,
    shift_started_at: "2026-07-29T07:05:00Z",
    state: "in_pause",
    state_entered_at: "2026-07-29T09:12:00Z",
    pause_reason: {
      id: "par_lunch",
      name: "Lunch break",
      image_url: "https://example.com/lunch.png",
    },
    declared_state: {
      id: "uds_open",
      pause_reason: {
        id: "par_lunch",
        name: "Lunch break",
        image_url: "https://example.com/lunch.png",
      },
      description: null,
      entered_at: "2026-07-29T09:12:00Z",
    },
  });
