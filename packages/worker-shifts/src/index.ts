export {
  AnalyticsCompletedItemSchema,
  AnalyticsRateSchema,
  AnalyticsTimelineSchema,
  AnalyticsWeekSchema,
  ClockInInputSchema,
  ClockInResultSchema,
  ClockOutAnalyticsSchema,
  ClockOutInputSchema,
  ClockOutResultSchema,
  CloseDeclaredStateInputSchema,
  CloseDeclaredStateResultSchema,
  CurrentShiftSchema,
  DeclareStateInputSchema,
  DeclareStateResultSchema,
  DeclaredStateSchema,
  FloorRosterSchema,
  FloorRosterUserSchema,
  ScheduledShiftSchema,
  ShiftStateSchema,
} from "./types";
export type {
  AnalyticsCompletedItem,
  AnalyticsRate,
  AnalyticsTimeline,
  AnalyticsWeek,
  AnalyticsWeekDay,
  ClockInInput,
  ClockInResult,
  ClockOutAnalytics,
  ClockOutInput,
  ClockOutResult,
  CloseDeclaredStateInput,
  CloseDeclaredStateResult,
  CurrentShift,
  DeclareStateInput,
  DeclareStateResult,
  DeclaredState,
  FloorRoster,
  FloorRosterUser,
  ScheduledShift,
  ShiftState,
} from "./types";

export {
  WORKER_SHIFT_SELF_SCOPE,
  workerShiftKeys,
} from "./api/worker-shift-keys";
export type {
  CurrentShiftParams,
  FloorRosterParams,
} from "./api/worker-shift-keys";
export { fetchFloorRoster } from "./api/fetch-floor-roster";
export { fetchCurrentShift } from "./api/fetch-current-shift";
export {
  FLOOR_ROSTER_REFRESH_INTERVAL_MS,
  useFloorRosterQuery,
} from "./api/use-floor-roster-query";
// The confirm step must use this fresh-read path: the roster cache decides who,
// never what state. useCurrentShiftQuery is the passive/observational hook.
export {
  fetchFreshCurrentShift,
  useCurrentShiftQuery,
  useMyCurrentShiftQuery,
} from "./api/use-current-shift-query";

export { useClockIn } from "./actions/use-clock-in";
export type { ClockInAction } from "./actions/use-clock-in";
export { useClockOut } from "./actions/use-clock-out";
export type { ClockOutAction } from "./actions/use-clock-out";
export { useDeclareState } from "./actions/use-declare-state";
export type { DeclareStateAction } from "./actions/use-declare-state";
export { useCloseDeclaredState } from "./actions/use-close-declared-state";
export type { CloseDeclaredStateAction } from "./actions/use-close-declared-state";

export { workerShiftSocketEvents } from "./socket-events";

export { matchWorker } from "./lib/match-worker";
export {
  AFTERNOON_START_HOUR,
  EVENING_START_HOUR,
  MORNING_START_HOUR,
  dayPartGreeting,
  elapsedSecondsSince,
  firstName,
  formatElapsedDuration,
  formatTimeInTimeZone,
} from "./lib/shift-time";
export type { DayPartGreeting } from "./lib/shift-time";
