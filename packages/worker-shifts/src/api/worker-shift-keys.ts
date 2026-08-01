export type FloorRosterParams = {
  role: "worker";
  compact: true;
  limit: 200;
};

export type CurrentShiftParams = {
  user_id: string;
};

/**
 * Cache scope for `GET /worker-shifts/current` called **without** `user_id` —
 * the worker-token "own state" read (handoff §12.1). It is a distinct cache
 * entry from any `{ user_id }` scope so the kiosk's per-worker reads and the
 * worker app's self read never collide.
 */
export const WORKER_SHIFT_SELF_SCOPE = "me";

export const workerShiftKeys = {
  all: ["worker-shifts"] as const,
  floorRosterLists: () =>
    [...workerShiftKeys.all, "floor-roster", "list"] as const,
  floorRosterList: (params: FloorRosterParams) =>
    [...workerShiftKeys.floorRosterLists(), params] as const,
  currentLists: () => [...workerShiftKeys.all, "current", "list"] as const,
  current: (params: CurrentShiftParams) =>
    [...workerShiftKeys.currentLists(), params] as const,
};
