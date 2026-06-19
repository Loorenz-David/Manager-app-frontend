import { useState } from "react";
import { useRealtimeLog } from "@beyo/realtime";

export function RealtimeDebugPanel(): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const entries = useRealtimeLog();

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed right-2 top-[calc(var(--safe-top)+3rem)] z-[80] text-xs">
      <button
        className="rounded border bg-background/95 px-2 py-1 shadow-sm"
        data-testid="realtime-debug-toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        RT {entries.length}
      </button>
      {open ? (
        <div
          className="mt-2 max-h-80 w-[min(24rem,calc(100vw-1rem))] overflow-auto rounded border bg-background/95 p-2 shadow-lg"
          data-testid="realtime-debug-panel"
        >
          {entries.length === 0 ? (
            <p className="text-muted-foreground">No realtime events</p>
          ) : (
            entries
              .slice()
              .reverse()
              .map((entry) => (
                <div className="border-b py-1 last:border-b-0" key={entry.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{entry.event}</span>
                    <span>{entry.status}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {entry.scope}
                    {entry.handlerMs !== undefined
                      ? ` - ${entry.handlerMs.toFixed(1)}ms`
                      : ""}
                  </div>
                  {entry.invalidated.length > 0 ? (
                    <div className="break-all text-muted-foreground">
                      {entry.invalidated.join(", ")}
                    </div>
                  ) : null}
                  {entry.error ? (
                    <div className="break-all text-[var(--color-destructive)]">
                      {entry.error}
                    </div>
                  ) : null}
                </div>
              ))
          )}
        </div>
      ) : null}
    </div>
  );
}
