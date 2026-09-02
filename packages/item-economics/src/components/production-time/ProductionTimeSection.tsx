import { useProductionTimeController } from "../../controllers/use-production-time.controller";
import type { ItemEconomicsSurfaceOpeners } from "../../surface-ids";
import { ProductionTimeCard } from "./ProductionTimeCard";
import { ProductionTimeCardSkeleton } from "./ProductionTimeCardSkeleton";
import { ProductionTimeFrame } from "./ProductionTimeFrame";

export type ProductionTimeSectionProps = {
  taskId: string;
  className?: string;
  /**
   * Injected down from the app that registered the sheet — this component
   * lives two packages away from any surface registry, so it takes the opener
   * rather than resolving one. Omitted, the strategy pill states rather than
   * opens, which is the correct degradation for a host without the surface.
   */
  surfaceOpeners?: ItemEconomicsSurfaceOpeners;
};

export function ProductionTimeSection({
  taskId,
  className,
  surfaceOpeners,
}: ProductionTimeSectionProps): React.JSX.Element | null {
  const { viewModel, isPending, isError, isNotFound, refetch } =
    useProductionTimeController(taskId);

  if (isNotFound) {
    return null;
  }

  if (isPending) {
    return <ProductionTimeCardSkeleton />;
  }

  if (isError) {
    return (
      <ProductionTimeFrame
        className={className}
        data-testid="production-time-error"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Could not load production time.
          </p>
          <button
            type="button"
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium"
            onClick={() => {
              void refetch();
            }}
          >
            Try again
          </button>
        </div>
      </ProductionTimeFrame>
    );
  }

  if (viewModel === null) {
    return null;
  }

  const openStrategy = surfaceOpeners?.openTypicalStrategy;

  return (
    <ProductionTimeCard
      className={className}
      viewModel={viewModel}
      onStrategyPress={
        openStrategy === undefined
          ? undefined
          : (strategy) => openStrategy({ strategy })
      }
    />
  );
}
