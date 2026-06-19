import type { QueryClient } from "@tanstack/react-query";
import type { SocketHandlerContext } from "../lib/socket-registry-types";
import type { ServerToClientEvents } from "../lib/socket-types";
import { recordRealtimeEvent } from "./realtime-log";

type SocketEventName = keyof ServerToClientEvents;
type SocketHandler = (payload: unknown, ctx: SocketHandlerContext) => void;

export function dispatchEvent(
  event: SocketEventName,
  payload: unknown,
  handler: SocketHandler | undefined,
  ctx: SocketHandlerContext,
): void {
  const invalidated: string[] = [];
  const recordingClient = createRecordingQueryClient(ctx.queryClient, invalidated);
  const start = performance.now();

  try {
    if (!handler) {
      recordRealtimeEvent({
        event,
        payload,
        invalidated,
        status: "no-handler",
      });
      logDevDispatch(event, payload, invalidated, "no-handler");
      return;
    }

    handler(payload, { ...ctx, queryClient: recordingClient });
    const handlerMs = performance.now() - start;
    recordRealtimeEvent({
      event,
      payload,
      handlerMs,
      invalidated,
      status: "ok",
    });
    logDevDispatch(event, payload, invalidated, "ok", handlerMs);
  } catch (err) {
    const handlerMs = performance.now() - start;
    const error = err instanceof Error ? err.message : String(err);

    recordRealtimeEvent({
      event,
      payload,
      handlerMs,
      invalidated,
      status: "error",
      error,
    });

    if (import.meta.env.DEV) {
      console.error(`[RT] handler error "${event}"`, err);
    }
  }
}

function createRecordingQueryClient(
  queryClient: QueryClient,
  invalidated: string[],
): QueryClient {
  return new Proxy(queryClient, {
    get(target, prop, receiver) {
      if (prop === "invalidateQueries") {
        return (...args: Parameters<QueryClient["invalidateQueries"]>) => {
          invalidated.push(serializeQueryKey(args[0]?.queryKey));
          return target.invalidateQueries(...args);
        };
      }

      if (prop === "removeQueries") {
        return (...args: Parameters<QueryClient["removeQueries"]>) => {
          invalidated.push(serializeQueryKey(args[0]?.queryKey));
          return target.removeQueries(...args);
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function serializeQueryKey(queryKey: unknown): string {
  if (queryKey === undefined) return "all";

  try {
    return JSON.stringify(queryKey);
  } catch {
    return String(queryKey);
  }
}

function logDevDispatch(
  event: string,
  payload: unknown,
  invalidated: string[],
  status: "ok" | "no-handler",
  handlerMs?: number,
): void {
  if (!import.meta.env.DEV) return;

  console.groupCollapsed(`[RT] ${event}`);
  console.info("status", status);
  console.info("payload", payload);
  console.info("invalidated", invalidated);
  if (handlerMs !== undefined) {
    console.info("handlerMs", handlerMs);
  }
  console.groupEnd();
}
