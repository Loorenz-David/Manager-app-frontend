import { cn } from "@beyo/lib";
import { Info } from "lucide-react";

import { TYPICAL_STRATEGY_PILL_CLASS } from "./typical-strategy-tone";
import type { TypicalStrategyTone } from "../../lib/typical-strategy";

export type TypicalStrategyPillProps = {
  /** "Same upholstery" — authored upstream, never derived here. */
  label: string;
  tone: TypicalStrategyTone;
  /** Omitted where the host cannot open the sheet; the pill then just states. */
  onPress?: () => void;
  className?: string;
};

/**
 * Names the population behind the typical times on the surface it sits on.
 *
 * It is a button only when a host injected an opener: packages never open
 * surfaces themselves, so an app that has not registered the sheet gets the
 * label without a dead tap target.
 */
export function TypicalStrategyPill({
  label,
  tone,
  onPress,
  className,
}: TypicalStrategyPillProps): React.JSX.Element {
  const content = (
    <>
      <span className="text-muted-foreground">Typical from</span>
      <span className="font-medium">{label}</span>
      {onPress ? <Info aria-hidden="true" className="size-3.5 shrink-0" /> : null}
    </>
  );

  const shared = cn(
    "inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-3 py-1 text-xs",
    TYPICAL_STRATEGY_PILL_CLASS[tone],
    className,
  );

  if (onPress === undefined) {
    return (
      <span className={shared} data-testid="typical-strategy-pill" data-tone={tone}>
        {content}
      </span>
    );
  }

  return (
    <button
      className={cn(
        shared,
        "transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:opacity-70",
      )}
      data-testid="typical-strategy-pill"
      data-tone={tone}
      onClick={onPress}
      type="button"
    >
      {content}
    </button>
  );
}
