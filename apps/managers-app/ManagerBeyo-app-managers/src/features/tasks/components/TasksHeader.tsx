import { cn } from '@beyo/lib';

import { BoxPicker, BoxSlidePicker, HorizontalScrollArea, SearchBar } from '@/components/primitives';

import { TASK_STATE_FILTER_OPTIONS, TASK_TYPE_PICKER_OPTIONS } from '../types';
import type { TaskState, TaskTypeFilter } from '../types';

type TasksHeaderProps = {
  isCompact: boolean;
  taskType: TaskTypeFilter;
  taskStates: TaskState[];
  q: string;
  isLoading: boolean;
  activeFilterCount: number;
  onTaskTypeChange: (value: TaskTypeFilter) => void;
  onTaskStatesChange: (value: TaskState[]) => void;
  onQChange: (value: string) => void;
  onSortPress: () => void;
  onFilterPress: () => void;
};

const COLLAPSE = "grid transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)]";

export function TasksHeader({
  isCompact,
  taskType,
  taskStates,
  q,
  isLoading,
  activeFilterCount,
  onTaskTypeChange,
  onTaskStatesChange,
  onQChange,
  onSortPress,
  onFilterPress,
}: TasksHeaderProps): React.JSX.Element {
  return (
    <div className="flex flex-col bg-background" data-testid="tasks-header">
      <div className={cn(COLLAPSE, isCompact ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")}>
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-2 pt-3">
            <BoxSlidePicker
              dataTestId="tasks-type-picker"
              options={TASK_TYPE_PICKER_OPTIONS}
              size="sm"
              value={taskType}
              onValueChange={onTaskTypeChange}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
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

      <div className={cn(COLLAPSE, isCompact ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")}>
        <div className="min-h-0 overflow-hidden">
          <HorizontalScrollArea className="pb-2">
            <BoxPicker
              className="flex flex-nowrap flex-row gap-1.5 px-4"
              data-testid="tasks-state-filter"
              layout="stack"
              mode="multiple"
              options={[...TASK_STATE_FILTER_OPTIONS]}
              size="xs"
              showDescription={false}
              showIcon={false}
              value={taskStates}
              visualVariant="pill"
              onValueChange={onTaskStatesChange}
            />
          </HorizontalScrollArea>
        </div>
      </div>
    </div>
  );
}
