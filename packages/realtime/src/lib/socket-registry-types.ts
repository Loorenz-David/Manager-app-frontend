import type { QueryClient } from "@tanstack/react-query";
import type { notify } from "@beyo/lib";
import type { ServerToClientEvents } from "./socket-types";

export type SocketHandlerContext = {
  queryClient: QueryClient;
  notify: typeof notify;
};

export type SocketEventHandlers = {
  [K in keyof ServerToClientEvents]?: (
    payload: Parameters<ServerToClientEvents[K]>[0],
    ctx: SocketHandlerContext,
  ) => void;
};
