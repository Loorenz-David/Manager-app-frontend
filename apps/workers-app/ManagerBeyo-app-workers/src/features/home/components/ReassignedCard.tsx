import { useMemo } from "react";
import { RefreshCcwDot } from "lucide-react";
import { usePreloadSurface } from "@beyo/hooks";
import type { ReassignedStepsHostAdapter } from "@beyo/task-working-sections";
import { ReassignedStepRow } from "../../task_steps";
import { useHomeTopCardsContext } from "../providers/HomeTopCardsProvider";
import { preloadReassignedStepsSlideSurface } from "../surfaces";

export function ReassignedCard(): React.JSX.Element {
  usePreloadSurface(preloadReassignedStepsSlideSurface);

  const { reassignedCount, openReassignedPage } = useHomeTopCardsContext();

  // A component type, not a closure: each row keeps its own live mutation state
  // while every openSurface call stays in app land (35_shared_packages.md §13).
  const adapter = useMemo<ReassignedStepsHostAdapter>(
    () => ({ StepRow: ReassignedStepRow }),
    [],
  );

  return (
    // `min-w-0`: this card is a grid item sharing a row with the state card,
    // and a grid item's default `min-width: auto` would let it overflow its
    // track at content width — the label below would never truncate. Width
    // itself comes from the `1fr` column, so both cards always match.
    <div className="relative min-w-0">
      <button
        // `h-full`: the grid stretches the wrapper to the row height, but the
        // button would otherwise stay at its own content height and sit short
        // next to the state card's two-line (label + timer) body.
        className="flex h-full w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left shadow-sm transition-opacity border-soft-container"
        data-testid="reassigned-card"
        type="button"
        onClick={() => openReassignedPage(adapter)}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft-container)]">
          <RefreshCcwDot
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          Re-Assigned
        </span>
      </button>

      {reassignedCount > 0 ? (
        <span
          aria-label={`${reassignedCount} reassigned tasks`}
          className="pointer-events-none absolute -right-1.5 -top-1.5 flex min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-xs font-bold text-card"
          data-testid="reassigned-card-badge"
        >
          {reassignedCount}
        </span>
      ) : null}
    </div>
  );
}
