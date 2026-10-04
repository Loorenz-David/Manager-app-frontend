import { useState } from "react";
import { ListFilter } from "lucide-react";

import { useSurfaceProps } from "@beyo/hooks";
import { BoxPicker, CollapsibleDrawer, ContentCard, type BoxPickerOptionType } from "@beyo/ui";

import { ItemPositionFilterField } from "../components/filter-fields/ItemPositionFilterField";
import { countTaskSheetFilters } from "../lib/task-filter-counts";
import { TASK_TYPE_ICON, TASK_TYPE_LABEL } from "../lib/task-detail";
import type { TaskFilterSheetSurfaceProps } from "../surface-ids";
import type { TaskTypeFilter } from "../types";

const TASK_TYPE_OPTIONS: BoxPickerOptionType<TaskTypeFilter>[] = [
  { value: "all", label: "All tasks", icon: ListFilter, testId: "task-filter-type-all" },
  { value: "return", label: TASK_TYPE_LABEL.return, icon: TASK_TYPE_ICON.return, testId: "task-filter-type-return" },
  { value: "pre_order", label: TASK_TYPE_LABEL.pre_order, icon: TASK_TYPE_ICON.pre_order, testId: "task-filter-type-pre-order" },
  { value: "internal", label: TASK_TYPE_LABEL.internal, icon: TASK_TYPE_ICON.internal, testId: "task-filter-type-internal" },
];

const GROUP_BY_UPHOLSTERY_OPTIONS: BoxPickerOptionType<"on">[] = [
  {
    value: "on",
    label: "Group by upholstery",
    testId: "task-filter-group-upholstery",
  },
];

export function TaskFilterSheetPage(): React.JSX.Element {
  const { selectedTaskType, selectedItemPosition, groupByUpholstery, onChange } =
    useSurfaceProps<TaskFilterSheetSurfaceProps>();
  const [localTaskType, setLocalTaskType] = useState<TaskTypeFilter>(selectedTaskType ?? "all");
  const [localItemPosition, setLocalItemPosition] = useState(selectedItemPosition ?? "");
  const [localGroupByUpholstery, setLocalGroupByUpholstery] =
    useState(groupByUpholstery ?? false);
  const [openDrawer, setOpenDrawer] = useState<"task" | "other" | null>(null);
  const counts = countTaskSheetFilters({
    taskType: localTaskType,
    itemPosition: localItemPosition,
    groupByUpholstery: localGroupByUpholstery,
  });

  return (
    <div
      className="flex flex-col bg-background pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="task-filter-sheet"
    >
      <CollapsibleDrawer
        title="Task"
        count={counts.task}
        open={openDrawer === "task"}
        onOpenChange={(isOpen) => setOpenDrawer(isOpen ? "task" : null)}
        triggerClassName="px-4"
        data-testid="task-filter-task-drawer"
      >
        <ContentCard data-testid="task-filter-task-card">
          <BoxPicker
            layout="stack"
            visualVariant="horizontalDescription"
            mode="single"
            data-testid="task-filter-type-picker"
            options={TASK_TYPE_OPTIONS}
            value={localTaskType}
            onValueChange={(next) => {
              setLocalTaskType(next);
              onChange?.({ taskType: next });
            }}
          />
        </ContentCard>
      </CollapsibleDrawer>

      <CollapsibleDrawer
        title="Other"
        count={counts.other}
        open={openDrawer === "other"}
        onOpenChange={(isOpen) => setOpenDrawer(isOpen ? "other" : null)}
        triggerClassName="px-4"
        data-testid="task-filter-other-drawer"
      >
        <ContentCard gapClassName="gap-4" data-testid="task-filter-other-card">
          <ItemPositionFilterField
            value={localItemPosition}
            onChange={(next) => {
              setLocalItemPosition(next);
              onChange?.({ itemPosition: next.trim() });
            }}
          />
          <BoxPicker
            layout="stack"
            data-testid="task-filter-group-upholstery-picker"
            mode="multiple"
            onValueChange={(values) => {
              const enabled = values.includes("on");
              setLocalGroupByUpholstery(enabled);
              onChange?.({ groupByUpholstery: enabled });
            }}
            options={GROUP_BY_UPHOLSTERY_OPTIONS}
            value={localGroupByUpholstery ? ["on"] : []}
          />
        </ContentCard>
      </CollapsibleDrawer>
    </div>
  );
}
