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
import { getSystemState, subscribeSystemState } from "@beyo/system-control";
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
import { superviseConnection } from "../lib/connection-supervisor";
import {
  createEntityViewRegistry,
  type EntityViewRegistry,
} from "../lib/entity-view-registry";
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

const EntityViewRegistryContext = createContext<EntityViewRegistry | null>(null);

export function useEntityViewRegistryContext(): EntityViewRegistry | null {
  return useContext(EntityViewRegistryContext);
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

  // One registry for the provider's lifetime: views survive socket re-creation.
  const [views] = useState(createEntityViewRegistry);

  useEffect(() => {
    if (!isAuthenticated) {
      const previous = socketRef.current;
      previous?.disconnect();
      if (previous) views.detach(previous);
      socketRef.current = null;
      setSocket(null);
      setStatus({ connected: false, reconnecting: false });
      return;
    }

    // Connected by the supervisor, not on creation: the system gate and
    // server rejections decide (see connection-supervisor.ts). Automatic
    // reconnection after a transport failure never gives up; its delay grows
    // up to 30 s (long outages are the gate's: it disconnects the socket).
    const s = io(resolveSocketUrl(), {
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
    }) as AppSocket;

    socketRef.current = s;
    setSocket(s);
    views.attach(s);

    s.on("connect", () => {
      setStatus({ connected: true, reconnecting: false });
      recordRealtimeEvent({
        event: "system:connected",
        payload: null,
        invalidated: [],
        status: "ok",
      });
      // Every connection re-joins the rooms of the views still open
      // (`resumed: true` after the first announcement).
      views.announce();
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

    const stopSupervising = superviseConnection(s, {
      getSystemState,
      subscribeSystemState,
      // A socket reconnect is automatic: its refresh never counts as human
      // activity.
      refresh: () => refreshAccessToken(undefined, { activity: "background" }),
      // Only a rejected session signs out; "unavailable" keeps the session.
      onSessionExpired: () => {
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      },
      onWaiting: () => {
        setStatus({ connected: false, reconnecting: true });
      },
      onRejected: (reason) => {
        recordRealtimeEvent({
          event: "system:connect-rejected",
          payload: null,
          invalidated: [],
          status: "error",
          error: reason,
        });
      },
    });

    return () => {
      stopSupervising();
      s.disconnect();
      views.detach(s);
      socketRef.current = null;
      setSocket(null);
      setStatus({ connected: false, reconnecting: false });
    };
  }, [isAuthenticated, workspaceId, userId, queryClient, registry, views]);

  return (
    <SocketContext.Provider value={socket}>
      <SocketStatusContext.Provider value={status}>
        <EntityViewRegistryContext.Provider value={views}>
          {children}
        </EntityViewRegistryContext.Provider>
      </SocketStatusContext.Provider>
    </SocketContext.Provider>
  );
}
