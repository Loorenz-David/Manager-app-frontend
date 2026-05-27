import { BoxPicker, HorizontalScrollArea } from '@/components/primitives';
import { cn } from '@/lib/utils';

import type { UpholsteryQuickFilter } from '../types';
import { UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS } from '../types';
import { UpholsterySearch } from './UpholsterySearch';

type UpholsteryPickerHeaderProps = {
  q: string;
  activeFilter: UpholsteryQuickFilter;
  description?: string;
  isFilterDisabled?: boolean;
  onQChange: (value: string) => void;
  onFilterChange: (filter: UpholsteryQuickFilter) => void;
};

export function UpholsteryPickerHeader({
  q,
  activeFilter,
  description,
  isFilterDisabled = false,
  onQChange,
  onFilterChange,
}: UpholsteryPickerHeaderProps): React.JSX.Element {
  const filterOptions = UPHOLSTERY_QUICK_FILTER_PILL_OPTIONS.map((option) => ({
    ...option,
    disabled: isFilterDisabled,
  }));

  return (
    <div
      className="sticky top-0 z-10 border-b border-border bg-background"
      data-testid="upholstery-picker-header"
    >
      <div className="px-4 pb-2 pt-3">
        <UpholsterySearch value={q} onChange={onQChange} />
        {description ? (
          <p
            className="mt-2 text-sm text-muted-foreground"
            data-testid="upholstery-picker-description"
          >
            {description}
          </p>
        ) : null}
      </div>

      <HorizontalScrollArea className="pb-3">
        <BoxPicker
          className={cn(
            'flex flex-nowrap flex-row gap-1.5 px-4 transition-opacity duration-150',
            isFilterDisabled && 'pointer-events-none opacity-60',
          )}
          data-testid="upholstery-quick-filter-pills"
          disabledOptionClassName="opacity-60"
          layout="stack"
          mode="single"
          options={filterOptions}
          showDescription={false}
          showIcon={false}
          size="xs"
          value={activeFilter}
          visualVariant="pill"
          onValueChange={onFilterChange}
        />
      </HorizontalScrollArea>
    </div>
  );
}
