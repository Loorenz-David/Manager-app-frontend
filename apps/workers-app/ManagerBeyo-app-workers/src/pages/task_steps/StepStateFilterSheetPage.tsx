import { useState } from "react";
import { useSurface, useSurfaceProps } from "@beyo/hooks";
import { ItemPositionFilterField } from "@beyo/tasks";
import { BoxPicker, CollapsibleDrawer, ContentCard, type BoxPickerOptionType } from "@beyo/ui";
import {
  DEFAULT_READINESS_STATUS_FILTERS,
  DEFAULT_STATE_FILTERS,
} from "@/features/task_steps/lib/filter-defaults";
import { countWorkingSectionStepFilters } from "@/features/task_steps/lib/filter-counts";
import { getTaskTypeIcon, getTaskTypeLabel } from "@/features/task_steps/domain/task-type-meta";
import {
  STEP_CATEGORY_FILTER_SHEET_SURFACE_ID,
  type StepCategoryFilterSheetSurfaceProps,
  type StepStateFilterSheetSurfaceProps,
} from "@/features/task_steps/surface-ids";
import type {
  ReadinessStatus,
  StepState,
  TaskType,
} from "@/features/task_steps/types";

const FILTER_OPTIONS: BoxPickerOptionType<StepState>[] = [
  {
    value: "pending",
    label: "Pending",
    testId: "filter-option-pending",
  },
  {
    value: "working",
    label: "Working",
    testId: "filter-option-working",
  },
  {
    value: "paused",
    label: "Paused",
    testId: "filter-option-paused",
  },
  {
    value: "ended_shift",
    label: "Ended shift",
    testId: "filter-option-ended-shift",
  },
  {
    value: "completed",
    label: "Completed",
    testId: "filter-option-completed",
  },
];

const READINESS_STATUS_OPTIONS: BoxPickerOptionType<ReadinessStatus>[] = [
  {
    value: "ready",
    label: "Ready",
    testId: "filter-readiness-ready",
  },
  {
    value: "blocked",
    label: "Blocked",
    testId: "filter-readiness-blocked",
  },
  {
    value: "partial",
    label: "Partial",
    testId: "filter-readiness-partial",
  },
];

const GROUP_BY_UPHOLSTERY_OPTIONS: BoxPickerOptionType<"on">[] = [
  {
    value: "on",
    label: "Group by upholstery",
    testId: "step-filter-group-upholstery",
  },
];

const TASK_TYPE_OPTIONS: BoxPickerOptionType<TaskType>[] = [
  {
    value: "return",
    label: getTaskTypeLabel("return"),
    icon: getTaskTypeIcon("return"),
    testId: "filter-task-type-return",
  },
  {
    value: "pre_order",
    label: getTaskTypeLabel("pre_order"),
    icon: getTaskTypeIcon("pre_order"),
    testId: "filter-task-type-pre-order",
  },
  {
    value: "internal",
    label: getTaskTypeLabel("internal"),
    icon: getTaskTypeIcon("internal"),
    testId: "filter-task-type-internal",
  },
];

