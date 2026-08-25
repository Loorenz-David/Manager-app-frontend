import { useSyncExternalStore } from "react";

import type { TaskBudgetSignal } from "../../types";
import { buildTaskBudgetSignalDisplay } from "../../lib/task-budget-overrun";
import { TaskBudgetOverrunBand } from "./TaskBudgetOverrunBand";

type Listener = () => void;

// The footer text is minute-granular. A shared 30-second clock keeps it fresh
// without making every task card (or every footer) schedule a one-second update.
const listeners = new Set<Listener>();
let tickInterval: ReturnType<typeof setInterval> | null = null;
let nowMs = Date.now();

function subscribe(callback: Listener): () => void {
  listeners.add(callback);
  if (listeners.size === 1) {
    nowMs = Date.now();
    tickInterval = setInterval(() => {
      nowMs = Date.now();
      for (const listener of listeners) listener();
    }, 30_000);
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && tickInterval !== null) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  };
}

function getSnapshot(): number {
  return nowMs;
}

export type TaskBudgetSignalFooterProps = {
  signal: TaskBudgetSignal;
  receivedAtMs: number;
};

/** Isolates the forward-only live clock to an individual warning footer. */
export function TaskBudgetSignalFooter({
  signal,
  receivedAtMs,
}: TaskBudgetSignalFooterProps): React.JSX.Element | null {
  const now = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const display = buildTaskBudgetSignalDisplay(
    signal,
    Math.max(0, now - receivedAtMs),
  );

  return display ? <TaskBudgetOverrunBand signal={display} /> : null;
}
