import { useEffect, useMemo, useState } from "react";

import { useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, useSurfaceStore } from "@beyo/ui";

import {
  TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID,
  type TaskPostHandlingFilterSheetSurfaceProps,
} from "../surface-ids";

const COMPLETED_OPTION = [
  {
    value: "completed" as const,
    label: "Completed",
    description: "Show completed post-handling tasks.",
  },
];

export function TaskPostHandlingFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { isCompletedFilterActive, onApply } =
    useSurfaceProps<TaskPostHandlingFilterSheetSurfaceProps>();
  const initialValue = useMemo(
    () => (isCompletedFilterActive ? (["completed"] as const) : []),
    [isCompletedFilterActive],
  );
  const [value, setValue] = useState<"completed"[]>([...initialValue]);

  useEffect(() => {
    header?.setTitle("Post-handling filter");
    header?.setActions(null);
  }, [header]);

  function handleChange(next: "completed"[]): void {
    setValue(next);
    onApply?.(next.includes("completed"));
  }

  return (
    <div
      className="flex flex-col px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="task-post-handling-filter-sheet"
    >
      <BoxPicker
        columns={2}
        data-testid="task-post-handling-filter-options"
        layout="grid"
        mode="multiple"
        options={COMPLETED_OPTION}
        showDescription={false}
        value={value}
        onValueChange={handleChange}
      />

      <div aria-hidden="true" className="h-16 shrink-0" />

      <button
        className="rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-card"
        type="button"
        onClick={() =>
          useSurfaceStore
            .getState()
            .close(TASK_POST_HANDLING_FILTER_SHEET_SURFACE_ID)
        }
      >
        Done
      </button>
    </div>
  );
}
