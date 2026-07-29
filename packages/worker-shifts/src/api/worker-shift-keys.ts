export type FloorRosterParams = {
  role: "worker";
  compact: true;
  limit: 200;
};

export type CurrentShiftParams = {
  user_id: string;
};

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
