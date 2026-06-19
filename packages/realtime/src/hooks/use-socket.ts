import {
  useRealtimeSocketContext,
  useRealtimeSocketStatusContext,
} from "../providers/RealtimeProvider";

export function useSocket() {
  return useRealtimeSocketContext();
}

export function useSocketStatus() {
  return useRealtimeSocketStatusContext();
}
