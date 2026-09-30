import type { AppSocket } from "./socket-types";

/**
 * The entity views the page holds open, ref-counted, and their announcement
 * on the socket.
 *
 * - Every registered entity gets exactly one `view_entity` per connection:
 *   when it is registered on a connected socket, or when the socket
 *   (re)connects. Nothing is emitted while disconnected (socket.io would
 *   buffer it and flush it on connect, next to the re-announcement).
 * - `resumed` is `false` the first time an entity is announced (someone opened
 *   it) and `true` on every later connection (the view survived a reconnect;
 *   no person did anything). The backend records human activity only for
 *   `resumed: false`.
 * - `leave_entity` goes out when the last registration of an entity goes away
 *   and its view was announced on the current connection.
 */
export type EntityViewRegistry = {
  /** Registers one consumer of the view. Returns its release function. */
  register(entityType: string, entityClientId: string): () => void;
  /** Makes `socket` the socket views are announced on. */
  attach(socket: AppSocket): void;
  /** Forgets `socket` (no-op when another socket is attached). */
  detach(socket: AppSocket): void;
  /** Announces every registered view not yet sent on the current connection. */
  announce(): void;
};

type Entry = {
  entityType: string;
  entityClientId: string;
  count: number;
  /** A `view_entity` for this registration went out on some connection. */
  announced: boolean;
};

function keyOf(entityType: string, entityClientId: string): string {
  return `${entityType}\u0000${entityClientId}`;
}

export function createEntityViewRegistry(): EntityViewRegistry {
  const entries = new Map<string, Entry>();
  let socket: AppSocket | null = null;
  // Keys announced on the connection named by `connectionId` (the socket id,
  // new on every connection).
  let connectionId: string | undefined;
  let sent = new Set<string>();

  function sentOnCurrentConnection(): Set<string> {
    const id = socket?.connected ? socket.id : undefined;
    if (id !== connectionId) {
      connectionId = id;
      sent = new Set();
    }
    return sent;
  }

  function send(key: string, entry: Entry): void {
    if (!socket?.connected) return;
    const onConnection = sentOnCurrentConnection();
    if (onConnection.has(key)) return;
    socket.emit("view_entity", {
      entity_type: entry.entityType,
      entity_client_id: entry.entityClientId,
      resumed: entry.announced,
    });
    entry.announced = true;
    onConnection.add(key);
  }

  return {
    register(entityType, entityClientId) {
      const key = keyOf(entityType, entityClientId);
      let entry = entries.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        entry = { entityType, entityClientId, count: 1, announced: false };
        entries.set(key, entry);
        send(key, entry);
      }
      const own = entry;
      let released = false;

      return () => {
        if (released) return;
        released = true;
        own.count -= 1;
        if (own.count > 0 || entries.get(key) !== own) return;
        entries.delete(key);
        if (!socket?.connected) return;
        const onConnection = sentOnCurrentConnection();
        if (!onConnection.delete(key)) return;
        socket.emit("leave_entity", {
          entity_type: own.entityType,
          entity_client_id: own.entityClientId,
        });
      };
    },

    attach(next) {
      socket = next;
      connectionId = undefined;
      sent = new Set();
    },

    detach(previous) {
      if (socket !== previous) return;
      socket = null;
      connectionId = undefined;
      sent = new Set();
    },

    announce() {
      for (const [key, entry] of entries) send(key, entry);
    },
  };
}
