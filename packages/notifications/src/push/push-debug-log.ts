import { useEffect, useState } from "react";

export type PushLogEntry = { ts: string; msg: string };

const entries: PushLogEntry[] = [];
const listeners = new Set<() => void>();

export function pushLog(msg: string): void {
  const now = new Date();
  const ts = now.toISOString().slice(11, 23); // HH:MM:SS.mmm
  entries.push({ ts, msg });
  listeners.forEach((fn) => fn());
}

export function getPushLogs(): readonly PushLogEntry[] {
  return entries;
}

export function clearPushLogs(): void {
  entries.length = 0;
  listeners.forEach((fn) => fn());
}

export function usePushDebugLogs(): readonly PushLogEntry[] {
  const [, rerender] = useState(0);
  useEffect(() => {
    listeners.add(tick);
    return () => {
      listeners.delete(tick);
    };
    function tick() {
      rerender((n) => n + 1);
    }
  }, []);
  return getPushLogs();
}
