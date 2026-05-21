import { cva } from 'class-variance-authority';

import { formatPickerMeters, type UpholsteryPickerRecord } from '@/features/upholstery/types';
import { cn } from '@/lib/utils';

const upholsteryCardVariants = cva(
  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  {
    variants: {
      selected: {
        true: 'border-primary bg-primary text-card',
        false: 'border-border bg-card text-foreground',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

type UpholsteryCardProps = {
  record: UpholsteryPickerRecord;
  isSelected: boolean;
  onSelect: (clientId: string) => void;
  testId?: string;
};

export function UpholsteryCard({
  record,
  isSelected,
  onSelect,
  testId,
}: UpholsteryCardProps): React.JSX.Element {
  return (
    <button
      type="button"
      data-testid={testId}
      className={upholsteryCardVariants({ selected: isSelected })}
      onClick={() => onSelect(record.client_id)}
    >
      <img
        src={record.image}
        alt={record.name}
        className="size-10 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            isSelected ? 'text-card' : 'text-foreground',
          )}
        >
          {record.name}
        </p>
        {record.code !== null ? (
          <p
            className={cn(
              'truncate text-xs',
              isSelected ? 'text-card/70' : 'text-muted-foreground',
            )}
          >
            {record.code}
          </p>
        ) : null}
      </div>
      <span
        className={cn(
          'shrink-0 text-sm font-medium tabular-nums',
          isSelected ? 'text-card/80' : 'text-muted-foreground',
        )}
      >
        {formatPickerMeters(record.current_available_amount_meters)}
      </span>
    </button>
  );
}
