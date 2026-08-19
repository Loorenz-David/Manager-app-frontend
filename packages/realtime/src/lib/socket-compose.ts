import type {
  SocketEventHandlers,
  SocketHandlerContext,
} from "./socket-registry-types";
import type { ServerToClientEvents } from "./socket-types";

type EventName = keyof ServerToClientEvents;
type UnknownSocketHandler = (
  payload: unknown,
  ctx: SocketHandlerContext,
) => void;
type CollectedHandlers = UnknownSocketHandler | UnknownSocketHandler[];

export function composeSocketHandlers(
  ...maps: SocketEventHandlers[]
): SocketEventHandlers {
  const collected = new Map<EventName, CollectedHandlers>();

  for (const handlers of maps) {
    const entries = Object.entries(handlers) as Array<[EventName, unknown]>;

    for (const [eventName, candidate] of entries) {
      if (typeof candidate !== "function") continue;

      const handler = candidate as UnknownSocketHandler;
      const existing = collected.get(eventName);

      if (!existing) {
        collected.set(eventName, handler);
      } else if (Array.isArray(existing)) {
        existing.push(handler);
      } else {
        collected.set(eventName, [existing, handler]);
      }
    }
  }

  const result: Partial<Record<EventName, UnknownSocketHandler>> = {};

  for (const [eventName, handlers] of collected) {
    result[eventName] = Array.isArray(handlers)
      ? (payload, ctx) => {
          for (const handler of handlers) {
            handler(payload, ctx);
          }
        }
      : handlers;
  }

  return result as SocketEventHandlers;
}
