import { cn } from "@beyo/lib";
import { useUnreadCountQuery } from "../api/use-unread-count-query";

export type NotificationBadgeProps = {
  className?: string;
  max?: number;
};

export function NotificationBadge({
  className,
  max = 99,
}: NotificationBadgeProps): React.JSX.Element | null {
  const { data } = useUnreadCountQuery();
  const count = data?.unread_count ?? 0;

  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn(
        "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full",
        "bg-[var(--color-destructive)] px-1.5 text-xs font-semibold",
        "text-[var(--color-card)] tabular-nums leading-none",
        className,
      )}
      data-testid="notification-badge"
      role="status"
      aria-label={`${count} unread notifications`}
    >
      {label}
    </span>
  );
}
