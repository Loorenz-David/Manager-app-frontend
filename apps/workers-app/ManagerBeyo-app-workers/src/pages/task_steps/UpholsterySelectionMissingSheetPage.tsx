import { useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { useItemUpholsteryQuery } from "@beyo/tasks";

import type { UpholsterySelectionMissingSheetSurfaceProps } from "@/features/task_steps/surface-ids";

function formatMeters(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function UpholsterySelectionMissingSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const { itemId } =
    useSurfaceProps<UpholsterySelectionMissingSheetSurfaceProps>();

  const resolvedItemId =
    itemId ?? ("" as UpholsterySelectionMissingSheetSurfaceProps["itemId"]);

  useEffect(() => {
    header?.setTitle("No upholstery assigned");
    header?.setActions(null);
  }, [header]);

  const upholsteryQuery = useItemUpholsteryQuery(resolvedItemId);

  const reservedAmountMeters = useMemo(() => {
    const entry = (upholsteryQuery.data?.upholstery ?? []).find(
      (item) => item.upholstery_id === null,
    );

    return entry?.amount_meters ?? null;
  }, [upholsteryQuery.data?.upholstery]);

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  return (
    <div
      className="flex flex-col gap-5 bg-background px-5 pb-[calc(var(--safe-bottom,0)+1.25rem)] pt-4"
      data-testid="upholstery-selection-missing-sheet"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-yellow-500"
        />
        <div className="flex flex-col gap-2 text-sm text-foreground">
          <p>
            No upholstery has been assigned to this step yet. Contact your
            manager before starting.
          </p>
          {reservedAmountMeters !== null ? (
            <p className="font-medium">
              Reserved amount: {formatMeters(reservedAmountMeters)} m.
            </p>
          ) : null}
        </div>
      </div>

      <button
        className="rounded-xl border border-light-border bg-card py-3 text-sm font-semibold text-foreground shadow-sm"
        data-testid="upholstery-selection-missing-close"
        type="button"
        onClick={closeSheet}
      >
        Close
      </button>
    </div>
  );
}
