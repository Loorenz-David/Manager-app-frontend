import { useState } from "react";
import { usePushDebugLogs, clearPushLogs } from "@beyo/notifications";

export function PushDebugLog(): React.JSX.Element {
  const logs = usePushDebugLogs();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = logs.map((e) => `[${e.ts}] ${e.msg}`).join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Push Debug Log
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => clearPushLogs()}
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-card"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy all"}
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No logs yet — tap Enable to capture the flow.
        </p>
      ) : (
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {logs.map((entry, i) => (
            <div
              key={i}
              className="flex gap-2 font-mono text-xs leading-relaxed"
            >
              <span className="shrink-0 text-muted-foreground">{entry.ts}</span>
              <span className="break-all">{entry.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
