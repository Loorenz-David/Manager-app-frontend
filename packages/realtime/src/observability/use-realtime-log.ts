import { useSyncExternalStore } from "react";
import { getRealtimeLog, subscribeRealtimeLog } from "./realtime-log";

export function useRealtimeLog() {
  return useSyncExternalStore(subscribeRealtimeLog, getRealtimeLog, getRealtimeLog);
}
