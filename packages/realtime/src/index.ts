export { RealtimeProvider } from "./providers/RealtimeProvider";
export type { SocketStatus } from "./providers/RealtimeProvider";
export { useSocket, useSocketStatus } from "./hooks/use-socket";
export { useEntityView } from "./hooks/use-entity-view";
export { useRealtimeLog } from "./observability/use-realtime-log";
export {
  clearRealtimeLog,
  getRealtimeLog,
  recordRealtimeEvent,
  subscribeRealtimeLog,
} from "./observability/realtime-log";
export type { RealtimeLogEntry } from "./observability/realtime-log";
export { debouncedInvalidation } from "./lib/socket-debounce";
export { batchInvalidation } from "./lib/socket-batch";
export type {
  SocketEventHandlers,
  SocketHandlerContext,
} from "./lib/socket-registry-types";
export type {
  ServerToClientEvents,
  ClientToServerEvents,
  AppSocket,
} from "./lib/socket-types";
