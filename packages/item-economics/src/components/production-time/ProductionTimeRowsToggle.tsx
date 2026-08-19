import { cn } from "@beyo/lib";
import { ChevronDown } from "lucide-react";

export type ProductionTimeRowsToggleProps = {
  isExpanded: boolean;
  totalCount: number;
  onToggle: () => void;
};

export function ProductionTimeRowsToggle({
  isExpanded,
  totalCount,
  onToggle,
}: ProductionTimeRowsToggleProps): React.JSX.Element {
  return (
    <button
      aria-expanded={isExpanded}
      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset active:bg-muted/20"
      data-testid="production-time-rows-toggle"
      type="button"
      onClick={onToggle}
    >
      <span>{isExpanded ? "Show less" : `Show all ${totalCount} stages`}</span>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 transition-transform duration-150",
          isExpanded && "rotate-180",
        )}
      />
    </button>
  );
}