export function StepStateFilterSheetPage(): React.JSX.Element {
  const { open } = useSurface();
  const {
    workingSectionId,
    selectedStates,
    selectedReadinessStatuses,
    selectedTaskTypes,
    selectedCategoryIds,
    selectedItemPosition,
    selectedGroupByUpholstery,
    onSaveCategories,
    onChange,
  } = useSurfaceProps<StepStateFilterSheetSurfaceProps>();
  const [localFilters, setLocalFilters] = useState<StepState[]>(
    selectedStates ?? DEFAULT_STATE_FILTERS,
  );
  const [localReadinessStatuses, setLocalReadinessStatuses] = useState<
    ReadinessStatus[]
  >(selectedReadinessStatuses ?? DEFAULT_READINESS_STATUS_FILTERS);
  const [localTaskTypes, setLocalTaskTypes] = useState<TaskType[]>(
    selectedTaskTypes ?? [],
  );
  const [localCategoryIds, setLocalCategoryIds] = useState<string[]>(
    selectedCategoryIds ?? [],
  );
  const [localItemPosition, setLocalItemPosition] = useState<string>(
    selectedItemPosition ?? "",
  );
  const [localGroupByUpholstery, setLocalGroupByUpholstery] = useState<boolean>(
    selectedGroupByUpholstery ?? false,
  );
  const [openDrawer, setOpenDrawer] = useState<"state" | "task" | "other" | null>(null);
  const counts = countWorkingSectionStepFilters({
    states: localFilters,
    readinessStatuses: localReadinessStatuses,
    taskTypes: localTaskTypes,
    categoryIds: localCategoryIds,
    itemPosition: localItemPosition,
    groupByUpholstery: localGroupByUpholstery,
  });

  function handleValueChange(newValues: StepState[]) {
    const justAdded = newValues.find((value) => !localFilters.includes(value));
    let next: StepState[];
    if (justAdded === "completed") {
      next = ["completed"];
    } else if (justAdded !== undefined) {
      next = newValues.filter((value) => value !== "completed");
    } else if (newValues.length > 0) {
      next = newValues;
    } else {
      return;
    }
    setLocalFilters(next);
    onChange?.({ states: next });
  }

  function openCategoryPicker(): void {
    if (!workingSectionId) return;
    open(STEP_CATEGORY_FILTER_SHEET_SURFACE_ID, {
      workingSectionId,
      selectedCategoryIds: localCategoryIds,
      onSave: async (ids: string[]) => {
        if (!onSaveCategories) throw new Error("Category save callback is unavailable");
        await onSaveCategories(ids);
        setLocalCategoryIds(ids);
      },
    } satisfies StepCategoryFilterSheetSurfaceProps);
  }

  return (
    <div
      className="flex flex-col bg-background pb-[calc(var(--safe-bottom,0)+1.5rem)] pt-2"
      data-testid="step-state-filter-sheet"
    >
      <CollapsibleDrawer
        title="State"
        count={counts.state}
        open={openDrawer === "state"}
        onOpenChange={(isOpen) => setOpenDrawer(isOpen ? "state" : null)}
        triggerClassName="px-4"
        data-testid="step-filter-state-drawer"
      >
        <ContentCard gapClassName="gap-4" data-testid="step-filter-state-card">
          <BoxPicker
            columns={2}
            data-testid="step-state-filter-picker"
            mode="multiple"
            onValueChange={handleValueChange}
            options={FILTER_OPTIONS}
            value={localFilters}
          />
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">Readiness</p>
            <BoxPicker
              columns={3}
              data-testid="step-readiness-status-filter-picker"
              mode="multiple"
              onValueChange={(next) => {
                setLocalReadinessStatuses(next);
                onChange?.({ readinessStatuses: next });
              }}
              options={READINESS_STATUS_OPTIONS}
              value={localReadinessStatuses}
            />
          </div>
        </ContentCard>
      </CollapsibleDrawer>

      <CollapsibleDrawer
        title="Task"
        count={counts.task}
        open={openDrawer === "task"}
        onOpenChange={(isOpen) => setOpenDrawer(isOpen ? "task" : null)}
        triggerClassName="px-4"
        data-testid="step-filter-task-drawer"
      >
        <ContentCard gapClassName="gap-4" data-testid="step-filter-task-card">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">Task type</p>
            <BoxPicker
              layout="stack"
              visualVariant="horizontalDescription"
              data-testid="step-task-type-filter-picker"
              mode="multiple"
              onValueChange={(next) => {
                setLocalTaskTypes(next);
                onChange?.({ taskTypes: next });
              }}
              options={TASK_TYPE_OPTIONS}
              value={localTaskTypes}
            />
          </div>
          <button
            type="button"
            className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-left text-sm font-medium"
            data-testid="step-category-filter-trigger"
            onClick={openCategoryPicker}
          >
            <span>Categories</span>
            <span className="text-muted-foreground">
              {localCategoryIds.length ? `${localCategoryIds.length} selected` : "All"}
            </span>
          </button>
        </ContentCard>
      </CollapsibleDrawer>

      <CollapsibleDrawer
        title="Other"
        count={counts.other}
        open={openDrawer === "other"}
        onOpenChange={(isOpen) => setOpenDrawer(isOpen ? "other" : null)}
        triggerClassName="px-4"
        data-testid="step-filter-other-drawer"
      >
        <ContentCard gapClassName="gap-4" data-testid="step-filter-other-card">
          <ItemPositionFilterField
            value={localItemPosition}
            onChange={(next) => {
              setLocalItemPosition(next);
              onChange?.({ itemPosition: next.trim() });
            }}
          />
          <BoxPicker
            layout="stack"
            data-testid="step-filter-group-upholstery-picker"
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
