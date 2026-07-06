import { useState } from "react";
import { CircleCheck, CircleX, Clock, Mail } from "lucide-react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, type BoxPickerOptionType } from "@beyo/ui";

import type { CustomerCoordinationInboxFilterSheetSurfaceProps } from "../surface-ids";
import {
  CUSTOMER_COORDINATION_STATE,
  DEFAULT_COORDINATION_INBOX_FILTER,
  type CoordinationInboxFilterState,
  type CustomerCoordinationState,
} from "../types";

const STATE_OPTIONS: BoxPickerOptionType<CustomerCoordinationState>[] =
  CUSTOMER_COORDINATION_STATE.map((state) => {
    switch (state) {
      case "pending":
        return {
          value: "pending",
          label: "Pending",
          icon: Clock,
          testId: "coordination-filter-state-pending",
        };
      case "coordinating":
        return {
          value: "coordinating",
          label: "Coordinating",
          icon: Mail,
          testId: "coordination-filter-state-coordinating",
        };
      case "completed":
        return {
          value: "completed",
          label: "Completed",
          icon: CircleCheck,
          testId: "coordination-filter-state-completed",
        };
      case "failed":
        return {
          value: "failed",
          label: "Failed",
          icon: CircleX,
          testId: "coordination-filter-state-failed",
        };
    }
  });

export function CustomerCoordinationInboxFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { currentFilters, onApply } =
    useSurfaceProps<CustomerCoordinationInboxFilterSheetSurfaceProps>();

  const [draft, setDraft] = useState<CoordinationInboxFilterState>(
    currentFilters ?? DEFAULT_COORDINATION_INBOX_FILTER,
  );

  function handleApply(): void {
    onApply?.(draft);
    header?.requestClose();
  }

  function handleClear(): void {
    setDraft(DEFAULT_COORDINATION_INBOX_FILTER);
  }

  return (
    <div
      className="flex flex-col gap-6 px-4 pb-6 pt-4"
      data-testid="coordination-inbox-filter-sheet"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Filters</h2>
        <button
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          type="button"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Coordination state
        </p>
        <BoxPicker
          columns={2}
          data-testid="coordination-filter-state-picker"
          mode="multiple"
          options={STATE_OPTIONS}
          showDescription={false}
          size="xs"
          value={draft.coordinationStates}
          onValueChange={(states) =>
            setDraft((prev) => ({
              ...prev,
              coordinationStates: states as CustomerCoordinationState[],
            }))
          }
        />
      </div>

      <button
        className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-card"
        data-testid="case-filter-apply"
        type="button"
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
}
