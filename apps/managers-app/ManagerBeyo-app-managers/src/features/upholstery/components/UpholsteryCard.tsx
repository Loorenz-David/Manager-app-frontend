import { cva } from 'class-variance-authority';

import { ImagePlaceholder } from '@/components/primitives';
import { formatMeters, type UpholsteryPickerRecord } from '@/features/upholstery/types';
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
  const conditionColors = {
    available: 'bg-emerald-500',
    low_stock: 'bg-amber-500',
    out_of_stock: 'bg-rose-500',
  } as const;
  const conditionColor = record.inventory_condition
    ? conditionColors[record.inventory_condition]
    : null;

  return (
    <button
      type="button"
      data-testid={testId}
      className={upholsteryCardVariants({ selected: isSelected })}
      onClick={() => onSelect(record.client_id)}
    >
      {record.image_url ? (
        <img
          src={record.image_url}
          alt={record.name}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="size-10 shrink-0 overflow-hidden rounded-full">
          <ImagePlaceholder />
        </div>
      )}
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
          'flex shrink-0 items-center gap-2 text-sm font-medium tabular-nums',
          isSelected ? 'text-card/80' : 'text-muted-foreground',
        )}
      >
        {conditionColor ? (
          <span
            aria-hidden="true"
            className={cn('size-2 rounded-full', conditionColor)}
          />
        ) : null}
        {formatMeters(record.current_stored_amount_meters) ?? '—'}
      </span>
    </button>
  );
}
