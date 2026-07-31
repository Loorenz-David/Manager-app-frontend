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
      working_seconds: 21600,
      pause_seconds: 3600,
      idle_seconds: 1800,
      pause_by_reason: { par_lunch: 2700, par_cleaning: 600, unspecified: 300 },
    },
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
      unspecified: {
        name: "Reason unavailable",
        image_url: null,
        pause_type: null,
      },
    },
    completed_items: [
      {
        item_id: "itm_hex_bolt",
        reference: "ART-10482",
        image_url: "https://example.com/hex-bolt.png",
        working_section: { client_id: "wsc_assembly", name: "Assembly" },
        units: 4,
        total_seconds: 4260,
        issues_count: 1,
      },
      {
        item_id: "itm_rail_bracket",
        reference: "ART-20911",
        image_url: null,
        working_section: { client_id: "wsc_assembly", name: "Assembly" },
        units: 3,
        total_seconds: 3600,
        issues_count: 0,
      },
    ],
    completed_items_truncated: false,
    week: {
      days: [
        { date: "2026-07-27", working_seconds: 28800, pause_seconds: 1800, idle_seconds: 900 },
        { date: "2026-07-28", working_seconds: 28380, pause_seconds: 3600, idle_seconds: 600 },
        { date: "2026-07-29", working_seconds: 21600, pause_seconds: 3600, idle_seconds: 1800 },
      ],
      totals: { working_seconds: 78780, pause_seconds: 9000, idle_seconds: 3300 },
    },
    rate: {
      units_per_hour: 17.3,
      baseline_units_per_hour: 15.9,
      baseline_days: 5,
    },
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
