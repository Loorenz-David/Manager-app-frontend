import { useSocketStatus } from "@beyo/realtime";
import { cn } from "@beyo/lib";

export function ConnectionStatus(): React.JSX.Element {
  const { connected, reconnecting } = useSocketStatus();
  const label = connected ? "Live" : reconnecting ? "Reconnecting" : "Offline";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-background/90 px-2 py-1",
        "text-[11px] font-medium shadow-sm backdrop-blur",
        connected
          ? "border-[var(--color-success)] text-[var(--color-success)]"
          : reconnecting
            ? "border-[var(--color-warning)] text-[var(--color-warning)]"
            : "border-[var(--color-border)] text-muted-foreground",
      )}
      data-testid="socket-connection-status"
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          connected
            ? "bg-[var(--color-success)]"
            : reconnecting
              ? "bg-[var(--color-warning)]"
              : "bg-muted-foreground",
        )}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
