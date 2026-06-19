import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken, refreshAccessToken } from "@beyo/api-client";
import { notify } from "@beyo/lib";
import {
  selectIsAuthenticated,
  selectUser,
  selectWorkspaceId,
  useAuthStore,
} from "@beyo/auth";
import { io } from "socket.io-client";
import { resolveSocketUrl } from "../env";
import { dispatchEvent } from "../observability/dispatch-event";
import { recordRealtimeEvent } from "../observability/realtime-log";
import type {
  SocketEventHandlers,
  SocketHandlerContext,
} from "../lib/socket-registry-types";
import type { AppSocket, ServerToClientEvents } from "../lib/socket-types";

export type SocketStatus = {
  connected: boolean;
  reconnecting: boolean;
};

type RealtimeProviderProps = {
  registry: SocketEventHandlers;
  children: ReactNode;
};

const SocketContext = createContext<AppSocket | null>(null);

const SocketStatusContext = createContext<SocketStatus>({
  connected: false,
  reconnecting: false,
});

export function useRealtimeSocketContext(): AppSocket | null {
  return useContext(SocketContext);
}

export function useRealtimeSocketStatusContext(): SocketStatus {
  return useContext(SocketStatusContext);
}

/**
 * Keep registry identity stable in apps; changing it tears down and recreates the socket.
 */
export function RealtimeProvider({
  registry,
  children,
}: RealtimeProviderProps): React.JSX.Element {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const workspaceId = useAuthStore(selectWorkspaceId);
  const userId = useAuthStore(selectUser)?.id;
  const queryClient = useQueryClient();
  const socketRef = useRef<AppSocket | null>(null);
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [status, setStatus] = useState<SocketStatus>({
    connected: false,
    reconnecting: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setStatus({ connected: false, reconnecting: false });
      return;
    }

    const s = io(resolveSocketUrl(), {
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
    }) as AppSocket;

    socketRef.current = s;
    setSocket(s);

    s.on("connect_error", async (err) => {
      if (err.message !== "unauthorized") return;

      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      }
    });

    s.on("connect", () => {
      setStatus({ connected: true, reconnecting: false });
      recordRealtimeEvent({
        event: "system:connected",
        payload: null,
        invalidated: [],
        status: "ok",
      });
      queryClient.invalidateQueries({ refetchType: "active" });
    });

    s.on("disconnect", () => {
      setStatus({ connected: false, reconnecting: true });
      recordRealtimeEvent({
        event: "system:disconnected",
        payload: null,
        invalidated: [],
        status: "ok",
      });
    });

    const handleReconnectFailed = () => {
      setStatus({ connected: false, reconnecting: false });
      recordRealtimeEvent({
        event: "system:reconnect-failed",
        payload: null,
        invalidated: [],
        status: "error",
        error: "all reconnection attempts exhausted",
      });
      notify.error("Connection lost", "Refresh the page to reconnect.");
    };
    s.io.on("reconnect_failed", handleReconnectFailed);

    const ctx: SocketHandlerContext = { queryClient, notify };

    Object.entries(registry).forEach(([event, handler]) => {
      const eventName = event as keyof ServerToClientEvents;
      s.on(eventName, (payload: unknown) => {
        dispatchEvent(
          eventName,
          payload,
          handler as (payload: unknown, ctx: SocketHandlerContext) => void,
          ctx,
        );
      });
    });

    return () => {
      s.io.off("reconnect_failed", handleReconnectFailed);
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setStatus({ connected: false, reconnecting: false });
    };
  }, [isAuthenticated, workspaceId, userId, queryClient, registry]);

  return (
    <SocketContext.Provider value={socket}>
      <SocketStatusContext.Provider value={status}>{children}</SocketStatusContext.Provider>
    </SocketContext.Provider>
  );
}
