import { cn } from "@beyo/lib";

export type TimelineProps = {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * Vertical timeline container. Items are rendered as siblings so a parent
 * entry and its nested rows can each be their own button (buttons never nest).
 */
export function Timeline({
  children,
  className,
  "data-testid": dataTestId,
}: TimelineProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col", className)} data-testid={dataTestId}>
      {children}
    </div>
  );
}

export type TimelineItemSpacing = "default" | "tight";

export type TimelineItemProps = {
  children: React.ReactNode;
  /** Highlights the dot (e.g. the newest entry). */
  emphasis?: boolean;
  /** The rail line stops after this item. */
  isLast?: boolean;
  /**
   * Renders the item indented under the previous top-level item: the main
   * rail continues on the left and a small dot marks the nested row.
   */
  nested?: boolean;
  /** Space below the item's content; `tight` groups a parent with its nested rows. */
  spacing?: TimelineItemSpacing;
  /** Defaults to `button` when `onClick` is given, otherwise `div`. */
  as?: "button" | "div";
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

const SPACING_CLASS: Record<TimelineItemSpacing, string> = {
  default: "pb-4",
  tight: "pb-2",
};

export function TimelineItem({
  children,
  emphasis = false,
  isLast = false,
  nested = false,
  spacing,
  as,
  onClick,
  className,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
}: TimelineItemProps): React.JSX.Element {
  const resolvedAs = as ?? (onClick ? "button" : "div");
  const resolvedSpacing = spacing ?? (nested ? "tight" : "default");
  const contentPadding = isLast ? null : SPACING_CLASS[resolvedSpacing];

  const rail = nested ? (
    <div
      className="relative mr-3 flex w-4 shrink-0 flex-col items-center"
      data-timeline-rail=""
    >
      {!isLast ? <div className="w-px flex-1 bg-(--color-border)" /> : null}
    </div>
  ) : (
    <div
      className="relative mr-3 flex w-4 shrink-0 flex-col items-center"
      data-timeline-rail=""
    >
      <div
        className={cn(
          "mt-0.5 h-3 w-3 shrink-0 rounded-full",
          emphasis ? "bg-primary" : "bg-(--color-border)",
        )}
        data-timeline-dot=""
      />
      {!isLast ? (
        <div className="mt-1 w-px flex-1 bg-(--color-border)" />
      ) : null}
    </div>
  );

  const content = nested ? (
    <div className="flex min-w-0 flex-1 gap-2 pl-1">
      <div
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          emphasis ? "bg-primary" : "bg-(--color-border)",
        )}
        data-timeline-dot=""
      />
      <div className={cn("min-w-0 flex-1", contentPadding)}>{children}</div>
    </div>
  ) : (
    <div className={cn("min-w-0 flex-1", contentPadding)}>{children}</div>
  );

  const sharedProps = {
    className: cn("flex w-full gap-0 text-left", className),
    "aria-label": ariaLabel,
    "data-testid": dataTestId,
    "data-emphasis": emphasis ? "" : undefined,
    "data-nested": nested ? "" : undefined,
  };

  if (resolvedAs === "button") {
    return (
      <button {...sharedProps} type="button" onClick={onClick}>
        {rail}
        {content}
      </button>
    );
  }

  return (
    <div {...sharedProps}>
      {rail}
      {content}
    </div>
  );
}
