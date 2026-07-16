import { useEffect, useState } from "react";

import { useSurface, useSurfaceHeader, useSurfaceProps } from "@beyo/hooks";

import { ItemPositionFilterField } from "../components/filter-fields/ItemPositionFilterField";
import type { TaskFilterSheetSurfaceProps } from "../surface-ids";

export function TaskFilterSheetPage(): React.JSX.Element {
  const header = useSurfaceHeader();
  const { closeTop } = useSurface();
  const { selectedItemPosition, onApply } =
    useSurfaceProps<TaskFilterSheetSurfaceProps>();
  const [localItemPosition, setLocalItemPosition] = useState<string>(
    selectedItemPosition ?? "",
  );

  useEffect(() => {
    header?.setTitle("Filters");
    header?.setActions(null);
  }, [header]);

  function closeSheet() {
    if (header) {
      header.requestClose();
      return;
    }

    closeTop();
  }

  function handleApply() {
    onApply?.(localItemPosition.trim());
    closeSheet();
  }

  return (
    <div
      className="flex flex-col gap-6 bg-background px-4 pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="task-filter-sheet"
    >
      <ItemPositionFilterField
        value={localItemPosition}
        onChange={setLocalItemPosition}
      />

      <button
        type="button"
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-card"
        data-testid="task-filter-apply"
        onClick={handleApply}
      >
        Apply
      </button>
    </div>
  );
}
