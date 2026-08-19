import { useProductionTimeController } from "../../controllers/use-production-time.controller";
import { ProductionTimeCard } from "./ProductionTimeCard";
import { ProductionTimeCardSkeleton } from "./ProductionTimeCardSkeleton";
import { ProductionTimeFrame } from "./ProductionTimeFrame";

export type ProductionTimeSectionProps = {
  taskId: string;
  className?: string;
};

export function ProductionTimeSection({
  taskId,
  className,
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

  return <ProductionTimeCard className={className} viewModel={viewModel} />;
}
