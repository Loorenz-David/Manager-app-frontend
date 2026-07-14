import {
  BoxPicker,
  BoxSlidePicker,
  HorizontalScrollArea,
  SearchBar,
} from "@beyo/ui";

import { TASK_STATE_FILTER_OPTIONS, TASK_TYPE_PICKER_OPTIONS } from "../types";
import type { TaskState, TaskTypeFilter } from "../types";

const HIDE_STYLE: React.CSSProperties = {
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition: "opacity var(--scroll-snap-duration, 0ms) ease-out",
};

const SLIDE_HIDE_STYLE: React.CSSProperties = {
  transform: "translateY(calc(-100% * var(--scroll-hide-progress, 0)))",
  opacity: "calc(1 - var(--scroll-hide-progress, 0))",
  transition:
    "transform var(--scroll-snap-duration, 0ms) ease-out, opacity var(--scroll-snap-duration, 0ms) ease-out",
};

type TasksHeaderProps = {
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  isHidden: boolean;
  isLoading: boolean;
  activeFilterCount: number;
  onTaskTypeChange: (value: TaskTypeFilter) => void;
  onTaskStatesChange: (value: TaskState[]) => void;
  onQChange: (value: string) => void;
  onSortPress: () => void;
  onFilterPress: () => void;
};

export function TasksHeader({
  taskType,
  taskStates,
  q,
  isHidden,
  isLoading,
  activeFilterCount,
  onTaskTypeChange,
  onTaskStatesChange,
  onQChange,
  onSortPress,
  onFilterPress,
}: TasksHeaderProps): React.JSX.Element {
  return (
    <div
      className="relative flex flex-col bg-background"
      data-testid="tasks-header"
    >
      <div
        className="px-4 pb-2 pt-3 will-change-[opacity]"
        style={{ ...HIDE_STYLE, pointerEvents: isHidden ? "none" : undefined }}
      >
        <BoxSlidePicker
          dataTestId="tasks-type-picker"
          options={TASK_TYPE_PICKER_OPTIONS}
          size="sm"
          value={taskType}
          onValueChange={onTaskTypeChange}
        />
      </div>

      <div className="relative z-10 bg-background px-4 py-2">
        <SearchBar
          activeFilterCount={activeFilterCount}
          data-testid="tasks-search-bar"
          isLoading={isLoading}
          placeholder="Search tasks..."
          value={q}
          wrapperClassName="bg-[var(--color-card)]"
          onChange={onQChange}
          onFilterPress={onFilterPress}
          onSortPress={onSortPress}
        />
      </div>

      <div
        className="absolute inset-x-0 bg-background [will-change:transform,opacity]"
        style={{
          top: "100%",
          ...SLIDE_HIDE_STYLE,
          pointerEvents: isHidden ? "none" : undefined,
        }}
      >
        <HorizontalScrollArea className="pb-1">
          <BoxPicker
            className="flex flex-nowrap flex-row gap-1.5 px-4"
            data-testid="tasks-state-filter"
            layout="stack"
            mode="multiple"
            options={[...TASK_STATE_FILTER_OPTIONS]}
            size="sm"
            showDescription={false}
            showIcon={false}
            value={taskStates}
            visualVariant="pill"
            selectedOptionClassName="bg-blue-100 border-blue-400 text-blue-500"
            unselectedOptionClassName="bg-white border-slate-300 text-slate-700"
            onValueChange={onTaskStatesChange}
          />
        </HorizontalScrollArea>
      </div>
    </div>
  );
}
