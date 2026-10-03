import type { ReadinessStatus, StepState } from "../types";

export const DEFAULT_STATE_FILTERS: StepState[] = [
  "pending",
  "working",
  "paused",
  "ended_shift",
];

export const DEFAULT_READINESS_STATUS_FILTERS: ReadinessStatus[] = ["ready"];
