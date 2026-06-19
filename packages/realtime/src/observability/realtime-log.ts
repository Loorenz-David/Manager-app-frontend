export type RealtimeLogEntry = {
  id: number;
  ts: number;
  event: string;
  scope: "workspace" | "user" | "conversation" | "client" | "system";
  payload: unknown;
  handlerMs?: number;
  invalidated: string[];
  status: "ok" | "error" | "no-handler";
  error?: string;
};

type RealtimeLogDraft = Omit<RealtimeLogEntry, "id" | "ts" | "scope"> & {
  ts?: number;
  scope?: RealtimeLogEntry["scope"];
};

const MAX_ENTRIES = 200;
const _entries: RealtimeLogEntry[] = [];
const _listeners = new Set<() => void>();
let _nextId = 1;
// Immutable snapshot replaced on every write so useSyncExternalStore detects changes by reference.
let _snapshot: RealtimeLogEntry[] = [];

export function getRealtimeLog(): RealtimeLogEntry[] {
  return _snapshot;
}

export function subscribeRealtimeLog(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

export function recordRealtimeEvent(entry: RealtimeLogDraft): void {
  _entries.push({
    id: _nextId,
    ts: entry.ts ?? Date.now(),
    scope: entry.scope ?? scopeFromEvent(entry.event),
    ...entry,
  });
  _nextId += 1;

  if (_entries.length > MAX_ENTRIES) {
    _entries.splice(0, _entries.length - MAX_ENTRIES);
  }

  _snapshot = [..._entries];
  _listeners.forEach((listener) => listener());
}

export function clearRealtimeLog(): void {
  _entries.splice(0, _entries.length);
  _snapshot = [];
  _listeners.forEach((listener) => listener());
}

function scopeFromEvent(event: string): RealtimeLogEntry["scope"] {
  if (event.startsWith("conversation:")) return "conversation";
  if (event.startsWith("notification:") || event.startsWith("user:")) return "user";
  if (event.startsWith("client:")) return "client";
  if (event.startsWith("system:")) return "system";
  return "workspace";
}
